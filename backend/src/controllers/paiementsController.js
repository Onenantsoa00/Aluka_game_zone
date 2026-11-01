import { query } from '../config/db.js'
import {
  countAffectationsForModele,
  createAffectation,
  createModele,
  deleteModele,
  findModeleById,
  listAffectations,
  listModeles,
  recetteParJeton,
  updateModele,
} from '../models/paiementsModel.js'
import { computeRemuneration, TYPES_MODELE } from '../services/remuneration.js'
import { clientIp, logAudit } from '../utils/audit.js'
import { httpError } from '../utils/errors.js'
import { assertTenant } from '../utils/tenant.js'

function validateModele({ typeModele, valeur, seuil }) {
  if (!TYPES_MODELE.includes(typeModele)) {
    throw httpError(400, `Type de modele invalide (${TYPES_MODELE.join(', ')})`)
  }
  const v = Number(valeur)
  if (!Number.isFinite(v) || v < 0) throw httpError(400, 'Valeur invalide')
  if (typeModele === 'fraction' && v > 1) {
    throw httpError(400, 'Une fraction doit etre comprise entre 0 et 1 (ex. 0.3333)')
  }
  if (['pourcentage', 'pourcentage_seuil'].includes(typeModele) && v > 100) {
    throw httpError(400, 'Un pourcentage doit etre compris entre 0 et 100')
  }
  if (typeModele === 'pourcentage_seuil') {
    const s = Number(seuil)
    if (!Number.isFinite(s) || s <= 0) {
      throw httpError(400, 'Un seuil positif est requis pour un pourcentage a seuil')
    }
  }
}

export async function getModeles(req, res) {
  const rows = await listModeles(req.user.tenantId)
  return res.json(rows)
}

function assertModeleAccess(user, modele) {
  if (modele.boss_id == null) {
    if (user.role !== 'admin') {
      throw httpError(403, 'Ce modèle est un modèle plateforme : dupliquez-le pour le modifier')
    }
    return
  }
  assertTenant(user, modele.boss_id, 'Modèle')
}

export async function postModele(req, res) {
  const { nomModele, typeModele, valeur, seuil, description } = req.body || {}
  if (!nomModele?.trim()) throw httpError(400, 'nomModele requis')
  validateModele({ typeModele, valeur, seuil })

  const row = await createModele({
    nomModele: nomModele.trim(),
    typeModele,
    valeur,
    seuil: typeModele === 'pourcentage_seuil' ? seuil : null,
    description,
    bossId: req.user.role === 'boss' ? req.user.tenantId : null,
  })
  await logAudit({
    userId: req.user.id,
    action: 'modele.create',
    entite: 'modele_paiement',
    entiteId: row.id,
    details: { nom: row.nom_modele, type: row.type_modele, valeur: row.valeur },
    ip: clientIp(req),
  })
  return res.status(201).json(row)
}

export async function putModele(req, res) {
  const modele = await findModeleById(req.params.id)
  if (!modele) throw httpError(404, 'Modele introuvable')
  assertModeleAccess(req.user, modele)

  const typeModele = req.body.typeModele || modele.type_modele
  const valeur = req.body.valeur !== undefined ? req.body.valeur : modele.valeur
  const seuil = req.body.seuil !== undefined ? req.body.seuil : modele.seuil
  validateModele({ typeModele, valeur, seuil })

  const row = await updateModele({
    id: modele.id,
    nomModele: req.body.nomModele?.trim(),
    typeModele,
    valeur,
    seuil: typeModele === 'pourcentage_seuil' ? seuil : null,
    description: req.body.description,
  })
  await logAudit({
    userId: req.user.id,
    action: 'modele.update',
    entite: 'modele_paiement',
    entiteId: modele.id,
    details: { nom: row.nom_modele, type: row.type_modele, valeur: row.valeur },
    ip: clientIp(req),
  })
  return res.json(row)
}

export async function deleteModeleController(req, res) {
  const modele = await findModeleById(req.params.id)
  if (!modele) throw httpError(404, 'Modele introuvable')
  assertModeleAccess(req.user, modele)
  const affectations = await countAffectationsForModele(modele.id)
  if (affectations > 0) {
    throw httpError(409, 'Ce modele est affecte a un operateur : desaffectez-le d\'abord')
  }
  const row = await deleteModele(modele.id)
  await logAudit({
    userId: req.user.id,
    action: 'modele.delete',
    entite: 'modele_paiement',
    entiteId: modele.id,
    details: { nom: modele.nom_modele },
    ip: clientIp(req),
  })
  return res.json(row)
}

export async function getAffectations(req, res) {
  const rows = await listAffectations(req.user.tenantId)
  return res.json(rows)
}

export async function postAffectation(req, res) {
  const { jetonId, modeleId } = req.body || {}
  if (!jetonId || !modeleId) throw httpError(400, 'jetonId et modeleId requis')

  const { rows } = await query(
    `SELECT u.id, u.cree_par FROM utilisateurs u JOIN roles r ON r.id=u.role_id
     WHERE u.id=$1 AND r.nom='jeton' AND u.actif=TRUE`,
    [jetonId],
  )
  if (!rows[0]) throw httpError(400, 'Operateur (jeton) introuvable ou inactif')
  assertTenant(req.user, rows[0].cree_par, 'Opérateur')
  const modele = await findModeleById(modeleId)
  if (!modele) throw httpError(400, 'Modele introuvable')
  if (modele.boss_id != null) assertTenant(req.user, modele.boss_id, 'Modèle')

  const row = await createAffectation({ jetonId, modeleId })
  await logAudit({
    userId: req.user.id,
    action: 'affectation.create',
    entite: 'affectation_jeton',
    entiteId: row.id,
    details: { jetonId, modeleId },
    ip: clientIp(req),
  })
  return res.status(201).json(row)
}

/** Calcule la remuneration due par operateur sur une periode (O7). */
export async function getRemunerations(req, res) {
  const dateDebut = req.query.dateDebut || new Date().toISOString().slice(0, 10)
  const dateFin = req.query.dateFin || dateDebut
  if (dateDebut > dateFin) throw httpError(400, 'Periode invalide')

  const jours =
    Math.round(
      (new Date(`${dateFin}T00:00:00Z`) - new Date(`${dateDebut}T00:00:00Z`)) / 86400000,
    ) + 1

  const [recettes, affectations] = await Promise.all([
    recetteParJeton(dateDebut, dateFin, req.user.tenantId),
    listAffectations(req.user.tenantId),
  ])
  const modelesParJeton = new Map(affectations.map((a) => [a.jeton_id, a]))

  const lignes = recettes.map((row) => {
    const modele = modelesParJeton.get(row.jeton_id)
    const recette = Number(row.recette)
    return {
      jetonId: row.jeton_id,
      jetonNom: row.jeton_nom,
      recette,
      modeleId: modele?.modele_id || null,
      modeleNom: modele?.nom_modele || null,
      typeModele: modele?.type_modele || null,
      valeur: modele ? Number(modele.valeur) : null,
      seuil: modele?.seuil != null ? Number(modele.seuil) : null,
      montant: computeRemuneration({ recette, modele, jours }),
    }
  })

  return res.json({
    dateDebut,
    dateFin,
    jours,
    total: lignes.reduce((sum, ligne) => sum + ligne.montant, 0),
    lignes,
  })
}

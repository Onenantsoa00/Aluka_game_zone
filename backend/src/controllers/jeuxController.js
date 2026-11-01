import {
  createJeu,
  createTarification,
  deactivateJeu,
  deleteTarification,
  findJeuById,
  findTarificationById,
  listJeux,
  listTarificationsByConsole,
  updateJeu,
  updateTarification,
} from '../models/jeuxModel.js'
import { clientIp, logAudit } from '../utils/audit.js'
import { httpError, translateDbError } from '../utils/errors.js'

export async function getJeux(_req, res) {
  const rows = await listJeux()
  return res.json(rows)
}

export async function postJeu(req, res) {
  const { nom, genre, description } = req.body || {}
  if (!nom?.trim()) throw httpError(400, 'Nom du jeu requis')
  const row = await createJeu({ nom: nom.trim(), genre, description })
  await logAudit({
    userId: req.user.id,
    action: 'jeu.create',
    entite: 'jeu',
    entiteId: row.id,
    details: { nom: row.nom },
    ip: clientIp(req),
  })
  return res.status(201).json(row)
}

export async function putJeu(req, res) {
  const jeu = await findJeuById(req.params.id)
  if (!jeu) throw httpError(404, 'Jeu introuvable')
  if (req.body.nom !== undefined && !String(req.body.nom).trim()) {
    throw httpError(400, 'Le nom ne peut pas etre vide')
  }
  const row = await updateJeu({
    id: jeu.id,
    nom: req.body.nom?.trim(),
    genre: req.body.genre,
    description: req.body.description,
    actif: req.body.actif,
  })
  await logAudit({
    userId: req.user.id,
    action: 'jeu.update',
    entite: 'jeu',
    entiteId: jeu.id,
    details: { nom: row.nom },
    ip: clientIp(req),
  })
  return res.json(row)
}

export async function deleteJeu(req, res) {
  const jeu = await findJeuById(req.params.id)
  if (!jeu) throw httpError(404, 'Jeu introuvable')
  const row = await deactivateJeu(jeu.id)
  await logAudit({
    userId: req.user.id,
    action: 'jeu.delete',
    entite: 'jeu',
    entiteId: jeu.id,
    details: { nom: jeu.nom },
    ip: clientIp(req),
  })
  return res.json(row)
}

export async function postTarification(req, res) {
  const { consoleId, dureeMinutes, prix } = req.body || {}
  const duree = Number(dureeMinutes)
  const montant = Number(prix)
  if (!consoleId) throw httpError(400, 'Console requise')
  if (!Number.isFinite(duree) || duree <= 0 || duree > 1440) {
    throw httpError(400, 'Duree invalide (1 a 1440 minutes)')
  }
  if (!Number.isFinite(montant) || montant < 0) throw httpError(400, 'Prix invalide')

  let row
  try {
    row = await createTarification({
      consoleId,
      dureeMinutes: duree,
      prix: montant,
      bossId: req.user.role === 'boss' ? req.user.tenantId : null,
    })
  } catch (error) {
    throw translateDbError(error)
  }
  await logAudit({
    userId: req.user.id,
    action: 'tarif.create',
    entite: 'tarification',
    entiteId: row.id,
    details: { duree, prix: montant },
    ip: clientIp(req),
  })
  return res.status(201).json(row)
}

function assertTarifAccess(user, tarif) {
  if (tarif.boss_id == null) {
    if (user.role !== 'admin') {
      throw httpError(403, 'Ce tarif est un modèle plateforme : dupliquez-le pour le modifier')
    }
    return
  }
  if (Number(tarif.boss_id) !== Number(user.tenantId)) {
    throw httpError(404, 'Tarification introuvable')
  }
}

export async function putTarification(req, res) {
  const tarif = await findTarificationById(req.params.id)
  if (!tarif) throw httpError(404, 'Tarification introuvable')
  assertTarifAccess(req.user, tarif)
  const duree = req.body.dureeMinutes === undefined ? null : Number(req.body.dureeMinutes)
  const prix = req.body.prix === undefined ? null : Number(req.body.prix)
  if (duree !== null && (!Number.isFinite(duree) || duree <= 0 || duree > 1440)) {
    throw httpError(400, 'Duree invalide (1 a 1440 minutes)')
  }
  if (prix !== null && (!Number.isFinite(prix) || prix < 0)) throw httpError(400, 'Prix invalide')

  let row
  try {
    row = await updateTarification({ id: tarif.id, dureeMinutes: duree, prix })
  } catch (error) {
    throw translateDbError(error)
  }
  await logAudit({
    userId: req.user.id,
    action: 'tarif.update',
    entite: 'tarification',
    entiteId: tarif.id,
    details: { duree: row.duree_minutes, prix: row.prix },
    ip: clientIp(req),
  })
  return res.json(row)
}

export async function deleteTarificationController(req, res) {
  const tarif = await findTarificationById(req.params.id)
  if (!tarif) throw httpError(404, 'Tarification introuvable')
  assertTarifAccess(req.user, tarif)
  const row = await deleteTarification(tarif.id)
  await logAudit({
    userId: req.user.id,
    action: 'tarif.delete',
    entite: 'tarification',
    entiteId: tarif.id,
    details: { duree: tarif.duree_minutes, prix: tarif.prix },
    ip: clientIp(req),
  })
  return res.json(row)
}

export async function getTarifications(req, res) {
  const rows = await listTarificationsByConsole(req.params.consoleId, req.user.tenantId)
  return res.json(rows)
}

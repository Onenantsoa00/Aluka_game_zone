import { addMouvementStock, createMateriel, listMateriels } from '../models/materielsModel.js'
import { httpError } from '../utils/errors.js'
import { assertSalleAccess, assertTenant, bossIdForMateriel } from '../utils/tenant.js'

export async function getMateriels(req, res) {
  const rows = await listMateriels(req.user.tenantId)
  return res.json(rows)
}

export async function postMateriel(req, res) {
  const { salleId, nom, categorie, quantite, stockMinimum, etat } = req.body
  if (!salleId || !nom?.trim()) throw httpError(400, 'Salle et nom du matériel requis')
  await assertSalleAccess(req.user, salleId)
  const row = await createMateriel({
    salleId,
    nom: nom.trim(),
    categorie,
    quantite,
    stockMinimum,
    etat,
  })
  return res.status(201).json(row)
}

export async function postMouvement(req, res) {
  const { materielId, typeMouvement, quantite } = req.body
  if (!materielId) throw httpError(400, 'Matériel requis')
  if (!['entree', 'sortie'].includes(typeMouvement)) {
    throw httpError(400, 'Type de mouvement invalide')
  }
  const qty = Number(quantite)
  if (!Number.isFinite(qty) || qty <= 0) throw httpError(400, 'Quantité invalide')
  assertTenant(req.user, await bossIdForMateriel(materielId), 'Matériel')
  const row = await addMouvementStock({
    materielId,
    typeMouvement,
    quantite: qty,
    utilisateurId: req.user.id,
  })
  return res.json(row)
}

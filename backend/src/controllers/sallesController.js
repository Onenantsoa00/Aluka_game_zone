import { query } from '../config/db.js'
import {
  countActiveSessionsInSalle,
  createSalle,
  deactivateSalle,
  findSalleById,
  listSallesActives,
  updateSalle,
} from '../models/sallesModel.js'
import { clientIp, logAudit } from '../utils/audit.js'
import { httpError } from '../utils/errors.js'

export async function getSalles(_req, res) {
  const rows = await listSallesActives()
  return res.json(rows)
}

export async function postSalle(req, res) {
  const { nom, adresse, bossId } = req.body || {}
  if (!nom?.trim()) throw httpError(400, 'Nom de salle requis')
  const owner = req.user.role === 'boss' ? req.user.id : bossId
  if (!owner) throw httpError(400, 'bossId requis')

  const { rows } = await query(
    `SELECT u.id FROM utilisateurs u JOIN roles r ON r.id=u.role_id
     WHERE u.id=$1 AND r.nom='boss' AND u.actif=TRUE`,
    [owner],
  )
  if (!rows[0]) throw httpError(400, 'Boss proprietaire introuvable ou inactif')

  const row = await createSalle({ nom: nom.trim(), adresse, bossId: owner })
  await logAudit({
    userId: req.user.id,
    action: 'salle.create',
    entite: 'salle',
    entiteId: row.id,
    details: { nom: row.nom },
    ip: clientIp(req),
  })
  return res.status(201).json(row)
}

export async function putSalle(req, res) {
  const salle = await findSalleById(req.params.id)
  if (!salle) throw httpError(404, 'Salle introuvable')
  if (req.user.role === 'boss' && salle.boss_id !== req.user.id) {
    throw httpError(403, 'Cette salle ne vous appartient pas')
  }
  if (req.body.nom !== undefined && !String(req.body.nom).trim()) {
    throw httpError(400, 'Le nom ne peut pas etre vide')
  }
  const row = await updateSalle({
    id: salle.id,
    nom: req.body.nom?.trim(),
    adresse: req.body.adresse,
    actif: req.body.actif,
  })
  await logAudit({
    userId: req.user.id,
    action: 'salle.update',
    entite: 'salle',
    entiteId: salle.id,
    details: { nom: row.nom, actif: row.actif },
    ip: clientIp(req),
  })
  return res.json(row)
}

export async function deleteSalle(req, res) {
  const salle = await findSalleById(req.params.id)
  if (!salle) throw httpError(404, 'Salle introuvable')
  if (req.user.role === 'boss' && salle.boss_id !== req.user.id) {
    throw httpError(403, 'Cette salle ne vous appartient pas')
  }
  const active = await countActiveSessionsInSalle(salle.id)
  if (active > 0) {
    throw httpError(409, 'Des sessions sont encore actives dans cette salle')
  }
  const row = await deactivateSalle(salle.id)
  await logAudit({
    userId: req.user.id,
    action: 'salle.delete',
    entite: 'salle',
    entiteId: salle.id,
    details: { nom: salle.nom },
    ip: clientIp(req),
  })
  return res.json(row)
}

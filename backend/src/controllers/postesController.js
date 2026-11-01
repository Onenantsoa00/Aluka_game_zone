import { query } from '../config/db.js'
import {
  createPoste,
  deactivatePoste,
  findPosteById,
  hasActiveSession,
  listPostes,
  updatePoste,
} from '../models/postesModel.js'
import { clientIp, logAudit } from '../utils/audit.js'
import { httpError, translateDbError } from '../utils/errors.js'
import { assertSalleAccess, assertTenant, bossIdForPoste } from '../utils/tenant.js'

async function assertReferences({ salleId, consoleId }) {
  if (salleId) {
    const { rows } = await query('SELECT 1 FROM salles WHERE id=$1 AND actif=TRUE', [salleId])
    if (!rows[0]) throw httpError(400, 'Salle introuvable ou inactive')
  }
  if (consoleId) {
    const { rows } = await query('SELECT 1 FROM consoles WHERE id=$1', [consoleId])
    if (!rows[0]) throw httpError(400, 'Console introuvable')
  }
}

export async function getPostes(req, res) {
  const rows = await listPostes({
    salleId: req.query.salleId ? Number(req.query.salleId) : null,
    tenantId: req.user.tenantId,
  })
  return res.json(rows)
}

export async function postPoste(req, res) {
  const { salleId, consoleId, nomPoste, numeroPoste } = req.body || {}
  if (!salleId || !consoleId) throw httpError(400, 'Salle et console requises')
  if (!nomPoste?.trim()) throw httpError(400, 'Nom du poste requis')
  await assertSalleAccess(req.user, salleId)
  await assertReferences({ salleId, consoleId })

  let row
  try {
    row = await createPoste({
      salleId,
      consoleId,
      nomPoste: nomPoste.trim(),
      numeroPoste,
    })
  } catch (error) {
    throw translateDbError(error)
  }

  await logAudit({
    userId: req.user.id,
    action: 'poste.create',
    entite: 'poste',
    entiteId: row.id,
    details: { nom: row.nom_poste, salleId },
    ip: clientIp(req),
  })
  return res.status(201).json(row)
}

export async function putPoste(req, res) {
  const poste = await findPosteById(req.params.id)
  if (!poste) throw httpError(404, 'Poste introuvable')
  assertTenant(req.user, await bossIdForPoste(poste.id), 'Poste')
  if (req.body.nomPoste !== undefined && !String(req.body.nomPoste).trim()) {
    throw httpError(400, 'Le nom ne peut pas etre vide')
  }
  if (req.body.consoleId) await assertReferences({ consoleId: req.body.consoleId })

  let row
  try {
    row = await updatePoste({
      id: poste.id,
      nomPoste: req.body.nomPoste?.trim(),
      numeroPoste: req.body.numeroPoste,
      consoleId: req.body.consoleId,
      actif: req.body.actif,
      disponible: req.body.disponible,
    })
  } catch (error) {
    throw translateDbError(error)
  }

  await logAudit({
    userId: req.user.id,
    action: 'poste.update',
    entite: 'poste',
    entiteId: poste.id,
    details: { nom: row.nom_poste, actif: row.actif, disponible: row.disponible },
    ip: clientIp(req),
  })
  return res.json(row)
}

export async function deletePoste(req, res) {
  const poste = await findPosteById(req.params.id)
  if (!poste) throw httpError(404, 'Poste introuvable')
  assertTenant(req.user, await bossIdForPoste(poste.id), 'Poste')
  if (await hasActiveSession(poste.id)) {
    throw httpError(409, 'Ce poste a une session active : terminez-la avant de le supprimer')
  }
  const row = await deactivatePoste(poste.id)
  await logAudit({
    userId: req.user.id,
    action: 'poste.delete',
    entite: 'poste',
    entiteId: poste.id,
    details: { nom: poste.nom_poste },
    ip: clientIp(req),
  })
  return res.json(row)
}

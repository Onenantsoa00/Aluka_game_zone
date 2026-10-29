import { query } from '../config/db.js'
import {
  createFileAttente,
  createReservation,
  deleteFileAttente,
  deleteReservation,
  findConflict,
  listFileAttente,
  listReservations,
  updateFileAttenteStatut,
  updateReservationStatut,
} from '../models/reservationsModel.js'
import { clientIp, logAudit } from '../utils/audit.js'
import { httpError } from '../utils/errors.js'

const STATUTS_RESERVATION = ['reservee', 'honoree', 'annulee', 'expiree']
const STATUTS_FILE = ['en_attente', 'appele', 'installe', 'annule']

export async function getReservations(req, res) {
  const rows = await listReservations({
    date: req.query.date || null,
    statut: STATUTS_RESERVATION.includes(req.query.statut) ? req.query.statut : null,
  })
  return res.json(rows)
}

export async function postReservation(req, res) {
  const { posteId, nomJoueur, telephone, debut, fin, montant, note } = req.body || {}
  if (!posteId) throw httpError(400, 'Poste requis')
  if (!nomJoueur?.trim()) throw httpError(400, 'Nom du joueur requis')
  if (!debut || Number.isNaN(Date.parse(debut))) throw httpError(400, 'Date de debut invalide')
  if (fin && (Number.isNaN(Date.parse(fin)) || new Date(fin) <= new Date(debut))) {
    throw httpError(400, 'La fin doit etre posterieure au debut')
  }

  const { rows } = await query(
    'SELECT id, actif FROM postes WHERE id=$1',
    [posteId],
  )
  if (!rows[0] || !rows[0].actif) throw httpError(400, 'Poste introuvable ou inactif')

  const conflict = await findConflict({ posteId, debut, fin })
  if (conflict) {
    throw httpError(409, `Ce poste est deja reserve par ${conflict.nom_joueur}`)
  }

  const row = await createReservation({
    posteId,
    nomJoueur: nomJoueur.trim(),
    telephone,
    debut,
    fin,
    montant,
    note,
    creePar: req.user.id,
  })
  await logAudit({
    userId: req.user.id,
    action: 'reservation.create',
    entite: 'reservation',
    entiteId: row.id,
    details: { posteId, debut, nomJoueur: row.nom_joueur },
    ip: clientIp(req),
  })
  return res.status(201).json(row)
}

export async function patchReservationStatut(req, res) {
  const statut = req.body?.statut
  if (!STATUTS_RESERVATION.includes(statut)) throw httpError(400, 'Statut invalide')
  const row = await updateReservationStatut(req.params.id, statut)
  if (!row) throw httpError(404, 'Reservation introuvable')
  await logAudit({
    userId: req.user.id,
    action: 'reservation.statut',
    entite: 'reservation',
    entiteId: row.id,
    details: { statut },
    ip: clientIp(req),
  })
  return res.json(row)
}

export async function removeReservation(req, res) {
  const row = await deleteReservation(req.params.id)
  if (!row) throw httpError(404, 'Reservation introuvable')
  await logAudit({
    userId: req.user.id,
    action: 'reservation.delete',
    entite: 'reservation',
    entiteId: row.id,
    ip: clientIp(req),
  })
  return res.json(row)
}

export async function getFileAttente(req, res) {
  const rows = await listFileAttente({
    statut: STATUTS_FILE.includes(req.query.statut) ? req.query.statut : null,
  })
  return res.json(rows)
}

export async function postFileAttente(req, res) {
  const { salleId, posteId, nomJoueur, telephone, jeuId, note } = req.body || {}
  if (!nomJoueur?.trim()) throw httpError(400, 'Nom du joueur requis')
  if (!salleId && !posteId) throw httpError(400, 'Salle ou poste requis')

  const row = await createFileAttente({
    salleId,
    posteId,
    nomJoueur: nomJoueur.trim(),
    telephone,
    jeuId,
    note,
    creePar: req.user.id,
  })
  await logAudit({
    userId: req.user.id,
    action: 'file.create',
    entite: 'file_attente',
    entiteId: row.id,
    details: { nomJoueur: row.nom_joueur },
    ip: clientIp(req),
  })
  return res.status(201).json(row)
}

export async function patchFileAttenteStatut(req, res) {
  const statut = req.body?.statut
  if (!STATUTS_FILE.includes(statut)) throw httpError(400, 'Statut invalide')
  const row = await updateFileAttenteStatut(req.params.id, statut)
  if (!row) throw httpError(404, 'Entree introuvable')
  await logAudit({
    userId: req.user.id,
    action: 'file.statut',
    entite: 'file_attente',
    entiteId: row.id,
    details: { statut },
    ip: clientIp(req),
  })
  return res.json(row)
}

export async function removeFileAttente(req, res) {
  const row = await deleteFileAttente(req.params.id)
  if (!row) throw httpError(404, 'Entree introuvable')
  await logAudit({
    userId: req.user.id,
    action: 'file.delete',
    entite: 'file_attente',
    entiteId: row.id,
    ip: clientIp(req),
  })
  return res.json(row)
}

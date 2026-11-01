import { query } from '../config/db.js'
import { tenantFilter } from '../utils/tenant.js'

const RESERVATION_SELECT = `
  SELECT r.*, p.nom_poste, s.nom AS salle_nom, c.nom AS console_nom
  FROM reservations r
  JOIN postes p ON p.id=r.poste_id
  JOIN salles s ON s.id=p.salle_id
  JOIN consoles c ON c.id=p.console_id
`

export async function listReservations({ date = null, statut = null, tenantId = null, limit = 100 } = {}) {
  const params = []
  const where = []
  if (date) {
    params.push(date)
    where.push(`r.debut::date = $${params.length}::date`)
  }
  if (statut) {
    params.push(statut)
    where.push(`r.statut = $${params.length}`)
  }
  where.push(tenantFilter(params, tenantId))
  params.push(limit)
  const { rows } = await query(
    `${RESERVATION_SELECT}
     WHERE ${where.join(' AND ')}
     ORDER BY r.debut ASC
     LIMIT $${params.length}`,
    params,
  )
  return rows
}

export async function findReservationBossId(id) {
  const { rows } = await query(
    `SELECT s.boss_id FROM reservations r
     JOIN postes p ON p.id=r.poste_id
     JOIN salles s ON s.id=p.salle_id
     WHERE r.id=$1`,
    [id],
  )
  return rows[0]?.boss_id ?? null
}

export async function findConflict({ posteId, debut, fin }) {
  const { rows } = await query(
    `SELECT id, nom_joueur, debut, fin FROM reservations
     WHERE poste_id=$1
       AND statut='reservee'
       AND debut < COALESCE($3::timestamp, $2::timestamp + interval '2 hours')
       AND COALESCE(fin, debut + interval '2 hours') > $2::timestamp
     LIMIT 1`,
    [posteId, debut, fin || null],
  )
  return rows[0]
}

export async function createReservation({
  posteId,
  nomJoueur,
  telephone,
  debut,
  fin,
  montant,
  note,
  creePar,
}) {
  const { rows } = await query(
    `INSERT INTO reservations (poste_id, nom_joueur, telephone, debut, fin, montant, note, cree_par, statut)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'reservee') RETURNING *`,
    [posteId, nomJoueur, telephone || null, debut, fin || null, montant || 0, note || null, creePar],
  )
  return rows[0]
}

export async function updateReservationStatut(id, statut) {
  const { rows } = await query(
    'UPDATE reservations SET statut=$2 WHERE id=$1 RETURNING *',
    [id, statut],
  )
  return rows[0]
}

export async function deleteReservation(id) {
  const { rows } = await query('DELETE FROM reservations WHERE id=$1 RETURNING id', [id])
  return rows[0]
}

const FILE_SELECT = `
  SELECT f.*, COALESCE(s.nom, sp.nom) AS salle_nom, p.nom_poste, j.nom AS jeu_nom
  FROM file_attente f
  LEFT JOIN salles s ON s.id=f.salle_id
  LEFT JOIN postes p ON p.id=f.poste_id
  LEFT JOIN salles sp ON sp.id=p.salle_id
  LEFT JOIN jeux j ON j.id=f.jeu_id
`

export async function listFileAttente({ statut = null, tenantId = null, limit = 100 } = {}) {
  const params = []
  const where = []
  if (statut) {
    params.push(statut)
    where.push(`f.statut = $${params.length}`)
  }
  where.push(tenantFilter(params, tenantId, 'COALESCE(s.boss_id, sp.boss_id)'))
  params.push(limit)
  const { rows } = await query(
    `${FILE_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY CASE f.statut WHEN 'en_attente' THEN 0 WHEN 'appele' THEN 1 ELSE 2 END,
              f.created_at ASC
     LIMIT $${params.length}`,
    params,
  )
  return rows
}

export async function findFileAttenteBossId(id) {
  const { rows } = await query(
    `SELECT COALESCE(s.boss_id, sp.boss_id) AS boss_id
     FROM file_attente f
     LEFT JOIN salles s ON s.id=f.salle_id
     LEFT JOIN postes p ON p.id=f.poste_id
     LEFT JOIN salles sp ON sp.id=p.salle_id
     WHERE f.id=$1`,
    [id],
  )
  return rows[0]?.boss_id ?? null
}

export async function createFileAttente({
  salleId,
  posteId,
  nomJoueur,
  telephone,
  jeuId,
  note,
  creePar,
}) {
  const { rows } = await query(
    `INSERT INTO file_attente (salle_id, poste_id, nom_joueur, telephone, jeu_id, note, cree_par)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [salleId || null, posteId || null, nomJoueur, telephone || null, jeuId || null, note || null, creePar],
  )
  return rows[0]
}

export async function updateFileAttenteStatut(id, statut) {
  const { rows } = await query(
    'UPDATE file_attente SET statut=$2 WHERE id=$1 RETURNING *',
    [id, statut],
  )
  return rows[0]
}

export async function deleteFileAttente(id) {
  const { rows } = await query('DELETE FROM file_attente WHERE id=$1 RETURNING id', [id])
  return rows[0]
}

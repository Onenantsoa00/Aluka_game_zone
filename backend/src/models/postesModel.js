import { query } from '../config/db.js'

export async function listPostes(salleId) {
  const params = []
  const where = []
  if (salleId) {
    params.push(salleId)
    where.push(`p.salle_id = $${params.length}`)
  }
  const { rows } = await query(
    `SELECT p.*, s.nom AS salle_nom, c.nom AS console_nom
     FROM postes p
     JOIN salles s ON s.id=p.salle_id
     JOIN consoles c ON c.id=p.console_id
     WHERE s.actif=TRUE ${where.length ? `AND ${where.join(' AND ')}` : ''}
     ORDER BY p.id DESC
     LIMIT 500`,
    params,
  )
  return rows
}

export async function findPosteById(id) {
  const { rows } = await query('SELECT * FROM postes WHERE id=$1', [id])
  return rows[0]
}

export async function createPoste({ salleId, consoleId, nomPoste, numeroPoste }) {
  const { rows } = await query(
    `INSERT INTO postes (salle_id, console_id, nom_poste, numero_poste)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [salleId, consoleId, nomPoste, numeroPoste],
  )
  return rows[0]
}

export async function updatePoste({ id, nomPoste, numeroPoste, consoleId, actif, disponible }) {
  const { rows } = await query(
    `UPDATE postes
     SET nom_poste = COALESCE($2, nom_poste),
         numero_poste = COALESCE($3, numero_poste),
         console_id = COALESCE($4, console_id),
         actif = COALESCE($5, actif),
         disponible = COALESCE($6, disponible)
     WHERE id=$1 RETURNING *`,
    [
      id,
      nomPoste || null,
      numeroPoste === undefined ? null : numeroPoste,
      consoleId || null,
      actif === undefined ? null : actif,
      disponible === undefined ? null : disponible,
    ],
  )
  return rows[0]
}

export async function hasActiveSession(posteId) {
  const { rows } = await query(
    `SELECT 1 FROM sessions_jeux
     WHERE poste_id=$1 AND statut IN ('en_cours','pause') LIMIT 1`,
    [posteId],
  )
  return Boolean(rows[0])
}

export async function deactivatePoste(id) {
  const { rows } = await query(
    `UPDATE postes SET actif=FALSE, disponible=FALSE WHERE id=$1
     RETURNING id, nom_poste, actif`,
    [id],
  )
  return rows[0]
}

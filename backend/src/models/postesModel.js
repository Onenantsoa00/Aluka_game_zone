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
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY p.id DESC`,
    params,
  )
  return rows
}

export async function createPoste({ salleId, consoleId, nomPoste, numeroPoste }) {
  const { rows } = await query(
    `INSERT INTO postes (salle_id, console_id, nom_poste, numero_poste)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [salleId, consoleId, nomPoste, numeroPoste],
  )
  return rows[0]
}

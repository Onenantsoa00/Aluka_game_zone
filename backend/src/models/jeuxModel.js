import { query } from '../config/db.js'

export async function listJeux() {
  const { rows } = await query('SELECT * FROM jeux ORDER BY id DESC')
  return rows
}

export async function createJeu({ nom, genre, description }) {
  const { rows } = await query(
    'INSERT INTO jeux (nom, genre, description) VALUES ($1,$2,$3) RETURNING *',
    [nom, genre || null, description || null],
  )
  return rows[0]
}

export async function createTarification({ consoleId, dureeMinutes, prix }) {
  const { rows } = await query(
    `INSERT INTO tarifications (console_id, duree_minutes, prix)
     VALUES ($1,$2,$3) RETURNING *`,
    [consoleId, dureeMinutes, prix],
  )
  return rows[0]
}

export async function listTarificationsByConsole(consoleId) {
  const { rows } = await query(
    `SELECT * FROM tarifications
     WHERE console_id=$1 AND actif=TRUE
     ORDER BY duree_minutes ASC`,
    [consoleId],
  )
  return rows
}

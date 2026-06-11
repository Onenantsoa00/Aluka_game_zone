import { query } from '../config/db.js'

export async function listSallesActives() {
  const { rows } = await query(
    `SELECT s.*, u.nom AS boss_nom
     FROM salles s JOIN utilisateurs u ON u.id=s.boss_id
     WHERE s.actif=TRUE
     ORDER BY s.id DESC`,
  )
  return rows
}

export async function createSalle({ nom, adresse, bossId }) {
  const { rows } = await query(
    'INSERT INTO salles (nom, adresse, boss_id) VALUES ($1,$2,$3) RETURNING *',
    [nom, adresse || null, bossId],
  )
  return rows[0]
}

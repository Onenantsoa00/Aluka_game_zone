import { query } from '../config/db.js'

export async function listJeux() {
  const { rows } = await query('SELECT * FROM jeux WHERE actif=TRUE ORDER BY id DESC LIMIT 500')
  return rows
}

export async function findJeuById(id) {
  const { rows } = await query('SELECT * FROM jeux WHERE id=$1', [id])
  return rows[0]
}

export async function createJeu({ nom, genre, description }) {
  const { rows } = await query(
    'INSERT INTO jeux (nom, genre, description) VALUES ($1,$2,$3) RETURNING *',
    [nom, genre || null, description || null],
  )
  return rows[0]
}

export async function updateJeu({ id, nom, genre, description, actif }) {
  const { rows } = await query(
    `UPDATE jeux
     SET nom = COALESCE($2, nom),
         genre = COALESCE($3, genre),
         description = COALESCE($4, description),
         actif = COALESCE($5, actif)
     WHERE id=$1 RETURNING *`,
    [id, nom || null, genre === undefined ? null : genre, description === undefined ? null : description, actif === undefined ? null : actif],
  )
  return rows[0]
}

export async function deactivateJeu(id) {
  const { rows } = await query('UPDATE jeux SET actif=FALSE WHERE id=$1 RETURNING id, nom, actif', [
    id,
  ])
  return rows[0]
}

export async function createTarification({ consoleId, dureeMinutes, prix, bossId = null }) {
  const { rows } = await query(
    `INSERT INTO tarifications (console_id, duree_minutes, prix, boss_id)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [consoleId, dureeMinutes, prix, bossId],
  )
  return rows[0]
}

export async function findTarificationById(id) {
  const { rows } = await query('SELECT * FROM tarifications WHERE id=$1', [id])
  return rows[0]
}

export async function updateTarification({ id, dureeMinutes, prix }) {
  const { rows } = await query(
    `UPDATE tarifications
     SET duree_minutes = COALESCE($2, duree_minutes),
         prix = COALESCE($3, prix)
     WHERE id=$1 RETURNING *`,
    [id, dureeMinutes || null, prix === undefined ? null : prix],
  )
  return rows[0]
}

export async function deleteTarification(id) {
  const { rows } = await query(
    'DELETE FROM tarifications WHERE id=$1 RETURNING id, duree_minutes, prix',
    [id],
  )
  return rows[0]
}

export async function listTarificationsByConsole(consoleId, tenantId = null) {
  const params = [consoleId]
  let scope = ''
  if (tenantId !== null && tenantId !== undefined) {
    params.push(tenantId)
    scope = `AND (boss_id IS NULL OR boss_id = $${params.length})`
  }
  const { rows } = await query(
    `SELECT * FROM tarifications
     WHERE console_id=$1 AND actif=TRUE ${scope}
     ORDER BY (boss_id IS NULL), duree_minutes ASC
     LIMIT 200`,
    params,
  )
  return rows
}

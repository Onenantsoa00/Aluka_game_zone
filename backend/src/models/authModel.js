import { query } from '../config/db.js'

export async function findUserForLogin(username) {
  const { rows } = await query(
    `SELECT u.id, u.nom, u.username, u.mot_de_passe, u.actif, r.nom AS role
     FROM utilisateurs u
     JOIN roles r ON r.id = u.role_id
     WHERE u.username = $1`,
    [username],
  )
  return rows[0]
}

export async function findUserProfileById(userId) {
  const { rows } = await query(
    `SELECT u.id, u.nom, u.username, u.telephone, u.actif, r.nom AS role
     FROM utilisateurs u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [userId],
  )
  return rows[0]
}

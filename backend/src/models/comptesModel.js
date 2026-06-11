import { query } from '../config/db.js'

export async function listComptes() {
  const { rows } = await query(
    `SELECT u.id, u.nom, u.username, u.telephone, u.actif, r.nom AS role
     FROM utilisateurs u JOIN roles r ON r.id=u.role_id ORDER BY u.id DESC`,
  )
  return rows
}

export async function findRoleByName(role) {
  const { rows } = await query('SELECT id, nom FROM roles WHERE nom=$1', [role])
  return rows[0]
}

export async function createCompte({ nom, username, hash, telephone, roleId, creePar }) {
  const { rows } = await query(
    `INSERT INTO utilisateurs (nom, username, mot_de_passe, telephone, role_id, cree_par)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, nom, username, telephone, actif`,
    [nom, username, hash, telephone || null, roleId, creePar],
  )
  return rows[0]
}

export async function updateCompteActif(id, actif) {
  const { rows } = await query('UPDATE utilisateurs SET actif=$1 WHERE id=$2 RETURNING id, actif', [
    actif,
    id,
  ])
  return rows[0]
}

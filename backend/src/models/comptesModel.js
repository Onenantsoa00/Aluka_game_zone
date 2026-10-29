import { query } from '../config/db.js'

/**
 * `ownerId` non nul = vue restreinte du boss : son propre compte et les comptes
 * qu'il a crees (cloisonnement O4). Le jeton n'a pas acces a cette liste.
 */
export async function listComptes({ ownerId = null, limit = 200, offset = 0 } = {}) {
  const params = []
  let where = ''
  if (ownerId) {
    params.push(ownerId)
    where = `WHERE (u.id = $${params.length} OR u.cree_par = $${params.length})`
  }
  params.push(limit, offset)
  const { rows } = await query(
    `SELECT u.id, u.nom, u.username, u.telephone, u.actif, u.cree_par, r.nom AS role,
            u.created_at
     FROM utilisateurs u JOIN roles r ON r.id=u.role_id
     ${where}
     ORDER BY u.id DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  )
  return rows
}

export async function findCompteById(id) {
  const { rows } = await query(
    `SELECT u.id, u.nom, u.username, u.telephone, u.actif, u.cree_par, r.nom AS role
     FROM utilisateurs u JOIN roles r ON r.id=u.role_id
     WHERE u.id=$1`,
    [id],
  )
  return rows[0]
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
  const { rows } = await query(
    `UPDATE utilisateurs
     SET actif=$2,
         token_version = CASE WHEN $2 THEN token_version ELSE token_version + 1 END,
         updated_at=CURRENT_TIMESTAMP
     WHERE id=$1
     RETURNING id, actif`,
    [id, actif],
  )
  return rows[0]
}

export async function updateCompte({ id, nom, telephone, roleId, hash }) {
  const { rows } = await query(
    `UPDATE utilisateurs
     SET nom = COALESCE($2, nom),
         telephone = COALESCE($3, telephone),
         role_id = COALESCE($4, role_id),
         mot_de_passe = COALESCE($5, mot_de_passe),
         -- Un simple changement de nom ne doit pas deconnecter l'utilisateur ;
         -- un changement de role ou de mot de passe revoque ses jetons.
         token_version = token_version + CASE WHEN $4 IS NOT NULL OR $5 IS NOT NULL THEN 1 ELSE 0 END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id=$1
     RETURNING id, nom, username, telephone, actif`,
    [id, nom || null, telephone === undefined ? null : telephone, roleId || null, hash || null],
  )
  return rows[0]
}

export async function deactivateCompte(id) {
  const { rows } = await query(
    `UPDATE utilisateurs
     SET actif=FALSE, token_version=token_version + 1, updated_at=CURRENT_TIMESTAMP
     WHERE id=$1 RETURNING id, nom, username, actif`,
    [id],
  )
  return rows[0]
}

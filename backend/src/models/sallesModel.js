import { query } from '../config/db.js'
import { tenantFilter } from '../utils/tenant.js'

export async function listSallesActives(tenantId = null) {
  const params = []
  const scope = tenantFilter(params, tenantId)
  const { rows } = await query(
    `SELECT s.*, u.nom AS boss_nom
     FROM salles s JOIN utilisateurs u ON u.id=s.boss_id
     WHERE s.actif=TRUE AND ${scope}
     ORDER BY s.id DESC
     LIMIT 500`,
    params,
  )
  return rows
}

export async function findSalleById(id) {
  const { rows } = await query('SELECT * FROM salles WHERE id=$1', [id])
  return rows[0]
}

export async function createSalle({ nom, adresse, bossId }) {
  const { rows } = await query(
    'INSERT INTO salles (nom, adresse, boss_id) VALUES ($1,$2,$3) RETURNING *',
    [nom, adresse || null, bossId],
  )
  return rows[0]
}

export async function updateSalle({ id, nom, adresse, actif }) {
  const { rows } = await query(
    `UPDATE salles
     SET nom = COALESCE($2, nom),
         adresse = COALESCE($3, adresse),
         actif = COALESCE($4, actif)
     WHERE id=$1 RETURNING *`,
    [id, nom || null, adresse === undefined ? null : adresse, actif === undefined ? null : actif],
  )
  return rows[0]
}

export async function countActiveSessionsInSalle(salleId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total
     FROM sessions_jeux sj
     JOIN postes p ON p.id=sj.poste_id
     WHERE p.salle_id=$1 AND sj.statut IN ('en_cours','pause')`,
    [salleId],
  )
  return rows[0].total
}

export async function deactivateSalle(id) {
  // Les postes de la salle sont desactives avec elle : ils ne doivent plus
  // apparaitre dans le selecteur de session.
  await query('UPDATE postes SET actif=FALSE, disponible=FALSE WHERE salle_id=$1', [id])
  const { rows } = await query(
    'UPDATE salles SET actif=FALSE WHERE id=$1 RETURNING id, nom, actif',
    [id],
  )
  return rows[0]
}

import { query } from '../config/db.js'

export async function listAudit({ limit = 100, offset = 0, action = null } = {}) {
  const params = []
  let where = ''
  if (action) {
    params.push(action)
    where = `WHERE a.action = $${params.length}`
  }
  params.push(limit, offset)
  const { rows } = await query(
    `SELECT a.*, u.nom AS utilisateur_nom, u.username
     FROM journal_audit a
     LEFT JOIN utilisateurs u ON u.id=a.utilisateur_id
     ${where}
     ORDER BY a.id DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  )
  return rows
}

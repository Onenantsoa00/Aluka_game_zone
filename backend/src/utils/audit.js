import { query } from '../config/db.js'

/**
 * Enregistre une action sensible dans journal_audit (P1.6).
 * Ne casse jamais la requete metier : une erreur d'audit est seulement loguee.
 */
export async function logAudit({ userId, action, entite, entiteId, details, ip }, client = null) {
  const run = client ? (text, params) => client.query(text, params) : query
  try {
    await run(
      `INSERT INTO journal_audit (utilisateur_id, action, entite, entite_id, details, ip)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [userId || null, action, entite, entiteId || null, details ? JSON.stringify(details) : null, ip || null],
    )
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Impossible d\'ecrire le journal d\'audit', error)
  }
}

export function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length) return forwarded.split(',')[0].trim()
  return req.ip || null
}

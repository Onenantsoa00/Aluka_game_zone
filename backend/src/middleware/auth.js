import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { query } from '../config/db.js'

/**
 * Verifie le JWT puis son etat cote base : un jeton revoque (logout,
 * desactivation du compte) est refuse meme s'il n'a pas encore expire (O10).
 */
export async function requireAuth(req, res, next) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null

  if (!token) return res.status(401).json({ message: 'Token manquant' })

  let payload
  try {
    payload = jwt.verify(token, env.jwtSecret)
  } catch {
    return res.status(401).json({ message: 'Token invalide ou expire' })
  }

  try {
    const { rows } = await query(
      `SELECT u.id, u.username, u.actif, u.token_version, r.nom AS role
       FROM utilisateurs u JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1`,
      [payload.id],
    )
    const user = rows[0]
    if (!user || !user.actif) return res.status(401).json({ message: 'Compte desactive' })
    if ((payload.ver ?? 0) !== user.token_version) {
      return res.status(401).json({ message: 'Session revoquee, reconnectez-vous' })
    }
    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      ver: user.token_version,
    }
    return next()
  } catch (error) {
    return next(error)
  }
}

export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Non authentifie' })
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acces refuse' })
    }
    next()
  }
}

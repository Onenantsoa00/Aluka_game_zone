import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null

  if (!token) return res.status(401).json({ message: 'Token manquant' })

  try {
    req.user = jwt.verify(token, env.jwtSecret)
    next()
  } catch {
    res.status(401).json({ message: 'Token invalide' })
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

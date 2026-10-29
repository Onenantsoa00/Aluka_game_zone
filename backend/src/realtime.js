import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { env } from './config/env.js'
import { query } from './config/db.js'

let io = null

function corsOptions() {
  if (env.corsOrigin === '*') return { origin: '*' }
  return { origin: env.corsOrigin.split(',').map((value) => value.trim()) }
}

/**
 * Temps réel (O13 / P1.8). Le client se connecte avec son JWT ; le jeton est
 * verifie en base (compte actif + token_version) comme pour l'API REST.
 */
export function initRealtime(httpServer) {
  io = new Server(httpServer, { cors: corsOptions() })

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      const payload = jwt.verify(token, env.jwtSecret)
      const { rows } = await query(
        `SELECT u.actif, u.token_version, r.nom AS role
         FROM utilisateurs u JOIN roles r ON r.id=u.role_id
         WHERE u.id=$1`,
        [payload.id],
      )
      const user = rows[0]
      if (!user || !user.actif || (payload.ver ?? 0) !== user.token_version) {
        return next(new Error('unauthorized'))
      }
      socket.user = { id: payload.id, role: user.role }
      return next()
    } catch {
      return next(new Error('unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    socket.join('operations')
  })

  return io
}

/** Diffuse un evenement a tous les postes connectes. */
export function emitEvent(name, payload = {}) {
  if (!io) return
  io.emit(name, payload)
}

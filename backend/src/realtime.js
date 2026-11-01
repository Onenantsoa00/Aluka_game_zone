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
        `SELECT u.actif, u.token_version, u.cree_par, r.nom AS role
         FROM utilisateurs u JOIN roles r ON r.id=u.role_id
         WHERE u.id=$1`,
        [payload.id],
      )
      const user = rows[0]
      if (!user || !user.actif || (payload.ver ?? 0) !== user.token_version) {
        return next(new Error('unauthorized'))
      }
      const tenantId =
        user.role === 'admin' ? null : user.role === 'boss' ? payload.id : (user.cree_par ?? -1)
      socket.user = { id: payload.id, role: user.role, tenantId }
      return next()
    } catch {
      return next(new Error('unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    // Chaque connexion rejoint uniquement son perimetre (P2.11) : un boss ne
    // recoit jamais les evenements d'une autre salle. L'admin rejoint la room
    // plateforme et voit tous les flux.
    const tenantId = socket.user?.tenantId
    socket.join(tenantId ? `boss:${tenantId}` : 'admin')
  })

  return io
}

/**
 * Diffuse un evenement au boss concerne et aux admins. `bossId` null = admin
 * uniquement (une action plateforme ne doit pas fuiter chez les locataires).
 */
export function emitEvent(name, payload = {}, bossId = null) {
  if (!io) return
  if (bossId == null) {
    io.to('admin').emit(name, payload)
    return
  }
  io.to(`boss:${bossId}`).to('admin').emit(name, payload)
}

export function emitToBoss(bossId, name, payload = {}) {
  emitEvent(name, payload, bossId)
}

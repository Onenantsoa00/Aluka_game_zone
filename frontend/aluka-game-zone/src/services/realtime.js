import { io } from 'socket.io-client'
import { api } from './api'

let socket = null
let socketToken = null

/**
 * Connexion socket.io unique, authentifiee par le JWT (O13 / P1.8).
 * Les pages s'abonnent aux evenements `session:changed`, `postes:changed`
 * et `sessions:refresh`.
 */
export function getRealtimeSocket(token) {
  if (!token) return null
  if (socket && socketToken === token) return socket

  if (socket) socket.disconnect()
  socketToken = token
  socket = io(api.serverUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionDelayMax: 10000,
  })
  return socket
}

export function closeRealtime() {
  if (socket) socket.disconnect()
  socket = null
  socketToken = null
}

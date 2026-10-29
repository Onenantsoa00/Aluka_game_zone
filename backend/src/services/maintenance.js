import { env } from '../config/env.js'
import { closeSessionsAtClosing } from '../models/sessionsModel.js'
import { emitEvent } from '../realtime.js'

let timer = null

/**
 * Cloture les sessions encore actives a la derniere heure de fermeture passee
 * et les marque « a verifier » (P0.5 / O6). Tourne au demarrage puis
 * periodiquement : les sessions fantomes sont donc traitees automatiquement.
 */
export async function runMaintenance() {
  try {
    const closed = await closeSessionsAtClosing(env.closingHour)
    if (closed.length) {
      // eslint-disable-next-line no-console
      console.log(`Cloture automatique de ${closed.length} session(s) a verifier`)
      emitEvent('sessions:refresh', { reason: 'closing', count: closed.length })
      emitEvent('postes:changed', {})
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Echec du job de maintenance', error)
  }
}

export function startMaintenance() {
  runMaintenance()
  timer = setInterval(runMaintenance, env.maintenanceIntervalMinutes * 60_000)
  if (timer.unref) timer.unref()
}

export function stopMaintenance() {
  if (timer) clearInterval(timer)
  timer = null
}

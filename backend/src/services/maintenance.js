import { env } from '../config/env.js'
import { closeSessionsAtClosing } from '../models/sessionsModel.js'
import { emitEvent } from '../realtime.js'
import { runRelances } from './abonnement.js'

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
      const parBoss = new Map()
      for (const row of closed) {
        if (row.boss_id) parBoss.set(row.boss_id, (parBoss.get(row.boss_id) || 0) + 1)
      }
      for (const [bossId, count] of parBoss) {
        emitEvent('sessions:refresh', { reason: 'closing', count }, bossId)
        emitEvent('postes:changed', {}, bossId)
      }
      emitEvent('sessions:refresh', { reason: 'closing', count: closed.length })
    }

    // Relances d'abonnement (J-7, J-3, J-1, expiration) : idempotent.
    const relances = await runRelances()
    for (const relance of relances) {
      emitEvent(
        'abonnement:relance',
        { type: relance.type, message: relance.message },
        relance.boss_id,
      )
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

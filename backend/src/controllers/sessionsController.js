import { withTransaction } from '../config/db.js'
import { emitEvent } from '../realtime.js'
import { computeAmountByTarif, computeRemboursement } from '../services/sessionPricing.js'
import {
  addSessionPayment,
  addTransaction,
  closeOpenPauses,
  countSessions,
  createSession,
  finalizeSession,
  findActiveSessionForPoste,
  getPauseMinutes,
  getTarifByPoste,
  listSessions,
  lockPoste,
  lockSession,
  pauseSession,
  resumeSession,
  setPosteStatus,
  verifySession,
  freePosteIfIdle,
} from '../models/sessionsModel.js'
import { clientIp, logAudit } from '../utils/audit.js'
import { httpError } from '../utils/errors.js'
import { assertTenant, bossIdForPoste, bossIdForSession } from '../utils/tenant.js'

const ACTIVE_STATUSES = ['en_cours', 'pause']
const ALLOWED_STATUSES = ['en_cours', 'pause', 'terminee', 'annulee']

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100

export async function getSessions(req, res) {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50))
  const offset = Math.max(0, Number(req.query.offset) || 0)
  const statut = ALLOWED_STATUSES.includes(req.query.statut) ? req.query.statut : null
  const aVerifier =
    req.query.aVerifier === 'true' || req.query.aVerifier === '1' ? true : null

  const [rows, total] = await Promise.all([
    listSessions({ limit, offset, statut, aVerifier, tenantId: req.user.tenantId }),
    countSessions({ statut, aVerifier, tenantId: req.user.tenantId }),
  ])
  res.set('X-Total-Count', String(total))
  return res.json(rows)
}

/** Ecran « sessions a verifier » (P0.5). */
export async function getSessionsAVerifier(req, res) {
  const rows = await listSessions({ aVerifier: true, limit: 100, tenantId: req.user.tenantId })
  return res.json(rows)
}

export async function getSessionsCount(req, res) {
  const statut = ALLOWED_STATUSES.includes(req.query.statut) ? req.query.statut : null
  const total = await countSessions({ statut, tenantId: req.user.tenantId })
  return res.json({ total })
}

export async function startSession(req, res) {
  const { posteId, jeuId } = req.body || {}
  const minutes = Number(req.body?.totalMinutesPaid)

  if (!posteId) throw httpError(400, 'Poste requis')
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) {
    throw httpError(400, 'Minutes payees invalides (1 a 1440)')
  }

  const bossId = await bossIdForPoste(posteId)
  assertTenant(req.user, bossId, 'Poste')

  const session = await withTransaction(async (client) => {
    const poste = await lockPoste(client, posteId)
    if (!poste) throw httpError(404, 'Poste introuvable')
    if (!poste.actif || !poste.disponible) {
      throw httpError(409, 'Ce poste est desactive ou indisponible')
    }

    const active = await findActiveSessionForPoste(client, posteId)
    if (active) {
      throw httpError(409, `Ce poste a deja une session active (#${active.id})`)
    }

    if (jeuId) {
      const { rows } = await client.query('SELECT id FROM jeux WHERE id=$1', [jeuId])
      if (!rows[0]) throw httpError(400, 'Jeu introuvable')
    }

    const tarif = await getTarifByPoste(posteId, client)
    if (!tarif) throw httpError(400, 'Aucune tarification active pour ce poste')

    const montantInitial = round2(
      computeAmountByTarif(minutes, Number(tarif.duree_minutes), Number(tarif.prix)),
    )

    const created = await createSession(client, {
      posteId,
      jeuId,
      jetonId: req.user.id,
      montantInitial,
    })
    // Le paiement est encaisse au demarrage : les recettes proviennent des
    // transactions, pas du montant des sessions (O3).
    await addTransaction(
      {
        sessionId: created.id,
        montant: montantInitial,
        type: 'encaissement',
        utilisateurId: req.user.id,
      },
      client,
    )
    await setPosteStatus('occupe', posteId, client)
    return created
  })

  await logAudit({
    userId: req.user.id,
    action: 'session.start',
    entite: 'session',
    entiteId: session.id,
    details: { posteId, jeuId: jeuId || null, minutes, montant: session.montant_total },
    ip: clientIp(req),
  })

  emitEvent('session:changed', { type: 'start', sessionId: session.id, posteId }, bossId)
  emitEvent('postes:changed', { posteId, statut: 'occupe' }, bossId)
  return res.status(201).json(session)
}

export async function pauseCurrentSession(req, res) {
  const bossId = await bossIdForSession(req.params.id)
  assertTenant(req.user, bossId, 'Session')
  const row = await pauseSession(req.params.id)
  await logAudit({
    userId: req.user.id,
    action: 'session.pause',
    entite: 'session',
    entiteId: row.id,
    ip: clientIp(req),
  })
  emitEvent('session:changed', { type: 'pause', sessionId: row.id, posteId: row.poste_id }, bossId)
  emitEvent('postes:changed', { posteId: row.poste_id, statut: 'pause' }, bossId)
  return res.json(row)
}

export async function resumeCurrentSession(req, res) {
  const bossId = await bossIdForSession(req.params.id)
  assertTenant(req.user, bossId, 'Session')
  const row = await resumeSession(req.params.id)
  await logAudit({
    userId: req.user.id,
    action: 'session.resume',
    entite: 'session',
    entiteId: row.id,
    ip: clientIp(req),
  })
  emitEvent('session:changed', { type: 'resume', sessionId: row.id, posteId: row.poste_id }, bossId)
  emitEvent('postes:changed', { posteId: row.poste_id, statut: 'occupe' }, bossId)
  return res.json(row)
}

export async function stopSession(req, res) {
  const { coupureElectricite = false } = req.body || {}
  const sessionId = req.params.id
  const bossId = await bossIdForSession(sessionId)
  assertTenant(req.user, bossId, 'Session')

  const { updated, montantARendre, montantTotal } = await withTransaction(async (client) => {
    const session = await lockSession(client, sessionId)
    if (!session) throw httpError(404, 'Session introuvable')
    // O2 : un arret rejoue ne doit jamais re-encaisser.
    if (!ACTIVE_STATUSES.includes(session.statut)) {
      throw httpError(409, 'Cette session est deja terminee')
    }

    const pauseMinutes = await getPauseMinutes(sessionId, client)
    const { rows } = await client.query(
      'SELECT EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - $1::timestamp))::int / 60 AS minutes',
      [session.heure_debut],
    )
    const grossMinutes = Number(rows[0].minutes)
    const elapsedMinutes = Math.max(0, grossMinutes - pauseMinutes)

    const tarif = await getTarifByPoste(session.poste_id, client)
    if (!tarif) throw httpError(400, 'Tarification manquante')

    const total = Number(session.montant_total)
    const tarifMinutes = Number(tarif.duree_minutes)
    const tarifPrix = Number(tarif.prix)
    const paidEquivalentMinutes = tarifPrix > 0 ? (total / tarifPrix) * tarifMinutes : 0
    const refund = coupureElectricite
      ? round2(computeRemboursement(paidEquivalentMinutes, elapsedMinutes, tarifMinutes, tarifPrix))
      : 0

    await closeOpenPauses(client, sessionId)

    const finalized = await finalizeSession(client, {
      sessionId,
      elapsedMinutes,
      montantARendre: refund,
      coupureElectricite: Boolean(coupureElectricite),
    })

    if (refund > 0) {
      await addTransaction(
        {
          sessionId,
          montant: refund,
          type: 'remboursement',
          utilisateurId: req.user.id,
        },
        client,
      )
    }

    await freePosteIfIdle(client, session.poste_id)
    return { updated: finalized, montantARendre: refund, montantTotal: total }
  })

  await logAudit({
    userId: req.user.id,
    action: 'session.stop',
    entite: 'session',
    entiteId: updated.id,
    details: {
      montant: montantTotal,
      montantARendre,
      coupureElectricite: Boolean(coupureElectricite),
    },
    ip: clientIp(req),
  })

  emitEvent(
    'session:changed',
    {
      type: 'stop',
      sessionId: updated.id,
      posteId: updated.poste_id,
    },
    bossId,
  )
  emitEvent('postes:changed', { posteId: updated.poste_id, statut: 'libre' }, bossId)
  return res.json(updated)
}

/**
 * Paiement partiel : encaisse un montant complementaire sur une session
 * active (P1.10).
 */
export async function addSessionPaymentController(req, res) {
  const montant = round2(req.body?.montant)
  if (!Number.isFinite(montant) || montant <= 0) {
    throw httpError(400, 'Montant invalide')
  }
  const bossId = await bossIdForSession(req.params.id)
  assertTenant(req.user, bossId, 'Session')
  const row = await addSessionPayment(req.params.id, montant, req.user.id)
  await logAudit({
    userId: req.user.id,
    action: 'session.payment',
    entite: 'session',
    entiteId: row.id,
    details: { montant },
    ip: clientIp(req),
  })
  emitEvent('session:changed', { type: 'payment', sessionId: row.id, posteId: row.poste_id }, bossId)
  return res.json(row)
}

/** Prolongation : ajoute des minutes payees a une session active (P1.10). */
export async function extendSession(req, res) {
  const minutes = Number(req.body?.minutes)
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) {
    throw httpError(400, 'Minutes invalides (1 a 1440)')
  }
  const bossId = await bossIdForSession(req.params.id)
  assertTenant(req.user, bossId, 'Session')

  const { updated, montant } = await withTransaction(async (client) => {
    const session = await lockSession(client, req.params.id)
    if (!session) throw httpError(404, 'Session introuvable')
    if (!ACTIVE_STATUSES.includes(session.statut)) {
      throw httpError(409, 'Cette session est deja terminee')
    }
    const tarif = await getTarifByPoste(session.poste_id, client)
    if (!tarif) throw httpError(400, 'Tarification manquante')
    const amount = round2(
      computeAmountByTarif(minutes, Number(tarif.duree_minutes), Number(tarif.prix)),
    )
    await addTransaction(
      { sessionId: session.id, montant: amount, type: 'encaissement', utilisateurId: req.user.id },
      client,
    )
    const result = await client.query(
      `UPDATE sessions_jeux SET montant_total = montant_total + $2
       WHERE id=$1 RETURNING *`,
      [session.id, amount],
    )
    return { updated: result.rows[0], montant: amount }
  })
  await logAudit({
    userId: req.user.id,
    action: 'session.extend',
    entite: 'session',
    entiteId: updated.id,
    details: { minutes, montant },
    ip: clientIp(req),
  })
  emitEvent(
    'session:changed',
    { type: 'extend', sessionId: updated.id, posteId: updated.poste_id },
    bossId,
  )
  return res.json({ ...updated, montant_ajoute: montant })
}

/** Acquitte une session cloturee automatiquement (P0.5). */
export async function verifySessionController(req, res) {
  const bossId = await bossIdForSession(req.params.id)
  assertTenant(req.user, bossId, 'Session')
  const row = await verifySession(req.params.id, req.user.id)
  await logAudit({
    userId: req.user.id,
    action: 'session.verify',
    entite: 'session',
    entiteId: row.id,
    ip: clientIp(req),
  })
  emitEvent('session:changed', { type: 'verify', sessionId: row.id }, bossId)
  return res.json(row)
}

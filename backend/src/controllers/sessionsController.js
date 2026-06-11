import { computeAmountByTarif, computeRemboursement } from '../services/sessionPricing.js'
import {
  addTransaction,
  createSession,
  finalizeSession,
  findSessionById,
  getElapsedGrossMinutes,
  getPauseMinutes,
  getTarifByPoste,
  listSessions,
  pauseSession,
  resumeSession,
  setPosteStatus,
} from '../models/sessionsModel.js'

export async function getSessions(req, res) {
  const rows = await listSessions()
  return res.json(rows)
}

export async function startSession(req, res) {
  const { posteId, jeuId, totalMinutesPaid } = req.body
  const tarif = await getTarifByPoste(posteId)
  if (!tarif) return res.status(400).json({ message: 'Aucune tarification active pour ce poste' })

  const montantInitial = computeAmountByTarif(totalMinutesPaid, tarif.duree_minutes, Number(tarif.prix))
  const row = await createSession({ posteId, jeuId, jetonId: req.user.id, montantInitial })
  await setPosteStatus(posteId, 'occupe')
  return res.status(201).json(row)
}

export async function pauseCurrentSession(req, res) {
  const row = await pauseSession(req.params.id)
  return res.json(row)
}

export async function resumeCurrentSession(req, res) {
  const row = await resumeSession(req.params.id)
  return res.json(row)
}

export async function stopSession(req, res) {
  const { coupureElectricite = false } = req.body
  const session = await findSessionById(req.params.id)
  if (!session) return res.status(404).json({ message: 'Session introuvable' })

  const pauseMinutes = await getPauseMinutes(session.id)
  const grossMinutes = await getElapsedGrossMinutes(session.heure_debut)
  const elapsedMinutes = Math.max(0, grossMinutes - pauseMinutes)

  const tarif = await getTarifByPoste(session.poste_id)
  if (!tarif) return res.status(400).json({ message: 'Tarification manquante' })

  const montantTotal = Number(session.montant_total)
  const tarifMinutes = Number(tarif.duree_minutes)
  const tarifPrix = Number(tarif.prix)
  const paidEquivalentMinutes = (montantTotal / tarifPrix) * tarifMinutes
  const montantARendre = coupureElectricite
    ? computeRemboursement(paidEquivalentMinutes, elapsedMinutes, tarifMinutes, tarifPrix)
    : 0

  const updated = await finalizeSession({
    sessionId: session.id,
    elapsedMinutes,
    montantARendre,
    coupureElectricite,
  })

  await setPosteStatus(session.poste_id, 'libre')
  await addTransaction({
    sessionId: session.id,
    montant: montantTotal,
    type: 'encaissement',
    utilisateurId: req.user.id,
  })

  if (montantARendre > 0) {
    await addTransaction({
      sessionId: session.id,
      montant: montantARendre,
      type: 'remboursement',
      utilisateurId: req.user.id,
    })
  }

  return res.json(updated)
}

import {
  addParticipant,
  createTournoi,
  getTournoiDetail,
  listTournois,
  recordResult,
  removeParticipant,
  resetTournoi,
  startTournoi,
} from '../models/tournoisModel.js'
import { clientIp, logAudit } from '../utils/audit.js'
import { httpError } from '../utils/errors.js'
import { assertSalleAccess, assertTenant, bossIdForTournoi } from '../utils/tenant.js'
import { emitEvent } from '../realtime.js'

async function loadTournoi(req, id = req.params.id) {
  const bossId = await bossIdForTournoi(id)
  assertTenant(req.user, bossId, 'Tournoi')
  const detail = await getTournoiDetail(id, req.user.tenantId)
  return { ...detail, bossId }
}

export async function getTournois(req, res) {
  const rows = await listTournois(req.user.tenantId)
  return res.json(rows)
}

export async function getTournoi(req, res) {
  return res.json(await loadTournoi(req))
}

export async function postTournoi(req, res) {
  const { salleId, jeuId, nom, mise, recompense, dateTournoi } = req.body || {}
  if (!salleId) throw httpError(400, 'Salle requise')
  if (!nom?.trim()) throw httpError(400, 'Nom du tournoi requis')
  await assertSalleAccess(req.user, salleId)
  if (mise !== undefined && mise !== null && (Number(mise) < 0 || !Number.isFinite(Number(mise)))) {
    throw httpError(400, 'Mise invalide')
  }
  if (dateTournoi && Number.isNaN(Date.parse(dateTournoi))) {
    throw httpError(400, 'Date invalide')
  }

  const row = await createTournoi({
    salleId,
    jeuId,
    nom: nom.trim(),
    mise: Number(mise) || 0,
    recompense,
    dateTournoi,
  })
  await logAudit({
    userId: req.user.id,
    action: 'tournoi.create',
    entite: 'tournoi',
    entiteId: row.id,
    details: { nom: row.nom, salleId },
    ip: clientIp(req),
  })
  return res.status(201).json(await getTournoiDetail(row.id, req.user.tenantId))
}

export async function postParticipant(req, res) {
  const { tournoi } = await loadTournoi(req)
  const row = await addParticipant({
    tournoi,
    nomJoueur: req.body?.nomJoueur,
    telephone: req.body?.telephone,
  })
  await logAudit({
    userId: req.user.id,
    action: 'tournoi.inscription',
    entite: 'participant_tournoi',
    entiteId: row.id,
    details: { tournoiId: tournoi.id, nomJoueur: row.nom_joueur },
    ip: clientIp(req),
  })
  emitEvent('tournoi:changed', { tournoiId: tournoi.id }, tournoi.boss_id)
  return res.status(201).json(await getTournoiDetail(tournoi.id, req.user.tenantId))
}

export async function deleteParticipant(req, res) {
  const { tournoi } = await loadTournoi(req)
  await removeParticipant(tournoi.id, req.params.participantId)
  await logAudit({
    userId: req.user.id,
    action: 'tournoi.desinscription',
    entite: 'participant_tournoi',
    entiteId: Number(req.params.participantId),
    details: { tournoiId: tournoi.id },
    ip: clientIp(req),
  })
  emitEvent('tournoi:changed', { tournoiId: tournoi.id }, tournoi.boss_id)
  return res.json(await getTournoiDetail(tournoi.id, req.user.tenantId))
}

export async function postDemarrer(req, res) {
  const { tournoi, bossId } = await loadTournoi(req)
  await startTournoi(tournoi.id)
  await logAudit({
    userId: req.user.id,
    action: 'tournoi.demarrer',
    entite: 'tournoi',
    entiteId: tournoi.id,
    details: { nom: tournoi.nom },
    ip: clientIp(req),
  })
  emitEvent('tournoi:changed', { tournoiId: tournoi.id, statut: 'en_cours' }, bossId)
  return res.json(await getTournoiDetail(tournoi.id, req.user.tenantId))
}

export async function postResultat(req, res) {
  const { tournoi, bossId } = await loadTournoi(req)
  const result = await recordResult(req.params.matchId, {
    score1: req.body?.score1,
    score2: req.body?.score2,
  })
  await logAudit({
    userId: req.user.id,
    action: 'tournoi.resultat',
    entite: 'match_tournoi',
    entiteId: Number(req.params.matchId),
    details: {
      tournoiId: tournoi.id,
      score1: req.body?.score1,
      score2: req.body?.score2,
      champion: result.champion,
    },
    ip: clientIp(req),
  })
  emitEvent(
    'tournoi:changed',
    { tournoiId: tournoi.id, champion: result.champion },
    bossId,
  )
  const detail = await getTournoiDetail(tournoi.id, req.user.tenantId)
  return res.json({ ...detail, championAtteint: result.champion })
}

export async function postReinitialiser(req, res) {
  const { tournoi, bossId } = await loadTournoi(req)
  if (tournoi.statut === 'inscriptions') {
    throw httpError(409, 'Le tournoi n’a pas encore démarré')
  }
  await resetTournoi(tournoi.id)
  await logAudit({
    userId: req.user.id,
    action: 'tournoi.reinitialiser',
    entite: 'tournoi',
    entiteId: tournoi.id,
    details: { nom: tournoi.nom },
    ip: clientIp(req),
  })
  emitEvent('tournoi:changed', { tournoiId: tournoi.id, statut: 'inscriptions' }, bossId)
  return res.json(await getTournoiDetail(tournoi.id, req.user.tenantId))
}

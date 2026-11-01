import { query } from '../config/db.js'
import { emitEvent } from '../realtime.js'
import {
  ABONNEMENT,
  abonnementInfosPaiement,
  activerManuellement,
  createDemande,
  getEtatAbonnement,
  getNotifications,
  listAbonnementsBoss,
  listDemandes,
  markNotificationsRead,
  refuserDemande,
  validerDemande,
} from '../services/abonnement.js'
import { setBossActif } from '../models/abonnementsModel.js'
import { clientIp, logAudit } from '../utils/audit.js'
import { httpError } from '../utils/errors.js'
import { isPlatformAdmin } from '../utils/tenant.js'

/** Tableau de bord admin : bosses, etats, demandes en attente, revenus. */
export async function getAbonnements(req, res) {
  if (!isPlatformAdmin(req.user)) throw httpError(403, 'Acces reserve a l’administrateur')
  const [bosses, demandes, revenus] = await Promise.all([
    listAbonnementsBoss(),
    listDemandes({ limit: 200 }),
    query(
      `SELECT COALESCE(SUM(montant), 0) AS total, COUNT(*)::int AS nombre
       FROM abonnements
       WHERE source IN ('mobile_money', 'manuel')
         AND date_debut >= date_trunc('month', CURRENT_DATE)`,
    ),
  ])

  const actifs = bosses.filter((row) => row.jours_restants !== null)
  const essais = actifs.filter((row) => row.source === 'essai')
  const expires = bosses.filter((row) => row.jours_restants === null)

  return res.json({
    bosses,
    demandes,
    infos: abonnementInfosPaiement(),
    stats: {
      totalBosses: bosses.length,
      actifs: actifs.length,
      essais: essais.length,
      expires: expires.length,
      enAttente: demandes.filter((row) => row.statut === 'en_attente').length,
      revenusMois: Number(revenus.rows[0].total),
      paiementsMois: revenus.rows[0].nombre,
    },
  })
}

export async function getDemandes(req, res) {
  const statut = ['en_attente', 'validee', 'refusee'].includes(req.query.statut)
    ? req.query.statut
    : null
  return res.json(await listDemandes({ statut, limit: 200 }))
}

/** Activation manuelle (30 jours) sans reference de paiement. */
export async function postAbonnement(req, res) {
  const { bossId, montant, commentaire } = req.body || {}
  if (!bossId) throw httpError(400, 'Boss requis')
  const row = await activerManuellement({
    bossId,
    montant,
    commentaire,
    adminId: req.user.id,
  })
  await logAudit({
    userId: req.user.id,
    action: 'abonnement.activer',
    entite: 'abonnement',
    entiteId: row.id,
    details: { bossId, montant: row.montant },
    ip: clientIp(req),
  })
  emitEvent('abonnement:activated', { bossId, dateFin: row.date_fin }, bossId)
  return res.status(201).json(row)
}

export async function patchBossBlocage(req, res) {
  const actif = Boolean(req.body?.actif)
  const row = await setBossActif(req.params.bossId, actif)
  if (!row) throw httpError(404, 'Boss introuvable')
  await logAudit({
    userId: req.user.id,
    action: actif ? 'compte.unblock' : 'compte.block',
    entite: 'utilisateur',
    entiteId: Number(req.params.bossId),
    details: { raison: actif ? 'deblocage admin' : 'blocage abonnement' },
    ip: clientIp(req),
  })
  emitEvent('abonnement:blocked', { actif }, Number(req.params.bossId))
  return res.json(row)
}

export async function postValiderDemande(req, res) {
  const abonnement = await validerDemande(req.params.id, req.user.id)
  await logAudit({
    userId: req.user.id,
    action: 'abonnement.demande.valider',
    entite: 'demande_abonnement',
    entiteId: Number(req.params.id),
    details: {
      bossId: abonnement.boss_id,
      reference: abonnement.reference_paiement,
      dateFin: abonnement.date_fin,
    },
    ip: clientIp(req),
  })
  emitEvent(
    'abonnement:activated',
    { bossId: abonnement.boss_id, dateFin: abonnement.date_fin },
    abonnement.boss_id,
  )
  return res.json({ abonnement, etat: await getEtatAbonnement(abonnement.boss_id) })
}

export async function postRefuserDemande(req, res) {
  const row = await refuserDemande(req.params.id, req.user.id, req.body?.note)
  await logAudit({
    userId: req.user.id,
    action: 'abonnement.demande.refuser',
    entite: 'demande_abonnement',
    entiteId: row.id,
    details: { bossId: row.boss_id, note: row.note },
    ip: clientIp(req),
  })
  emitEvent('abonnement:refused', { demandeId: row.id, note: row.note }, row.boss_id)
  return res.json(row)
}

/** Espace boss : etat de l'abonnement, historique, demandes et notifications. */
export async function getMonAbonnement(req, res) {
  if (req.user.role !== 'boss') throw httpError(403, 'Espace reserve aux proprietaires')
  const bossId = req.user.id
  const [etat, demandes, historique, notifications] = await Promise.all([
    getEtatAbonnement(bossId),
    listDemandes({ bossId, limit: 20 }),
    query(
      `SELECT id, date_debut, date_fin, montant, source, reference_paiement, commentaire,
              created_at
       FROM abonnements WHERE boss_id=$1
       ORDER BY date_debut DESC, id DESC LIMIT 20`,
      [bossId],
    ),
    getNotifications(bossId),
  ])
  return res.json({
    etat,
    infos: abonnementInfosPaiement(),
    montantMensuel: ABONNEMENT.montant,
    demandes,
    historique: historique.rows,
    notifications,
    nonLues: notifications.filter((n) => !n.lu).length,
  })
}

export async function postMaDemande(req, res) {
  if (req.user.role !== 'boss') throw httpError(403, 'Espace reserve aux proprietaires')
  const row = await createDemande({
    bossId: req.user.id,
    reference: req.body?.reference,
    telephonePayeur: req.body?.telephonePayeur,
    datePaiement: req.body?.datePaiement,
    note: req.body?.note,
  })
  await logAudit({
    userId: req.user.id,
    action: 'abonnement.demande.creer',
    entite: 'demande_abonnement',
    entiteId: row.id,
    details: { reference: row.reference, montant: row.montant },
    ip: clientIp(req),
  })
  emitEvent('abonnement:demande', {
    demandeId: row.id,
    bossId: req.user.id,
    reference: row.reference,
    montant: Number(row.montant),
  })
  return res.status(201).json(row)
}

export async function getMesNotifications(req, res) {
  if (req.user.role !== 'boss') throw httpError(403, 'Espace reserve aux proprietaires')
  const rows = await getNotifications(req.user.id)
  return res.json({ notifications: rows, nonLues: rows.filter((n) => !n.lu).length })
}

export async function postNotificationsLues(req, res) {
  if (req.user.role !== 'boss') throw httpError(403, 'Espace reserve aux proprietaires')
  return res.json(await markNotificationsRead(req.user.id))
}

import { query, withTransaction } from '../config/db.js'
import { httpError } from '../utils/errors.js'

/**
 * Abonnement SaaS (P2.11) — paiement manuel par Mobile Money.
 *
 * Flux : le boss paie 30 000 Ar sur l'un des numeros de la plateforme, saisit
 * la reference de la transaction, l'admin verifie dans son compte marchand puis
 * active 30 jours. Aucun debit automatique n'est effectue par l'application.
 */
export const ABONNEMENT = {
  montant: 30000,
  dureeJours: 30,
  essaiJours: 7,
  beneficiaire: 'RANAIVO Andry Ny Avo Onenantsoa',
  numeros: [
    { numero: '0389145273', reseau: 'Orange Money' },
    { numero: '0375441549', reseau: 'MVola / Orange Money' },
  ],
}

const ETAT_SELECT = `
  SELECT a.*,
         (a.date_fin - CURRENT_DATE)::int AS jours_restants
  FROM abonnements a
  WHERE a.boss_id = $1
    AND a.actif = TRUE
    AND a.date_fin >= CURRENT_DATE
  ORDER BY a.date_fin DESC, a.id DESC
  LIMIT 1
`

function dateFr(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Indian/Antananarivo',
  }).format(new Date(value))
}

function mapEtat(row) {
  if (!row) {
    return {
      actif: false,
      statut: 'expire',
      source: null,
      dateDebut: null,
      dateFin: null,
      montant: 0,
      joursRestants: 0,
      reference: null,
    }
  }
  return {
    actif: true,
    statut: row.source === 'essai' ? 'essai' : 'actif',
    source: row.source,
    dateDebut: row.date_debut,
    dateFin: row.date_fin,
    montant: Number(row.montant),
    joursRestants: Math.max(0, Number(row.jours_restants)),
    reference: row.reference_paiement,
  }
}

/**
 * Cache court de l'etat d'abonnement. Le middleware le lit a chaque requete et
 * un tableau de bord enchaine plusieurs appels : sans cache, chaque ecran
 * payait une requete SQL supplementaire. 30 s de fraicheur suffisent, et toute
 * activation faite dans ce processus invalide l'entree immediatement.
 */
const ETAT_TTL_MS = 30_000
const ETAT_CACHE_MAX = 500
const etatCache = new Map()

export function invalidateEtatAbonnement(bossId) {
  if (bossId === undefined || bossId === null) etatCache.clear()
  else etatCache.delete(Number(bossId))
}

export async function getEtatAbonnementCached(bossId) {
  const key = Number(bossId)
  if (!Number.isFinite(key)) return mapEtat(null)
  const hit = etatCache.get(key)
  const now = Date.now()
  if (hit && now - hit.at < ETAT_TTL_MS) return hit.etat

  const etat = await getEtatAbonnement(key)
  if (etatCache.size >= ETAT_CACHE_MAX) etatCache.clear()
  etatCache.set(key, { at: now, etat })
  return etat
}

/** Etat courant d'un boss (essai, actif ou expire). */
export async function getEtatAbonnement(bossId) {
  if (!bossId) return mapEtat(null)
  const { rows } = await query(ETAT_SELECT, [bossId])
  if (rows[0]) return mapEtat(rows[0])

  const { rows: last } = await query(
    `SELECT date_fin, source FROM abonnements
     WHERE boss_id=$1 ORDER BY date_fin DESC, id DESC LIMIT 1`,
    [bossId],
  )
  return {
    ...mapEtat(null),
    dateFin: last[0]?.date_fin ?? null,
    source: last[0]?.source ?? null,
  }
}

export async function isAbonnementActif(bossId) {
  return (await getEtatAbonnement(bossId)).actif
}

/** Essai gratuit de 7 jours a la creation d'un compte boss. */
export async function createTrialForBoss(bossId, client = null) {
  const run = client ? (text, params) => client.query(text, params) : query
  const { rows } = await run(
    `INSERT INTO abonnements (boss_id, date_debut, date_fin, montant, actif, source, commentaire)
     SELECT $1, CURRENT_DATE, CURRENT_DATE + ($2::int - 1), 0, TRUE, 'essai',
            'Essai gratuit de 7 jours'
     WHERE NOT EXISTS (
       SELECT 1 FROM abonnements a
       WHERE a.boss_id = $1 AND a.actif = TRUE AND a.date_fin >= CURRENT_DATE
     )
     RETURNING *`,
    [bossId, ABONNEMENT.essaiJours],
  )
  return rows[0] || null
}

export function abonnementInfosPaiement() {
  return {
    montant: ABONNEMENT.montant,
    dureeJours: ABONNEMENT.dureeJours,
    beneficiaire: ABONNEMENT.beneficiaire,
    numeros: ABONNEMENT.numeros,
    moyen: 'mobile_money',
  }
}

export async function listAbonnementsBoss() {
  const { rows } = await query(
    `SELECT u.id AS boss_id, u.nom AS boss_nom, u.username, u.telephone, u.actif,
            a.id AS abonnement_id, a.date_debut, a.date_fin, a.montant, a.source,
            a.reference_paiement,
            CASE WHEN a.id IS NULL THEN NULL ELSE (a.date_fin - CURRENT_DATE)::int END
              AS jours_restants,
            (SELECT COUNT(*)::int FROM demandes_abonnement d
             WHERE d.boss_id = u.id AND d.statut='en_attente') AS demandes_en_attente
     FROM utilisateurs u
     JOIN roles r ON r.id = u.role_id AND r.nom = 'boss'
     LEFT JOIN LATERAL (
       SELECT * FROM abonnements ab
       WHERE ab.boss_id = u.id AND ab.actif = TRUE AND ab.date_fin >= CURRENT_DATE
       ORDER BY ab.date_fin DESC, ab.id DESC LIMIT 1
     ) a ON TRUE
     ORDER BY (a.id IS NULL), a.date_fin ASC, u.nom`,
  )
  return rows
}

export async function createDemande({ bossId, reference, telephonePayeur, datePaiement, note }) {
  const ref = String(reference || '').trim()
  if (ref.length < 4) throw httpError(400, 'Référence de paiement requise (4 caractères minimum)')
  if (ref.length > 80) throw httpError(400, 'Référence trop longue (80 caractères maximum)')
  if (telephonePayeur && String(telephonePayeur).length > 20) {
    throw httpError(400, 'Numéro de téléphone trop long')
  }
  const date = datePaiement || new Date().toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw httpError(400, 'Date de paiement invalide')
  if (new Date(`${date}T00:00:00Z`) > new Date()) {
    throw httpError(400, 'La date de paiement ne peut pas être dans le futur')
  }

  const { rows: pending } = await query(
    `SELECT id FROM demandes_abonnement WHERE boss_id=$1 AND statut='en_attente' LIMIT 1`,
    [bossId],
  )
  if (pending[0]) {
    throw httpError(409, 'Une demande est déjà en attente de validation par l’administrateur')
  }

  const { rows } = await query(
    `INSERT INTO demandes_abonnement
       (boss_id, montant, reference, moyen_paiement, telephone_payeur, date_paiement, note)
     VALUES ($1,$2,$3,'mobile_money',$4,$5,$6)
     RETURNING *`,
    [bossId, ABONNEMENT.montant, ref, telephonePayeur || null, date, note || null],
  )
  return rows[0]
}

export async function listDemandes({ statut = null, bossId = null, limit = 100 } = {}) {
  const params = []
  const where = []
  if (statut) {
    params.push(statut)
    where.push(`d.statut = $${params.length}`)
  }
  if (bossId) {
    params.push(bossId)
    where.push(`d.boss_id = $${params.length}`)
  }
  params.push(limit)
  const { rows } = await query(
    `SELECT d.*, u.nom AS boss_nom, u.username, u.telephone AS boss_telephone,
            t.nom AS traite_par_nom
     FROM demandes_abonnement d
     JOIN utilisateurs u ON u.id=d.boss_id
     LEFT JOIN utilisateurs t ON t.id=d.traite_par
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY CASE d.statut WHEN 'en_attente' THEN 0 ELSE 1 END, d.created_at DESC
     LIMIT $${params.length}`,
    params,
  )
  return rows
}

/** Valide une demande : cree une periode de 30 jours et debloque le compte. */
export async function validerDemande(demandeId, adminId) {
  return withTransaction(async (client) => {
    const { rows: demandes } = await client.query(
      'SELECT * FROM demandes_abonnement WHERE id=$1 FOR UPDATE',
      [demandeId],
    )
    const demande = demandes[0]
    if (!demande) throw httpError(404, 'Demande introuvable')
    if (demande.statut !== 'en_attente') {
      throw httpError(409, 'Cette demande a déjà été traitée')
    }

    const { rows: debutRows } = await client.query(
      `SELECT GREATEST(
                CURRENT_DATE,
                COALESCE(MAX(date_fin) FILTER (WHERE actif AND date_fin >= CURRENT_DATE), CURRENT_DATE - 1) + 1
              )::date AS debut
       FROM abonnements WHERE boss_id=$1`,
      [demande.boss_id],
    )
    const debut = debutRows[0].debut
    const { rows: abos } = await client.query(
      `INSERT INTO abonnements
         (boss_id, date_debut, date_fin, montant, actif, source, commentaire,
          reference_paiement, moyen_paiement, valide_par, valide_at, demande_id)
       VALUES ($1,$2::date, ($2::date + ($3::int - 1)), $4, TRUE, 'mobile_money',
               $5, $6, $7, $8, CURRENT_TIMESTAMP, $9)
       RETURNING *`,
      [
        demande.boss_id,
        debut,
        ABONNEMENT.dureeJours,
        ABONNEMENT.montant,
        `Paiement Mobile Money validé (réf. ${demande.reference})`,
        demande.reference,
        'mobile_money',
        adminId,
        demande.id,
      ],
    )
    const abonnement = abos[0]

    await client.query(
      `UPDATE demandes_abonnement
       SET statut='validee', traite_par=$2, traite_at=CURRENT_TIMESTAMP
       WHERE id=$1`,
      [demande.id, adminId],
    )
    await client.query('UPDATE utilisateurs SET actif=TRUE WHERE id=$1', [demande.boss_id])
    invalidateEtatAbonnement(demande.boss_id)

    await client.query(
      `INSERT INTO relances_abonnement (boss_id, abonnement_id, type, message)
       VALUES ($1,$2,'active',$3)
       ON CONFLICT (boss_id, abonnement_id, type) DO NOTHING`,
      [
        demande.boss_id,
        abonnement.id,
        `Abonnement actif du ${dateFr(abonnement.date_debut)} au ${dateFr(abonnement.date_fin)}.`,
      ],
    )
    return abonnement
  })
}

export async function refuserDemande(demandeId, adminId, note) {
  const { rows } = await query(
    `UPDATE demandes_abonnement
     SET statut='refusee', traite_par=$2, traite_at=CURRENT_TIMESTAMP,
         note = COALESCE($3, note)
     WHERE id=$1 AND statut='en_attente'
     RETURNING *`,
    [demandeId, adminId, note || null],
  )
  if (!rows[0]) throw httpError(409, 'Demande introuvable ou déjà traitée')
  return rows[0]
}

/** Activation manuelle par l'admin (sans reference, ex. geste commercial). */
export async function activerManuellement({ bossId, montant, commentaire, adminId }) {
  return withTransaction(async (client) => {
    const { rows: boss } = await client.query(
      `SELECT u.id FROM utilisateurs u JOIN roles r ON r.id=u.role_id
       WHERE u.id=$1 AND r.nom='boss'`,
      [bossId],
    )
    if (!boss[0]) throw httpError(400, 'Boss introuvable')

    const { rows: debutRows } = await client.query(
      `SELECT GREATEST(
                CURRENT_DATE,
                COALESCE(MAX(date_fin) FILTER (WHERE actif AND date_fin >= CURRENT_DATE), CURRENT_DATE - 1) + 1
              )::date AS debut
       FROM abonnements WHERE boss_id=$1`,
      [bossId],
    )
    const debut = debutRows[0].debut
    const { rows } = await client.query(
      `INSERT INTO abonnements
         (boss_id, date_debut, date_fin, montant, actif, source, commentaire,
          moyen_paiement, valide_par, valide_at)
       VALUES ($1,$2::date, ($2::date + ($3::int - 1)), $4, TRUE, 'manuel',
               $5, 'manuel', $6, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        bossId,
        debut,
        ABONNEMENT.dureeJours,
        Number(montant) || ABONNEMENT.montant,
        commentaire || 'Activation manuelle par l’administrateur',
        adminId,
      ],
    )
    await client.query('UPDATE utilisateurs SET actif=TRUE WHERE id=$1', [bossId])
    invalidateEtatAbonnement(bossId)
    return rows[0]
  })
}

export async function getNotifications(bossId) {
  const { rows } = await query(
    `SELECT * FROM relances_abonnement WHERE boss_id=$1 ORDER BY created_at DESC LIMIT 30`,
    [bossId],
  )
  return rows
}

export async function markNotificationsRead(bossId) {
  await query('UPDATE relances_abonnement SET lu=TRUE WHERE boss_id=$1 AND lu=FALSE', [bossId])
  return { ok: true }
}

/**
 * Relances automatiques : une notification in-app a J-7, J-3, J-1 puis a
 * l'expiration. Idempotent grace a la contrainte unique.
 */
export async function runRelances() {
  const { rows } = await query(
    `SELECT u.id AS boss_id, a.id AS abonnement_id, a.date_fin, a.source,
            (a.date_fin - CURRENT_DATE)::int AS jours
     FROM utilisateurs u
     JOIN roles r ON r.id=u.role_id AND r.nom='boss'
     LEFT JOIN LATERAL (
       SELECT * FROM abonnements ab
       WHERE ab.boss_id=u.id
       ORDER BY ab.date_fin DESC, ab.id DESC LIMIT 1
     ) a ON TRUE
     WHERE u.actif = TRUE`,
  )

  const created = []
  for (const row of rows) {
    if (!row.abonnement_id) continue
    let type = null
    let message = ''
    if (row.jours < 0) {
      type = 'expire'
      message = `Votre abonnement a expiré le ${dateFr(row.date_fin)}. Renouvelez pour 30 000 Ar par Mobile Money.`
    } else if (row.jours <= 1) {
      type = 'j1'
      message = `Votre abonnement expire ${row.jours === 0 ? "aujourd'hui" : 'demain'}. Réglez 30 000 Ar par Mobile Money.`
    } else if (row.jours <= 3) {
      type = 'j3'
      message = `Votre abonnement expire dans ${row.jours} jours (${dateFr(row.date_fin)}).`
    } else if (row.jours <= 7) {
      type = 'j7'
      message = `Votre abonnement expire dans ${row.jours} jours (${dateFr(row.date_fin)}).`
    }
    if (!type) continue
    const { rows: inserted } = await query(
      `INSERT INTO relances_abonnement (boss_id, abonnement_id, type, message)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (boss_id, abonnement_id, type) DO NOTHING
       RETURNING *`,
      [row.boss_id, row.abonnement_id, type, message],
    )
    if (inserted[0]) created.push(inserted[0])
  }
  return created
}

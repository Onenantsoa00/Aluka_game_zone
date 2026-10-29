import { query, withTransaction } from '../config/db.js'
import { httpError, translateDbError } from '../utils/errors.js'

const ACTIVE_STATUSES = ['en_cours', 'pause']

const run = (client) => (client ? (text, params) => client.query(text, params) : query)

export async function getTarifByPoste(posteId, client = null) {
  const { rows } = await run(client)(
    `SELECT t.*
     FROM postes p
     JOIN tarifications t ON t.console_id=p.console_id
     WHERE p.id=$1 AND t.actif=TRUE
     ORDER BY t.duree_minutes ASC
     LIMIT 1`,
    [posteId],
  )
  return rows[0]
}

const SESSION_SELECT = `
  SELECT sj.*,
         p.nom_poste,
         p.statut AS poste_statut,
         p.salle_id,
         s.nom AS salle_nom,
         j.nom AS jeu_nom,
         ROUND(EXTRACT(EPOCH FROM (COALESCE(sj.heure_fin, CURRENT_TIMESTAMP) - sj.heure_debut)) / 60)::int
           AS duree_brute_minutes,
         COALESCE(pa.pause_minutes, 0)::int AS pause_minutes,
         GREATEST(
           0,
           ROUND(EXTRACT(EPOCH FROM (COALESCE(sj.heure_fin, CURRENT_TIMESTAMP) - sj.heure_debut)) / 60)::int
             - COALESCE(pa.pause_minutes, 0)::int
         ) AS elapsed_minutes,
         tar.duree_minutes AS tarif_duree_minutes,
         tar.prix AS tarif_prix,
         COALESCE(tar.duree_payee_minutes, 0)::int AS duree_payee_minutes
  FROM sessions_jeux sj
  JOIN postes p ON p.id = sj.poste_id
  JOIN salles s ON s.id = p.salle_id
  LEFT JOIN jeux j ON j.id = sj.jeu_id
  LEFT JOIN LATERAL (
    SELECT COALESCE(
             SUM(ROUND(EXTRACT(EPOCH FROM (COALESCE(ps.fin_pause, CURRENT_TIMESTAMP) - ps.debut_pause)) / 60)),
             0
           )::int AS pause_minutes
    FROM pauses_sessions ps
    WHERE ps.session_id = sj.id
  ) pa ON TRUE
  LEFT JOIN LATERAL (
    SELECT t.duree_minutes,
           t.prix,
           CASE WHEN t.prix > 0
                THEN ROUND(sj.montant_total / t.prix * t.duree_minutes)::int
                ELSE 0 END AS duree_payee_minutes
    FROM tarifications t
    JOIN postes pp ON pp.console_id = t.console_id
    WHERE pp.id = sj.poste_id AND t.actif = TRUE
    ORDER BY t.duree_minutes ASC
    LIMIT 1
  ) tar ON TRUE
`

/**
 * Liste paginee (O9). `limit` est borne a 200 cote controleur.
 * `elapsed_minutes` est calcule serveur en excluant les pauses, y compris la
 * pause ouverte : le temps affiche ne court donc plus pendant une pause (O5).
 */
export async function listSessions({ limit = 50, offset = 0, statut = null, aVerifier = null } = {}) {
  const params = []
  const where = []
  if (statut) {
    params.push(statut)
    where.push(`sj.statut = $${params.length}`)
  }
  if (aVerifier === true) where.push('sj.a_verifier = TRUE')
  if (aVerifier === false) where.push('sj.a_verifier = FALSE')

  params.push(limit, offset)
  const limitIdx = params.length - 1
  const offsetIdx = params.length

  const { rows } = await query(
    `WITH base AS (${SESSION_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''})
     SELECT *,
            (statut IN ('en_cours', 'pause')
             AND duree_payee_minutes > 0
             AND elapsed_minutes > duree_payee_minutes) AS depassement
     FROM base
     ORDER BY id DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params,
  )
  return rows
}

export async function countSessions({ statut = null, aVerifier = null } = {}) {
  const params = []
  const where = []
  if (statut) {
    params.push(statut)
    where.push(`statut = $${params.length}`)
  }
  if (aVerifier === true) where.push('a_verifier = TRUE')
  if (aVerifier === false) where.push('a_verifier = FALSE')
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total FROM sessions_jeux ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`,
    params,
  )
  return rows[0].total
}

export async function findSessionById(sessionId, client = null) {
  const { rows } = await run(client)('SELECT * FROM sessions_jeux WHERE id=$1', [sessionId])
  return rows[0]
}

export async function lockSession(client, sessionId) {
  const { rows } = await client.query('SELECT * FROM sessions_jeux WHERE id=$1 FOR UPDATE', [
    sessionId,
  ])
  return rows[0]
}

export async function lockPoste(client, posteId) {
  const { rows } = await client.query('SELECT * FROM postes WHERE id=$1 FOR UPDATE', [posteId])
  return rows[0]
}

export async function findActiveSessionForPoste(client, posteId) {
  const { rows } = await client.query(
    `SELECT id, statut FROM sessions_jeux
     WHERE poste_id=$1 AND statut IN ('en_cours','pause')
     LIMIT 1`,
    [posteId],
  )
  return rows[0]
}

export async function createSession(client, { posteId, jeuId, jetonId, montantInitial }) {
  try {
    const { rows } = await client.query(
      `INSERT INTO sessions_jeux (poste_id, jeu_id, jeton_id, montant_total, statut)
       VALUES ($1,$2,$3,$4,'en_cours') RETURNING *`,
      [posteId, jeuId || null, jetonId, montantInitial],
    )
    return rows[0]
  } catch (error) {
    throw translateDbError(error)
  }
}

export async function setPosteStatus(status, posteId, client = null) {
  await run(client)('UPDATE postes SET statut=$1 WHERE id=$2', [status, posteId])
}

/** Libere le poste uniquement s'il n'a plus aucune session active. */
export async function freePosteIfIdle(client, posteId) {
  await client.query(
    `UPDATE postes p SET statut='libre'
     WHERE p.id=$1
       AND NOT EXISTS (
         SELECT 1 FROM sessions_jeux sj
         WHERE sj.poste_id=p.id AND sj.statut IN ('en_cours','pause')
       )`,
    [posteId],
  )
}

export async function closeOpenPauses(client, sessionId) {
  await client.query(
    `UPDATE pauses_sessions
     SET fin_pause = CURRENT_TIMESTAMP,
         duree_pause = ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - debut_pause)) / 60)
     WHERE session_id = $1 AND fin_pause IS NULL`,
    [sessionId],
  )
}

/** Minutes de pause reelles (calculees depuis les bornes, pas depuis duree_pause). */
export async function getPauseMinutes(sessionId, client = null) {
  const { rows } = await run(client)(
    `SELECT COALESCE(
              SUM(ROUND(EXTRACT(EPOCH FROM (COALESCE(fin_pause, CURRENT_TIMESTAMP) - debut_pause)) / 60)),
              0
            )::int AS minutes
     FROM pauses_sessions WHERE session_id=$1`,
    [sessionId],
  )
  return Number(rows[0].minutes)
}

export async function getElapsedGrossMinutes(heureDebut, client = null) {
  const { rows } = await run(client)(
    'SELECT EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - $1::timestamp))::int / 60 AS minutes',
    [heureDebut],
  )
  return Number(rows[0].minutes)
}

export async function pauseSession(sessionId) {
  return withTransaction(async (client) => {
    const session = await lockSession(client, sessionId)
    if (!session) throw httpError(404, 'Session introuvable')
    if (session.statut !== 'en_cours') {
      throw httpError(409, 'Seule une session en cours peut etre mise en pause')
    }
    await client.query(
      'INSERT INTO pauses_sessions (session_id, debut_pause) VALUES ($1, CURRENT_TIMESTAMP)',
      [sessionId],
    )
    const { rows } = await client.query(
      "UPDATE sessions_jeux SET statut='pause' WHERE id=$1 RETURNING *",
      [sessionId],
    )
    await setPosteStatus('pause', session.poste_id, client)
    return rows[0]
  })
}

export async function resumeSession(sessionId) {
  return withTransaction(async (client) => {
    const session = await lockSession(client, sessionId)
    if (!session) throw httpError(404, 'Session introuvable')
    if (session.statut !== 'pause') {
      throw httpError(409, 'Seule une session en pause peut etre reprise')
    }
    await closeOpenPauses(client, sessionId)
    const { rows } = await client.query(
      "UPDATE sessions_jeux SET statut='en_cours' WHERE id=$1 RETURNING *",
      [sessionId],
    )
    await setPosteStatus('occupe', session.poste_id, client)
    return rows[0]
  })
}

export async function finalizeSession(
  client,
  { sessionId, elapsedMinutes, montantARendre, coupureElectricite },
) {
  const { rows } = await client.query(
    `UPDATE sessions_jeux
     SET heure_fin=CURRENT_TIMESTAMP,
         duree_reelle=$2,
         montant_a_rendre=$3,
         coupure_electricite=$4,
         statut='terminee'
     WHERE id=$1 RETURNING *`,
    [sessionId, elapsedMinutes, montantARendre, coupureElectricite],
  )
  return rows[0]
}

export async function addTransaction(
  { sessionId, montant, type, utilisateurId },
  client = null,
) {
  await run(client)(
    `INSERT INTO transactions (session_id, montant, type_transaction, utilisateur_id)
     VALUES ($1,$2,$3,$4)`,
    [sessionId, montant, type, utilisateurId],
  )
}

/** Encaissement complementaire (prolongation ou paiement partiel) — P1.10. */
export async function addSessionPayment(sessionId, montant, utilisateurId) {
  return withTransaction(async (client) => {
    const session = await lockSession(client, sessionId)
    if (!session) throw httpError(404, 'Session introuvable')
    if (!ACTIVE_STATUSES.includes(session.statut)) {
      throw httpError(409, 'Cette session est deja terminee')
    }
    await addTransaction(
      { sessionId, montant, type: 'encaissement', utilisateurId },
      client,
    )
    const { rows } = await client.query(
      `UPDATE sessions_jeux SET montant_total = montant_total + $2
       WHERE id=$1 RETURNING *`,
      [sessionId, montant],
    )
    return rows[0]
  })
}

export async function verifySession(sessionId, userId) {
  const { rows } = await query(
    `UPDATE sessions_jeux
     SET a_verifier=FALSE, verifie_par=$2, verifie_at=CURRENT_TIMESTAMP
     WHERE id=$1 RETURNING *`,
    [sessionId, userId],
  )
  if (!rows[0]) throw httpError(404, 'Session introuvable')
  return rows[0]
}

/**
 * Cloture automatique des sessions encore actives a l'heure de fermeture (P0.5).
 * Les sessions sont marquees « a verifier » : aucune recette n'est inventee et
 * un operateur doit confirmer le temps reellement consomme.
 */
export async function closeSessionsAtClosing(closingHour) {
  return withTransaction(async (client) => {
    const { rows: targets } = await client.query(
      `WITH cutoff AS (
         SELECT ((CURRENT_DATE - CASE WHEN LOCALTIME < make_time($1, 0, 0) THEN 1 ELSE 0 END)
                 + make_time($1, 0, 0))::timestamp AS at
       )
       SELECT sj.id, sj.poste_id
       FROM sessions_jeux sj, cutoff c
       WHERE sj.statut IN ('en_cours', 'pause')
         AND sj.heure_debut < c.at`,
      [closingHour],
    )

    if (!targets.length) return []

    const ids = targets.map((row) => row.id)
    const postes = targets.map((row) => row.poste_id)

    await client.query(
      `WITH cutoff AS (
         SELECT ((CURRENT_DATE - CASE WHEN LOCALTIME < make_time($1, 0, 0) THEN 1 ELSE 0 END)
                 + make_time($1, 0, 0))::timestamp AS at
       )
       UPDATE pauses_sessions ps
       SET fin_pause = c.at,
           duree_pause = ROUND(EXTRACT(EPOCH FROM (c.at - ps.debut_pause)) / 60)
       FROM cutoff c
       WHERE ps.session_id = ANY($2::int[]) AND ps.fin_pause IS NULL`,
      [closingHour, ids],
    )

    await client.query(
      `WITH cutoff AS (
         SELECT ((CURRENT_DATE - CASE WHEN LOCALTIME < make_time($1, 0, 0) THEN 1 ELSE 0 END)
                 + make_time($1, 0, 0))::timestamp AS at
       )
       UPDATE sessions_jeux sj
       SET statut='terminee',
           heure_fin = c.at,
           a_verifier = TRUE,
           duree_reelle = GREATEST(
             0,
             ROUND(EXTRACT(EPOCH FROM (c.at - sj.heure_debut)) / 60)::int
               - COALESCE((SELECT SUM(ps.duree_pause)::int FROM pauses_sessions ps WHERE ps.session_id = sj.id), 0)
           )
       FROM cutoff c
       WHERE sj.id = ANY($2::int[])`,
      [closingHour, ids],
    )

    await client.query(
      `UPDATE postes p SET statut='libre'
       WHERE p.id = ANY($1::int[])
         AND NOT EXISTS (
           SELECT 1 FROM sessions_jeux sj
           WHERE sj.poste_id=p.id AND sj.statut IN ('en_cours','pause')
         )`,
      [postes],
    )

    return targets
  })
}

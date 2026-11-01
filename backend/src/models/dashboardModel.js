import { query } from '../config/db.js'
import { tenantFilter } from '../utils/tenant.js'

// Recette = encaissements - remboursements. `date_transaction` est stockee dans
// le fuseau de la session PostgreSQL (Indian/Antananarivo), donc CURRENT_DATE
// correspond bien a la journee d'exploitation malgache (O3).
const NET = `COALESCE(SUM(CASE WHEN t.type_transaction='encaissement' THEN t.montant ELSE -t.montant END), 0)`

/** Condition tenant sur une transaction joignable a sa salle. */
function txScope(params, tenantId) {
  return tenantFilter(params, tenantId, 's.boss_id')
}

export async function getDashboardStats(tenantId = null) {
  const totals = (period) => {
    const params = []
    const scope = txScope(params, tenantId)
    return query(
      `SELECT ${NET} AS total
       FROM transactions t
       JOIN sessions_jeux sj ON sj.id = t.session_id
       JOIN postes p ON p.id = sj.poste_id
       JOIN salles s ON s.id = p.salle_id
       WHERE ${scope} ${period}`,
      params,
    )
  }

  const postesOccParams = []
  const postesOccScope = tenantFilter(postesOccParams, tenantId)
  const postesParams = []
  const postesScope = tenantFilter(postesParams, tenantId)

  const bySalleParams = []
  const bySalleScope = tenantFilter(bySalleParams, tenantId)

  const byPosteParams = []
  const byPosteScope = tenantFilter(byPosteParams, tenantId)

  const byJeuParams = []
  const byJeuScope = tenantFilter(byJeuParams, tenantId)

  const aVerifierParams = []
  const aVerifierScope = tenantFilter(aVerifierParams, tenantId)

  const [
    today,
    month,
    year,
    postesOcc,
    postesTotal,
    bySalle,
    byPoste,
    byJeu,
    aVerifier,
    sessionsAVerifierCount,
    serie,
  ] = await Promise.all([
    totals(`AND date_trunc('day', t.date_transaction) = date_trunc('day', CURRENT_DATE)`),
    totals(`AND date_trunc('month', t.date_transaction) = date_trunc('month', CURRENT_DATE)`),
    totals(`AND date_trunc('year', t.date_transaction) = date_trunc('year', CURRENT_DATE)`),
    // Occupation reelle : sessions actives, pas le champ statut du poste.
    query(
      `SELECT COUNT(DISTINCT sj.poste_id)::int AS total
       FROM sessions_jeux sj
       JOIN postes p ON p.id = sj.poste_id
       JOIN salles s ON s.id = p.salle_id
       WHERE sj.statut IN ('en_cours','pause') AND ${postesOccScope}`,
      postesOccParams,
    ),
    query(
      `SELECT COUNT(*)::int AS total
       FROM postes p JOIN salles s ON s.id=p.salle_id
       WHERE p.actif=TRUE AND ${postesScope}`,
      postesParams,
    ),
    query(
      `SELECT s.id, s.nom, ${NET} AS montant
       FROM salles s
       LEFT JOIN postes p ON p.salle_id=s.id
       LEFT JOIN sessions_jeux sj ON sj.poste_id=p.id
       LEFT JOIN transactions t ON t.session_id=sj.id
       WHERE s.actif=TRUE AND ${bySalleScope}
       GROUP BY s.id
       ORDER BY montant DESC`,
      bySalleParams,
    ),
    query(
      `SELECT p.nom_poste, s.nom AS salle_nom, COUNT(sj.id)::int AS utilisations
       FROM postes p
       JOIN salles s ON s.id=p.salle_id
       LEFT JOIN sessions_jeux sj ON sj.poste_id=p.id
       WHERE ${byPosteScope}
       GROUP BY p.id, s.nom
       HAVING COUNT(sj.id) > 0
       ORDER BY utilisations DESC
       LIMIT 10`,
      byPosteParams,
    ),
    query(
      `SELECT j.nom, COUNT(sj.id)::int AS utilisations
       FROM jeux j
       JOIN sessions_jeux sj ON sj.jeu_id=j.id
       JOIN postes p ON p.id=sj.poste_id
       JOIN salles s ON s.id=p.salle_id
       WHERE ${byJeuScope}
       GROUP BY j.id
       HAVING COUNT(sj.id) > 0
       ORDER BY utilisations DESC
       LIMIT 10`,
      byJeuParams,
    ),
    query(
      `SELECT sj.id, sj.poste_id, sj.heure_debut, sj.heure_fin, sj.montant_total,
              p.nom_poste
       FROM sessions_jeux sj
       JOIN postes p ON p.id=sj.poste_id
       JOIN salles s ON s.id=p.salle_id
       WHERE sj.a_verifier = TRUE AND ${aVerifierScope}
       ORDER BY sj.heure_fin DESC NULLS LAST
       LIMIT 5`,
      aVerifierParams,
    ),
    query(
      `SELECT COUNT(*)::int AS total
       FROM sessions_jeux sj
       JOIN postes p ON p.id=sj.poste_id
       JOIN salles s ON s.id=p.salle_id
       WHERE sj.a_verifier = TRUE AND ${aVerifierScope}`,
      aVerifierParams,
    ),
    getRevenueSeries(tenantId, 30),
  ])

  return {
    soldes: {
      jour: Number(today.rows[0].total),
      mois: Number(month.rows[0].total),
      annee: Number(year.rows[0].total),
    },
    postesActifs: postesOcc.rows[0].total,
    postesTotal: postesTotal.rows[0].total,
    argentParSalle: bySalle.rows,
    postesPlusUtilises: byPoste.rows,
    jeuxPlusUtilises: byJeu.rows,
    sessionsAVerifier: aVerifier.rows,
    sessionsAVerifierCount: sessionsAVerifierCount.rows[0].total,
    serieRecette: serie,
  }
}

/**
 * Courbe de recette (P2.14) : net par jour sur les N derniers jours, jours
 * sans operation inclus a 0 pour que la courbe reste lisible.
 */
export async function getRevenueSeries(tenantId = null, days = 30) {
  const span = Math.min(90, Math.max(1, Number(days) || 30))
  const params = [span]
  params.push(tenantId)
  const tenantParam = params.length
  const { rows } = await query(
    `WITH jours AS (
       SELECT generate_series(CURRENT_DATE - ($1::int - 1), CURRENT_DATE, interval '1 day')::date AS jour
     )
     SELECT to_char(j.jour, 'YYYY-MM-DD') AS date,
            COALESCE(SUM(
              CASE WHEN $${tenantParam}::int IS NULL OR s.boss_id = $${tenantParam}
                   THEN CASE WHEN t.type_transaction='encaissement' THEN t.montant
                             WHEN t.type_transaction='remboursement' THEN -t.montant
                             ELSE 0 END
                   ELSE 0 END
            ), 0) AS net
     FROM jours j
     LEFT JOIN transactions t ON t.date_transaction::date = j.jour
     LEFT JOIN sessions_jeux sj ON sj.id = t.session_id
     LEFT JOIN postes p ON p.id = sj.poste_id
     LEFT JOIN salles s ON s.id = p.salle_id
     GROUP BY j.jour
     ORDER BY j.jour ASC`,
    params,
  )
  return rows.map((row) => ({ date: row.date, net: Number(row.net) }))
}

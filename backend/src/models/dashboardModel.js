import { query } from '../config/db.js'

// Recette = encaissements - remboursements. `date_transaction` est stockee dans
// le fuseau de la session PostgreSQL (Indian/Antananarivo), donc CURRENT_DATE
// correspond bien a la journee d'exploitation malgache (O3).
const NET = `COALESCE(SUM(CASE WHEN t.type_transaction='encaissement' THEN t.montant ELSE -t.montant END), 0)`

export async function getDashboardStats() {
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
  ] = await Promise.all([
    query(`SELECT ${NET} AS total FROM transactions t WHERE t.date_transaction::date = CURRENT_DATE`),
    query(
      `SELECT ${NET} AS total FROM transactions t
       WHERE date_trunc('month', t.date_transaction) = date_trunc('month', CURRENT_DATE)`,
    ),
    query(
      `SELECT ${NET} AS total FROM transactions t
       WHERE date_trunc('year', t.date_transaction) = date_trunc('year', CURRENT_DATE)`,
    ),
    // Occupation reelle : sessions actives, pas le champ statut du poste.
    query(`SELECT COUNT(DISTINCT poste_id)::int AS total FROM sessions_jeux
           WHERE statut IN ('en_cours','pause')`),
    query('SELECT COUNT(*)::int AS total FROM postes WHERE actif=TRUE'),
    query(
      `SELECT s.id, s.nom, ${NET} AS montant
       FROM salles s
       LEFT JOIN postes p ON p.salle_id=s.id
       LEFT JOIN sessions_jeux sj ON sj.poste_id=p.id
       LEFT JOIN transactions t ON t.session_id=sj.id
       WHERE s.actif=TRUE
       GROUP BY s.id
       ORDER BY montant DESC`,
    ),
    query(
      `SELECT p.nom_poste, s.nom AS salle_nom, COUNT(sj.id)::int AS utilisations
       FROM postes p
       JOIN salles s ON s.id=p.salle_id
       LEFT JOIN sessions_jeux sj ON sj.poste_id=p.id
       GROUP BY p.id, s.nom
       HAVING COUNT(sj.id) > 0
       ORDER BY utilisations DESC
       LIMIT 10`,
    ),
    query(
      `SELECT j.nom, COUNT(sj.id)::int AS utilisations
       FROM jeux j
       LEFT JOIN sessions_jeux sj ON sj.jeu_id=j.id
       GROUP BY j.id
       HAVING COUNT(sj.id) > 0
       ORDER BY utilisations DESC
       LIMIT 10`,
    ),
    query(
      `SELECT sj.id, sj.poste_id, sj.heure_debut, sj.heure_fin, sj.montant_total,
              p.nom_poste
       FROM sessions_jeux sj
       JOIN postes p ON p.id=sj.poste_id
       WHERE sj.a_verifier = TRUE
       ORDER BY sj.heure_fin DESC NULLS LAST
       LIMIT 5`,
    ),
    query('SELECT COUNT(*)::int AS total FROM sessions_jeux WHERE a_verifier = TRUE'),
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
  }
}

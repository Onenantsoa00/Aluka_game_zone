import { query } from '../config/db.js'

/** Rapport de caisse de fin de journee (P1.7), dans le fuseau des salles. */
export async function getRapportZ(date) {
  const [totaux, parCaissier, parSalle, sessions, aVerifier] = await Promise.all([
    query(
      `SELECT type_transaction,
              COALESCE(SUM(montant), 0) AS total,
              COUNT(*)::int AS nombre
       FROM transactions
       WHERE date_transaction::date = $1::date
       GROUP BY type_transaction`,
      [date],
    ),
    query(
      `SELECT COALESCE(u.nom, 'Inconnu') AS caissier,
              COALESCE(SUM(CASE WHEN t.type_transaction='encaissement' THEN t.montant ELSE 0 END), 0) AS encaisse,
              COALESCE(SUM(CASE WHEN t.type_transaction='remboursement' THEN t.montant ELSE 0 END), 0) AS rembourse,
              COUNT(*)::int AS operations
       FROM transactions t
       LEFT JOIN utilisateurs u ON u.id=t.utilisateur_id
       WHERE t.date_transaction::date = $1::date
       GROUP BY u.id
       ORDER BY caissier`,
      [date],
    ),
    query(
      `SELECT s.nom AS salle,
              COALESCE(SUM(CASE WHEN t.type_transaction='encaissement' THEN t.montant
                                WHEN t.type_transaction='remboursement' THEN -t.montant
                                ELSE 0 END), 0) AS net
       FROM transactions t
       JOIN sessions_jeux sj ON sj.id=t.session_id
       JOIN postes p ON p.id=sj.poste_id
       JOIN salles s ON s.id=p.salle_id
       WHERE t.date_transaction::date = $1::date
       GROUP BY s.id
       ORDER BY net DESC`,
      [date],
    ),
    query(
      `SELECT COUNT(*)::int AS sessions,
              COALESCE(SUM(duree_reelle), 0)::int AS minutes
       FROM sessions_jeux
       WHERE heure_fin::date = $1::date`,
      [date],
    ),
    query(
      `SELECT COUNT(*)::int AS total
       FROM sessions_jeux
       WHERE a_verifier = TRUE AND COALESCE(heure_fin::date, CURRENT_DATE) = $1::date`,
      [date],
    ),
  ])

  const encaissements = Number(
    totaux.rows.find((row) => row.type_transaction === 'encaissement')?.total || 0,
  )
  const remboursements = Number(
    totaux.rows.find((row) => row.type_transaction === 'remboursement')?.total || 0,
  )

  return {
    date,
    encaissements,
    remboursements,
    net: encaissements - remboursements,
    operations: totaux.rows.reduce((sum, row) => sum + row.nombre, 0),
    parCaissier: parCaissier.rows.map((row) => ({
      caissier: row.caissier,
      encaisse: Number(row.encaisse),
      rembourse: Number(row.rembourse),
      net: Number(row.encaisse) - Number(row.rembourse),
      operations: row.operations,
    })),
    parSalle: parSalle.rows.map((row) => ({ salle: row.salle, net: Number(row.net) })),
    sessionsCloturees: sessions.rows[0].sessions,
    minutesJouees: sessions.rows[0].minutes,
    sessionsAVerifier: aVerifier.rows[0].total,
  }
}

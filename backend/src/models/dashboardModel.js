import { query } from '../config/db.js'

export async function getDashboardStats() {
  const [today, month, year, postesOcc, bySalle, byPoste, byJeu] = await Promise.all([
    query("SELECT COALESCE(SUM(montant_total),0) AS total FROM sessions_jeux WHERE DATE(created_at)=CURRENT_DATE"),
    query(
      "SELECT COALESCE(SUM(montant_total),0) AS total FROM sessions_jeux WHERE DATE_TRUNC('month', created_at)=DATE_TRUNC('month', CURRENT_DATE)",
    ),
    query(
      "SELECT COALESCE(SUM(montant_total),0) AS total FROM sessions_jeux WHERE DATE_TRUNC('year', created_at)=DATE_TRUNC('year', CURRENT_DATE)",
    ),
    query("SELECT COUNT(*)::int AS total FROM postes WHERE statut='occupe'"),
    query(
      `SELECT s.nom, COALESCE(SUM(sj.montant_total),0) AS montant
       FROM salles s
       LEFT JOIN postes p ON p.salle_id=s.id
       LEFT JOIN sessions_jeux sj ON sj.poste_id=p.id
       GROUP BY s.id ORDER BY montant DESC`,
    ),
    query(
      `SELECT p.nom_poste, COUNT(sj.id)::int AS utilisations
       FROM postes p
       LEFT JOIN sessions_jeux sj ON sj.poste_id=p.id
       GROUP BY p.id ORDER BY utilisations DESC LIMIT 10`,
    ),
    query(
      `SELECT j.nom, COUNT(sj.id)::int AS utilisations
       FROM jeux j
       LEFT JOIN sessions_jeux sj ON sj.jeu_id=j.id
       GROUP BY j.id ORDER BY utilisations DESC LIMIT 10`,
    ),
  ])

  return {
    soldes: {
      jour: Number(today.rows[0].total),
      mois: Number(month.rows[0].total),
      annee: Number(year.rows[0].total),
    },
    postesActifs: postesOcc.rows[0].total,
    argentParSalle: bySalle.rows,
    postesPlusUtilises: byPoste.rows,
    jeuxPlusUtilises: byJeu.rows,
  }
}

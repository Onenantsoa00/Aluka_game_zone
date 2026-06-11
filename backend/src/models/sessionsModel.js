import { query } from '../config/db.js'

export async function getTarifByPoste(posteId) {
  const { rows } = await query(
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

export async function listSessions() {
  const { rows } = await query(
    `SELECT sj.*, p.nom_poste, j.nom AS jeu_nom
     FROM sessions_jeux sj
     JOIN postes p ON p.id=sj.poste_id
     LEFT JOIN jeux j ON j.id=sj.jeu_id
     ORDER BY sj.id DESC LIMIT 100`,
  )
  return rows
}

export async function createSession({ posteId, jeuId, jetonId, montantInitial }) {
  const { rows } = await query(
    `INSERT INTO sessions_jeux (poste_id, jeu_id, jeton_id, montant_total, statut)
     VALUES ($1,$2,$3,$4,'en_cours') RETURNING *`,
    [posteId, jeuId || null, jetonId, montantInitial],
  )
  return rows[0]
}

export async function setPosteStatus(posteId, status) {
  await query('UPDATE postes SET statut=$1 WHERE id=$2', [status, posteId])
}

export async function pauseSession(sessionId) {
  await query('INSERT INTO pauses_sessions (session_id, debut_pause) VALUES ($1, CURRENT_TIMESTAMP)', [
    sessionId,
  ])
  const { rows } = await query("UPDATE sessions_jeux SET statut='pause' WHERE id=$1 RETURNING *", [sessionId])
  return rows[0]
}

export async function resumeSession(sessionId) {
  await query(
    `UPDATE pauses_sessions
     SET fin_pause = CURRENT_TIMESTAMP,
         duree_pause = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - debut_pause))::int / 60
     WHERE id = (
       SELECT id FROM pauses_sessions
       WHERE session_id = $1 AND fin_pause IS NULL
       ORDER BY id DESC LIMIT 1
     )`,
    [sessionId],
  )
  const { rows } = await query("UPDATE sessions_jeux SET statut='en_cours' WHERE id=$1 RETURNING *", [sessionId])
  return rows[0]
}

export async function findSessionById(sessionId) {
  const { rows } = await query('SELECT * FROM sessions_jeux WHERE id=$1', [sessionId])
  return rows[0]
}

export async function getPauseMinutes(sessionId) {
  const { rows } = await query(
    'SELECT COALESCE(SUM(duree_pause),0)::int AS minutes FROM pauses_sessions WHERE session_id=$1',
    [sessionId],
  )
  return Number(rows[0].minutes)
}

export async function getElapsedGrossMinutes(heureDebut) {
  const { rows } = await query(
    'SELECT EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - $1::timestamp))::int / 60 AS minutes',
    [heureDebut],
  )
  return Number(rows[0].minutes)
}

export async function finalizeSession({ sessionId, elapsedMinutes, montantARendre, coupureElectricite }) {
  const { rows } = await query(
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

export async function addTransaction({ sessionId, montant, type, utilisateurId }) {
  await query(
    `INSERT INTO transactions (session_id, montant, type_transaction, utilisateur_id)
     VALUES ($1,$2,$3,$4)`,
    [sessionId, montant, type, utilisateurId],
  )
}

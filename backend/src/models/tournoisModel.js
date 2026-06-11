import { query } from '../config/db.js'

export async function listTournois() {
  const { rows } = await query('SELECT * FROM tournois ORDER BY date_tournoi DESC NULLS LAST')
  return rows
}

export async function createTournoi({ salleId, jeuId, nom, mise, recompense, dateTournoi }) {
  const { rows } = await query(
    `INSERT INTO tournois (salle_id, jeu_id, nom, mise, recompense, type_tournoi, date_tournoi)
     VALUES ($1,$2,$3,$4,$5,'elimination_directe',$6) RETURNING *`,
    [salleId, jeuId || null, nom, mise || 0, recompense || null, dateTournoi || null],
  )
  return rows[0]
}

export async function addParticipant({ tournoiId, nomJoueur, telephone }) {
  const { rows } = await query(
    `INSERT INTO participants_tournoi (tournoi_id, nom_joueur, telephone)
     VALUES ($1,$2,$3) RETURNING *`,
    [tournoiId, nomJoueur, telephone || null],
  )
  return rows[0]
}

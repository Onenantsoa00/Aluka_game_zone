import { query, withTransaction } from '../config/db.js'
import { httpError } from '../utils/errors.js'
import { tenantFilter } from '../utils/tenant.js'

const TOURNOI_SELECT = `
  SELECT t.*, s.nom AS salle_nom, s.boss_id, j.nom AS jeu_nom,
         champ.nom_joueur AS champion_nom,
         (SELECT COUNT(*)::int FROM participants_tournoi p WHERE p.tournoi_id=t.id)
           AS participants_count
  FROM tournois t
  JOIN salles s ON s.id=t.salle_id
  LEFT JOIN jeux j ON j.id=t.jeu_id
  LEFT JOIN participants_tournoi champ ON champ.id=t.champion_id
`

export async function listTournois(tenantId = null) {
  const params = []
  const scope = tenantFilter(params, tenantId)
  const { rows } = await query(
    `${TOURNOI_SELECT}
     WHERE ${scope}
     ORDER BY CASE t.statut WHEN 'en_cours' THEN 0 WHEN 'inscriptions' THEN 1 ELSE 2 END,
              t.date_tournoi DESC NULLS LAST, t.id DESC
     LIMIT 200`,
    params,
  )
  return rows
}

export async function findTournoiById(id, tenantId = null, client = null) {
  const params = [id]
  const scope = tenantFilter(params, tenantId)
  const run = client ? (text, values) => client.query(text, values) : query
  const { rows } = await run(`${TOURNOI_SELECT} WHERE t.id=$1 AND ${scope} LIMIT 1`, params)
  return rows[0]
}

export async function createTournoi({
  salleId,
  jeuId,
  nom,
  mise,
  recompense,
  dateTournoi,
}) {
  const { rows } = await query(
    `INSERT INTO tournois
       (salle_id, jeu_id, nom, mise, recompense, type_tournoi, date_tournoi, statut)
     VALUES ($1,$2,$3,$4,$5,'elimination_directe',$6,'inscriptions') RETURNING *`,
    [salleId, jeuId || null, nom, mise || 0, recompense || null, dateTournoi || null],
  )
  return rows[0]
}

export async function listParticipants(tournoiId, client = null) {
  const run = client ? (text, values) => client.query(text, values) : query
  const { rows } = await run(
    `SELECT * FROM participants_tournoi WHERE tournoi_id=$1
     ORDER BY seed NULLS LAST, id ASC`,
    [tournoiId],
  )
  return rows
}

export async function listMatchs(tournoiId, client = null) {
  const run = client ? (text, values) => client.query(text, values) : query
  const { rows } = await run(
    `SELECT m.*,
            p1.nom_joueur AS joueur1,
            p2.nom_joueur AS joueur2,
            g.nom_joueur AS gagnant_nom
     FROM matchs_tournoi m
     LEFT JOIN participants_tournoi p1 ON p1.id=m.participant1_id
     LEFT JOIN participants_tournoi p2 ON p2.id=m.participant2_id
     LEFT JOIN participants_tournoi g ON g.id=m.gagnant_id
     WHERE m.tournoi_id=$1
     ORDER BY m.tour ASC, m.position ASC`,
    [tournoiId],
  )
  return rows
}

export async function getTournoiDetail(id, tenantId = null) {
  const tournoi = await findTournoiById(id, tenantId)
  if (!tournoi) throw httpError(404, 'Tournoi introuvable')
  const [participants, matchs] = await Promise.all([
    listParticipants(id),
    listMatchs(id),
  ])
  return {
    tournoi,
    participants,
    matchs,
    rounds: tournoi.taille_tableau ? Math.log2(tournoi.taille_tableau) : 0,
  }
}

export async function addParticipant({ tournoi, nomJoueur, telephone }) {
  if (tournoi.statut !== 'inscriptions') {
    throw httpError(409, 'Les inscriptions sont closes : le tournoi a démarré')
  }
  if (!nomJoueur?.trim()) throw httpError(400, 'Nom du joueur requis')
  if (tournoi.participants_count >= 64) {
    throw httpError(409, '64 joueurs maximum par tournoi')
  }
  const { rows: doublon } = await query(
    `SELECT id FROM participants_tournoi
     WHERE tournoi_id=$1 AND lower(nom_joueur)=lower($2) LIMIT 1`,
    [tournoi.id, nomJoueur.trim()],
  )
  if (doublon[0]) throw httpError(409, 'Ce joueur est déjà inscrit à ce tournoi')

  const { rows } = await query(
    `INSERT INTO participants_tournoi (tournoi_id, nom_joueur, telephone)
     VALUES ($1,$2,$3) RETURNING *`,
    [tournoi.id, nomJoueur.trim(), telephone || null],
  )
  return rows[0]
}

export async function removeParticipant(tournoiId, participantId) {
  const { rows } = await query(
    `DELETE FROM participants_tournoi
     WHERE id=$1 AND tournoi_id=$2
       AND EXISTS (SELECT 1 FROM tournois t WHERE t.id=$2 AND t.statut='inscriptions')
     RETURNING *`,
    [participantId, tournoiId],
  )
  if (!rows[0]) throw httpError(409, 'Inscription introuvable ou tournoi déjà démarré')
  return rows[0]
}

async function advanceWinner(client, tournoiId, tour, position, winnerId, totalRounds) {
  if (tour >= totalRounds) return
  const nextPosition = Math.ceil(position / 2)
  const slot = position % 2 === 1 ? 'participant1_id' : 'participant2_id'
  await client.query(
    `UPDATE matchs_tournoi
     SET ${slot}=$1, updated_at=CURRENT_TIMESTAMP
     WHERE tournoi_id=$2 AND tour=$3 AND position=$4`,
    [winnerId, tournoiId, tour + 1, nextPosition],
  )
}

/**
 * Genere le tableau d'elimination directe (P2.12) : puissance de 2 superieure
 * au nombre d'inscrits, tetes de serie classiques (1 vs N, 2 vs N-1...),
 * exempts (bye) resolus automatiquement et places au tour suivant.
 */
export async function startTournoi(id) {
  return withTransaction(async (client) => {
    const { rows: tournois } = await client.query(
      'SELECT * FROM tournois WHERE id=$1 FOR UPDATE',
      [id],
    )
    const tournoi = tournois[0]
    if (!tournoi) throw httpError(404, 'Tournoi introuvable')
    if (tournoi.statut !== 'inscriptions') {
      throw httpError(409, 'Ce tournoi a déjà démarré')
    }

    const players = await listParticipants(id, client)
    if (players.length < 2) {
      throw httpError(400, 'Au moins 2 joueurs sont nécessaires pour démarrer')
    }

    const size = 2 ** Math.ceil(Math.log2(players.length))
    const totalRounds = Math.log2(size)

    await client.query('DELETE FROM matchs_tournoi WHERE tournoi_id=$1', [id])
    await client.query(
      'UPDATE participants_tournoi SET elimine=FALSE, seed=NULL WHERE tournoi_id=$1',
      [id],
    )
    for (let index = 0; index < players.length; index += 1) {
      await client.query('UPDATE participants_tournoi SET seed=$2 WHERE id=$1', [
        players[index].id,
        index + 1,
      ])
    }

    // Toutes les rencontres sont creees a l'avance : le tableau est lisible
    // des le premier tour, les vainqueurs viennent alimenter les suivantes.
    for (let tour = 1; tour <= totalRounds; tour += 1) {
      const matchs = size / 2 ** tour
      for (let position = 1; position <= matchs; position += 1) {
        await client.query(
          `INSERT INTO matchs_tournoi (tournoi_id, tour, position)
           VALUES ($1,$2,$3)`,
          [id, tour, position],
        )
      }
    }

    const { rows: firstRound } = await client.query(
      'SELECT id, position FROM matchs_tournoi WHERE tournoi_id=$1 AND tour=1 ORDER BY position',
      [id],
    )

    for (const match of firstRound) {
      const joueur1 = players[match.position - 1]
      const joueur2 = players[size - match.position]
      if (!joueur2) {
        // Exempt : le joueur passe directement au tour suivant.
        await client.query(
          `UPDATE matchs_tournoi
           SET participant1_id=$2, gagnant_id=$2, statut='bye', updated_at=CURRENT_TIMESTAMP
           WHERE id=$1`,
          [match.id, joueur1.id],
        )
        await advanceWinner(client, id, 1, match.position, joueur1.id, totalRounds)
      } else {
        await client.query(
          `UPDATE matchs_tournoi
           SET participant1_id=$2, participant2_id=$3, updated_at=CURRENT_TIMESTAMP
           WHERE id=$1`,
          [match.id, joueur1.id, joueur2.id],
        )
      }
    }

    await client.query(
      `UPDATE tournois
       SET statut='en_cours', taille_tableau=$2, started_at=CURRENT_TIMESTAMP, champion_id=NULL
       WHERE id=$1`,
      [id, size],
    )
    return { taille: size, rounds: totalRounds }
  })
}

/** Enregistre un score et fait avancer le vainqueur dans le tableau. */
export async function recordResult(matchId, { score1, score2 }) {
  const s1 = Number(score1)
  const s2 = Number(score2)
  if (!Number.isInteger(s1) || !Number.isInteger(s2) || s1 < 0 || s2 < 0) {
    throw httpError(400, 'Scores invalides (entiers positifs)')
  }
  if (s1 === s2) {
    throw httpError(400, 'Pas de match nul en élimination directe : un vainqueur est requis')
  }

  return withTransaction(async (client) => {
    const { rows: matchs } = await client.query(
      'SELECT * FROM matchs_tournoi WHERE id=$1 FOR UPDATE',
      [matchId],
    )
    const match = matchs[0]
    if (!match) throw httpError(404, 'Rencontre introuvable')

    const { rows: tournois } = await client.query(
      'SELECT * FROM tournois WHERE id=$1 FOR UPDATE',
      [match.tournoi_id],
    )
    const tournoi = tournois[0]
    if (!tournoi || tournoi.statut !== 'en_cours') {
      throw httpError(409, 'Le tournoi n’est pas en cours')
    }
    if (match.statut === 'termine' || match.statut === 'bye') {
      throw httpError(409, 'Cette rencontre est déjà terminée')
    }
    if (!match.participant1_id || !match.participant2_id) {
      throw httpError(409, 'Les deux joueurs ne sont pas encore connus')
    }

    const gagnantId = s1 > s2 ? match.participant1_id : match.participant2_id
    const perdantId = s1 > s2 ? match.participant2_id : match.participant1_id

    await client.query(
      `UPDATE matchs_tournoi
       SET score1=$2, score2=$3, gagnant_id=$4, statut='termine',
           updated_at=CURRENT_TIMESTAMP
       WHERE id=$1`,
      [matchId, s1, s2, gagnantId],
    )
    await client.query('UPDATE participants_tournoi SET elimine=TRUE WHERE id=$1', [
      perdantId,
    ])

    const totalRounds = Math.log2(tournoi.taille_tableau)
    if (match.tour >= totalRounds) {
      await client.query(
        `UPDATE tournois
         SET statut='termine', champion_id=$2, finished_at=CURRENT_TIMESTAMP
         WHERE id=$1`,
        [tournoi.id, gagnantId],
      )
    } else {
      await advanceWinner(
        client,
        tournoi.id,
        match.tour,
        match.position,
        gagnantId,
        totalRounds,
      )
    }

    return { gagnantId, tournoiId: tournoi.id, champion: match.tour >= totalRounds }
  })
}

export async function resetTournoi(id) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      'SELECT id, statut FROM tournois WHERE id=$1 FOR UPDATE',
      [id],
    )
    if (!rows[0]) throw httpError(404, 'Tournoi introuvable')
    await client.query('DELETE FROM matchs_tournoi WHERE tournoi_id=$1', [id])
    await client.query(
      `UPDATE participants_tournoi SET elimine=FALSE, seed=NULL WHERE tournoi_id=$1`,
      [id],
    )
    await client.query(
      `UPDATE tournois
       SET statut='inscriptions', champion_id=NULL, taille_tableau=NULL,
           started_at=NULL, finished_at=NULL
       WHERE id=$1`,
      [id],
    )
    return { ok: true }
  })
}

import { addParticipant, createTournoi, listTournois } from '../models/tournoisModel.js'

export async function getTournois(req, res) {
  const rows = await listTournois()
  return res.json(rows)
}

export async function postTournoi(req, res) {
  const { salleId, jeuId, nom, mise, recompense, dateTournoi } = req.body
  const row = await createTournoi({ salleId, jeuId, nom, mise, recompense, dateTournoi })
  return res.status(201).json(row)
}

export async function postParticipant(req, res) {
  const { nomJoueur, telephone } = req.body
  const row = await addParticipant({ tournoiId: req.params.id, nomJoueur, telephone })
  return res.status(201).json(row)
}

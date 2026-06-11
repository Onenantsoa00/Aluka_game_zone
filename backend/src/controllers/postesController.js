import { createPoste, listPostes } from '../models/postesModel.js'

export async function getPostes(req, res) {
  const rows = await listPostes(req.query.salleId)
  return res.json(rows)
}

export async function postPoste(req, res) {
  const { salleId, consoleId, nomPoste, numeroPoste } = req.body
  const row = await createPoste({ salleId, consoleId, nomPoste, numeroPoste })
  return res.status(201).json(row)
}

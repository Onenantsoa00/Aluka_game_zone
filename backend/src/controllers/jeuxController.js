import {
  createJeu,
  createTarification,
  listJeux,
  listTarificationsByConsole,
} from '../models/jeuxModel.js'

export async function getJeux(req, res) {
  const rows = await listJeux()
  return res.json(rows)
}

export async function postJeu(req, res) {
  const { nom, genre, description } = req.body
  const row = await createJeu({ nom, genre, description })
  return res.status(201).json(row)
}

export async function postTarification(req, res) {
  const { consoleId, dureeMinutes, prix } = req.body
  const row = await createTarification({ consoleId, dureeMinutes, prix })
  return res.status(201).json(row)
}

export async function getTarifications(req, res) {
  const rows = await listTarificationsByConsole(req.params.consoleId)
  return res.json(rows)
}

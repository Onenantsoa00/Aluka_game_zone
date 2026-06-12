import { createConsole, listConsoles } from '../models/consolesModel.js'

export async function getConsoles(_req, res) {
  const rows = await listConsoles()
  return res.json(rows)
}

export async function postConsole(req, res) {
  const { nom, marque, description } = req.body
  if (!nom) return res.status(400).json({ message: 'Nom de console requis' })
  const row = await createConsole({ nom, marque, description })
  return res.status(201).json(row)
}

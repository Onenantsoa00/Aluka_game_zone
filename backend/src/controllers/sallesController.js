import { createSalle, listSallesActives } from '../models/sallesModel.js'

export async function getSalles(req, res) {
  const rows = await listSallesActives()
  return res.json(rows)
}

export async function postSalle(req, res) {
  const { nom, adresse, bossId } = req.body
  const owner = req.user.role === 'boss' ? req.user.id : bossId
  const row = await createSalle({ nom, adresse, bossId: owner })
  return res.status(201).json(row)
}

import { createAbonnement, listAbonnements, setBossActif } from '../models/abonnementsModel.js'

export async function getAbonnements(req, res) {
  const rows = await listAbonnements()
  return res.json(rows)
}

export async function postAbonnement(req, res) {
  const { bossId, dateDebut, dateFin, montant, commentaire } = req.body
  const row = await createAbonnement({ bossId, dateDebut, dateFin, montant, commentaire })
  return res.status(201).json(row)
}

export async function patchBossBlocage(req, res) {
  const row = await setBossActif(req.params.bossId, req.body.actif)
  return res.json(row)
}

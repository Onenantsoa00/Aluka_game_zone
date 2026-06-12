import {
  createAffectation,
  createModele,
  listAffectations,
  listModeles,
} from '../models/paiementsModel.js'

export async function getModeles(_req, res) {
  const rows = await listModeles()
  return res.json(rows)
}

export async function postModele(req, res) {
  const { nomModele, typeModele, valeur, seuil, description } = req.body
  if (!nomModele || !typeModele || valeur == null) {
    return res.status(400).json({ message: 'nomModele, typeModele et valeur requis' })
  }
  const row = await createModele({ nomModele, typeModele, valeur, seuil, description })
  return res.status(201).json(row)
}

export async function getAffectations(_req, res) {
  const rows = await listAffectations()
  return res.json(rows)
}

export async function postAffectation(req, res) {
  const { jetonId, modeleId } = req.body
  if (!jetonId || !modeleId) {
    return res.status(400).json({ message: 'jetonId et modeleId requis' })
  }
  const row = await createAffectation({ jetonId, modeleId })
  return res.status(201).json(row)
}

import { addMouvementStock, createMateriel, listMateriels } from '../models/materielsModel.js'

export async function getMateriels(req, res) {
  const rows = await listMateriels()
  return res.json(rows)
}

export async function postMateriel(req, res) {
  const { salleId, nom, categorie, quantite, stockMinimum, etat } = req.body
  const row = await createMateriel({ salleId, nom, categorie, quantite, stockMinimum, etat })
  return res.status(201).json(row)
}

export async function postMouvement(req, res) {
  const { materielId, typeMouvement, quantite } = req.body
  const row = await addMouvementStock({
    materielId,
    typeMouvement,
    quantite,
    utilisateurId: req.user.id,
  })
  return res.json(row)
}

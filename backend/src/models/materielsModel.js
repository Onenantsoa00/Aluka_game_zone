import { query } from '../config/db.js'

export async function listMateriels() {
  const { rows } = await query(
    `SELECT m.*, s.nom AS salle_nom
     FROM materiels m JOIN salles s ON s.id=m.salle_id
     ORDER BY m.id DESC`,
  )
  return rows
}

export async function createMateriel({ salleId, nom, categorie, quantite, stockMinimum, etat }) {
  const { rows } = await query(
    `INSERT INTO materiels (salle_id, nom, categorie, quantite, stock_minimum, etat)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [salleId, nom, categorie || null, quantite || 0, stockMinimum || 0, etat || 'bon'],
  )
  return rows[0]
}

export async function addMouvementStock({ materielId, typeMouvement, quantite, utilisateurId }) {
  await query(
    `INSERT INTO mouvements_stock (materiel_id, type_mouvement, quantite, utilisateur_id)
     VALUES ($1,$2,$3,$4)`,
    [materielId, typeMouvement, quantite, utilisateurId],
  )

  const delta = typeMouvement === 'entree' ? quantite : -quantite
  const { rows } = await query(
    `UPDATE materiels SET quantite = GREATEST(0, quantite + $1)
     WHERE id=$2 RETURNING *`,
    [delta, materielId],
  )
  return rows[0]
}

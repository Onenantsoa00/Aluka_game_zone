import { query } from '../config/db.js'

export async function listModeles() {
  const { rows } = await query('SELECT * FROM modeles_paiement_jeton ORDER BY id ASC')
  return rows
}

export async function createModele({ nomModele, typeModele, valeur, seuil, description }) {
  const { rows } = await query(
    `INSERT INTO modeles_paiement_jeton (nom_modele, type_modele, valeur, seuil, description)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [nomModele, typeModele, valeur, seuil || null, description || null],
  )
  return rows[0]
}

export async function listAffectations() {
  const { rows } = await query(
    `SELECT a.*, u.nom AS jeton_nom, m.nom_modele, m.type_modele, m.valeur, m.seuil
     FROM affectation_paiement_jeton a
     JOIN utilisateurs u ON u.id=a.jeton_id
     JOIN modeles_paiement_jeton m ON m.id=a.modele_id
     WHERE a.actif=TRUE
     ORDER BY a.id DESC`,
  )
  return rows
}

export async function createAffectation({ jetonId, modeleId }) {
  await query(
    'UPDATE affectation_paiement_jeton SET actif=FALSE WHERE jeton_id=$1 AND actif=TRUE',
    [jetonId],
  )
  const { rows } = await query(
    `INSERT INTO affectation_paiement_jeton (jeton_id, modele_id, date_debut, actif)
     VALUES ($1,$2,CURRENT_DATE,TRUE) RETURNING *`,
    [jetonId, modeleId],
  )
  return rows[0]
}

import { query } from '../config/db.js'

export async function listModeles() {
  const { rows } = await query('SELECT * FROM modeles_paiement_jeton ORDER BY id ASC LIMIT 500')
  return rows
}

export async function findModeleById(id) {
  const { rows } = await query('SELECT * FROM modeles_paiement_jeton WHERE id=$1', [id])
  return rows[0]
}

export async function createModele({ nomModele, typeModele, valeur, seuil, description }) {
  const { rows } = await query(
    `INSERT INTO modeles_paiement_jeton (nom_modele, type_modele, valeur, seuil, description)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [nomModele, typeModele, valeur, seuil ?? null, description || null],
  )
  return rows[0]
}

export async function updateModele({ id, nomModele, typeModele, valeur, seuil, description }) {
  const { rows } = await query(
    `UPDATE modeles_paiement_jeton
     SET nom_modele = COALESCE($2, nom_modele),
         type_modele = COALESCE($3, type_modele),
         valeur = COALESCE($4, valeur),
         seuil = CASE WHEN $5::boolean THEN $6 ELSE seuil END,
         description = COALESCE($7, description)
     WHERE id=$1 RETURNING *`,
    [
      id,
      nomModele || null,
      typeModele || null,
      valeur === undefined ? null : valeur,
      seuil !== undefined,
      seuil === undefined ? null : seuil,
      description === undefined ? null : description,
    ],
  )
  return rows[0]
}

export async function deleteModele(id) {
  const { rows } = await query(
    'DELETE FROM modeles_paiement_jeton WHERE id=$1 RETURNING id, nom_modele',
    [id],
  )
  return rows[0]
}

export async function countAffectationsForModele(modeleId) {
  const { rows } = await query(
    'SELECT COUNT(*)::int AS total FROM affectation_paiement_jeton WHERE modele_id=$1 AND actif=TRUE',
    [modeleId],
  )
  return rows[0].total
}

export async function listAffectations() {
  const { rows } = await query(
    `SELECT a.*, u.nom AS jeton_nom, m.nom_modele, m.type_modele, m.valeur, m.seuil
     FROM affectation_paiement_jeton a
     JOIN utilisateurs u ON u.id=a.jeton_id
     JOIN modeles_paiement_jeton m ON m.id=a.modele_id
     WHERE a.actif=TRUE
     ORDER BY a.id DESC
     LIMIT 500`,
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

/** Recette nette (encaissements - remboursements) par operateur sur une periode. */
export async function recetteParJeton(dateDebut, dateFin) {
  const { rows } = await query(
    `SELECT u.id AS jeton_id, u.nom AS jeton_nom,
            COALESCE(SUM(CASE WHEN t.type_transaction='encaissement' THEN t.montant
                              WHEN t.type_transaction='remboursement' THEN -t.montant
                              ELSE 0 END), 0) AS recette
     FROM utilisateurs u
     JOIN roles r ON r.id=u.role_id AND r.nom='jeton'
     LEFT JOIN sessions_jeux sj ON sj.jeton_id=u.id
     LEFT JOIN transactions t ON t.session_id=sj.id
       AND t.date_transaction::date BETWEEN $1::date AND $2::date
     GROUP BY u.id
     ORDER BY u.nom`,
    [dateDebut, dateFin],
  )
  return rows
}

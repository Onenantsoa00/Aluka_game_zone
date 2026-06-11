import { query } from '../config/db.js'

export async function listAbonnements() {
  const { rows } = await query(
    `SELECT a.*, u.nom AS boss_nom
     FROM abonnements a
     JOIN utilisateurs u ON u.id=a.boss_id
     ORDER BY a.created_at DESC`,
  )
  return rows
}

export async function createAbonnement({ bossId, dateDebut, dateFin, montant, commentaire }) {
  const { rows } = await query(
    `INSERT INTO abonnements (boss_id, date_debut, date_fin, montant, commentaire, actif)
     VALUES ($1,$2,$3,$4,$5,TRUE) RETURNING *`,
    [bossId, dateDebut, dateFin, montant, commentaire || null],
  )
  return rows[0]
}

export async function setBossActif(bossId, actif) {
  const { rows } = await query('UPDATE utilisateurs SET actif=$1 WHERE id=$2 RETURNING id, actif', [
    actif,
    bossId,
  ])
  return rows[0]
}

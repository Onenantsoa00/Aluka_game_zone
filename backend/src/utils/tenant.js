import { query } from '../config/db.js'
import { httpError } from './errors.js'

/**
 * Multi-tenant (P2.11).
 *
 * `tenantId` est le boss proprietaire du perimetre :
 *  - admin  -> null (aucun filtre, vue plateforme)
 *  - boss   -> son propre id
 *  - jeton  -> le boss qui l'a cree (-1 si orphelin : aucune donnee visible)
 *
 * Toutes les lectures metier passent `tenantId` en parametre SQL et utilisent
 * la condition `($n::int IS NULL OR s.boss_id = $n)`. Les ecritures verifient
 * l'appartenance de la ressource avant d'agir.
 */
export function isPlatformAdmin(user) {
  return user?.role === 'admin'
}

/** Ajoute le parametre tenant et renvoie le fragment SQL a inserer. */
export function tenantFilter(params, tenantId, column = 's.boss_id') {
  params.push(tenantId)
  return `($${params.length}::int IS NULL OR ${column} = $${params.length})`
}

export function tenantClause(params, tenantId, column = 's.boss_id') {
  return `AND ${tenantFilter(params, tenantId, column)}`
}

export async function bossIdForSalle(salleId) {
  const { rows } = await query('SELECT boss_id FROM salles WHERE id=$1', [salleId])
  return rows[0]?.boss_id ?? null
}

export async function bossIdForPoste(posteId) {
  const { rows } = await query(
    'SELECT s.boss_id FROM postes p JOIN salles s ON s.id=p.salle_id WHERE p.id=$1',
    [posteId],
  )
  return rows[0]?.boss_id ?? null
}

export async function bossIdForSession(sessionId) {
  const { rows } = await query(
    `SELECT s.boss_id
     FROM sessions_jeux sj
     JOIN postes p ON p.id=sj.poste_id
     JOIN salles s ON s.id=p.salle_id
     WHERE sj.id=$1`,
    [sessionId],
  )
  return rows[0]?.boss_id ?? null
}

export async function bossIdForTournoi(tournoiId) {
  const { rows } = await query(
    'SELECT s.boss_id FROM tournois t JOIN salles s ON s.id=t.salle_id WHERE t.id=$1',
    [tournoiId],
  )
  return rows[0]?.boss_id ?? null
}

export async function bossIdForMateriel(materielId) {
  const { rows } = await query(
    'SELECT s.boss_id FROM materiels m JOIN salles s ON s.id=m.salle_id WHERE m.id=$1',
    [materielId],
  )
  return rows[0]?.boss_id ?? null
}

export async function bossIdForCompte(compteId) {
  const { rows } = await query('SELECT cree_par FROM utilisateurs WHERE id=$1', [compteId])
  return rows[0]?.cree_par ?? null
}

/** 404 volontaire (et non 403) : on ne revele pas l'existence d'une ressource d'autrui. */
export function assertTenant(user, resourceBossId, label = 'Ressource') {
  if (isPlatformAdmin(user)) return
  if (!resourceBossId || Number(resourceBossId) !== Number(user.tenantId)) {
    throw httpError(404, `${label} introuvable`)
  }
}

/** Empeche un operateur d'ecrire hors de son perimetre. */
export function assertCanWrite(user, resourceBossId, label = 'Ressource') {
  if (isPlatformAdmin(user)) return
  if (!resourceBossId || Number(resourceBossId) !== Number(user.tenantId)) {
    throw httpError(404, `${label} introuvable`)
  }
}

export async function assertSalleAccess(user, salleId, label = 'Salle') {
  const bossId = await bossIdForSalle(salleId)
  assertTenant(user, bossId, label)
  return bossId
}

/**
 * Erreur HTTP portant un code de statut. Le middleware d'erreurs de server.js
 * renvoie `{ message }` avec ce statut.
 */
export function httpError(statusCode, message, details) {
  const error = new Error(message)
  error.statusCode = statusCode
  if (details) error.details = details
  return error
}

/** Erreur PostgreSQL connue -> erreur HTTP lisible. */
export function translateDbError(error) {
  if (!error || !error.code) return error
  if (error.code === '23505') {
    if (String(error.constraint || '').includes('sessions_jeux_active_poste_uniq')) {
      return httpError(409, 'Ce poste a deja une session active')
    }
    if (String(error.constraint || '').includes('postes_nom_par_salle_uniq')) {
      return httpError(409, 'Un poste porte deja ce nom dans cette salle')
    }
    if (String(error.constraint || '').includes('tarifications_console_duree_uniq')) {
      return httpError(409, 'Une tarification existe deja pour cette duree')
    }
    if (String(error.constraint || '').includes('username')) {
      return httpError(409, "Cet identifiant est deja utilise")
    }
    return httpError(409, 'Cette valeur existe deja')
  }
  if (error.code === '23503') {
    return httpError(409, 'Element reference par d\'autres donnees : operation impossible')
  }
  if (error.code === '23514') {
    return httpError(400, 'Valeur non autorisee')
  }
  return error
}

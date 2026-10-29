export function mapPosteStatut(statut, disponible = true, actif = true) {
  if (!actif || disponible === false) return 'off'
  if (statut === 'occupe') return 'occupied'
  if (statut === 'pause') return 'reserved'
  return 'available'
}

export function consoleIcon(consoleNom) {
  if (!consoleNom) return '??'
  const n = consoleNom.toUpperCase()
  if (n.includes('PS')) return 'PS'
  if (n.includes('XBOX') || n.includes('XB')) return 'XB'
  if (n.includes('PC')) return 'PC'
  if (n.includes('SWITCH')) return 'SW'
  return consoleNom.substring(0, 2).toUpperCase()
}

export function mapPosteForCard(poste, activeSession = null) {
  return {
    id: poste.id,
    name: poste.nom_poste || poste.numero_poste || `Poste ${poste.id}`,
    icon: consoleIcon(poste.console_nom),
    game: activeSession?.jeu_nom || '',
    time: activeSession ? formatSessionTime(activeSession) : '',
    overtime: Boolean(activeSession?.depassement),
    status: mapPosteStatut(
      activeSession?.statut === 'pause' ? 'pause' : poste.statut,
      poste.disponible,
      poste.actif,
    ),
    salle: poste.salle_nom,
    console: poste.console_nom,
    sessionId: activeSession?.id || null,
  }
}

/**
 * Le temps ecoule est calcule par le serveur (pauses deduites, y compris la
 * pause ouverte) : il ne court donc plus pendant une pause et ne peut pas
 * afficher 3333 h (O5).
 */
export function formatSessionTime(session) {
  if (!session) return ''
  let minutes = Number(session.elapsed_minutes)
  if (!Number.isFinite(minutes)) {
    if (!session.heure_debut) return ''
    minutes = Math.floor((Date.now() - new Date(session.heure_debut).getTime()) / 60000)
    minutes -= Number(session.pause_minutes) || 0
  }
  return formatMinutes(minutes)
}

export function formatMinutes(value) {
  const total = Math.max(0, Math.round(Number(value) || 0))
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`
}

export function formatAriary(amount) {
  const n = Number(amount) || 0
  return `${n.toLocaleString('fr-FR')} Ar`
}

export const TYPE_MODELE_OPTIONS = [
  { value: 'fraction', label: 'Fraction (0–1, ex. 1/3 = 0.3333)' },
  { value: 'pourcentage', label: 'Pourcentage (ex: 20%)' },
  { value: 'fixe_journalier', label: 'Salaire fixe / jour' },
  { value: 'pourcentage_seuil', label: '% après seuil de recette' },
]

export function describeModele(m) {
  if (!m) return ''
  const valeur = Number(m.valeur)
  switch (m.type_modele) {
    case 'fraction':
      if (Math.abs(valeur - 1 / 3) < 0.01) return '1/3 de la recette'
      return `${(valeur * 100).toFixed(1)} % de la recette`
    case 'pourcentage':
      return `${valeur}% de la recette`
    case 'fixe_journalier':
      return `${formatAriary(valeur)} / jour`
    case 'pourcentage_seuil':
      return `${valeur}% après ${formatAriary(m.seuil)}`
    default:
      return m.description || m.nom_modele
  }
}

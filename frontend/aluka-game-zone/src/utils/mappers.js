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

function formatSessionTime(session) {
  if (!session?.heure_debut) return ''
  const start = new Date(session.heure_debut)
  const diff = Math.floor((Date.now() - start.getTime()) / 60000)
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`
}

export function formatAriary(amount) {
  const n = Number(amount) || 0
  return `${n.toLocaleString('fr-FR')} Ar`
}

export const TYPE_MODELE_OPTIONS = [
  { value: 'fraction', label: 'Fraction (ex: 1/3)' },
  { value: 'pourcentage', label: 'Pourcentage (ex: 20%)' },
  { value: 'fixe_journalier', label: 'Salaire fixe / jour' },
  { value: 'pourcentage_seuil', label: '% après seuil de recette' },
]

export function describeModele(m) {
  if (!m) return ''
  switch (m.type_modele) {
    case 'fraction':
      return `${m.valeur} de la recette`
    case 'pourcentage':
      return `${m.valeur}% de la recette`
    case 'fixe_journalier':
      return `${m.valeur} Ar / jour`
    case 'pourcentage_seuil':
      return `${m.valeur}% après ${m.seuil} Ar`
    default:
      return m.description || m.nom_modele
  }
}

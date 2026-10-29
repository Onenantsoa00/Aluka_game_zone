export const TYPES_MODELE = [
  'fraction',
  'pourcentage',
  'fixe_journalier',
  'pourcentage_seuil',
]

/**
 * Regle unique de calcul, partagee par l'API et le front (O7).
 * - fraction          : valeur = part de la recette (0..1)
 * - pourcentage       : valeur = pourcentage (0..100)
 * - fixe_journalier   : valeur = montant par jour
 * - pourcentage_seuil : valeur = % applique a la recette au-dela du seuil
 */
export function computeRemuneration({ recette = 0, modele, jours = 1 }) {
  if (!modele) return 0
  const valeur = Number(modele.valeur) || 0
  const base = Math.max(0, Number(recette) || 0)
  switch (modele.type_modele) {
    case 'fraction':
      return round2(base * valeur)
    case 'pourcentage':
      return round2((base * valeur) / 100)
    case 'fixe_journalier':
      return round2(valeur * Math.max(1, jours))
    case 'pourcentage_seuil':
      return round2((Math.max(0, base - (Number(modele.seuil) || 0)) * valeur) / 100)
    default:
      return 0
  }
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

import { getEtatAbonnementCached } from '../services/abonnement.js'

/**
 * Bloque les operations metier d'un boss (et de ses operateurs) lorsque
 * l'abonnement est expire. L'admin n'est jamais bloque. Les routes de
 * facturation restent accessibles pour permettre le renouvellement.
 */
export async function requireSubscription(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Non authentifie' })
    if (req.user.role === 'admin') return next()

    const etat = await getEtatAbonnementCached(req.user.tenantId)
    if (!etat.actif) {
      return res.status(402).json({
        message:
          req.user.role === 'boss'
            ? 'Votre abonnement a expiré. Renouvelez pour 30 000 Ar par Mobile Money.'
            : 'L’abonnement de votre salle a expiré. Contactez votre gérant.',
        code: 'ABONNEMENT_EXPIRE',
        abonnement: etat,
      })
    }
    req.abonnement = etat
    return next()
  } catch (error) {
    return next(error)
  }
}

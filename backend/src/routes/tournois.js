import { Router } from 'express'
import { requireRoles } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  deleteParticipant,
  getTournoi,
  getTournois,
  postDemarrer,
  postParticipant,
  postResultat,
  postReinitialiser,
  postTournoi,
} from '../controllers/tournoisController.js'

const router = Router()

router.get('/', asyncHandler(getTournois))
router.get('/:id', asyncHandler(getTournoi))
router.post('/', requireRoles('admin', 'boss'), asyncHandler(postTournoi))

// Inscriptions ouvertes au personnel de la salle (jeton inclus).
router.post(
  '/:id/participants',
  requireRoles('admin', 'boss', 'jeton'),
  asyncHandler(postParticipant),
)
router.delete(
  '/:id/participants/:participantId',
  requireRoles('admin', 'boss', 'jeton'),
  asyncHandler(deleteParticipant),
)

// Le deroulement du tableau est reserve a la gestion.
router.post('/:id/demarrer', requireRoles('admin', 'boss'), asyncHandler(postDemarrer))
router.post(
  '/:id/matchs/:matchId/resultat',
  requireRoles('admin', 'boss'),
  asyncHandler(postResultat),
)
router.post('/:id/reinitialiser', requireRoles('admin', 'boss'), asyncHandler(postReinitialiser))

export default router

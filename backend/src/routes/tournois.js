import { Router } from 'express'
import { requireRoles } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { getTournois, postParticipant, postTournoi } from '../controllers/tournoisController.js'

const router = Router()

router.get('/', asyncHandler(getTournois))
router.post('/', requireRoles('admin', 'boss'), asyncHandler(postTournoi))
router.post('/:id/participants', requireRoles('admin', 'boss', 'jeton'), asyncHandler(postParticipant))

export default router

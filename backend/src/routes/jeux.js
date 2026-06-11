import { Router } from 'express'
import { requireRoles } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { getJeux, getTarifications, postJeu, postTarification } from '../controllers/jeuxController.js'

const router = Router()

router.get('/', asyncHandler(getJeux))
router.post('/', requireRoles('admin', 'boss'), asyncHandler(postJeu))
router.post('/tarifications', requireRoles('admin', 'boss'), asyncHandler(postTarification))
router.get('/tarifications/:consoleId', asyncHandler(getTarifications))

export default router

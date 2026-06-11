import { Router } from 'express'
import { requireRoles } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { getMateriels, postMateriel, postMouvement } from '../controllers/materielsController.js'

const router = Router()

router.get('/', asyncHandler(getMateriels))
router.post('/', requireRoles('admin', 'boss', 'jeton'), asyncHandler(postMateriel))
router.post('/mouvements', requireRoles('admin', 'boss', 'jeton'), asyncHandler(postMouvement))

export default router

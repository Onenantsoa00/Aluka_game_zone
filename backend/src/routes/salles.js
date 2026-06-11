import { Router } from 'express'
import { requireRoles } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { getSalles, postSalle } from '../controllers/sallesController.js'

const router = Router()

router.get('/', asyncHandler(getSalles))
router.post('/', requireRoles('admin', 'boss'), asyncHandler(postSalle))

export default router

import { Router } from 'express'
import { requireRoles } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { getPostes, postPoste } from '../controllers/postesController.js'

const router = Router()

router.get('/', asyncHandler(getPostes))
router.post('/', requireRoles('admin', 'boss'), asyncHandler(postPoste))

export default router

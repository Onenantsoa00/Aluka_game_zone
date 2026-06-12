import { Router } from 'express'
import { getConsoles, postConsole } from '../controllers/consolesController.js'
import { requireRoles } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.get('/', asyncHandler(getConsoles))
router.post('/', requireRoles('admin', 'boss'), asyncHandler(postConsole))

export default router

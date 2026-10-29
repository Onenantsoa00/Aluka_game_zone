import { Router } from 'express'
import { requireRoles } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { getAudit } from '../controllers/auditController.js'

const router = Router()

router.get('/', requireRoles('admin'), asyncHandler(getAudit))

export default router

import { Router } from 'express'
import { requireRoles } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { getZ, getZCsv, getZTicket } from '../controllers/rapportsController.js'

const router = Router()

router.get('/z', requireRoles('admin', 'boss'), asyncHandler(getZ))
router.get('/z.csv', requireRoles('admin', 'boss'), asyncHandler(getZCsv))
router.get('/z/ticket', requireRoles('admin', 'boss'), asyncHandler(getZTicket))

export default router

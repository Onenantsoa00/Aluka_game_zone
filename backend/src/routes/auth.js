import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { login, logout, me, refresh } from '../controllers/authController.js'

const router = Router()

router.post('/login', asyncHandler(login))
router.get('/me', requireAuth, asyncHandler(me))
router.post('/refresh', requireAuth, asyncHandler(refresh))
router.post('/logout', requireAuth, asyncHandler(logout))

export default router

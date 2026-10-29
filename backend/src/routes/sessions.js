import { Router } from 'express'
import { requireRoles } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  addSessionPaymentController,
  extendSession,
  getSessions,
  getSessionsAVerifier,
  getSessionsCount,
  pauseCurrentSession,
  resumeCurrentSession,
  startSession,
  stopSession,
  verifySessionController,
} from '../controllers/sessionsController.js'

const router = Router()

router.get('/', asyncHandler(getSessions))
router.get('/a-verifier', asyncHandler(getSessionsAVerifier))
router.get('/count', asyncHandler(getSessionsCount))

// Toute operation de caisse est reservee aux comptes habilités (O4).
router.post('/start', requireRoles('admin', 'boss', 'jeton'), asyncHandler(startSession))
router.post('/:id/pause', requireRoles('admin', 'boss', 'jeton'), asyncHandler(pauseCurrentSession))
router.post('/:id/resume', requireRoles('admin', 'boss', 'jeton'), asyncHandler(resumeCurrentSession))
router.post('/:id/stop', requireRoles('admin', 'boss', 'jeton'), asyncHandler(stopSession))
router.post(
  '/:id/paiements',
  requireRoles('admin', 'boss', 'jeton'),
  asyncHandler(addSessionPaymentController),
)
router.post('/:id/prolongation', requireRoles('admin', 'boss', 'jeton'), asyncHandler(extendSession))
router.patch('/:id/verifier', requireRoles('admin', 'boss'), asyncHandler(verifySessionController))

export default router

import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  getSessions,
  pauseCurrentSession,
  resumeCurrentSession,
  startSession,
  stopSession,
} from '../controllers/sessionsController.js'

const router = Router()

router.get('/', asyncHandler(getSessions))
router.post('/start', asyncHandler(startSession))
router.post('/:id/pause', asyncHandler(pauseCurrentSession))
router.post('/:id/resume', asyncHandler(resumeCurrentSession))
router.post('/:id/stop', asyncHandler(stopSession))

export default router

import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  getReservations,
  patchReservationStatut,
  postReservation,
  removeReservation,
} from '../controllers/reservationsController.js'

const router = Router()

router.get('/', asyncHandler(getReservations))
router.post('/', asyncHandler(postReservation))
router.patch('/:id/statut', asyncHandler(patchReservationStatut))
router.delete('/:id', asyncHandler(removeReservation))

export default router

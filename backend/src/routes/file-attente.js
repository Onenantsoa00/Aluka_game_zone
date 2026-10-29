import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  getFileAttente,
  patchFileAttenteStatut,
  postFileAttente,
  removeFileAttente,
} from '../controllers/reservationsController.js'

const router = Router()

router.get('/', asyncHandler(getFileAttente))
router.post('/', asyncHandler(postFileAttente))
router.patch('/:id/statut', asyncHandler(patchFileAttenteStatut))
router.delete('/:id', asyncHandler(removeFileAttente))

export default router

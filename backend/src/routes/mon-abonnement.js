import { Router } from 'express'
import { requireRoles } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  getMesNotifications,
  getMonAbonnement,
  postMaDemande,
  postNotificationsLues,
} from '../controllers/abonnementsController.js'

const router = Router()

// Espace facturation : jamais bloque par l'expiration, sinon impossible de payer.
router.use(requireRoles('boss'))

router.get('/', asyncHandler(getMonAbonnement))
router.post('/demandes', asyncHandler(postMaDemande))
router.get('/notifications', asyncHandler(getMesNotifications))
router.post('/notifications/lu', asyncHandler(postNotificationsLues))

export default router

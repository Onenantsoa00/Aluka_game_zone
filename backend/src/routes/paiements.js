import { Router } from 'express'
import {
  getAffectations,
  getModeles,
  postAffectation,
  postModele,
} from '../controllers/paiementsController.js'
import { requireRoles } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.get('/modeles', asyncHandler(getModeles))
router.post('/modeles', requireRoles('admin', 'boss'), asyncHandler(postModele))
router.get('/affectations', asyncHandler(getAffectations))
router.post('/affectations', requireRoles('admin', 'boss'), asyncHandler(postAffectation))

export default router

import { Router } from 'express'
import {
  deleteModeleController,
  getAffectations,
  getModeles,
  getRemunerations,
  postAffectation,
  postModele,
  putModele,
} from '../controllers/paiementsController.js'
import { requireRoles } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

// admin + boss uniquement (O4) : un operateur n'a pas a voir les modeles de paie.
router.get('/modeles', requireRoles('admin', 'boss'), asyncHandler(getModeles))
router.post('/modeles', requireRoles('admin', 'boss'), asyncHandler(postModele))
router.put('/modeles/:id', requireRoles('admin', 'boss'), asyncHandler(putModele))
router.delete('/modeles/:id', requireRoles('admin', 'boss'), asyncHandler(deleteModeleController))
router.get('/affectations', requireRoles('admin', 'boss'), asyncHandler(getAffectations))
router.post('/affectations', requireRoles('admin', 'boss'), asyncHandler(postAffectation))
router.get('/remunerations', requireRoles('admin', 'boss'), asyncHandler(getRemunerations))

export default router

import { Router } from 'express'
import { requireRoles } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  getAbonnements,
  getDemandes,
  patchBossBlocage,
  postAbonnement,
  postRefuserDemande,
  postValiderDemande,
} from '../controllers/abonnementsController.js'

const router = Router()

router.use(requireRoles('admin'))

router.get('/', asyncHandler(getAbonnements))
router.get('/demandes', asyncHandler(getDemandes))
router.post('/demandes/:id/valider', asyncHandler(postValiderDemande))
router.post('/demandes/:id/refuser', asyncHandler(postRefuserDemande))
router.post('/', asyncHandler(postAbonnement))
router.patch('/boss/:bossId/blocage', asyncHandler(patchBossBlocage))

export default router

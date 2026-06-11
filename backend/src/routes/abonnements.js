import { Router } from 'express'
import { requireRoles } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  getAbonnements,
  patchBossBlocage,
  postAbonnement,
} from '../controllers/abonnementsController.js'

const router = Router()

router.get('/', requireRoles('admin'), asyncHandler(getAbonnements))
router.post('/', requireRoles('admin'), asyncHandler(postAbonnement))
router.patch('/boss/:bossId/blocage', requireRoles('admin'), asyncHandler(patchBossBlocage))

export default router

import { Router } from 'express'
import { requireRoles } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { getComptes, patchCompteActif, postCompte } from '../controllers/comptesController.js'

const router = Router()

router.get('/', asyncHandler(getComptes))
router.post('/', requireRoles('admin', 'boss'), asyncHandler(postCompte))
router.patch('/:id/actif', requireRoles('admin'), asyncHandler(patchCompteActif))

export default router

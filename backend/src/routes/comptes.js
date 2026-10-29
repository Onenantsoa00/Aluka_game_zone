import { Router } from 'express'
import { requireRoles } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  deleteCompte,
  getComptes,
  patchCompteActif,
  postCompte,
  putCompte,
} from '../controllers/comptesController.js'

const router = Router()

// admin : tous les comptes ; boss : son compte + ses jetons ; jeton : 403 (O4).
router.get('/', requireRoles('admin', 'boss'), asyncHandler(getComptes))
router.post('/', requireRoles('admin', 'boss'), asyncHandler(postCompte))
router.put('/:id', requireRoles('admin', 'boss'), asyncHandler(putCompte))
router.patch('/:id/actif', requireRoles('admin', 'boss'), asyncHandler(patchCompteActif))
router.delete('/:id', requireRoles('admin', 'boss'), asyncHandler(deleteCompte))

export default router

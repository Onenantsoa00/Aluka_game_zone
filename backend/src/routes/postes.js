import { Router } from 'express'
import { requireRoles } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  deletePoste,
  getPostes,
  postPoste,
  putPoste,
} from '../controllers/postesController.js'

const router = Router()

router.get('/', asyncHandler(getPostes))
router.post('/', requireRoles('admin', 'boss'), asyncHandler(postPoste))
router.put('/:id', requireRoles('admin', 'boss'), asyncHandler(putPoste))
router.delete('/:id', requireRoles('admin', 'boss'), asyncHandler(deletePoste))

export default router

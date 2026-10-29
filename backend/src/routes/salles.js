import { Router } from 'express'
import { requireRoles } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  deleteSalle,
  getSalles,
  postSalle,
  putSalle,
} from '../controllers/sallesController.js'

const router = Router()

router.get('/', asyncHandler(getSalles))
router.post('/', requireRoles('admin', 'boss'), asyncHandler(postSalle))
router.put('/:id', requireRoles('admin', 'boss'), asyncHandler(putSalle))
router.delete('/:id', requireRoles('admin', 'boss'), asyncHandler(deleteSalle))

export default router

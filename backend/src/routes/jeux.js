import { Router } from 'express'
import { requireRoles } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  deleteJeu,
  deleteTarificationController,
  getJeux,
  getTarifications,
  postJeu,
  postTarification,
  putJeu,
  putTarification,
} from '../controllers/jeuxController.js'

const router = Router()

router.get('/', asyncHandler(getJeux))
router.post('/', requireRoles('admin', 'boss'), asyncHandler(postJeu))
router.put('/:id', requireRoles('admin', 'boss'), asyncHandler(putJeu))
router.delete('/:id', requireRoles('admin', 'boss'), asyncHandler(deleteJeu))

router.post('/tarifications', requireRoles('admin', 'boss'), asyncHandler(postTarification))
router.get('/tarifications/:consoleId', asyncHandler(getTarifications))
router.put('/tarifications/:id', requireRoles('admin', 'boss'), asyncHandler(putTarification))
router.delete(
  '/tarifications/:id',
  requireRoles('admin', 'boss'),
  asyncHandler(deleteTarificationController),
)

export default router

import express from 'express'
import {
  getAllSchedulers,
  getSchedulerById,
  createScheduler,
  updateScheduler,
  deleteScheduler,
  runScheduler,
  toggleScheduler
} from '../controllers/schedulerController.js'
import { adminAuth } from '../middleware/auth.js'

const router = express.Router()

router.use(adminAuth)

router.get('/', getAllSchedulers)
router.get('/:id', getSchedulerById)
router.post('/', createScheduler)
router.put('/:id', updateScheduler)
router.delete('/:id', deleteScheduler)
router.post('/:id/run', runScheduler)
router.patch('/:id/toggle', toggleScheduler)

export default router

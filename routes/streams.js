import express from 'express'
import {
  getAllStreams,
  getStreamById,
  createStream,
  updateStream,
  deleteStream,
  toggleStreamActive
} from '../controllers/streamController.js'

const router = express.Router()

router.get('/', getAllStreams)
router.get('/:id', getStreamById)
router.post('/', createStream)
router.put('/:id', updateStream)
router.delete('/:id', deleteStream)
router.patch('/:id/toggle', toggleStreamActive)

export default router

import express from 'express'
import {
  getAllChannels,
  getChannelById,
  createChannel,
  updateChannel,
  deleteChannel,
  toggleChannelActive
} from '../controllers/channelController.js'
import { adminAuth } from '../middleware/auth.js'

const router = express.Router()

// Public reads
router.get('/', getAllChannels)
router.get('/:id', getChannelById)

// Admin writes
router.post('/', adminAuth, createChannel)
router.put('/:id', adminAuth, updateChannel)
router.delete('/:id', adminAuth, deleteChannel)
router.patch('/:id/toggle', adminAuth, toggleChannelActive)

export default router

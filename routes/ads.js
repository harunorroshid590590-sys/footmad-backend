import express from 'express'
import {
  getAllAds,
  getActiveAds,
  getAdById,
  createAd,
  updateAd,
  deleteAd,
  trackImpression,
  trackClick
} from '../controllers/adController.js'
import { adminAuth } from '../middleware/auth.js'

const router = express.Router()

// Public routes
router.get('/active', getActiveAds)
router.get('/:id/track-impression', trackImpression)
router.get('/:id/track-click', trackClick)

// Admin routes
router.use(adminAuth)
router.get('/', getAllAds)
router.get('/:id', getAdById)
router.post('/', createAd)
router.put('/:id', updateAd)
router.delete('/:id', deleteAd)

export default router

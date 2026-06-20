import express from 'express'
import {
  getAdConfig,
  getVastAd,
  updateAdConfig,
  updateBannerAds,
  updatePopunderAds,
  updateDirectLinkAds,
  updateAdSettings
} from '../controllers/adConfigController.js'
import { adminAuth } from '../middleware/auth.js'

const router = express.Router()

// Public routes
router.get('/', getAdConfig)
router.get('/vast', getVastAd)

// Admin routes
router.use(adminAuth)
router.put('/', updateAdConfig)
router.put('/banner/:position', updateBannerAds)
router.put('/popunder/:device', updatePopunderAds)
router.put('/direct-link', updateDirectLinkAds)
router.put('/settings', updateAdSettings)

export default router

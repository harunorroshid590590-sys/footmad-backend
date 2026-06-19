import express from 'express'
import {
  getAdConfig,
  updateAdConfig,
  updateBannerAds,
  updatePopunderAds,
  updateDirectLinkAds,
  updateAdSettings
} from '../controllers/adConfigController.js'
import { adminAuth } from '../middleware/auth.js'

const router = express.Router()

// Public route for getting ad config
router.get('/', getAdConfig)

// Admin routes
router.use(adminAuth)
router.put('/', updateAdConfig)
router.put('/banner/:position', updateBannerAds)
router.put('/popunder/:device', updatePopunderAds)
router.put('/direct-link', updateDirectLinkAds)
router.put('/settings', updateAdSettings)

export default router

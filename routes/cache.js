import express from 'express'
import { getCacheStats, clearCacheEndpoint, refreshCache } from '../controllers/cacheController.js'
import { adminAuth } from '../middleware/auth.js'

const router = express.Router()

router.use(adminAuth)

router.get('/stats', getCacheStats)
router.delete('/clear', clearCacheEndpoint)
router.post('/refresh', refreshCache)

export default router

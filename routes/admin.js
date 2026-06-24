import express from 'express'
import {
  getStats,
  getAllMatchesAdmin,
  getAllStreamsAdmin,
  getAllCategoriesAdmin,
  getSettings,
  updateSettings,
  syncAPI,
  initializeCategories,
  getOverrides,
  upsertOverride,
  deleteOverride,
  updateMatchLinks,
  updateProviderMatch,
  resetMatchLinks,
  setMatchHidden,
  createCustomMatch,
  updateCustomMatch,
  deleteCustomMatch
} from '../controllers/adminController.js'
import { adminAuth } from '../middleware/auth.js'

const router = express.Router()

router.use(adminAuth)

router.get('/stats', getStats)
router.get('/matches', getAllMatchesAdmin)
router.put('/matches/:matchId/links', updateMatchLinks)
router.put('/matches/:matchId', updateProviderMatch)
router.post('/matches/:matchId/reset', resetMatchLinks)
router.post('/matches/:matchId/hide', setMatchHidden)
router.post('/custom-matches', createCustomMatch)
router.put('/custom-matches/:matchId', updateCustomMatch)
router.delete('/custom-matches/:matchId', deleteCustomMatch)
router.get('/streams', getAllStreamsAdmin)
router.get('/categories', getAllCategoriesAdmin)
router.get('/settings', getSettings)
router.post('/settings', updateSettings)
router.post('/sync', syncAPI)
router.post('/initialize-categories', initializeCategories)
router.get('/overrides', getOverrides)
router.post('/overrides', upsertOverride)
router.delete('/overrides/:matchId', deleteOverride)

export default router

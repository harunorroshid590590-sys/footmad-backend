import express from 'express'
import {
  getAllMatches,
  getMatchById,
  createMatch,
  updateMatch,
  deleteMatch,
  getLiveMatches,
  getUpcomingMatches,
  getMatchesByCategory,
  togglePin,
  toggleFeature
} from '../controllers/matchController.js'

const router = express.Router()

router.get('/', getAllMatches)
router.get('/live', getLiveMatches)
router.get('/upcoming', getUpcomingMatches)
router.get('/category/:category', getMatchesByCategory)
router.get('/:id', getMatchById)
router.post('/', createMatch)
router.put('/:id', updateMatch)
router.delete('/:id', deleteMatch)
router.patch('/:id/pin', togglePin)
router.patch('/:id/feature', toggleFeature)

export default router

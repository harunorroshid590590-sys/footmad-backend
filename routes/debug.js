import express from 'express'
import { fetchFromExternalAPI, syncWithAPI, getCachedMatches, clearCache } from '../utils/api.js'

const router = express.Router()

// Get raw API response from provider
router.get('/raw', async (req, res) => {
  try {
    const result = await fetchFromExternalAPI()
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get normalized matches
router.get('/normalized', async (req, res) => {
  try {
    const result = await syncWithAPI()
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get cache status
router.get('/cache', async (req, res) => {
  try {
    const { matches, fresh, age } = getCachedMatches()
    res.json({
      matchesCount: matches.length,
      fresh,
      age: age ? `${Math.floor(age / 1000)}s` : null,
      sample: matches.slice(0, 3)
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Clear cache
router.delete('/cache', async (req, res) => {
  try {
    clearCache()
    res.json({ message: 'Cache cleared' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router

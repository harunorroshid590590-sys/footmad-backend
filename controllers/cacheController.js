import { getCache, setCache, deleteCache, clearCache, getCacheStats as getCacheStatsUtil } from '../utils/cache.js'

export const getCacheStats = async (req, res) => {
  try {
    const stats = await getCacheStatsUtil()
    res.json(stats)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const clearCacheEndpoint = async (req, res) => {
  try {
    const { key } = req.query
    
    if (key) {
      await deleteCache(key)
      res.json({ message: `Cache cleared for key: ${key}` })
    } else {
      await clearCache()
      res.json({ message: 'All cache cleared' })
    }
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const refreshCache = async (req, res) => {
  try {
    const { syncWithAPI } = await import('../utils/api.js')
    
    // Clear existing cache
    await clearCache()
    
    // Sync with API
    const result = await syncWithAPI()
    
    res.json({
      message: 'Cache refreshed',
      syncResult: result
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

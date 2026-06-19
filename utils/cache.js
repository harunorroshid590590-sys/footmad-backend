import ApiCache from '../models/ApiCache.js'
import ApiUsage from '../models/ApiUsage.js'

// In-memory cache for faster access
const memoryCache = new Map()
const MEMORY_CACHE_TTL = 300000 // 5 minutes

export const getCache = async (key) => {
  try {
    // Check memory cache first
    const memoryEntry = memoryCache.get(key)
    if (memoryEntry && Date.now() < memoryEntry.expiresAt) {
      console.log('Cache hit (memory):', key)
      await incrementCacheHit()
      return memoryEntry.data
    }

    // Check database cache
    const dbEntry = await ApiCache.findOne({ key, expiresAt: { $gt: new Date() } })
    if (dbEntry) {
      console.log('Cache hit (database):', key)
      await incrementCacheHit()
      
      // Update memory cache
      memoryCache.set(key, {
        data: dbEntry.data,
        expiresAt: dbEntry.expiresAt.getTime()
      })
      
      return dbEntry.data
    }

    console.log('Cache miss:', key)
    return null
  } catch (error) {
    console.error('Cache get error:', error)
    return null
  }
}

export const setCache = async (key, data, ttl = 300) => {
  try {
    const expiresAt = new Date(Date.now() + ttl * 1000)
    
    // Update memory cache
    memoryCache.set(key, {
      data,
      expiresAt: expiresAt.getTime()
    })
    
    // Update database cache
    await ApiCache.findOneAndUpdate(
      { key },
      { data, ttl, expiresAt, $inc: { hitCount: 1 } },
      { upsert: true, new: true }
    )
    
    console.log('Cache set:', key, 'TTL:', ttl + 's')
    return true
  } catch (error) {
    console.error('Cache set error:', error)
    return false
  }
}

export const deleteCache = async (key) => {
  try {
    memoryCache.delete(key)
    await ApiCache.deleteOne({ key })
    console.log('Cache deleted:', key)
    return true
  } catch (error) {
    console.error('Cache delete error:', error)
    return false
  }
}

export const clearCache = async () => {
  try {
    memoryCache.clear()
    await ApiCache.deleteMany({})
    console.log('All cache cleared')
    return true
  } catch (error) {
    console.error('Cache clear error:', error)
    return false
  }
}

export const incrementCacheHit = async () => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    await ApiUsage.findOneAndUpdate(
      { date: today },
      { $inc: { cached: 1, requests: 1 } },
      { upsert: true }
    )
  } catch (error) {
    console.error('Cache hit increment error:', error)
  }
}

export const incrementApiCall = async (success = true) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const update = {
      $inc: { requests: 1 }
    }
    
    if (success) {
      update.$inc.successful = 1
    } else {
      update.$inc.failed = 1
    }
    
    await ApiUsage.findOneAndUpdate(
      { date: today },
      update,
      { upsert: true }
    )
  } catch (error) {
    console.error('API call increment error:', error)
  }
}

export const getCacheStats = async () => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const stats = await ApiUsage.findOne({ date: today })
    const cacheSize = await ApiCache.countDocuments()
    
    return {
      today: stats || { requests: 0, successful: 0, failed: 0, cached: 0, cacheHitRate: 0 },
      cacheSize,
      memoryCacheSize: memoryCache.size
    }
  } catch (error) {
    console.error('Cache stats error:', error)
    return null
  }
}

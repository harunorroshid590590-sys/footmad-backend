import Match from '../models/Match.js'
import Stream from '../models/Stream.js'
import Category from '../models/Category.js'
import Settings from '../models/Settings.js'
import MatchOverride from '../models/MatchOverride.js'
import { syncWithAPI, clearCache } from '../utils/api.js'

export const getStats = async (req, res) => {
  try {
    const totalMatches = await Match.countDocuments()
    const liveMatches = await Match.countDocuments({ status: 'live' })
    const totalStreams = await Stream.countDocuments()
    const categories = await Category.countDocuments()
    
    res.json({
      totalMatches,
      liveMatches,
      totalStreams,
      categories
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getAllMatchesAdmin = async (req, res) => {
  try {
    const matches = await Match.find()
      .populate('streams')
      .sort({ createdAt: -1 })
    
    res.json(matches)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getAllStreamsAdmin = async (req, res) => {
  try {
    const streams = await Stream.find().sort({ createdAt: -1 })
    res.json(streams)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getAllCategoriesAdmin = async (req, res) => {
  try {
    const categories = await Category.find().sort({ order: 1 })
    
    // Add match count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const count = await Match.countDocuments({ category: category.name })
        return {
          ...category.toObject(),
          count
        }
      })
    )
    
    res.json(categoriesWithCount)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne()
    
    if (!settings) {
      settings = new Settings()
      await settings.save()
    }
    
    res.json(settings)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne()
    
    if (!settings) {
      settings = new Settings()
    }
    
    Object.assign(settings, req.body)
    await settings.save()

    // Invalidate the provider cache so the new API config takes effect on next fetch.
    clearCache()

    res.json(settings)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const syncAPI = async (req, res) => {
  try {
    const result = await syncWithAPI()
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ===== Match banner overrides (for API-sourced matches) =====

export const getOverrides = async (req, res) => {
  try {
    const overrides = await MatchOverride.find()
    res.json(overrides)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const upsertOverride = async (req, res) => {
  try {
    const { matchId, banner } = req.body
    if (!matchId) {
      return res.status(400).json({ message: 'matchId is required' })
    }
    const override = await MatchOverride.findOneAndUpdate(
      { matchId: String(matchId) },
      { banner: banner || '', updatedAt: Date.now() },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
    res.json(override)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const deleteOverride = async (req, res) => {
  try {
    await MatchOverride.findOneAndDelete({ matchId: String(req.params.matchId) })
    res.json({ message: 'Override removed' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const initializeCategories = async (req, res) => {
  try {
    const defaultCategories = [
      { name: 'Football', icon: '⚽', order: 1 },
      { name: 'Cricket', icon: '🏏', order: 2 },
      { name: 'UFC', icon: '🥊', order: 3 },
      { name: 'Boxing', icon: '🥊', order: 4 },
      { name: 'WWE', icon: '🤼', order: 5 },
      { name: 'Formula 1', icon: '🏎️', order: 6 },
      { name: 'MotoGP', icon: '🏍️', order: 7 },
      { name: 'NBA', icon: '🏀', order: 8 },
      { name: 'MLB', icon: '⚾', order: 9 },
      { name: 'Tennis', icon: '🎾', order: 10 },
      { name: 'NHL', icon: '🏒', order: 11 }
    ]
    
    for (const category of defaultCategories) {
      const existing = await Category.findOne({ name: category.name })
      if (!existing) {
        await new Category(category).save()
      }
    }
    
    res.json({ message: 'Categories initialized successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

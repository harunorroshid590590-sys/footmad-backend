import { getCachedMatches, syncWithAPI } from '../utils/api.js'

export const getAllMatches = async (req, res) => {
  try {
    console.log('Fetching matches from cache')
    
    // Get cached matches
    const { matches, fresh, age } = getCachedMatches()
    
    if (matches.length > 0) {
      console.log(`Returning ${matches.length} cached matches (fresh: ${fresh}, age: ${age}ms)`)
      return res.json(matches)
    }
    
    // If no cache, sync with API
    console.log('No cache found, syncing with API')
    const syncResult = await syncWithAPI()
    
    if (syncResult.success && syncResult.matches) {
      console.log(`Synced ${syncResult.matches.length} matches from API`)
      return res.json(syncResult.matches)
    }
    
    // Return empty array if no matches available
    console.log('No matches available')
    res.json([])
  } catch (error) {
    console.error('Error fetching matches:', error.message)
    
    // Try to return cached data even on error
    const { matches } = getCachedMatches()
    if (matches.length > 0) {
      console.log('Returning cached data due to error')
      return res.json(matches)
    }
    
    res.status(500).json({ message: error.message })
  }
}

export const getMatchById = async (req, res) => {
  try {
    const matchId = req.params.id
    console.log('Fetching match by ID:', matchId)
    
    // Get cached matches
    let { matches } = getCachedMatches()
    
    if (!matches || matches.length === 0) {
      console.log('No cached matches available, syncing with API')
      const syncResult = await syncWithAPI()
      matches = syncResult.matches || []
    }
    
    // Find match by ID
    let match = matches.find(m => m.id === matchId || m._id === matchId)

    if (!match) {
      console.log('Match not found in cache, refreshing from API')
      const syncResult = await syncWithAPI()
      const refreshedMatches = syncResult.matches || []
      match = refreshedMatches.find(m => m.id === matchId || m._id === matchId)
    }
    
    if (!match) {
      console.log('Match not found after refresh')
      return res.status(404).json({ message: 'Match not found' })
    }
    
    console.log('Match found:', match.id)
    console.log('Stream count:', match.servers?.length || 0)
    
    res.json(match)
  } catch (error) {
    console.error('Error fetching match by ID:', error.message)
    res.status(500).json({ message: error.message })
  }
}

export const createMatch = async (req, res) => {
  try {
    const match = new Match(req.body)
    await match.save()
    res.status(201).json(match)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const updateMatch = async (req, res) => {
  try {
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    
    if (!match) {
      return res.status(404).json({ message: 'Match not found' })
    }
    
    res.json(match)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const deleteMatch = async (req, res) => {
  try {
    const match = await Match.findByIdAndDelete(req.params.id)
    
    if (!match) {
      return res.status(404).json({ message: 'Match not found' })
    }
    
    // Delete associated streams
    await Stream.deleteMany({ _id: { $in: match.streams } })
    
    res.json({ message: 'Match deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getLiveMatches = async (req, res) => {
  try {
    const matches = await Match.find({ status: 'live' })
      .populate('streams')
      .sort({ isPinned: -1, isFeatured: -1, time: 1 })
    
    res.json(matches)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getUpcomingMatches = async (req, res) => {
  try {
    const matches = await Match.find({ status: 'upcoming' })
      .populate('streams')
      .sort({ time: 1 })
    
    res.json(matches)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getMatchesByCategory = async (req, res) => {
  try {
    const category = req.params.category
    const matches = await Match.find({ category })
      .populate('streams')
      .sort({ isPinned: -1, isFeatured: -1, time: 1 })
    
    res.json(matches)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const togglePin = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
    
    if (!match) {
      return res.status(404).json({ message: 'Match not found' })
    }
    
    match.isPinned = !match.isPinned
    await match.save()
    
    res.json(match)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const toggleFeature = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
    
    if (!match) {
      return res.status(404).json({ message: 'Match not found' })
    }
    
    match.isFeatured = !match.isFeatured
    await match.save()
    
    res.json(match)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

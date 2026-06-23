import { getCachedMatches, syncWithAPI } from '../utils/api.js'
import MatchOverride from '../models/MatchOverride.js'
import CustomMatch from '../models/CustomMatch.js'
import { buildMatchFromCustom } from '../utils/customMatch.js'

// Load admin-created matches and normalize them to the provider match shape so
// they can be merged into the public feed. Newest first.
const getCustomMatchesNormalized = async () => {
  try {
    const docs = await CustomMatch.find().sort({ createdAt: -1 })
    return docs.map(buildMatchFromCustom)
  } catch (error) {
    console.error('Failed to load custom matches:', error.message)
    return []
  }
}

// Merge a single admin override (banner / pin / edited links) into one match.
export const mergeOverrideIntoMatch = (match, ov) => {
  if (!ov) return match
  const merged = {
    ...match,
    ...(ov.banner ? { banner: ov.banner } : {}),
    bannerLink: ov.bannerLink || '',
    isPinned: !!ov.pinned
  }
  // Admin-edited links replace the API's links for this match. Individually
  // hidden streams are dropped from the public feed (kept in the override so
  // the admin can unhide them).
  if (ov.serversEdited) {
    const servers = (Array.isArray(ov.servers) ? ov.servers : []).filter(s => !s.hidden)
    merged.servers = servers
    merged.streamsCount = servers.length
  }
  return merged
}

// Merge admin overrides (stored in Mongo, keyed by provider match id) into the
// API-sourced matches: hide hidden matches, apply edited links/banner/pin.
const applyOverrides = async (matches) => {
  if (!Array.isArray(matches) || matches.length === 0) return matches
  try {
    const overrides = await MatchOverride.find()
    if (!overrides.length) return matches
    const byId = new Map(overrides.map(o => [String(o.matchId), o]))

    const merged = matches
      // Hidden matches are removed from the public feed entirely.
      .filter(match => !byId.get(String(match.id))?.hidden)
      .map(match => mergeOverrideIntoMatch(match, byId.get(String(match.id))))

    // Pinned matches float to the top (stable order otherwise).
    return merged
      .map((m, i) => ({ m, i }))
      .sort((a, b) => (b.m.isPinned ? 1 : 0) - (a.m.isPinned ? 1 : 0) || a.i - b.i)
      .map(({ m }) => m)
  } catch (error) {
    console.error('Failed to apply match overrides:', error.message)
    return matches
  }
}

export const getAllMatches = async (req, res) => {
  try {
    console.log('Fetching matches from cache')

    // Admin-created matches always appear (prepended), even if the provider
    // cache is empty.
    const customMatches = await getCustomMatchesNormalized()

    // Get cached matches
    const { matches, fresh, age } = getCachedMatches()

    if (matches.length > 0) {
      console.log(`Returning ${matches.length} cached matches (fresh: ${fresh}, age: ${age}ms)`)
      return res.json([...customMatches, ...(await applyOverrides(matches))])
    }

    // If no cache, sync with API
    console.log('No cache found, syncing with API')
    const syncResult = await syncWithAPI()

    if (syncResult.success && syncResult.matches) {
      console.log(`Synced ${syncResult.matches.length} matches from API`)
      return res.json([...customMatches, ...(await applyOverrides(syncResult.matches))])
    }

    // No provider matches — still return any custom matches.
    console.log('No provider matches available')
    res.json(customMatches)
  } catch (error) {
    console.error('Error fetching matches:', error.message)

    // Try to return cached data even on error
    const { matches } = getCachedMatches()
    if (matches.length > 0) {
      console.log('Returning cached data due to error')
      return res.json(await applyOverrides(matches))
    }

    res.status(500).json({ message: error.message })
  }
}

export const getMatchById = async (req, res) => {
  try {
    const matchId = req.params.id
    console.log('Fetching match by ID:', matchId)

    // Custom (admin-created) matches take precedence and aren't in the cache.
    const customDoc = await CustomMatch.findOne({ matchId: String(matchId) })
    if (customDoc) {
      console.log('Returning custom match:', matchId)
      return res.json(buildMatchFromCustom(customDoc))
    }

    // Get cached matches
    let { matches } = getCachedMatches()
    
    if (!matches || matches.length === 0) {
      console.log('No cached matches available, syncing with API')
      const syncResult = await syncWithAPI()
      matches = syncResult.matches || []
    }
    
    // Find match by ID (type-safe: provider ids are numbers, route param is a string)
    const idEquals = (m) => String(m.id) === String(matchId) || String(m._id) === String(matchId)
    let match = matches.find(idEquals)

    if (!match) {
      console.log('Match not found in cache, refreshing from API')
      const syncResult = await syncWithAPI()
      const refreshedMatches = syncResult.matches || []
      match = refreshedMatches.find(idEquals)
    }
    
    if (!match) {
      console.log('Match not found after refresh')
      return res.status(404).json({ message: 'Match not found' })
    }
    
    console.log('Match found:', match.id)
    console.log('Stream count:', match.servers?.length || 0)

    // Apply admin override (banner / pin / edited links / hidden) if one exists.
    const override = await MatchOverride.findOne({ matchId: String(match.id) })
    if (override?.hidden) {
      console.log('Match is hidden by admin override')
      return res.status(404).json({ message: 'Match not found' })
    }
    match = mergeOverrideIntoMatch(match, override)

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

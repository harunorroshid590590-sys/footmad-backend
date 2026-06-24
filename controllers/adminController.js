import Match from '../models/Match.js'
import Stream from '../models/Stream.js'
import Category from '../models/Category.js'
import Settings from '../models/Settings.js'
import MatchOverride from '../models/MatchOverride.js'
import CustomMatch from '../models/CustomMatch.js'
import { syncWithAPI, clearCache, getCachedMatches, buildServerFromChannel } from '../utils/api.js'
import { buildMatchFromCustom, applyFieldOverride } from '../utils/customMatch.js'

export const getStats = async (req, res) => {
  try {
    // Matches/streams are sourced from the provider API (cached in memory),
    // not Mongo — so derive the dashboard stats from there.
    let { matches } = getCachedMatches()
    if (!matches || matches.length === 0) {
      const syncResult = await syncWithAPI()
      matches = syncResult.matches || []
    }

    const isLive = (m) => m.status === 'live' || m.isLive === true
    const totalMatches = matches.length
    const liveMatches = matches.filter(isLive).length
    const totalStreams = matches.reduce((sum, m) => sum + (m.servers?.length || 0), 0)
    const categories = new Set(
      matches.map((m) => m.category).filter(Boolean)
    ).size

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
    // Matches are sourced from the provider API (cached in memory), not Mongo,
    // so the admin table must read the same cache the public site does.
    let { matches } = getCachedMatches()
    if (!matches || matches.length === 0) {
      const syncResult = await syncWithAPI()
      matches = syncResult.matches || []
    }

    // Annotate each match with its admin override state so the table can show
    // the effective (edited) links and the right actions (Reset / Unhide).
    const overrides = await MatchOverride.find()
    const byId = new Map(overrides.map(o => [String(o.matchId), o]))

    const annotated = matches.map(m => {
      const ov = byId.get(String(m.id))
      // Admin sees ALL servers (including per-stream hidden ones, so they can
      // unhide them); the Streams count reflects what the public actually sees.
      const servers = ov?.serversEdited ? (ov.servers || []) : (m.servers || [])
      // Apply full-field edits so the table + edit form show the edited values.
      const withFields = applyFieldOverride(m, ov)
      return {
        ...withFields,
        servers,
        streamsCount: servers.filter(s => !s.hidden).length,
        isPinned: !!ov?.pinned,
        isHidden: !!ov?.hidden,
        isEdited: !!(ov?.serversEdited || ov?.fieldsEdited)
      }
    })

    // Admin-created matches (editable + deletable) shown at the top, annotated
    // with their pin/banner override so the table reflects the pinned state.
    const customDocs = await CustomMatch.find().sort({ createdAt: -1 })
    const custom = customDocs.map(d => {
      const ov = byId.get(String(d.matchId))
      const m = buildMatchFromCustom(d)
      return {
        ...m,
        streamsCount: (m.servers || []).filter(s => !s.hidden).length,
        isCustom: true,
        isPinned: !!ov?.pinned,
        isHidden: !!ov?.hidden
      }
    })

    res.json([...custom, ...annotated])
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ===== Per-match link editing (Edit / Reset) and Hide (for API matches) =====

// Save admin-edited stream links for a match. Raw rows ({ title, link, drmKey,
// type }) are normalized the same way provider links are, then stored as an
// override that replaces the API's links until Reset.
export const updateMatchLinks = async (req, res) => {
  try {
    const { matchId } = req.params
    const rows = Array.isArray(req.body.servers) ? req.body.servers : []
    const servers = rows
      .map(r => buildServerFromChannel({ title: r.title, link: r.link, api: r.drmKey, type: r.type, hidden: r.hidden === true }))
      .filter(Boolean)

    const override = await MatchOverride.findOneAndUpdate(
      { matchId: String(matchId) },
      { $set: { servers, serversEdited: true, updatedAt: Date.now() }, $setOnInsert: { matchId: String(matchId) } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
    res.json(override)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Reset an API match back to the original API data — clears both the link edits
// and the full-field edits. (Pin/banner/hide are separate and left untouched.)
export const resetMatchLinks = async (req, res) => {
  try {
    const { matchId } = req.params
    const override = await MatchOverride.findOneAndUpdate(
      { matchId: String(matchId) },
      {
        $set: {
          servers: [], serversEdited: false, fieldsEdited: false,
          category: '', status: 'normal', eventName: '', tournamentLogo: '',
          homeTeam: '', homeLogo: '', awayTeam: '', awayLogo: '',
          startTime: null, durationMinutes: 120,
          updatedAt: Date.now()
        },
        $setOnInsert: { matchId: String(matchId) }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
    res.json(override)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Full edit of an API match — stores teams/league/category/time/banner/channels
// as an override that REPLACES the provider data until Reset.
export const updateProviderMatch = async (req, res) => {
  try {
    const { matchId } = req.params
    const b = req.body || {}
    const servers = (Array.isArray(b.channels) ? b.channels : [])
      .map(c => buildServerFromChannel({ title: c.title, link: c.link, api: c.drm, type: c.type, hidden: c.hidden === true }))
      .filter(Boolean)

    const override = await MatchOverride.findOneAndUpdate(
      { matchId: String(matchId) },
      {
        $set: {
          fieldsEdited: true,
          category: b.category || '',
          status: b.status || 'normal',
          eventName: b.eventName || '',
          tournamentLogo: b.tournamentLogo || '',
          homeTeam: b.homeTeam || '',
          homeLogo: b.homeLogo || '',
          awayTeam: b.awayTeam || '',
          awayLogo: b.awayLogo || '',
          startTime: b.startTime ? new Date(b.startTime) : null,
          durationMinutes: Number(b.durationMinutes) || 120,
          banner: b.banner || '',
          servers,
          serversEdited: true,
          updatedAt: Date.now()
        },
        $setOnInsert: { matchId: String(matchId) }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
    res.json(override)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Hide / unhide a match from the public site.
export const setMatchHidden = async (req, res) => {
  try {
    const { matchId } = req.params
    const hidden = !!req.body.hidden
    const override = await MatchOverride.findOneAndUpdate(
      { matchId: String(matchId) },
      { $set: { hidden, updatedAt: Date.now() }, $setOnInsert: { matchId: String(matchId) } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
    res.json(override)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ===== Custom (admin-created) matches =====

// Map a request body to CustomMatch fields (shared by create + update).
const customMatchFields = (body = {}) => ({
  category: body.category || 'Football',
  status: body.status || 'normal',
  eventName: body.eventName || '',
  tournamentLogo: body.tournamentLogo || '',
  homeTeam: body.homeTeam || '',
  homeLogo: body.homeLogo || '',
  awayTeam: body.awayTeam || '',
  awayLogo: body.awayLogo || '',
  startTime: body.startTime ? new Date(body.startTime) : new Date(),
  durationMinutes: Number(body.durationMinutes) || 120,
  banner: body.banner || '',
  channels: (Array.isArray(body.channels) ? body.channels : [])
    .filter(c => (c.link || '').trim())
    .map((c, i) => ({
      title: (c.title || 'Stream').trim(),
      type: (c.type || 'M3U8').trim(),
      link: (c.link || '').trim(),
      drm: (c.drm || '').trim(),
      order: Number(c.order) || i + 1
    }))
})

export const createCustomMatch = async (req, res) => {
  try {
    const matchId = `custom-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
    const doc = await CustomMatch.create({ matchId, ...customMatchFields(req.body) })
    res.status(201).json(buildMatchFromCustom(doc))
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const updateCustomMatch = async (req, res) => {
  try {
    const { matchId } = req.params
    const doc = await CustomMatch.findOneAndUpdate(
      { matchId: String(matchId) },
      { $set: { ...customMatchFields(req.body), updatedAt: Date.now() } },
      { new: true }
    )
    if (!doc) return res.status(404).json({ message: 'Custom match not found' })
    res.json(buildMatchFromCustom(doc))
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const deleteCustomMatch = async (req, res) => {
  try {
    await CustomMatch.findOneAndDelete({ matchId: String(req.params.matchId) })
    res.json({ message: 'Custom match deleted' })
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
    const { matchId, banner, bannerLink, pinned } = req.body
    if (!matchId) {
      return res.status(400).json({ message: 'matchId is required' })
    }
    // Only update the fields actually provided so they don't clobber each other.
    const update = { updatedAt: Date.now() }
    if (banner !== undefined) update.banner = banner || ''
    if (bannerLink !== undefined) update.bannerLink = bannerLink || ''
    if (pinned !== undefined) update.pinned = !!pinned

    const override = await MatchOverride.findOneAndUpdate(
      { matchId: String(matchId) },
      { $set: update, $setOnInsert: { matchId: String(matchId) } },
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

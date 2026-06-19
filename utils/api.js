import axios from 'axios'
import { buildDrmConfigFromProviderValue } from './proxy.js'
import Settings from '../models/Settings.js'

const DEFAULT_PROVIDER_URL = process.env.PROVIDER_API_URL || 'https://events.ivan-flux.online/api/v1/user?username=footfy'

// In-memory cache
let cachedResponse = null
let cacheTime = null
const CACHE_DURATION = 3 * 60 * 1000 // 3 minutes

/**
 * Build the provider URL from the admin Settings (apiUrl + apiUsername).
 * Falls back to the PROVIDER_API_URL env / default when Settings are unavailable.
 * This is what makes the admin "API Configuration" form actually drive the feed.
 */
export const buildProviderUrl = async () => {
  try {
    const settings = await Settings.findOne()
    const base = (settings?.apiUrl || '').trim()
    const username = (settings?.apiUsername || '').trim()

    if (base) {
      try {
        const url = new URL(base)
        const existing = url.searchParams.get('username')
        // Inject the configured username unless the URL already carries a non-empty one.
        // Handles a dangling "?username=" (empty) that the admin form can leave behind.
        if (!existing && username) {
          url.searchParams.set('username', username)
        }
        return url.toString()
      } catch {
        // Not a parseable absolute URL — fall back to simple string handling.
        if (/[?&]username=[^&]+/i.test(base)) return base
        if (!username) return base
        const separator = base.includes('?') ? '&' : '?'
        return `${base}${separator}username=${encodeURIComponent(username)}`
      }
    }
  } catch (error) {
    console.warn('Could not read Settings for provider URL, using env/default:', error.message)
  }

  return DEFAULT_PROVIDER_URL
}

export const fetchFromExternalAPI = async () => {
  try {
    const providerUrl = await buildProviderUrl()
    console.log('Fetching from external API:', providerUrl)

    const response = await axios.get(providerUrl, {
      proxy: false,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    console.log('External API response status:', response.status)
    
    // Check if response has events array
    let events = []
    if (response.data && response.data.events && Array.isArray(response.data.events)) {
      events = response.data.events
    } else if (Array.isArray(response.data)) {
      events = response.data
    }
    
    console.log('Provider response count:', events.length)
    
    // Update cache
    cachedResponse = response.data
    cacheTime = Date.now()
    
    return { success: true, data: response.data, events }
  } catch (error) {
    console.error('Error fetching from external API:', error.message)
    
    // Return cached data if available
    if (cachedResponse) {
      console.log('Using cached response from', new Date(cacheTime).toISOString())
      const events = cachedResponse.events || []
      return { success: true, data: cachedResponse, events, cached: true }
    }
    
    return { success: false, error: error.message, events: [] }
  }
}

const normalizeHeaderName = (headerName = '') => {
  const lowerName = headerName.trim().toLowerCase()

  if (!lowerName) return ''
  if (lowerName === 'referer') return 'Referer'
  if (lowerName === 'origin') return 'Origin'
  if (lowerName === 'user-agent' || lowerName === 'useragent') return 'User-Agent'
  if (lowerName === 'cookie') return 'Cookie'
  if (lowerName === 'x-forwarded-for') return 'X-Forwarded-For'

  return headerName
    .trim()
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('-')
}

const parseProviderStreamLink = (streamLink = '') => {
  const [urlPart, ...rawParts] = String(streamLink).split('|')
  const url = urlPart?.trim() || ''
  const headers = {}

  for (const rawPart of rawParts) {
    const segments = rawPart.split('&').map(segment => segment.trim()).filter(Boolean)

    for (const segment of segments) {
      const separatorIndex = segment.indexOf('=')

      if (separatorIndex === -1) {
        continue
      }

      const rawKey = segment.slice(0, separatorIndex).trim()
      const rawValue = segment.slice(separatorIndex + 1).trim()
      const normalizedKey = normalizeHeaderName(rawKey)

      if (normalizedKey && rawValue) {
        headers[normalizedKey] = rawValue
      }
    }
  }

  return { url, headers }
}

const buildDrmConfig = (drmValue = '') => {
  return buildDrmConfigFromProviderValue(drmValue)
}

const detectStreamType = (streamUrl = '', providerType = '') => {
  const url = String(streamUrl).toLowerCase()

  if (url.includes('.mpd')) return 'dash'
  if (url.includes('.m3u8')) return 'hls'
  if (url.includes('.ts')) return 'ts'

  if (providerType === '1') return 'dash'
  if (providerType === '0') return 'hls'
  if (providerType === '2') return 'ts'

  return 'direct'
}

export const normalizeMatch = (event) => {
  try {
    const eventInfo = event.eventInfo || {}
    
    // Map channels_data to servers
    const servers = []
    if (event.channels_data && Array.isArray(event.channels_data)) {
      for (const channel of event.channels_data) {
        const originalLink = channel.link || ''
        const providerType = String(channel.type || '0')
        const drmKey = channel.api || ''
        const { url: cleanUrl, headers } = parseProviderStreamLink(originalLink)
        const streamType = detectStreamType(cleanUrl, providerType)
        const { drm, drmError } = buildDrmConfig(drmKey)

        // Only add server if it has a valid stream URL
        if (cleanUrl) {
          servers.push({
            title: channel.title || 'Stream',
            name: channel.title || 'Stream',
            streamUrl: cleanUrl,
            url: cleanUrl,
            externalUrl: cleanUrl,
            drmKey: drmKey,
            drm,
            drmError,
            type: streamType,
            providerType,
            logo: channel.logo || '',
            quality: channel.quality || 'auto',
            headers,
            referer: headers.Referer || '',
            origin: headers.Origin || '',
            userAgent: headers['User-Agent'] || ''
          })
        }
      }
    }
    
    console.log(`Normalized match ${event.id}: ${servers.length} servers`)
    
    // Calculate live status
    const now = new Date()
    const startTime = eventInfo.startTime ? new Date(eventInfo.startTime) : now
    const endTime = eventInfo.endTime ? new Date(eventInfo.endTime) : new Date(now.getTime() + 3 * 60 * 60 * 1000)
    const isLive = now >= startTime && now <= endTime

    // Derive a normalized status from the provider's `Status` field
    // (more reliable than client-side time math), falling back to time when absent.
    const providerStatus = String(eventInfo.Status || '').toLowerCase()
    let status
    if (providerStatus.includes('live')) status = 'live'
    else if (providerStatus.includes('finish')) status = 'finished'
    else if (providerStatus.includes('upcoming')) status = 'upcoming'
    else status = isLive ? 'live' : (now < startTime ? 'upcoming' : 'finished')

    // Check publish status.
    // This provider does not send a `publish` field — it uses eventInfo.Status instead.
    // So treat events as published unless `publish` is explicitly set to a "off" value.
    const hasPublishField = event.publish !== undefined && event.publish !== null && event.publish !== ''
    const publish = hasPublishField
      ? (event.publish === "1" || event.publish === true || event.publish === 1)
      : true
    
    return {
      id: event.id,
      title: event.title || '',
      category: event.cat || 'Sports',
      eventName: eventInfo.eventName || '',
      homeTeam: eventInfo.teamA || '',
      awayTeam: eventInfo.teamB || '',
      homeLogo: eventInfo.teamAFlag || '',
      awayLogo: eventInfo.teamBFlag || '',
      banner: eventInfo.eventBanner || '',
      image: event.image || '',
      startTime: eventInfo.startTime || '',
      endTime: eventInfo.endTime || '',
      isLive: isLive,
      status: status,
      isHot: eventInfo.isHot === "1",
      streamsCount: servers.length,
      servers: servers,
      publish: publish,
      adsLimit: Number(event.adsLimit) || 0
    }
  } catch (error) {
    console.error('Error normalizing match:', error.message)
    return null
  }
}

export const syncWithAPI = async () => {
  try {
    const { events, success, cached } = await fetchFromExternalAPI()
    
    if (!success || !events || events.length === 0) {
      return { success: false, message: 'No events from API', cached }
    }
    
    let normalizedCount = 0
    let skippedCount = 0
    const normalizedMatches = []
    
    for (const event of events) {
      const normalized = normalizeMatch(event)
      
      if (normalized && normalized.publish) {
        normalizedMatches.push(normalized)
        normalizedCount++
      } else {
        skippedCount++
      }
    }
    
    console.log(`Normalized ${normalizedCount} matches, skipped ${skippedCount} (unpublished or invalid)`)
    
    // Update cache with normalized data
    cachedResponse = { events: normalizedMatches }
    cacheTime = Date.now()
    
    return { 
      success: true, 
      normalizedCount, 
      skippedCount, 
      matches: normalizedMatches,
      cached 
    }
  } catch (error) {
    console.error('Sync error:', error)
    return { success: false, message: error.message }
  }
}

export const getCachedMatches = () => {
  if (cachedResponse && cacheTime) {
    const age = Date.now() - cacheTime
    const isFresh = age < CACHE_DURATION
    console.log(`Cache age: ${Math.floor(age / 1000)}s, fresh: ${isFresh}`)
    return { matches: cachedResponse.events || [], fresh: isFresh, age }
  }
  return { matches: [], fresh: false, age: null }
}

export const clearCache = () => {
  cachedResponse = null
  cacheTime = null
  console.log('Cache cleared')
}

import { buildServerFromChannel } from './api.js'

/**
 * Apply a provider match's full-field override (set from the admin "Edit" form)
 * onto a normalized match. Only runs when the override has fieldsEdited=true.
 * Recomputes endTime/status from the edited start time + duration.
 */
export const applyFieldOverride = (match, ov) => {
  if (!ov?.fieldsEdited) return match
  const out = { ...match }
  if (ov.category) out.category = ov.category
  out.eventName = ov.eventName || ''
  out.title = ov.eventName || ''
  if (ov.tournamentLogo) out.image = ov.tournamentLogo
  out.homeTeam = ov.homeTeam || ''
  out.homeLogo = ov.homeLogo || ''
  out.awayTeam = ov.awayTeam || ''
  out.awayLogo = ov.awayLogo || ''
  out.isHot = String(ov.status || '').toLowerCase() === 'hot'

  if (ov.startTime) {
    const start = new Date(ov.startTime)
    const end = new Date(start.getTime() + (Number(ov.durationMinutes) || 120) * 60000)
    const now = new Date()
    out.startTime = start.toISOString()
    out.endTime = end.toISOString()
    out.isLive = now >= start && now <= end
    out.status = out.isLive ? 'live' : (now < start ? 'upcoming' : 'finished')
  }
  return out
}

/**
 * Normalize a CustomMatch Mongo document into the SAME match shape the provider
 * feed uses, so the public site and admin can treat custom matches like any
 * other match. endTime is derived from startTime + durationMinutes; status is
 * time-authoritative; channels become normalized servers (with DRM/headers).
 */
export const buildMatchFromCustom = (doc) => {
  const start = doc.startTime ? new Date(doc.startTime) : new Date()
  const dur = Number(doc.durationMinutes) || 120
  const end = new Date(start.getTime() + dur * 60000)
  const now = new Date()

  const servers = [...(doc.channels || [])]
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(c => buildServerFromChannel({ title: c.title, link: c.link, type: c.type, api: c.drm, hidden: c.hidden === true }))
    .filter(Boolean)

  const isLive = now >= start && now <= end
  const status = isLive ? 'live' : (now < start ? 'upcoming' : 'finished')

  return {
    id: doc.matchId,
    title: doc.eventName || '',
    category: doc.category || 'Sports',
    eventName: doc.eventName || '',
    homeTeam: doc.homeTeam || '',
    awayTeam: doc.awayTeam || '',
    homeLogo: doc.homeLogo || '',
    awayLogo: doc.awayLogo || '',
    banner: doc.banner || '',
    image: doc.tournamentLogo || '',
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    isLive,
    status,
    isHot: String(doc.status).toLowerCase() === 'hot',
    streamsCount: servers.length,
    servers,
    publish: true,
    isCustom: true,
    adsLimit: 0
  }
}

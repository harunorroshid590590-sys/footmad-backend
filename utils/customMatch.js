import { buildServerFromChannel } from './api.js'

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
    .map(c => buildServerFromChannel({ title: c.title, link: c.link, type: c.type, api: c.drm }))
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

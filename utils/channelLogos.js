import Channel from '../models/Channel.js'

// Best-effort brand domains for seeded channels. Logos are pulled from a public
// logo CDN (Clearbit). Missing/unknown brands simply fall back to initials in the UI.
const CHANNEL_DOMAINS = {
  'TNT Sports 1': 'tntsports.co.uk',
  'TNT Sports 2': 'tntsports.co.uk',
  'TNT Sports 3': 'tntsports.co.uk',
  'TNT Sports 4': 'tntsports.co.uk',
  'beIN Sports 1': 'beinsports.com',
  'beIN Sports 2': 'beinsports.com',
  'beIN Sports 3': 'beinsports.com',
  'Eleven Sports': 'elevensports.com',
  'FIFA+': 'fifa.com',
  'FOX Sports': 'foxsports.com',
  'DAZN': 'dazn.com',
  'Star Sports': 'starsports.com',
  'Fancode': 'fancode.com',
  'PTV Sports': 'ptv.com.pk',
  'TEN Sports': 'tensports.com',
  'Willow Sports': 'willow.tv',
  'Astro Cricket': 'astro.com.my',
  'T Sports': 'tsports.com',
  'RTA Sports': 'rta.ae',
  'Sky Sports': 'skysports.com',
  'Fox Cricket': 'foxsports.com.au',
  'SPOTV': 'spotv.net',
  'Ziggo Sport': 'ziggo.nl',
  'Geo Super': 'geosuper.tv',
  'Nova Sports': 'novasports.gr',
  'Cosmote Sport': 'cosmote.gr',
  'Premier Sports': 'premiersports.com',
  'Setanta Sports': 'setanta.com',
  'USA Network': 'usanetwork.com',
  'SporTV': 'globo.com',
  'Sport TV': 'sporttv.pt',
  'ESPN': 'espn.com',
  'TSN': 'tsn.ca',
  'fubo Sports': 'fubo.tv',
  'Astro Sports': 'astro.com.my',
  'TUDN': 'tudn.com',
  'EuroSport': 'eurosport.com',
  'Premiere': 'globo.com',
  'SportDigital': 'sportdigital.de',
  'CBS Golazo': 'cbssports.com',
  'Telemundo': 'telemundo.com',
  'Sport 5': 'sport5.co.il',
  'Canal+ Sport': 'canalplus.com',
  'MBC Sports': 'mbc.net',
  'Win Sports': 'winsports.co',
  'HBO Boxing': 'hbo.com',
  'Fox Deportes': 'foxdeportes.com'
}

const logoUrlFor = (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`

// Treat these as "auto" logos that may be replaced/migrated.
const isAutoLogo = (logo = '') =>
  !logo || logo.includes('logo.clearbit.com') || logo.includes('s2/favicons')

/**
 * Set a logo URL on channels that don't have a custom one.
 * Idempotent and non-destructive: never overwrites an admin-uploaded logo,
 * but will migrate previously-set auto logos (e.g. the dead Clearbit URLs).
 */
export const applyChannelLogos = async () => {
  try {
    const channels = await Channel.find({ section: 'channel' })
    let updated = 0
    for (const channel of channels) {
      if (!isAutoLogo(channel.logo)) continue
      const domain = CHANNEL_DOMAINS[channel.name]
      if (!domain) continue
      const url = logoUrlFor(domain)
      if (channel.logo === url) continue
      channel.logo = url
      await channel.save()
      updated++
    }
    if (updated) console.log(`Applied logos to ${updated} channels`)
    return updated
  } catch (error) {
    console.error('applyChannelLogos error:', error.message)
    return 0
  }
}

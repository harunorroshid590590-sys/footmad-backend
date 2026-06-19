import Channel from '../models/Channel.js'

// Branded TV channels shown in the "All Channels" grid (from the FootMad design).
// Logos + stream servers are added later by the admin; seeded with empty
// servers so the grid renders immediately with name-fallback tiles.
const CHANNEL_NAMES = [
  'TNT Sports 1', 'TNT Sports 2', 'TNT Sports 3', 'TNT Sports 4',
  'beIN Sports 1', 'beIN Sports 2', 'beIN Sports 3',
  'Eleven Sports', 'FIFA+', 'FOX Sports', 'DAZN', 'Star Sports', 'Fancode',
  'PTV Sports', 'A Sports', 'TEN Sports', 'Willow Sports', 'CricLife',
  'Astro Cricket', 'T Sports', 'RTA Sports', 'Sky Sports', 'Fox Cricket',
  'SPOTV', 'Ziggo Sport', 'Geo Super', 'Nova Sports', 'Cosmote Sport',
  'Premier Sports', 'Setanta Sports', 'USA Network', 'SporTV', 'Sport TV',
  'ESPN', 'TSN', 'fubo Sports', 'Astro Sports', 'TUDN', 'EuroSport',
  'Premiere', 'SportDigital', 'CBS Golazo', 'Telemundo', 'Sport 5',
  'True Sports', 'Canal+ Sport', 'MaxSport', 'MBC Sports', 'Ad Sports',
  'Bahrain Sports', 'Tamanyah', 'Win Sports', 'Swerve Combat', 'HBO Boxing',
  'CazéTV', 'Fox Deportes'
]

export const seedChannels = async () => {
  try {
    const existing = await Channel.countDocuments({ section: 'channel' })
    if (existing > 0) {
      console.log(`Channels already seeded (${existing}), skipping`)
      return { success: true, message: 'Channels already exist' }
    }

    const docs = CHANNEL_NAMES.map((name, index) => ({
      name,
      logo: '',
      section: 'channel',
      category: 'Sports',
      badges: { live: true, sports: true },
      quality: 'FHD',
      servers: [],
      order: index,
      active: true
    }))

    await Channel.insertMany(docs)
    console.log(`Seeded ${docs.length} channels`)
    return { success: true, message: `Seeded ${docs.length} channels` }
  } catch (error) {
    console.error('Channel seed error:', error.message)
    return { success: false, message: error.message }
  }
}

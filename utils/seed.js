import Match from '../models/Match.js'
import Stream from '../models/Stream.js'

export const seedDemoMatches = async () => {
  try {
    console.log('Seeding demo matches...')
    
    const existingCount = await Match.countDocuments()
    if (existingCount > 0) {
      console.log(`Database already has ${existingCount} matches, skipping seed`)
      return { success: true, message: 'Matches already exist' }
    }
    
    // Create demo streams
    const demoStreams = [
      {
        name: 'SPY AFC LIVE',
        url: 'https://example.com/stream1.m3u8',
        type: 'hls',
        quality: '1080p',
        active: true,
        isLive: true
      },
      {
        name: 'SPORTIFY Live',
        url: 'https://example.com/stream2.m3u8',
        type: 'hls',
        quality: '720p',
        active: true,
        isLive: true
      },
      {
        name: 'FANCODE HD',
        url: 'https://example.com/stream3.m3u8',
        type: 'hls',
        quality: 'HD',
        active: true,
        isLive: true
      }
    ]
    
    const savedStreams = await Stream.insertMany(demoStreams)
    console.log(`Created ${savedStreams.length} demo streams`)
    
    // Create demo matches
    const now = new Date()
    const demoMatches = [
      {
        homeTeam: {
          name: 'Al-Nassr',
          logo: ''
        },
        awayTeam: {
          name: 'Gamba Osaka',
          logo: ''
        },
        league: 'AFC Champions Two',
        category: 'Football',
        time: new Date(now.getTime() - 30 * 60 * 1000), // Started 30 mins ago
        status: 'live',
        streams: [savedStreams[0]._id, savedStreams[1]._id],
        source: 'manual',
        isFeatured: true
      },
      {
        homeTeam: {
          name: 'Dave Allen',
          logo: ''
        },
        awayTeam: {
          name: 'Filip Hrgović',
          logo: ''
        },
        league: 'World Boxing',
        category: 'Boxing',
        time: new Date(now.getTime() - 15 * 60 * 1000),
        status: 'live',
        streams: [savedStreams[0]._id],
        source: 'manual'
      },
      {
        homeTeam: {
          name: 'Tigers',
          logo: ''
        },
        awayTeam: {
          name: 'Blue Jays',
          logo: ''
        },
        league: 'MLB',
        category: 'MLB',
        time: new Date(now.getTime() + 60 * 60 * 1000), // In 1 hour
        status: 'upcoming',
        streams: [savedStreams[2]._id],
        source: 'manual'
      },
      {
        homeTeam: {
          name: 'Real Madrid',
          logo: ''
        },
        awayTeam: {
          name: 'Barcelona',
          logo: ''
        },
        league: 'La Liga',
        category: 'Football',
        time: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        status: 'upcoming',
        streams: [savedStreams[0]._id, savedStreams[1]._id, savedStreams[2]._id],
        source: 'manual',
        isPinned: true
      },
      {
        homeTeam: {
          name: 'Conor McGregor',
          logo: ''
        },
        awayTeam: {
          name: 'Michael Chandler',
          logo: ''
        },
        league: 'UFC 300',
        category: 'UFC',
        time: new Date(now.getTime() + 3 * 60 * 60 * 1000),
        status: 'upcoming',
        streams: [savedStreams[0]._id],
        source: 'manual'
      },
      {
        homeTeam: {
          name: 'Lewis Hamilton',
          logo: ''
        },
        awayTeam: {
          name: 'Max Verstappen',
          logo: ''
        },
        league: 'Formula 1',
        category: 'Formula 1',
        time: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        status: 'upcoming',
        streams: [savedStreams[1]._id],
        source: 'manual'
      }
    ]
    
    const savedMatches = await Match.insertMany(demoMatches)
    console.log(`Created ${savedMatches.length} demo matches`)
    
    return { success: true, message: `Seeded ${savedMatches.length} demo matches` }
  } catch (error) {
    console.error('Seed error:', error.message)
    return { success: false, message: error.message }
  }
}

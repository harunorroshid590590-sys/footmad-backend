import mongoose from 'mongoose'

/**
 * A playable stream source attached to a channel.
 * Shape mirrors the normalized server used by matches so the
 * frontend VideoPlayer / server-switcher can be reused directly.
 */
const channelServerSchema = new mongoose.Schema({
  title: { type: String, default: 'Server' },
  url: { type: String, required: true },
  type: {
    type: String,
    enum: ['hls', 'dash', 'ts', 'direct', 'embed'],
    default: 'hls'
  },
  quality: { type: String, default: 'FHD' },
  // DRM key as "keyId:key" (clearkey) or a license URL (widevine); parsed on read.
  drmKey: { type: String, default: '' },
  referer: { type: String, default: '' },
  origin: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  useProxy: { type: Boolean, default: true }
}, { _id: false })

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  logo: {
    type: String,
    default: ''
  },
  // Which surface this item belongs to. Channels, News, Playlists and Dawah
  // are all the same shape (logo + title + badges + servers), differing only by section.
  section: {
    type: String,
    enum: ['channel', 'news', 'playlist', 'dawah'],
    default: 'channel',
    index: true
  },
  category: {
    type: String,
    default: 'Sports'
  },
  // Display badges shown on the card (e.g. LIVE • SPORTS).
  badges: {
    live: { type: Boolean, default: true },
    sports: { type: Boolean, default: true }
  },
  quality: {
    type: String,
    default: 'FHD'
  },
  servers: {
    type: [channelServerSchema],
    default: []
  },
  order: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

channelSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  next()
})

// Virtual: number of servers (handy for the "· N servers ·" card label).
channelSchema.virtual('serversCount').get(function () {
  return Array.isArray(this.servers) ? this.servers.length : 0
})

channelSchema.set('toJSON', { virtuals: true })
channelSchema.set('toObject', { virtuals: true })

export default mongoose.model('Channel', channelSchema)

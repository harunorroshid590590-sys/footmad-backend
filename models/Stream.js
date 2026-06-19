import mongoose from 'mongoose'

const streamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['hls', 'dash', 'ts', 'embed'],
    default: 'hls'
  },
  quality: {
    type: String,
    default: 'HD'
  },
  drm: {
    type: {
      type: String,
      enum: ['clearkey', 'widevine'],
      default: null
    },
    clearKeys: {
      type: Map,
      of: String,
      default: null
    },
    licenseUrl: {
      type: String,
      default: ''
    }
  },
  referer: {
    type: String,
    default: ''
  },
  origin: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  active: {
    type: Boolean,
    default: true
  },
  isLive: {
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

streamSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

export default mongoose.model('Stream', streamSchema)

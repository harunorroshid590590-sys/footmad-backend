import mongoose from 'mongoose'

const apiCacheSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  ttl: {
    type: Number,
    default: 300 // 5 minutes in seconds
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  hitCount: {
    type: Number,
    default: 0
  }
})

apiCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.model('ApiCache', apiCacheSchema)

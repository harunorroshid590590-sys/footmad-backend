import mongoose from 'mongoose'

const apiUsageSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  requests: {
    type: Number,
    default: 0
  },
  successful: {
    type: Number,
    default: 0
  },
  failed: {
    type: Number,
    default: 0
  },
  cached: {
    type: Number,
    default: 0
  },
  lastSyncTime: {
    type: Date,
    default: null
  },
  cacheHitRate: {
    type: Number,
    default: 0
  }
})

apiUsageSchema.pre('save', function(next) {
  const total = this.requests
  if (total > 0) {
    this.cacheHitRate = (this.cached / total) * 100
  }
  next()
})

export default mongoose.model('ApiUsage', apiUsageSchema)

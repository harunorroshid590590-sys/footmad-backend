import mongoose from 'mongoose'

const schedulerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['api-sync', 'cache-cleanup', 'stats-update'],
    required: true
  },
  interval: {
    type: Number,
    required: true // in minutes
  },
  active: {
    type: Boolean,
    default: true
  },
  lastRun: {
    type: Date,
    default: null
  },
  nextRun: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['idle', 'running', 'completed', 'failed'],
    default: 'idle'
  },
  lastError: {
    type: String,
    default: ''
  },
  runCount: {
    type: Number,
    default: 0
  },
  successCount: {
    type: Number,
    default: 0
  },
  failureCount: {
    type: Number,
    default: 0
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

schedulerSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

export default mongoose.model('Scheduler', schedulerSchema)

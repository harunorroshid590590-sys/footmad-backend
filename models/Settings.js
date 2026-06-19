import mongoose from 'mongoose'

const settingsSchema = new mongoose.Schema({
  siteName: {
    type: String,
    default: 'FOOTFY'
  },
  siteDescription: {
    type: String,
    default: 'Premium Sports Live Streaming Platform'
  },
  apiUrl: {
    type: String,
    default: 'https://events.ivan-flux.online/api/v1/user'
  },
  apiUsername: {
    type: String,
    default: 'footfy'
  },
  proxyEnabled: {
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

settingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

export default mongoose.model('Settings', settingsSchema)

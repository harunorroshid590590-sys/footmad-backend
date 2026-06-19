import mongoose from 'mongoose'

const adSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['banner', 'popunder', 'popup', 'native', 'player', 'sticky'],
    required: true
  },
  position: {
    type: String,
    enum: ['header', 'between-cards', 'sidebar', 'above-player', 'below-player', 'footer', 'overlay'],
    default: 'header'
  },
  htmlCode: {
    type: String,
    required: true
  },
  desktopCode: {
    type: String,
    default: ''
  },
  mobileCode: {
    type: String,
    default: ''
  },
  active: {
    type: Boolean,
    default: true
  },
  frequencyLimit: {
    type: Number,
    default: 1 // times per session
  },
  frequencyPeriod: {
    type: String,
    enum: ['session', 'hour', 'day'],
    default: 'session'
  },
  priority: {
    type: Number,
    default: 0
  },
  device: {
    type: String,
    enum: ['all', 'desktop', 'mobile'],
    default: 'all'
  },
  countries: [{
    type: String
  }],
  excludeCountries: [{
    type: String
  }],
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  impressions: {
    type: Number,
    default: 0
  },
  clicks: {
    type: Number,
    default: 0
  },
  ctr: {
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

adSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  if (this.impressions > 0) {
    this.ctr = (this.clicks / this.impressions) * 100
  }
  next()
})

export default mongoose.model('Ad', adSchema)

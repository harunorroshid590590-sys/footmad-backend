import mongoose from 'mongoose'

const adConfigSchema = new mongoose.Schema({
  bannerAds: {
    top: {
      enabled: { type: Boolean, default: false },
      code: { type: String, default: '' },
      desktopCode: { type: String, default: '' },
      mobileCode: { type: String, default: '' }
    },
    middle: {
      enabled: { type: Boolean, default: false },
      code: { type: String, default: '' },
      desktopCode: { type: String, default: '' },
      mobileCode: { type: String, default: '' }
    },
    bottom: {
      enabled: { type: Boolean, default: false },
      code: { type: String, default: '' },
      desktopCode: { type: String, default: '' },
      mobileCode: { type: String, default: '' }
    }
  },
  popunderAds: {
    desktop: {
      enabled: { type: Boolean, default: false },
      code: { type: String, default: '' }
    },
    mobile: {
      enabled: { type: Boolean, default: false },
      code: { type: String, default: '' }
    }
  },
  directLinkAds: {
    enabled: { type: Boolean, default: false },
    redirectUrl: { type: String, default: '' },
    buttonAds: [{
      title: { type: String, default: '' },
      url: { type: String, default: '' },
      position: { type: String, default: 'header' }
    }]
  },
  adSettings: {
    enabled: { type: Boolean, default: true },
    frequency: { type: Number, default: 1 },
    maxPopupPerSession: { type: Number, default: 3 }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

adConfigSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

export default mongoose.model('AdConfig', adConfigSchema)

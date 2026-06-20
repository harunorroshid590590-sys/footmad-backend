import AdConfig from '../models/AdConfig.js'
import { fetchVastAd } from '../utils/vast.js'

// Public: resolve the configured VAST tag into a playable ad (server-side, to
// avoid browser CORS on the ad XML). Returns { enabled:false } if unavailable.
export const getVastAd = async (req, res) => {
  try {
    const config = await AdConfig.findOne()
    const va = config?.videoAd
    if (!va || !va.enabled || !va.vastUrl) return res.json({ enabled: false })

    const ad = await fetchVastAd(va.vastUrl)
    if (!ad || !ad.mediaFile) return res.json({ enabled: false })

    res.json({ enabled: true, skipAfter: va.skipAfter ?? 5, ...ad })
  } catch (error) {
    console.error('VAST resolve failed:', error.message)
    res.json({ enabled: false })
  }
}

export const getAdConfig = async (req, res) => {
  try {
    let config = await AdConfig.findOne()
    
    if (!config) {
      // Create default config
      config = await AdConfig.create({})
    }
    
    res.json(config)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const updateAdConfig = async (req, res) => {
  try {
    let config = await AdConfig.findOne()
    
    if (!config) {
      config = await AdConfig.create(req.body)
    } else {
      config = await AdConfig.findOneAndUpdate({}, req.body, { new: true, upsert: true })
    }
    
    res.json(config)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const updateBannerAds = async (req, res) => {
  try {
    const { position, enabled, code, desktopCode, mobileCode } = req.body
    
    const config = await AdConfig.findOne()
    
    if (!config) {
      return res.status(404).json({ message: 'Ad config not found' })
    }
    
    config.bannerAds[position] = {
      enabled,
      code,
      desktopCode,
      mobileCode
    }
    
    await config.save()
    res.json(config)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const updatePopunderAds = async (req, res) => {
  try {
    const { device, enabled, code } = req.body
    
    const config = await AdConfig.findOne()
    
    if (!config) {
      return res.status(404).json({ message: 'Ad config not found' })
    }
    
    config.popunderAds[device] = {
      enabled,
      code
    }
    
    await config.save()
    res.json(config)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const updateDirectLinkAds = async (req, res) => {
  try {
    const { enabled, redirectUrl, buttonAds } = req.body
    
    const config = await AdConfig.findOne()
    
    if (!config) {
      return res.status(404).json({ message: 'Ad config not found' })
    }
    
    config.directLinkAds = {
      enabled,
      redirectUrl,
      buttonAds
    }
    
    await config.save()
    res.json(config)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const updateAdSettings = async (req, res) => {
  try {
    const { enabled, frequency, maxPopupPerSession } = req.body
    
    const config = await AdConfig.findOne()
    
    if (!config) {
      return res.status(404).json({ message: 'Ad config not found' })
    }
    
    config.adSettings = {
      enabled,
      frequency,
      maxPopupPerSession
    }
    
    await config.save()
    res.json(config)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

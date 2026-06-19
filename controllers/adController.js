import Ad from '../models/Ad.js'

export const getAllAds = async (req, res) => {
  try {
    const ads = await Ad.find().sort({ priority: -1, createdAt: -1 })
    res.json(ads)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getActiveAds = async (req, res) => {
  try {
    const { type, position, device } = req.query
    
    const query = { active: true }
    
    if (type) query.type = type
    if (position) query.position = position
    if (device && device !== 'all') query.$or = [{ device: 'all' }, { device }]
    
    const now = new Date()
    query.$and = [
      { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: null }, { endDate: { $gte: now } }] }
    ]
    
    const ads = await Ad.find(query).sort({ priority: -1 })
    res.json(ads)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getAdById = async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id)
    
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' })
    }
    
    res.json(ad)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const createAd = async (req, res) => {
  try {
    const ad = new Ad(req.body)
    await ad.save()
    res.status(201).json(ad)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const updateAd = async (req, res) => {
  try {
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' })
    }
    
    res.json(ad)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const deleteAd = async (req, res) => {
  try {
    const ad = await Ad.findByIdAndDelete(req.params.id)
    
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' })
    }
    
    res.json({ message: 'Ad deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const trackImpression = async (req, res) => {
  try {
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { $inc: { impressions: 1 } },
      { new: true }
    )
    
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' })
    }
    
    res.json({ success: true, impressions: ad.impressions })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const trackClick = async (req, res) => {
  try {
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { $inc: { clicks: 1 } },
      { new: true }
    )
    
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' })
    }
    
    res.json({ success: true, clicks: ad.clicks, ctr: ad.ctr })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

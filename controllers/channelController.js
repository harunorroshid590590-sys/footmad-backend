import Channel from '../models/Channel.js'

const VALID_SECTIONS = ['channel', 'news', 'playlist', 'dawah']

// GET /api/channels?section=channel&search=bein
export const getAllChannels = async (req, res) => {
  try {
    const { section, search, all } = req.query
    const query = {}

    // Public requests only see active items; admin (?all=1) sees everything.
    if (all !== '1' && all !== 'true') {
      query.active = true
    }

    if (section && VALID_SECTIONS.includes(section)) {
      query.section = section
    }

    if (search) {
      query.name = { $regex: String(search).trim(), $options: 'i' }
    }

    const channels = await Channel.find(query).sort({ order: 1, name: 1 })
    res.json(channels)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/channels/:id
export const getChannelById = async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id)
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' })
    }
    res.json(channel)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// POST /api/channels  (admin)
export const createChannel = async (req, res) => {
  try {
    const channel = new Channel(req.body)
    await channel.save()
    res.status(201).json(channel)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// PUT /api/channels/:id  (admin)
export const updateChannel = async (req, res) => {
  try {
    const channel = await Channel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' })
    }
    res.json(channel)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// DELETE /api/channels/:id  (admin)
export const deleteChannel = async (req, res) => {
  try {
    const channel = await Channel.findByIdAndDelete(req.params.id)
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' })
    }
    res.json({ message: 'Channel deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// PATCH /api/channels/:id/toggle  (admin)
export const toggleChannelActive = async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id)
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' })
    }
    channel.active = !channel.active
    await channel.save()
    res.json(channel)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

import Stream from '../models/Stream.js'
import Match from '../models/Match.js'
import { parseStreamUrl, needsProxy } from '../utils/proxy.js'

export const getAllStreams = async (req, res) => {
  try {
    const streams = await Stream.find().sort({ createdAt: -1 })
    res.json(streams)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getStreamById = async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id)
    
    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' })
    }
    
    // Parse stream URL if it contains parameters
    const { url, params } = parseStreamUrl(stream.url)
    
    res.json({
      ...stream.toObject(),
      parsedUrl: url,
      params,
      needsProxy: needsProxy(stream)
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const createStream = async (req, res) => {
  try {
    const stream = new Stream(req.body)
    await stream.save()
    res.status(201).json(stream)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const updateStream = async (req, res) => {
  try {
    const stream = await Stream.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    
    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' })
    }
    
    res.json(stream)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const deleteStream = async (req, res) => {
  try {
    const stream = await Stream.findByIdAndDelete(req.params.id)
    
    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' })
    }
    
    // Remove stream from all matches
    await Match.updateMany(
      { streams: stream._id },
      { $pull: { streams: stream._id } }
    )
    
    res.json({ message: 'Stream deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const toggleStreamActive = async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id)
    
    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' })
    }
    
    stream.active = !stream.active
    await stream.save()
    
    res.json(stream)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

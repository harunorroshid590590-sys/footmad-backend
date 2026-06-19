import mongoose from 'mongoose'

/**
 * Per-match admin overrides for API-sourced matches.
 * Matches come from the external provider (not MongoDB), so anything an admin
 * wants to customize per match (e.g. a designed poster banner) is stored here,
 * keyed by the provider's match id, and merged into the feed at read time.
 */
const matchOverrideSchema = new mongoose.Schema({
  matchId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  banner: {
    type: String,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

export default mongoose.model('MatchOverride', matchOverrideSchema)

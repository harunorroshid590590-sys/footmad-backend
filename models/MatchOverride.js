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
  bannerLink: {
    type: String,
    default: ''
  },
  pinned: {
    type: Boolean,
    default: false
  },
  // Admin-edited stream links. When `serversEdited` is true these REPLACE the
  // API's links for this match; "Reset" sets it back to false to restore the API.
  servers: {
    type: Array,
    default: []
  },
  serversEdited: {
    type: Boolean,
    default: false
  },
  // Hidden matches are removed from the public feed (admin can still see/unhide).
  hidden: {
    type: Boolean,
    default: false
  },
  // Full-match field edits for an API match. When `fieldsEdited` is true these
  // REPLACE the provider's match info; "Reset" sets it back to false (restores
  // the original API data).
  fieldsEdited: { type: Boolean, default: false },
  category: { type: String, default: '' },
  status: { type: String, default: 'normal' },
  eventName: { type: String, default: '' },
  tournamentLogo: { type: String, default: '' },
  homeTeam: { type: String, default: '' },
  homeLogo: { type: String, default: '' },
  awayTeam: { type: String, default: '' },
  awayLogo: { type: String, default: '' },
  startTime: { type: Date, default: null },
  durationMinutes: { type: Number, default: 120 },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

export default mongoose.model('MatchOverride', matchOverrideSchema)

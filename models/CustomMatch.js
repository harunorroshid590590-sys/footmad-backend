import mongoose from 'mongoose'

/**
 * Admin-created ("custom") matches. The public feed normally comes from the
 * external provider API; custom matches are stored here in Mongo and merged into
 * the feed at read time (normalized to the same shape as provider matches, with
 * isCustom: true). This is what the admin "Add Match" form creates.
 */
const customChannelSchema = new mongoose.Schema(
  {
    title: { type: String, default: 'Stream' },
    type: { type: String, default: 'M3U8' },
    link: { type: String, default: '' },
    drm: { type: String, default: '' },
    order: { type: Number, default: 1 }
  },
  { _id: false }
)

const customMatchSchema = new mongoose.Schema({
  matchId: { type: String, required: true, unique: true, index: true },
  category: { type: String, default: 'Football' },
  // Display flag: 'normal' or 'hot' (hot shows the HOT ribbon).
  status: { type: String, default: 'normal' },
  // Tournament / league name + its logo.
  eventName: { type: String, default: '' },
  tournamentLogo: { type: String, default: '' },
  homeTeam: { type: String, default: '' },
  homeLogo: { type: String, default: '' },
  awayTeam: { type: String, default: '' },
  awayLogo: { type: String, default: '' },
  startTime: { type: Date },
  durationMinutes: { type: Number, default: 120 },
  // Notification banner image shown for the match.
  banner: { type: String, default: '' },
  channels: { type: [customChannelSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

export default mongoose.model('CustomMatch', customMatchSchema)

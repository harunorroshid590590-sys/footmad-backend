import mongoose from 'mongoose'

const matchSchema = new mongoose.Schema({
  homeTeam: {
    name: {
      type: String,
      required: true
    },
    logo: {
      type: String,
      default: ''
    }
  },
  awayTeam: {
    name: {
      type: String,
      required: true
    },
    logo: {
      type: String,
      default: ''
    }
  },
  league: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Football', 'Cricket', 'UFC', 'Boxing', 'WWE', 'Formula 1', 'MotoGP', 'NBA', 'MLB', 'Tennis', 'NHL']
  },
  time: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['upcoming', 'live', 'finished'],
    default: 'upcoming'
  },
  streams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stream'
  }],
  isFeatured: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  source: {
    type: String,
    enum: ['manual', 'api'],
    default: 'manual'
  },
  apiId: {
    type: String,
    default: ''
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

matchSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

export default mongoose.model('Match', matchSchema)

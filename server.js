import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import compression from 'compression'
import authRoutes from './routes/auth.js'
import matchRoutes from './routes/matches.js'
import streamRoutes from './routes/streams.js'
import adminRoutes from './routes/admin.js'
import proxyRoutes from './routes/proxy.js'
import adRoutes from './routes/ads.js'
import adConfigRoutes from './routes/adConfig.js'
import cacheRoutes from './routes/cache.js'
import schedulerRoutes from './routes/scheduler.js'
import debugRoutes from './routes/debug.js'
import { errorHandler } from './middleware/errorHandler.js'
import User from './models/User.js'
import bcrypt from 'bcryptjs'
import { seedDemoMatches } from './utils/seed.js'
import { initializeScheduler } from './utils/scheduler.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5007

// Middleware
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

app.use(cors({
  origin: corsOrigins,
  credentials: true
}))
app.use(compression())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/matches', matchRoutes)
app.use('/api/streams', streamRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/ads', adRoutes)
app.use('/api/ad-config', adConfigRoutes)
app.use('/api/cache', cacheRoutes)
app.use('/api/scheduler', schedulerRoutes)
app.use('/api/debug', debugRoutes)
app.use('/proxy', proxyRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'FOOTFY API is running' })
})

// Error handling
app.use(errorHandler)

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB')
    
    // Initialize database (admin user + demo matches)
    initializeDatabase()
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
      console.log(`API: http://localhost:${PORT}/api`)
      console.log(`Admin: http://localhost:${PORT}/admin`)
    })
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error)
    process.exit(1)
  })

async function createDefaultAdmin() {
  try {
    const existingAdmin = await User.findOne({ username: 'admin' })
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10)
      const admin = new User({
        username: 'admin',
        password: hashedPassword,
        role: 'admin'
      })
      await admin.save()
      console.log('Default admin user created: username=admin, password=admin123')
      console.log('⚠️  Please change the default password after first login!')
    }
  } catch (error) {
    console.error('Error creating default admin:', error)
  }
}

async function initializeDatabase() {
  try {
    console.log('Initializing database...')
    await createDefaultAdmin()
    
    // DO NOT seed demo matches - use only real API data
    console.log('Skipping demo match seeding - using real API data only')
    
    // Initialize default scheduler tasks
    const Scheduler = (await import('./models/Scheduler.js')).default
    const schedulerCount = await Scheduler.countDocuments()
    
    if (schedulerCount === 0) {
      console.log('Creating default scheduler tasks...')
      await Scheduler.create([
        {
          name: 'API Auto Sync',
          type: 'api-sync',
          interval: 3, // 3 minutes
          active: true,
          nextRun: new Date(Date.now() + 3 * 60 * 1000)
        },
        {
          name: 'Cache Cleanup',
          type: 'cache-cleanup',
          interval: 60, // 1 hour
          active: true,
          nextRun: new Date(Date.now() + 60 * 60 * 1000)
        }
      ])
    }
    
    // Initialize scheduler
    await initializeScheduler()
    
    // Initial API sync
    console.log('Performing initial API sync...')
    const { syncWithAPI } = await import('./utils/api.js')
    await syncWithAPI()
    
    console.log('Database initialization complete')
  } catch (error) {
    console.error('Database initialization error:', error)
  }
}

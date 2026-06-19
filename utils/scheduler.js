import cron from 'node-cron'
import Scheduler from '../models/Scheduler.js'
import { syncWithAPI } from './api.js'

const activeTasks = new Map()

export const initializeScheduler = async () => {
  try {
    console.log('Initializing scheduler...')
    
    // Get all active schedulers from database
    const schedulers = await Scheduler.find({ active: true })
    
    for (const scheduler of schedulers) {
      await scheduleTask(scheduler)
    }
    
    console.log(`Initialized ${schedulers.length} scheduler tasks`)
  } catch (error) {
    console.error('Scheduler initialization error:', error)
  }
}

export const scheduleTask = async (scheduler) => {
  try {
    // Stop existing task if running
    if (activeTasks.has(scheduler._id.toString())) {
      activeTasks.get(scheduler._id.toString()).stop()
    }
    
    // Create cron expression from interval (in minutes)
    const cronExpression = `*/${scheduler.interval} * * * *`
    
    const task = cron.schedule(cronExpression, async () => {
      console.log(`Running scheduled task: ${scheduler.name}`)
      
      try {
        await Scheduler.findByIdAndUpdate(scheduler._id, { status: 'running' })
        
        let result
        switch (scheduler.type) {
          case 'api-sync':
            result = await syncWithAPI()
            // Clear cache after sync
            const { clearCache } = await import('./cache.js')
            await clearCache()
            break
          case 'cache-cleanup':
            const { clearCache: clearCache2 } = await import('./cache.js')
            result = await clearCache2()
            break
          case 'stats-update':
            // Stats update logic here
            result = { success: true }
            break
          default:
            result = { success: false, message: 'Unknown task type' }
        }
        
        const update = {
          status: result.success ? 'completed' : 'failed',
          lastRun: new Date(),
          $inc: { runCount: 1 }
        }
        
        if (result.success) {
          update.$inc.successCount = 1
          update.lastError = ''
        } else {
          update.$inc.failureCount = 1
          update.lastError = result.message || 'Unknown error'
        }
        
        // Calculate next run
        update.nextRun = new Date(Date.now() + scheduler.interval * 60 * 1000)
        
        await Scheduler.findByIdAndUpdate(scheduler._id, update)
        console.log(`Task completed: ${scheduler.name}`, result)
      } catch (error) {
        console.error(`Task error: ${scheduler.name}`, error)
        await Scheduler.findByIdAndUpdate(scheduler._id, {
          status: 'failed',
          lastRun: new Date(),
          lastError: error.message,
          $inc: { runCount: 1, failureCount: 1 },
          nextRun: new Date(Date.now() + scheduler.interval * 60 * 1000)
        })
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    })
    
    activeTasks.set(scheduler._id.toString(), task)
    console.log(`Scheduled task: ${scheduler.name} (interval: ${scheduler.interval} min)`)
  } catch (error) {
    console.error('Schedule task error:', error)
  }
}

export const stopTask = async (schedulerId) => {
  try {
    if (activeTasks.has(schedulerId.toString())) {
      activeTasks.get(schedulerId.toString()).stop()
      activeTasks.delete(schedulerId.toString())
      console.log(`Stopped task: ${schedulerId}`)
      return true
    }
    return false
  } catch (error) {
    console.error('Stop task error:', error)
    return false
  }
}

export const runTaskNow = async (schedulerId) => {
  try {
    const scheduler = await Scheduler.findById(schedulerId)
    if (!scheduler) {
      return { success: false, message: 'Scheduler not found' }
    }
    
    console.log(`Running task now: ${scheduler.name}`)
    
    let result
    switch (scheduler.type) {
      case 'api-sync':
        result = await syncWithAPI()
        const { clearCache } = await import('./cache.js')
        await clearCache()
        break
      case 'cache-cleanup':
        const { clearCache: clearCache2 } = await import('./cache.js')
        result = await clearCache2()
        break
      case 'stats-update':
        result = { success: true }
        break
      default:
        result = { success: false, message: 'Unknown task type' }
    }
    
    const update = {
      status: result.success ? 'completed' : 'failed',
      lastRun: new Date(),
      $inc: { runCount: 1 }
    }
    
    if (result.success) {
      update.$inc.successCount = 1
      update.lastError = ''
    } else {
      update.$inc.failureCount = 1
      update.lastError = result.message || 'Unknown error'
    }
    
    update.nextRun = new Date(Date.now() + scheduler.interval * 60 * 1000)
    
    await Scheduler.findByIdAndUpdate(schedulerId, update)
    
    return result
  } catch (error) {
    console.error('Run task now error:', error)
    return { success: false, message: error.message }
  }
}

import Scheduler from '../models/Scheduler.js'
import { runTaskNow, stopTask, scheduleTask } from '../utils/scheduler.js'

export const getAllSchedulers = async (req, res) => {
  try {
    const schedulers = await Scheduler.find().sort({ createdAt: 1 })
    res.json(schedulers)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getSchedulerById = async (req, res) => {
  try {
    const scheduler = await Scheduler.findById(req.params.id)
    
    if (!scheduler) {
      return res.status(404).json({ message: 'Scheduler not found' })
    }
    
    res.json(scheduler)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const createScheduler = async (req, res) => {
  try {
    const scheduler = new Scheduler(req.body)
    await scheduler.save()
    
    // Schedule the task
    await scheduleTask(scheduler)
    
    res.status(201).json(scheduler)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const updateScheduler = async (req, res) => {
  try {
    const scheduler = await Scheduler.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    
    if (!scheduler) {
      return res.status(404).json({ message: 'Scheduler not found' })
    }
    
    // Reschedule if interval changed
    if (req.body.interval) {
      await stopTask(req.params.id)
      await scheduleTask(scheduler)
    }
    
    res.json(scheduler)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const deleteScheduler = async (req, res) => {
  try {
    const scheduler = await Scheduler.findByIdAndDelete(req.params.id)
    
    if (!scheduler) {
      return res.status(404).json({ message: 'Scheduler not found' })
    }
    
    // Stop the task
    await stopTask(req.params.id)
    
    res.json({ message: 'Scheduler deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const runScheduler = async (req, res) => {
  try {
    const result = await runTaskNow(req.params.id)
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const toggleScheduler = async (req, res) => {
  try {
    const scheduler = await Scheduler.findById(req.params.id)
    
    if (!scheduler) {
      return res.status(404).json({ message: 'Scheduler not found' })
    }
    
    scheduler.active = !scheduler.active
    
    if (scheduler.active) {
      await scheduleTask(scheduler)
    } else {
      await stopTask(req.params.id)
    }
    
    await scheduler.save()
    
    res.json(scheduler)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

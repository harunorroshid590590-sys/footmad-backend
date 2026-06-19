import express from 'express'
import { login, createAdmin, verifyToken } from '../controllers/authController.js'
import { adminAuth } from '../middleware/auth.js'

const router = express.Router()

// Public routes - no auth required
router.post('/login', login)
router.post('/create-admin', createAdmin)

// Protected routes - require auth
router.get('/verify', adminAuth, verifyToken)

export default router

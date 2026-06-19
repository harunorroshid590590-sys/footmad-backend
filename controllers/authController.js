import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const login = async (req, res) => {
  try {
    const { username, password } = req.body
    
    console.log('Login attempt for username:', username)
    
    const user = await User.findOne({ username })
    
    if (!user) {
      console.log('Login failed: User not found')
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    
    console.log('User found, comparing password...')
    const isMatch = await bcrypt.compare(password, user.password)
    
    if (!isMatch) {
      console.log('Login failed: Password mismatch')
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    
    console.log('Password match, generating token...')
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )
    
    console.log('Login successful for user:', username)
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: error.message })
  }
}

export const createAdmin = async (req, res) => {
  try {
    const { username, password } = req.body
    
    const existingUser = await User.findOne({ username })
    
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' })
    }
    
    const hashedPassword = await bcrypt.hash(password, 10)
    
    const user = new User({
      username,
      password: hashedPassword,
      role: 'admin'
    })
    
    await user.save()
    
    res.status(201).json({
      message: 'Admin user created successfully',
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const verifyToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password')
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    res.json({ user })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

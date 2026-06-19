import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { uploadFile } from '../controllers/uploadController.js'
import { adminAuth } from '../middleware/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// On serverless (Vercel) the project filesystem is read-only — only /tmp is
// writable (and ephemeral). Locally/always-on hosts use a persistent ./uploads.
export const uploadDir = process.env.VERCEL
  ? '/tmp/uploads'
  : path.join(__dirname, '..', 'uploads')

// Ensure the uploads directory exists (never crash on read-only FS).
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }
} catch (err) {
  console.warn('Could not create uploads dir:', err.message)
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase()
      .slice(0, 40) || 'file'
    cb(null, `${Date.now()}-${safeBase}${ext.toLowerCase()}`)
  }
})

const fileFilter = (req, file, cb) => {
  if (/^image\//.test(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Only image files are allowed'))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
})

const router = express.Router()

// POST /api/upload  (field name: "file") — admin only
router.post('/', adminAuth, upload.single('file'), uploadFile)

export default router

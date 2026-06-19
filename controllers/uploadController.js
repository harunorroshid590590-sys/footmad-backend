/**
 * Returns the public URL for a freshly uploaded file.
 * The multer middleware (see routes/upload.js) has already stored the file
 * in /uploads and populated req.file.
 */
export const uploadFile = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' })
  }

  const url = `/uploads/${req.file.filename}`
  res.status(201).json({
    url,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype
  })
}

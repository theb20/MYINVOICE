import { createHash, randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { Router } from 'express'
import multer from 'multer'

import { ApiError } from '../errors.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

function uploadsDir() {
  const dir = path.join(process.cwd(), 'uploads')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir()),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').slice(0, 16) || ''
    const name = `${Date.now()}_${randomBytes(8).toString('hex')}${ext}`
    cb(null, name)
  },
})

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

function isImage(file) {
  return typeof file?.mimetype === 'string' && file.mimetype.startsWith('image/')
}

function computeStampHash({ issueDate, companyName, clientName, clientEmail }) {
  const raw = [
    String(issueDate || '').trim(),
    String(companyName || '').trim(),
    String(clientName || '').trim(),
    String(clientEmail || '').trim(),
  ].join('|')
  return createHash('sha256').update(raw).digest('hex')
}

export function uploadsRouter(env) {
  const router = Router()
  const auth = requireAuth(env.JWT_SECRET)

  router.post(
    '/',
    auth,
    upload.fields([
      { name: 'attachment', maxCount: 1 },
      { name: 'signature', maxCount: 1 },
      { name: 'stamp', maxCount: 1 },
    ]),
    asyncHandler(async (req, res) => {
      const files = req.files || {}
      const attachment = files.attachment?.[0]
      const signature = files.signature?.[0]
      const stamp = files.stamp?.[0]

      if (signature && !isImage(signature)) throw new ApiError(400, 'Signature must be an image')
      if (stamp && !isImage(stamp)) throw new ApiError(400, 'Stamp must be an image')

      const base = env.NODE_ENV === 'production' ? '' : `http://localhost:${env.PORT}`

      const out = {}
      if (attachment) {
        out.attachment = { url: `${base}/uploads/${attachment.filename}`, name: attachment.originalname }
      }
      if (signature) {
        out.signature = { url: `${base}/uploads/${signature.filename}` }
      }
      if (stamp) {
        const stampHash = computeStampHash({
          issueDate: req.body.issueDate,
          companyName: req.body.companyName,
          clientName: req.body.clientName,
          clientEmail: req.body.clientEmail,
        })
        out.stamp = { url: `${base}/uploads/${stamp.filename}`, hash: stampHash }
      }

      return res.status(201).json(out)
    }),
  )

  return router
}


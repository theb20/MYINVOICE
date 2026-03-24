import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

import { errorHandler } from './middleware/errorHandler.js'
import { registerRoutes } from './routes/index.js'
import { logInfo } from './logger.js'

export function createApp({ db, env }) {
  const app = express()
  const origins = env.FRONTEND_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  )
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true)
        if (origins.includes(origin)) return cb(null, true)
        if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true)
        return cb(null, false)
      },
      credentials: false,
    }),
  )
  app.use(express.json({ limit: '1mb' }))
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

  app.use((req, res, next) => {
    req.id = req.header('x-request-id') || randomUUID()
    res.setHeader('x-request-id', req.id)
    next()
  })

  morgan.token('id', (req) => req.id)
  morgan.token('ip', (req) => req.ip)
  morgan.token('ua', (req) => req.get('user-agent') || '')
  app.use(
    morgan(':id :ip :method :url :status :res[content-length] - :response-time ms', {
      stream: { write: (line) => logInfo('http', { line: line.trim() }) },
    }),
  )

  app.use((req, _res, next) => {
    req.ctx = { db, env, origins, requestId: req.id }
    next()
  })

  app.get('/', (_req, res) => res.json({ status: 'ok' }))

  registerRoutes(app, { env })

  app.use((_req, res) => res.status(404).json({ message: 'Not found' }))
  app.use(errorHandler)

  return app
}

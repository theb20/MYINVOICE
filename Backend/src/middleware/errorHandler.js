import { ApiError } from '../errors.js'
import { logError } from '../logger.js'

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ApiError) return res.status(err.status).json({ message: err.message })
  logError('unhandled_error', {
    requestId: _req?.id,
    method: _req?.method,
    url: _req?.originalUrl,
    error: err instanceof Error ? err.stack || err.message : String(err),
  })
  if (process.env.NODE_ENV !== 'production') {
    return res.status(500).json({
      message: 'Internal server error',
      requestId: _req?.id,
      detail: err instanceof Error ? err.message : String(err),
    })
  }
  return res.status(500).json({ message: 'Internal server error', requestId: _req?.id })
}

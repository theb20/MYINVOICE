import { start } from './src/start.js'
import { logError } from './src/logger.js'

process.on('unhandledRejection', (reason) => {
  logError('unhandled_rejection', { reason: reason instanceof Error ? reason.stack || reason.message : String(reason) })
})

process.on('uncaughtException', (err) => {
  logError('uncaught_exception', { error: err instanceof Error ? err.stack || err.message : String(err) })
  process.exit(1)
})

start().catch((e) => {
  logError('startup_error', { error: e instanceof Error ? e.stack || e.message : String(e) })
  process.exit(1)
})

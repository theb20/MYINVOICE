import fs from 'node:fs'

const levels = { debug: 10, info: 20, warn: 30, error: 40 }

function currentLevel() {
  const raw = (process.env.LOG_LEVEL || 'info').toLowerCase()
  return levels[raw] ? raw : 'info'
}

function shouldLog(level) {
  return levels[level] >= levels[currentLevel()]
}

function format(level, message, meta) {
  const base = { ts: new Date().toISOString(), level, message }
  const payload = meta && typeof meta === 'object' ? { ...base, ...meta } : base
  return `${JSON.stringify(payload)}\n`
}

function write(level, message, meta) {
  if (!shouldLog(level)) return
  const line = format(level, message, meta)
  const file = process.env.LOG_FILE
  if (file) {
    try {
      fs.appendFileSync(file, line)
    } catch {}
  }
  if (level === 'debug' || level === 'info') process.stdout.write(line)
  else process.stderr.write(line)
}

export function logDebug(message, meta) {
  write('debug', message, meta)
}

export function logInfo(message, meta) {
  write('info', message, meta)
}

export function logWarn(message, meta) {
  write('warn', message, meta)
}

export function logError(message, meta) {
  write('error', message, meta)
}

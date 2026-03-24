import jwt from 'jsonwebtoken'

export function requireAuth(jwtSecret) {
  return (req, res, next) => {
    const header = req.header('authorization') || ''
    const [scheme, token] = header.split(' ')
    if (scheme !== 'Bearer' || !token) {
      process.stderr.write(
        `${JSON.stringify({
          ts: new Date().toISOString(),
          level: 'warn',
          message: 'unauthorized_missing_token',
          requestId: req.id,
          method: req.method,
          url: req.originalUrl,
        })}\n`,
      )
      return res.status(401).json({ message: 'Unauthorized' })
    }

    try {
      const payload = jwt.verify(token, jwtSecret)
      req.user = { userId: payload.sub, email: payload.email }
      return next()
    } catch {
      process.stderr.write(
        `${JSON.stringify({
          ts: new Date().toISOString(),
          level: 'warn',
          message: 'unauthorized_invalid_token',
          requestId: req.id,
          method: req.method,
          url: req.originalUrl,
        })}\n`,
      )
      return res.status(401).json({ message: 'Unauthorized' })
    }
  }
}

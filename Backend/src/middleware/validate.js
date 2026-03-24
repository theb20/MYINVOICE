export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      process.stderr.write(
        `${JSON.stringify({
          ts: new Date().toISOString(),
          level: 'warn',
          message: 'invalid_body',
          requestId: req.id,
          method: req.method,
          url: req.originalUrl,
          issues,
          bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body).slice(0, 30) : [],
        })}\n`,
      )
      if (process.env.NODE_ENV === 'production') return res.status(400).json({ message: 'Invalid body' })
      return res.status(400).json({ message: 'Invalid body', issues })
    }
    req.body = parsed.data
    return next()
  }
}

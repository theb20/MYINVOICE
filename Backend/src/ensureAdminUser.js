import { v4 as uuidv4 } from 'uuid'

import { hashPassword } from './security.js'

export async function ensureAdminUser({ db, env }) {
  const email = (env.ADMIN_EMAIL ?? '').trim().toLowerCase()
  const password = (env.ADMIN_PASSWORD ?? '').trim()
  if (!email || !password) return

  const [rows] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email])
  if (rows.length) return

  const passwordHash = await hashPassword(password)
  await db.query(
    'INSERT INTO users (id, email, passwordHash, isActive) VALUES (?, ?, ?, TRUE) ON DUPLICATE KEY UPDATE email = email',
    [uuidv4(), email, passwordHash],
  )
}

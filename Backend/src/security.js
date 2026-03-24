import { createHash, randomBytes } from 'node:crypto'

import bcrypt from 'bcrypt'

export function generateToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url')
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash)
}


import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'

import { ApiError } from '../errors.js'
import { createPasswordReset, findPasswordResetByTokenHash, markPasswordResetUsed } from '../models/passwordReset.model.js'
import { findUserByEmail, updateUserPassword } from '../models/user.model.js'
import { generateToken, hashPassword, hashToken, verifyPassword } from '../security.js'

export async function login({ db, env }, { email, password }) {
  const user = await findUserByEmail(db, email.trim().toLowerCase())
  if (!user || !user.isActive) throw new ApiError(401, 'Unauthorized')
  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) throw new ApiError(401, 'Unauthorized')
  const accessToken = jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, { expiresIn: '12h' })
  return { accessToken }
}

export async function requestPasswordReset({ db }, { email }) {
  const user = await findUserByEmail(db, email.trim().toLowerCase())
  if (!user || !user.isActive) return { ok: true }

  const token = generateToken(32)
  const tokenHash = hashToken(token)
  const ttlMinutes = 30
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000)

  await createPasswordReset(db, { id: uuidv4(), userId: user.id, tokenHash, expiresAt })

  if (process.env.NODE_ENV === 'production') return { ok: true }
  return { ok: true, token, expiresAt }
}

export async function resetPassword({ db }, { token, newPassword }) {
  const record = await findPasswordResetByTokenHash(db, hashToken(token))
  if (!record) throw new ApiError(401, 'Invalid or expired token')
  if (record.usedAt) throw new ApiError(401, 'Invalid or expired token')
  if (new Date(record.expiresAt).getTime() < Date.now()) throw new ApiError(401, 'Invalid or expired token')

  const passwordHash = await hashPassword(newPassword)
  await updateUserPassword(db, record.userId, passwordHash)
  await markPasswordResetUsed(db, record.id)
  return { ok: true }
}

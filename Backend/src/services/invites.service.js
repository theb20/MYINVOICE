import { ApiError } from '../errors.js'
import { findClientById, updateClient } from '../models/client.model.js'
import { createInvite, findInviteByTokenHash, markInviteUsed } from '../models/invite.model.js'
import { sendAdminClientCompletedEmail } from './mailer.service.js'
import { generateToken, hashToken } from '../security.js'

export async function createForClient({ db, env, origins }, clientId, { inviteId }) {
  const client = await findClientById(db, clientId)
  if (!client) throw new ApiError(404, 'Not found')

  const token = generateToken(32)
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + env.INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)

  await createInvite(db, { id: inviteId, tokenHash, clientId, expiresAt })

  const origin = origins[0] ?? 'http://localhost:5173'
  return {
    inviteId,
    expiresAt,
    url: `${origin}/client/${token}`,
    clientId: client.id,
    clientName: client.name,
    clientEmail: client.email,
  }
}

export async function getByToken({ db }, token) {
  const invite = await findInviteByTokenHash(db, hashToken(token))
  if (!invite) throw new ApiError(404, 'Not found')
  if (invite.usedAt) throw new ApiError(401, 'Invalid or used')
  if (new Date(invite.expiresAt).getTime() < Date.now()) throw new ApiError(401, 'Expired')
  return invite
}

export async function submit(ctx, token, clientInfo) {
  const { db, env } = ctx
  const invite = await getByToken({ db }, token)

  await updateClient(db, invite.clientId, {
    name: clientInfo.name.trim(),
    contactName: clientInfo.contactName?.trim() ?? null,
    siret: clientInfo.siret?.trim() ?? null,
    email: clientInfo.email?.trim() ?? null,
    phone: clientInfo.phone?.trim() ?? null,
    address: clientInfo.address?.trim() ?? null,
    postalCode: clientInfo.postalCode?.trim() ?? null,
    city: clientInfo.city?.trim() ?? null,
    country: clientInfo.country?.trim() ?? null,
    vatNumber: clientInfo.vatNumber?.trim() ?? null,
    lastCompletedAt: new Date(),
  })

  await markInviteUsed(db, invite.id)
  const client = await findClientById(db, invite.clientId)
  if (client && env?.ADMIN_EMAIL) {
    await sendAdminClientCompletedEmail(ctx, { to: env.ADMIN_EMAIL, client }).catch(() => {})
  }
  return { ok: true }
}

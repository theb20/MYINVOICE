import { v4 as uuidv4 } from 'uuid'

import { ApiError } from '../errors.js'
import { findInvoiceDraftByNumber } from '../models/invoiceDraft.model.js'
import { createInvoiceShare, findInvoiceShareByTokenHash } from '../models/invoiceShare.model.js'
import { generateToken, hashToken } from '../security.js'

export async function createShare(ctx, invoiceNumber) {
  const draft = await findInvoiceDraftByNumber(ctx.db, invoiceNumber)
  if (!draft) throw new ApiError(404, 'Not found')

  const token = generateToken(32)
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  await createInvoiceShare(ctx.db, { id: uuidv4(), invoiceDraftId: draft.id, tokenHash, expiresAt })
  return {
    expiresAt,
    url: `${ctx.origins?.[0] ?? ctx.env.FRONTEND_ORIGIN}/public/invoice/${token}`,
  }
}

export async function getPublicByToken(ctx, token) {
  const row = await findInvoiceShareByTokenHash(ctx.db, hashToken(token))
  if (!row) throw new ApiError(404, 'Not found')
  if (new Date(row.expiresAt).getTime() < Date.now()) throw new ApiError(401, 'Expired')
  return row
}


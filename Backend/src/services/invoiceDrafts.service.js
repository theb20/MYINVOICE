import { v4 as uuidv4 } from 'uuid'

import { ApiError } from '../errors.js'
import { deleteInvoiceDraftByNumber, findInvoiceDraftByNumber, insertInvoiceDraft, listInvoiceDrafts, updateInvoiceDraftByNumber } from '../models/invoiceDraft.model.js'

export async function upsert(ctx, payload) {
  const invoiceNumber = String(payload.invoiceNumber || '').trim()
  if (!invoiceNumber) throw new ApiError(400, 'Invalid invoiceNumber')

  const status = String(payload.status || '').trim() || 'draft'
  const currency = String(payload.currency || '').trim() || 'EUR'
  const clientName = payload.clientName ? String(payload.clientName).trim() : null
  const clientEmail = payload.clientEmail ? String(payload.clientEmail).trim() : null
  const data = payload.data
  if (!data || typeof data !== 'object') throw new ApiError(400, 'Invalid data')

  const existing = await findInvoiceDraftByNumber(ctx.db, invoiceNumber)
  if (!existing) {
    const id = uuidv4()
    await insertInvoiceDraft(ctx.db, { id, invoiceNumber, status, currency, clientName, clientEmail, data })
    return { id, invoiceNumber }
  }

  await updateInvoiceDraftByNumber(ctx.db, invoiceNumber, { status, currency, clientName, clientEmail, data })
  return { id: existing.id, invoiceNumber }
}

export async function get(ctx, invoiceNumberRaw) {
  const invoiceNumber = String(invoiceNumberRaw || '').trim()
  if (!invoiceNumber) throw new ApiError(400, 'Invalid invoiceNumber')
  const row = await findInvoiceDraftByNumber(ctx.db, invoiceNumber)
  if (!row) throw new ApiError(404, 'Not found')
  return row
}

export async function list(ctx, { limit } = {}) {
  return listInvoiceDrafts(ctx.db, { limit })
}

export async function patchData(ctx, invoiceNumberRaw, patchFn) {
  const invoiceNumber = String(invoiceNumberRaw || '').trim()
  if (!invoiceNumber) throw new ApiError(400, 'Invalid invoiceNumber')
  const row = await findInvoiceDraftByNumber(ctx.db, invoiceNumber)
  if (!row) throw new ApiError(404, 'Not found')
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
  const nextData = patchFn(data)
  await updateInvoiceDraftByNumber(ctx.db, invoiceNumber, {
    status: row.status,
    currency: row.currency,
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    data: nextData,
  })
  return nextData
}

export async function updateMeta(ctx, invoiceNumberRaw, payload) {
  const invoiceNumber = String(invoiceNumberRaw || '').trim()
  if (!invoiceNumber) throw new ApiError(400, 'Invalid invoiceNumber')
  const row = await findInvoiceDraftByNumber(ctx.db, invoiceNumber)
  if (!row) throw new ApiError(404, 'Not found')

  const status = payload.status ? String(payload.status).trim() : row.status
  const currency = payload.currency ? String(payload.currency).trim() : row.currency
  const clientName = payload.clientName !== undefined ? (payload.clientName ? String(payload.clientName).trim() : null) : row.clientName
  const clientEmail = payload.clientEmail !== undefined ? (payload.clientEmail ? String(payload.clientEmail).trim() : null) : row.clientEmail
  const data = row.data
  await updateInvoiceDraftByNumber(ctx.db, invoiceNumber, { status, currency, clientName, clientEmail, data: typeof data === 'string' ? JSON.parse(data) : data })
  return { ok: true }
}

export async function remove(ctx, invoiceNumberRaw) {
  const invoiceNumber = String(invoiceNumberRaw || '').trim()
  if (!invoiceNumber) throw new ApiError(400, 'Invalid invoiceNumber')
  await deleteInvoiceDraftByNumber(ctx.db, invoiceNumber)
  return { ok: true }
}

import { ApiError } from '../errors.js'
import { nextInvoiceSequence } from '../models/invoiceCounter.model.js'

function pad4(n) {
  return String(n).padStart(4, '0')
}

function normalizeDate(dateStr) {
  const s = String(dateStr || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new ApiError(400, 'Invalid issueDate')
  return s
}

function prefixForType(type) {
  if (type === 'invoice') return 'INV'
  if (type === 'quote') return 'DEV'
  if (type === 'credit_note') return 'AVO'
  if (type === 'deposit') return 'ACP'
  return 'INV'
}

export async function nextNumber(ctx, { issueDate, docType }) {
  const date = normalizeDate(issueDate)
  const type = String(docType || 'invoice').trim()
  const prefix = prefixForType(type)
  const counterDate = date
  const seq = await nextInvoiceSequence(ctx.db, { counterDate, docType: type })
  const compact = counterDate.replaceAll('-', '')
  return { invoiceNumber: `${prefix}-${compact}-${pad4(seq)}`, seq, counterDate, docType: type }
}


import * as invoiceSharesService from '../services/invoiceShares.service.js'

export async function create(req, res) {
  const result = await invoiceSharesService.createShare(req.ctx, req.params.invoiceNumber)
  return res.status(201).json(result)
}

export async function getPublic(req, res) {
  const row = await invoiceSharesService.getPublicByToken(req.ctx, req.params.token)
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
  return res.json({
    invoiceNumber: row.invoiceNumber,
    status: row.status,
    currency: row.currency,
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    data,
  })
}


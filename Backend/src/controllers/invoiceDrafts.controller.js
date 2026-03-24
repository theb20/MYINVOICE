import * as invoiceDraftsService from '../services/invoiceDrafts.service.js'

export async function upsert(req, res) {
  const result = await invoiceDraftsService.upsert(req.ctx, req.body)
  return res.json(result)
}

export async function get(req, res) {
  const result = await invoiceDraftsService.get(req.ctx, req.params.invoiceNumber)
  return res.json(result)
}

export async function list(req, res) {
  const limit = req.query.limit ? Number(req.query.limit) : undefined
  const result = await invoiceDraftsService.list(req.ctx, { limit })
  return res.json(result)
}

export async function update(req, res) {
  const result = await invoiceDraftsService.updateMeta(req.ctx, req.params.invoiceNumber, req.body)
  return res.json(result)
}

export async function remove(req, res) {
  const result = await invoiceDraftsService.remove(req.ctx, req.params.invoiceNumber)
  return res.json(result)
}

import * as serviceItemsService from '../services/serviceItems.service.js'

export async function list(req, res) {
  const activeOnly = req.query.activeOnly === '1' || req.query.activeOnly === 'true'
  const result = await serviceItemsService.list(req.ctx, { activeOnly })
  return res.json(result)
}

export async function create(req, res) {
  const result = await serviceItemsService.create(req.ctx, req.body)
  return res.status(201).json(result)
}

export async function update(req, res) {
  const result = await serviceItemsService.update(req.ctx, req.params.id, req.body)
  return res.json(result)
}

export async function remove(req, res) {
  const result = await serviceItemsService.remove(req.ctx, req.params.id)
  return res.json(result)
}


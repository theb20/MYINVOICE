import * as ownerProfileService from '../services/ownerProfile.service.js'

export async function get(req, res) {
  const result = await ownerProfileService.get(req.ctx)
  return res.json(result)
}

export async function update(req, res) {
  const result = await ownerProfileService.update(req.ctx, req.body)
  return res.json(result)
}


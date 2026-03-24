import * as authService from '../services/auth.service.js'

export async function login(req, res) {
  const result = await authService.login(req.ctx, req.body)
  return res.json(result)
}

export async function requestPasswordReset(req, res) {
  const result = await authService.requestPasswordReset(req.ctx, req.body)
  return res.json(result)
}

export async function resetPassword(req, res) {
  const result = await authService.resetPassword(req.ctx, req.body)
  return res.json(result)
}

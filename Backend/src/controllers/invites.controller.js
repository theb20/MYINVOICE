import * as invitesService from '../services/invites.service.js'

export async function getInvite(req, res) {
  const invite = await invitesService.getByToken(req.ctx, req.params.token)
  return res.json({ clientId: invite.clientId, clientName: invite.clientName, expiresAt: invite.expiresAt })
}

export async function submit(req, res) {
  return res.json(await invitesService.submit(req.ctx, req.params.token, req.body))
}


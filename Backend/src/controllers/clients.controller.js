import { v4 as uuidv4 } from 'uuid'

import * as clientsService from '../services/clients.service.js'
import * as invitesService from '../services/invites.service.js'
import { sendClientInviteEmail } from '../services/mailer.service.js'

export async function list(req, res) {
  return res.json(await clientsService.list(req.ctx))
}

export async function create(req, res) {
  const client = await clientsService.create(req.ctx, { id: uuidv4(), ...req.body })
  if (client?.email) {
    const invite = await invitesService.createForClient(req.ctx, client.id, { inviteId: uuidv4() })
    const mail = await sendClientInviteEmail(req.ctx, {
      to: client.email,
      clientName: client.name,
      url: invite.url,
      expiresAt: invite.expiresAt,
    })
    return res.status(201).json({ client, invite, mail })
  }
  return res.status(201).json({ client })
}

export async function update(req, res) {
  const client = await clientsService.update(req.ctx, req.params.id, req.body)
  return res.json(client)
}

export async function remove(req, res) {
  return res.json(await clientsService.remove(req.ctx, req.params.id))
}

export async function createInvite(req, res) {
  const invite = await invitesService.createForClient(req.ctx, req.params.id, { inviteId: uuidv4() })
  const send = String(req.query.sendEmail ?? '0') === '1'
  if (send && invite.clientEmail) {
    const mail = await sendClientInviteEmail(req.ctx, {
      to: invite.clientEmail,
      clientName: invite.clientName,
      url: invite.url,
      expiresAt: invite.expiresAt,
    })
    return res.status(201).json({ ...invite, mail })
  }
  return res.status(201).json(invite)
}

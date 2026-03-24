import { Router } from 'express'
import { z } from 'zod'

import * as clientsController from '../controllers/clients.controller.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { validateBody } from '../middleware/validate.js'

const createClientSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email().optional(),
})

const updateClientSchema = z
  .object({
    name: z.string().min(2).max(255).optional(),
    contactName: z.string().max(255).optional(),
    siret: z.string().max(30).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(50).optional(),
    address: z.string().max(255).optional(),
    postalCode: z.string().max(30).optional(),
    city: z.string().max(120).optional(),
    country: z.string().max(120).optional(),
    vatNumber: z.string().max(80).optional(),
  })
  .strict()

export function clientsRouter(env) {
  const router = Router()
  const auth = requireAuth(env.JWT_SECRET)

  router.get('/', auth, asyncHandler(clientsController.list))
  router.post('/', auth, validateBody(createClientSchema), asyncHandler(clientsController.create))
  router.patch('/:id', auth, validateBody(updateClientSchema), asyncHandler(clientsController.update))
  router.delete('/:id', auth, asyncHandler(clientsController.remove))
  router.post('/:id/invites', auth, asyncHandler(clientsController.createInvite))

  return router
}

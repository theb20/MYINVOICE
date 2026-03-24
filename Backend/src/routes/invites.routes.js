import rateLimit from 'express-rate-limit'
import { Router } from 'express'
import { z } from 'zod'

import * as invitesController from '../controllers/invites.controller.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { validateBody } from '../middleware/validate.js'

const getLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
})

const submitLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
})

const submitClientSchema = z.object({
  name: z.string().min(2).max(255),
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

export function invitesRouter() {
  const router = Router()
  router.get('/:token', getLimiter, asyncHandler(invitesController.getInvite))
  router.post(
    '/:token/submit',
    submitLimiter,
    validateBody(submitClientSchema),
    asyncHandler(invitesController.submit),
  )
  return router
}

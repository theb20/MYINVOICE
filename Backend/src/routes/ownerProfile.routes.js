import { Router } from 'express'
import { z } from 'zod'

import * as ownerProfileController from '../controllers/ownerProfile.controller.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { validateBody } from '../middleware/validate.js'

const updateSchema = z
  .object({
    name: z.string().min(1).max(255),
    legalForm: z.string().max(120).optional(),
    siret: z.string().max(30).optional(),
    vatNumber: z.string().max(80).optional(),
    address: z.string().max(255).optional(),
    postalCode: z.string().max(30).optional(),
    city: z.string().max(120).optional(),
    country: z.string().max(120).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(50).optional(),
    website: z.string().max(255).optional(),
    legalMention: z.string().max(255).optional(),
    logo: z.string().max(2000).optional(),
  })
  .strict()

export function ownerProfileRouter(env) {
  const router = Router()
  const auth = requireAuth(env.JWT_SECRET)
  router.get('/', auth, asyncHandler(ownerProfileController.get))
  router.put('/', auth, validateBody(updateSchema), asyncHandler(ownerProfileController.update))
  return router
}


import { Router } from 'express'
import { z } from 'zod'

import * as invoiceDraftsController from '../controllers/invoiceDrafts.controller.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { validateBody } from '../middleware/validate.js'

const upsertSchema = z
  .object({
    invoiceNumber: z.string().min(1).max(64),
    status: z.string().min(1).max(20),
    currency: z.string().min(1).max(10),
    clientName: z.string().max(255).optional(),
    clientEmail: z.string().email().optional(),
    data: z.record(z.string(), z.unknown()),
  })
  .strict()

const updateSchema = z
  .object({
    status: z.string().min(1).max(20).optional(),
    currency: z.string().min(1).max(10).optional(),
    clientName: z.string().max(255).optional(),
    clientEmail: z.string().email().optional(),
  })
  .strict()

export function invoiceDraftsRouter(env) {
  const router = Router()
  const auth = requireAuth(env.JWT_SECRET)

  router.get('/', auth, asyncHandler(invoiceDraftsController.list))
  router.post('/upsert', auth, validateBody(upsertSchema), asyncHandler(invoiceDraftsController.upsert))
  router.get('/:invoiceNumber', auth, asyncHandler(invoiceDraftsController.get))
  router.patch('/:invoiceNumber', auth, validateBody(updateSchema), asyncHandler(invoiceDraftsController.update))
  router.delete('/:invoiceNumber', auth, asyncHandler(invoiceDraftsController.remove))

  return router
}

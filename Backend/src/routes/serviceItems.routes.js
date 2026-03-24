import { Router } from 'express'
import { z } from 'zod'

import * as serviceItemsController from '../controllers/serviceItems.controller.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { validateBody } from '../middleware/validate.js'

const createSchema = z
  .object({
    name: z.string().min(1).max(120),
    description: z.string().max(5000).optional(),
    unit: z.string().min(1).max(30).optional(),
    unitPriceHt: z.coerce.number().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()

const updateSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(5000).optional(),
    unit: z.string().min(1).max(30).optional(),
    unitPriceHt: z.coerce.number().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()

export function serviceItemsRouter(env) {
  const router = Router()
  const auth = requireAuth(env.JWT_SECRET)

  router.get('/', auth, asyncHandler(serviceItemsController.list))
  router.post('/', auth, validateBody(createSchema), asyncHandler(serviceItemsController.create))
  router.patch('/:id', auth, validateBody(updateSchema), asyncHandler(serviceItemsController.update))
  router.delete('/:id', auth, asyncHandler(serviceItemsController.remove))

  return router
}


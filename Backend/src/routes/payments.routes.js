import { Router } from 'express'
import { z } from 'zod'

import * as paymentsController from '../controllers/payments.controller.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { validateBody } from '../middleware/validate.js'

const revolutOrderSchema = z
  .object({
    invoiceNumber: z.string().min(1).max(64),
    amountMajor: z.coerce.number().positive(),
    currency: z.string().min(3).max(10),
    customerEmail: z.string().email().optional(),
  })
  .strict()

const stripeCheckoutSchema = z
  .object({
    invoiceNumber: z.string().min(1).max(64),
    amountMajor: z.coerce.number().positive(),
    currency: z.string().min(3).max(10),
    customerEmail: z.string().email().optional(),
    successUrl: z.string().url(),
    cancelUrl: z.string().url(),
  })
  .strict()

export function paymentsRouter(env) {
  const router = Router()
  const auth = requireAuth(env.JWT_SECRET)

  router.post(
    '/revolut/order',
    auth,
    validateBody(revolutOrderSchema),
    asyncHandler(paymentsController.createRevolutOrder),
  )

  router.post(
    '/stripe/checkout',
    auth,
    validateBody(stripeCheckoutSchema),
    asyncHandler(paymentsController.createStripeCheckout),
  )

  return router
}

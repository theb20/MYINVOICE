import { Router } from 'express'

import * as invoicesController from '../controllers/invoices.controller.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

export function invoicesRouter(env) {
  const router = Router()
  const auth = requireAuth(env.JWT_SECRET)
  router.get('/next-number', auth, asyncHandler(invoicesController.nextNumber))
  router.post('/:invoiceNumber/send', auth, asyncHandler(invoicesController.send))
  return router
}

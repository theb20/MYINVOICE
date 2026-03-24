import { Router } from 'express'

import * as invoiceSharesController from '../controllers/invoiceShares.controller.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

export function invoiceSharesRouter(env) {
  const router = Router()
  const auth = requireAuth(env.JWT_SECRET)
  router.post('/:invoiceNumber', auth, asyncHandler(invoiceSharesController.create))
  return router
}

export function publicInvoiceRouter() {
  const router = Router()
  router.get('/invoices/:token', asyncHandler(invoiceSharesController.getPublic))
  return router
}


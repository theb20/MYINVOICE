import { Router } from 'express'
import { z } from 'zod'

import * as authController from '../controllers/auth.controller.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { validateBody } from '../middleware/validate.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const requestResetSchema = z.object({
  email: z.string().email(),
})

const resetSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8),
})

export function authRouter() {
  const router = Router()
  router.post('/login', validateBody(loginSchema), asyncHandler(authController.login))
  router.post('/request-password-reset', validateBody(requestResetSchema), asyncHandler(authController.requestPasswordReset))
  router.post('/reset-password', validateBody(resetSchema), asyncHandler(authController.resetPassword))
  return router
}

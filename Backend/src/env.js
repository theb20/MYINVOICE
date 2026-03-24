import 'dotenv/config'

import { z } from 'zod'

const optionalTrimmed = (inner) =>
  z.preprocess((v) => {
    if (typeof v !== 'string') return v
    const t = v.trim()
    return t === '' ? undefined : t
  }, inner.optional())

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FILE: optionalTrimmed(z.string().min(1)),
  REVOLUT_MODE: z.enum(['off', 'sandbox', 'live']).default('off'),
  REVOLUT_SECRET_KEY: optionalTrimmed(z.string().min(10)),
  REVOLUT_API_VERSION: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .default('2023-09-29'),
  STRIPE_SECRET_KEY: optionalTrimmed(z.string().min(10)),
  MAIL_MODE: z.enum(['smtp', 'log']).default('log'),
  SMTP_HOST: optionalTrimmed(z.string().min(1)),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
    z.enum(['true', 'false']).optional(),
  ),
  SMTP_USER: optionalTrimmed(z.string().min(1)),
  SMTP_PASS: optionalTrimmed(z.string().min(1)),
  MAIL_FROM: optionalTrimmed(z.string().min(3)),
  JWT_SECRET: z.string().min(32),
  ADMIN_EMAIL: optionalTrimmed(z.string().email()),
  ADMIN_PASSWORD: optionalTrimmed(z.string().min(8)),
  INVITE_TTL_DAYS: z.coerce.number().int().positive().default(14),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
})

export function getEnv() {
  return schema.parse(process.env)
}

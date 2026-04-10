import axios from 'axios'

import { ApiError } from '../errors.js'
import { logInfo, logError } from '../logger.js'

function minorUnits(amount, currency) {
  const zeroDecimal = new Set(['JPY', 'KRW', 'VND'])
  if (zeroDecimal.has(String(currency).toUpperCase())) return Math.round(amount)
  return Math.round(amount * 100)
}

export async function createCheckoutSession(ctx, { invoiceNumber, amountMajor, currency, customerEmail, successUrl, cancelUrl }) {
  const { env, requestId } = ctx
  if (!env.STRIPE_SECRET_KEY) throw new ApiError(400, 'Missing Stripe secret key')
  if (String(env.STRIPE_SECRET_KEY).startsWith('pk_')) throw new ApiError(400, 'Stripe secret key must start with sk_')

  const amount = minorUnits(Number(amountMajor || 0), currency)
  if (!Number.isFinite(amount) || amount <= 0) throw new ApiError(400, 'Invalid amount')

  const zeroDecimalCurrency = new Set(['JPY', 'KRW', 'VND'])
  const minAmount = zeroDecimalCurrency.has(String(currency).toUpperCase()) ? 1 : 50
  if (amount < minAmount) throw new ApiError(400, `Amount too small — minimum is ${minAmount} ${String(currency).toUpperCase()} (in minor units)`)

  const params = new URLSearchParams()
  params.set('mode', 'payment')
  params.set('success_url', successUrl)
  params.set('cancel_url', cancelUrl)
  if (customerEmail) params.set('customer_email', customerEmail)

  params.set('line_items[0][price_data][currency]', String(currency).toLowerCase())
  params.set('line_items[0][price_data][unit_amount]', String(amount))
  params.set('line_items[0][price_data][product_data][name]', `Invoice ${invoiceNumber}`)
  params.set('line_items[0][quantity]', '1')
  params.set('metadata[invoiceNumber]', invoiceNumber)

  try {
    const res = await axios.post('https://api.stripe.com/v1/checkout/sessions', params.toString(), {
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': `${invoiceNumber}:${amount}:${currency}:${Date.now()}`,
        'X-Request-Id': requestId,
      },
      timeout: 20_000,
    })

    if (!res.data?.url) throw new ApiError(502, 'Stripe session missing url')
    logInfo('stripe_checkout_created', { requestId, invoiceNumber, sessionId: res.data.id })
    return { sessionId: res.data.id, url: res.data.url, amount, currency: res.data.currency }
  } catch (e) {
    const status = e?.response?.status
    const data = e?.response?.data
    logError('stripe_checkout_failed', { requestId, invoiceNumber, status, data, error: e instanceof Error ? e.message : String(e) })
    if (status === 400 && data?.error?.message) throw new ApiError(400, data.error.message)
    throw new ApiError(502, 'Stripe checkout failed')
  }
}

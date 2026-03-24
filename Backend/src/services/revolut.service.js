import axios from 'axios'

import { ApiError } from '../errors.js'
import { logInfo, logWarn, logError } from '../logger.js'

function getBaseUrl(env) {
  if (env.REVOLUT_MODE === 'sandbox') return 'https://sandbox-merchant.revolut.com'
  if (env.REVOLUT_MODE === 'live') return 'https://merchant.revolut.com'
  return null
}

function minorUnits(amount, currency) {
  const zeroDecimal = new Set(['JPY', 'KRW', 'VND'])
  if (zeroDecimal.has(String(currency).toUpperCase())) return Math.round(amount)
  return Math.round(amount * 100)
}

export async function createCheckoutOrder(ctx, { invoiceNumber, amountMajor, currency, customerEmail }) {
  const { env, requestId } = ctx
  const baseUrl = getBaseUrl(env)
  if (!baseUrl) throw new ApiError(400, 'Revolut is disabled')
  if (!env.REVOLUT_SECRET_KEY) throw new ApiError(400, 'Missing Revolut secret key')

  const amount = minorUnits(Number(amountMajor || 0), currency)
  if (!Number.isFinite(amount) || amount <= 0) throw new ApiError(400, 'Invalid amount')

  try {
    const res = await axios.post(
      `${baseUrl}/api/orders`,
      {
        amount,
        currency: String(currency).toUpperCase(),
        description: `Invoice ${invoiceNumber}`,
        customer: customerEmail ? { email: customerEmail } : undefined,
        merchant_order_data: { reference: invoiceNumber },
      },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.REVOLUT_SECRET_KEY}`,
          'Revolut-Api-Version': env.REVOLUT_API_VERSION,
          'X-Request-Id': requestId,
        },
        timeout: 20_000,
      },
    )

    const order = res.data
    if (!order?.checkout_url) {
      logWarn('revolut_order_missing_checkout_url', { requestId, invoiceNumber })
      throw new ApiError(502, 'Revolut order missing checkout_url')
    }

    logInfo('revolut_order_created', { requestId, invoiceNumber, orderId: order.id })
    return {
      orderId: order.id,
      token: order.token,
      state: order.state,
      checkoutUrl: order.checkout_url,
      amount,
      currency: order.currency,
    }
  } catch (e) {
    const status = e?.response?.status
    const data = e?.response?.data
    logError('revolut_order_failed', {
      requestId,
      invoiceNumber,
      status,
      error: e instanceof Error ? e.message : String(e),
      data,
    })
    throw new ApiError(502, 'Revolut order failed')
  }
}


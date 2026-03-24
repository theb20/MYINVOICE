import { createCheckoutOrder } from '../services/revolut.service.js'
import { createCheckoutSession } from '../services/stripe.service.js'

export async function createRevolutOrder(req, res) {
  const result = await createCheckoutOrder(req.ctx, req.body)
  return res.status(201).json(result)
}

export async function createStripeCheckout(req, res) {
  const result = await createCheckoutSession(req.ctx, req.body)
  return res.status(201).json(result)
}

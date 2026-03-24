import { ApiError } from '../errors.js'
import { findInvoiceDraftByNumber } from '../models/invoiceDraft.model.js'
import * as invoiceDraftsService from './invoiceDrafts.service.js'
import * as invoiceSharesService from './invoiceShares.service.js'
import { sendInvoiceEmail } from './mailer.service.js'
import { createCheckoutOrder } from './revolut.service.js'
import { createCheckoutSession } from './stripe.service.js'

function computeTotals(items) {
  const list = Array.isArray(items) ? items : []
  const totalHt = list.reduce((sum, it) => sum + Math.max(0, Number(it?.unitPriceHt || 0)) * Math.max(1, Number(it?.quantity || 1)), 0)
  return { totalHt, totalTtc: totalHt }
}

function parseCc(ccRaw) {
  const raw = typeof ccRaw === 'string' ? ccRaw : ''
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10)
}

function docLabel(type) {
  if (type === 'quote') return 'Devis'
  if (type === 'credit_note') return 'Avoir'
  if (type === 'deposit') return "Facture d'acompte"
  return 'Facture'
}

export async function sendInvoice(ctx, invoiceNumberRaw) {
  const invoiceNumber = String(invoiceNumberRaw || '').trim()
  if (!invoiceNumber) throw new ApiError(400, 'Invalid invoiceNumber')

  const row = await findInvoiceDraftByNumber(ctx.db, invoiceNumber)
  if (!row) throw new ApiError(404, 'Not found')

  const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
  const clientEmail = row.clientEmail || data?.client?.email || data?.clientEmail
  if (!clientEmail) throw new ApiError(400, 'Missing clientEmail')

  const cc = parseCc(data?.extras?.ccEmails || data?.extras?.cc || '')

  const computed = computeTotals(data?.items)
  const summaryTotals = data?.summary?.totals
  const totalTtc =
    summaryTotals && Number.isFinite(Number(summaryTotals.ttc))
      ? Number(summaryTotals.ttc)
      : Number.isFinite(Number(summaryTotals?.totalTtc))
        ? Number(summaryTotals.totalTtc)
        : computed.totalTtc
  const depositPercent = Number(data?.extras?.depositPercent || 0)
  const amountToPay = depositPercent > 0 ? (totalTtc * depositPercent) / 100 : totalTtc

  const share = await invoiceSharesService.createShare(ctx, invoiceNumber)

  const paymentMethod = String(data?.payment?.method || '').trim()
  let paymentProvider = ''
  let paymentUrl =
    data?.payment?.stripe?.checkoutUrl ||
    data?.payment?.stripeLink ||
    data?.payment?.revolut?.checkoutUrl ||
    data?.payment?.revolutLink ||
    data?.payment?.paymentLink ||
    ''

  if (!paymentUrl && paymentMethod === 'revolut') {
    const order = await createCheckoutOrder(ctx, {
      invoiceNumber,
      amountMajor: amountToPay,
      currency: row.currency || data?.currency || 'EUR',
      customerEmail: clientEmail,
    })
    await invoiceDraftsService.patchData(ctx, invoiceNumber, (prev) => ({
      ...prev,
      payment: {
        ...(prev?.payment || {}),
        revolut: { orderId: order.orderId, checkoutUrl: order.checkoutUrl },
        revolutLink: order.checkoutUrl,
      },
    }))
    paymentUrl = order.checkoutUrl
    paymentProvider = 'Revolut'
  }

  if (!paymentUrl && paymentMethod === 'stripe' && ctx.env.STRIPE_SECRET_KEY) {
    const session = await createCheckoutSession(ctx, {
      invoiceNumber,
      amountMajor: amountToPay,
      currency: row.currency || data?.currency || 'EUR',
      customerEmail: clientEmail,
      successUrl: share.url,
      cancelUrl: share.url,
    })

    await invoiceDraftsService.patchData(ctx, invoiceNumber, (prev) => ({
      ...prev,
      payment: {
        ...(prev?.payment || {}),
        stripe: { sessionId: session.sessionId, checkoutUrl: session.url },
        stripeLink: session.url,
      },
    }))
    paymentUrl = session.url
    paymentProvider = 'Stripe'
  }

  if (!paymentUrl && !paymentMethod && ctx.env.STRIPE_SECRET_KEY) {
    const session = await createCheckoutSession(ctx, {
      invoiceNumber,
      amountMajor: amountToPay,
      currency: row.currency || data?.currency || 'EUR',
      customerEmail: clientEmail,
      successUrl: share.url,
      cancelUrl: share.url,
    })
    await invoiceDraftsService.patchData(ctx, invoiceNumber, (prev) => ({
      ...prev,
      payment: {
        ...(prev?.payment || {}),
        stripe: { sessionId: session.sessionId, checkoutUrl: session.url },
        stripeLink: session.url,
      },
    }))
    paymentUrl = session.url
    paymentProvider = 'Stripe'
  }

  const type = data?.invoice?.type || 'invoice'
  const label = docLabel(type)
  const subject = `${label} ${invoiceNumber}`

  const clientName = row.clientName || data?.client?.name || ''
  const greeting = clientName ? `Bonjour ${clientName},` : 'Bonjour,'

  const textParts = [
    greeting,
    '',
    `Voici votre ${label.toLowerCase()} ${invoiceNumber}.`,
    share.url,
  ]
  if (paymentUrl) {
    textParts.push('', `Paiement en ligne${paymentProvider ? ` (${paymentProvider})` : ''}:`, paymentUrl)
  }
  if (depositPercent > 0) {
    textParts.push('', `Acompte demandé: ${depositPercent}%`)
  }
  textParts.push('', 'Cordialement,', 'Stack')
  const text = textParts.join('\n')

  const html = `
    <div style="font-family: ui-sans-serif, system-ui; line-height: 1.5;">
      <p>${greeting}</p>
      <p>Voici votre ${label.toLowerCase()} <strong>${invoiceNumber}</strong>.</p>
      <p><a href="${share.url}">Ouvrir la facture</a></p>
      ${paymentUrl ? `<p>Paiement en ligne${paymentProvider ? ` (${paymentProvider})` : ''}:<br/><a href="${paymentUrl}">${paymentUrl}</a></p>` : ''}
      ${depositPercent > 0 ? `<p style="color:#6b7280;font-size:12px;">Acompte demandé: ${depositPercent}%</p>` : ''}
      <p>Cordialement,<br/>Stack</p>
    </div>
  `

  const mail = await sendInvoiceEmail(ctx, { to: clientEmail, cc, subject, text, html })
  return { ok: true, to: clientEmail, cc, shareUrl: share.url, paymentUrl: paymentUrl || null, mail }
}

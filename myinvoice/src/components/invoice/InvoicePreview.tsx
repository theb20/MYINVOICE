import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

import { apiFetch } from '@/lib/api'
import { type InvoiceDraft } from '@/lib/invoice'

const TOKEN_KEY = 'myinvoice:adminToken:v1'

function dateLong(iso: string) {
  const s = String(iso || '').trim()
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return s || '—'
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`)
  return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'long', year: 'numeric' }).format(d)
}

export function InvoicePreview({
  draft,
}: {
  draft: InvoiceDraft
  variant?: 'invoice' | 'form'
}) {
  const [shareUrl, setShareUrl] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const money = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: draft.currency }).format(amount)

  const rawSubtotal = draft.items.reduce((sum, item) => {
    const qty = Math.max(1, Number(item.quantity || 1))
    const rate = Math.max(0, Number(item.unitPriceHt || 0))
    return sum + qty * rate
  }, 0)

  const discountType = draft.invoice.discountType === 'amount' ? 'amount' : 'percent'
  const discountPercent = Number(draft.invoice.discount || 0)
  const discountAmount = Number(draft.invoice.discountAmount || 0)
  const discount =
    discountType === 'amount'
      ? Math.max(0, discountAmount)
      : discountPercent > 0
        ? (rawSubtotal * discountPercent) / 100
        : 0

  const subtotal = Math.max(0, rawSubtotal - discount)
  const vatExempt = !!draft.invoice.vatExempt
  const vatRate = Math.max(0, Number(draft.invoice.vatRate || 0))
  const tax = vatExempt ? 0 : (subtotal * vatRate) / 100
  const total = subtotal + tax

  const alreadyPaid = Math.max(0, Number(draft.invoice.deposit || 0))
  const depositPercent = Math.max(0, Number(draft.extras.depositPercent || 0))
  const depositRequested = depositPercent > 0 ? (total * depositPercent) / 100 : 0
  const balanceAfterPaid = Math.max(0, total - alreadyPaid)
  const balanceAfterDeposit = Math.max(0, total - depositRequested)
  const amountDue = alreadyPaid > 0 ? balanceAfterPaid : depositPercent > 0 ? depositRequested : total

  const invoiceTitle =
    draft.invoice.type === 'quote'
      ? 'QUOTE'
      : draft.invoice.type === 'credit_note'
        ? 'CREDIT NOTE'
        : draft.invoice.type === 'deposit'
          ? 'INVOICE'
          : 'INVOICE'

  useEffect(() => {
    if (typeof window === 'undefined') return
    const invoiceNumber = String(draft.invoice.number || '').trim()
    if (!invoiceNumber) return

    if (window.location.pathname.startsWith('/public/invoice/')) {
      setShareUrl(window.location.href)
      return
    }

    const cacheKey = `myinvoice:shareUrl:${invoiceNumber}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      setShareUrl(cached)
      return
    }

    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return

    apiFetch<{ url: string }>(`/invoice-shares/${encodeURIComponent(invoiceNumber)}`, { method: 'POST', token })
      .then((res) => {
        if (res?.url) {
          localStorage.setItem(cacheKey, res.url)
          setShareUrl(res.url)
        }
      })
      .catch(() => {})
  }, [draft.invoice.number])

  useEffect(() => {
    if (!shareUrl) return
    QRCode.toDataURL(shareUrl, {
      width: 192,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#111111', light: '#ffffff' },
    })
      .then((url: string) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''))
  }, [shareUrl])

  return (
    <div className="invoice-paper overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 shadow-sm">
      <div className="grid grid-cols-12">
        <aside className="col-span-12 md:col-span-4 bg-neutral-900 text-white p-8 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="h-24 w-24 bg-white p-2">
              {qrDataUrl ? (
                <img alt="Invoice QR code" className="h-full w-full object-contain" src={qrDataUrl} />
              ) : (
                <div className="flex h-full w-full items-center justify-center border border-neutral-200 text-xs font-semibold text-neutral-900">
                  QR
                </div>
              )}
            </div>
            {draft.payment.stripeLink || draft.payment.revolutLink ? (
              <a
                className="mt-1 inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-200"
                href={draft.payment.stripeLink || draft.payment.revolutLink}
                rel="noreferrer"
                target="_blank"
              >
                Pay Online
              </a>
            ) : null}
          </div>

          <div className="mt-8 grid gap-6 text-sm text-left">
            <div>
              <div className="text-white/60 text-xs font-semibold tracking-wide text-left">Date</div>
              <div className="mt-1 font-medium">{dateLong(draft.invoice.issueDate)}</div>
            </div>
            <div>
              <div className="text-white/60 text-xs font-semibold tracking-wide text-left">Due Date</div>
              <div className="mt-1 font-medium">{dateLong(draft.invoice.dueDate)}</div>
            </div>
            {draft.invoice.deliveryDate ? (
              <div>
                <div className="text-white/60 text-xs font-semibold tracking-wide text-left">Delivery</div>
                <div className="mt-1 font-medium">{dateLong(draft.invoice.deliveryDate)}</div>
              </div>
            ) : null}
            <div>
              <div className="text-white/60 text-xs font-semibold tracking-wide text-left">To</div>
              <div className="mt-2 font-semibold">{draft.client.name || '—'}</div>
              {draft.client.contactName ? <div className="mt-1 text-white/80">{draft.client.contactName}</div> : null}
              {draft.client.phone ? <div className="mt-1 text-white/80">{draft.client.phone}</div> : null}
              {draft.client.email ? <div className="text-white/80">{draft.client.email}</div> : null}
              {(draft.client.address || draft.client.city || draft.client.postalCode || draft.client.country) ? (
                <div className="mt-2 text-white/80 whitespace-pre-line text-xs text-left">
                  {[
                    draft.client.address,
                    [draft.client.postalCode, draft.client.city].filter(Boolean).join(' '),
                    draft.client.country,
                  ].filter(Boolean).join('\n')}
                </div>
              ) : null}
              {(draft.client.vatNumber || draft.client.siret) ? (
                <div className="mt-2 text-white/80 text-xs text-left">
                  {draft.client.vatNumber ? `VAT ${draft.client.vatNumber}` : null}
                  {draft.client.vatNumber && draft.client.siret ? ' · ' : null}
                  {draft.client.siret ? `SIRET ${draft.client.siret}` : null}
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <main className="col-span-12 md:col-span-8 p-8">
          <header className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-3">
              {draft.company.logoDataUrl ? (
                <img alt="Logo" className="h-10 w-10 rounded-xl bg-white object-contain" src={draft.company.logoDataUrl} />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-white" />
              )}
              <div>
                <div className="text-sm font-semibold text-neutral-900">{draft.company.name || '—'}</div>
                <div className="text-xs text-neutral-600">{draft.company.legalForm || draft.company.website || 'Your Tagline Here'}</div>
                {[draft.company.email, draft.company.phone].filter(Boolean).length ? (
                  <div className="mt-1 text-[11px] text-neutral-500">
                    {[draft.company.email, draft.company.phone].filter(Boolean).join(' · ')}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="text-right">
              <div className="text-5xl font-extrabold tracking-tight text-neutral-900">{invoiceTitle}</div>
              <div className="mt-2 text-xs text-neutral-500">{draft.invoice.object || 'Document Payment Information'}</div>
            </div>
          </header>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-5">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-neutral-500">Account No:</div>
                  <div className="mt-1 font-semibold text-neutral-900">{draft.company.siret || '—'}</div>
                </div>
                <div>
                  <div className="text-neutral-500">Invoice No:</div>
                  <div className="mt-1 font-semibold text-neutral-900">{draft.invoice.number || '—'}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-neutral-500">Issue Date:</div>
                  <div className="mt-1 font-semibold text-neutral-900">{dateLong(draft.invoice.issueDate)}</div>
                </div>
                <div>
                  <div className="text-neutral-500">Due Date:</div>
                  <div className="mt-1 font-semibold text-neutral-900">{dateLong(draft.invoice.dueDate)}</div>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-neutral-900 px-4 py-3 text-white">
                <div className="text-xs text-white/70">Amount Due</div>
                <div className="mt-1 text-base font-semibold">{money(amountDue)}</div>
              </div>
              {(draft.invoice.clientOrderRef || draft.invoice.internalProjectRef) ? (
                <div className="mt-4 grid gap-1 text-xs text-neutral-600">
                  {draft.invoice.clientOrderRef ? <div>PO: {draft.invoice.clientOrderRef}</div> : null}
                  {draft.invoice.internalProjectRef ? <div>Internal Ref: {draft.invoice.internalProjectRef}</div> : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl bg-white p-5">
              <div className="grid gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="text-neutral-500">Payment Method</div>
                  <div className="text-neutral-900 font-semibold">{draft.payment.method || '—'}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-neutral-500">Terms</div>
                  <div className="text-neutral-900">{draft.payment.terms || '—'}</div>
                </div>
                {draft.payment.accountHolder ? (
                  <div className="flex items-center justify-between">
                    <div className="text-neutral-500">Account Holder</div>
                    <div className="text-neutral-900">{draft.payment.accountHolder}</div>
                  </div>
                ) : null}
                {draft.payment.bankName ? (
                  <div className="flex items-center justify-between">
                    <div className="text-neutral-500">Bank</div>
                    <div className="text-neutral-900">{draft.payment.bankName}</div>
                  </div>
                ) : null}
                {draft.payment.bic ? (
                  <div className="flex items-center justify-between">
                    <div className="text-neutral-500">BIC / SWIFT</div>
                    <div className="text-neutral-900 break-words">{draft.payment.bic}</div>
                  </div>
                ) : null}
                {draft.payment.iban ? (
                  <div className="flex items-center justify-between">
                    <div className="text-neutral-500">IBAN</div>
                    <div className="text-neutral-900 break-words">{draft.payment.iban}</div>
                  </div>
                ) : null}
                {draft.payment.paypalEmail ? (
                  <div className="flex items-center justify-between">
                    <div className="text-neutral-500">PayPal</div>
                    <div className="text-neutral-900 break-words">{draft.payment.paypalEmail}</div>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <div className="text-neutral-500">Account Name</div>
                  <div className="text-neutral-900">{draft.company.name || '—'}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-neutral-500">Address</div>
                  <div className="text-neutral-900">
                    {[
                      draft.company.address,
                      [draft.company.postalCode, draft.company.city].filter(Boolean).join(' '),
                      draft.company.country,
                    ]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-900 text-white text-xs">
                <tr>
                  <th className="px-5 py-4 font-semibold">Item Description</th>
                  <th className="px-5 py-4 font-semibold text-right w-28">Rate</th>
                  <th className="px-5 py-4 font-semibold text-right w-20">Unit</th>
                  <th className="px-5 py-4 font-semibold text-right w-32">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {draft.items.map((item, idx) => {
                  const qty = Math.max(1, Number(item.quantity || 1))
                  const rate = Math.max(0, Number(item.unitPriceHt || 0))
                  const line = qty * rate
                  return (
                    <tr key={idx} className="text-neutral-900">
                      <td className="px-5 py-4">{item.description || '—'}</td>
                      <td className="px-5 py-4 text-right">{money(rate)}</td>
                      <td className="px-5 py-4 text-right">{qty}</td>
                      <td className="px-5 py-4 text-right">{money(line)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 text-xs text-neutral-600">
              <div className="whitespace-pre-line">{draft.extras.notes || '—'}</div>
              {draft.extras.terms ? <div className="mt-4 whitespace-pre-line">{draft.extras.terms}</div> : null}
              {draft.invoice.penaltyRate ? <div className="mt-4">Late payment penalty: {draft.invoice.penaltyRate}</div> : null}
              {draft.invoice.lateFeeFlatRate ? <div className="mt-1">Late fee: {draft.invoice.lateFeeFlatRate}</div> : null}
              {draft.company.legalMention ? <div className="mt-4">{draft.company.legalMention}</div> : null}
              {(draft.extras.attachmentName || draft.extras.attachmentUrl) ? (
                <div className="mt-4">
                  <div className="font-semibold text-neutral-900">Attachment</div>
                  {draft.extras.attachmentName ? <div className="mt-1">{draft.extras.attachmentName}</div> : null}
                  {draft.extras.attachmentUrl ? (
                    <a className="mt-1 inline-block underline underline-offset-4 break-words" href={draft.extras.attachmentUrl} rel="noreferrer" target="_blank">
                      {draft.extras.attachmentUrl}
                    </a>
                  ) : null}
                </div>
              ) : null}
              {(draft.extras.signature || draft.extras.stamp) ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {draft.extras.signature ? (
                    <div>
                      <div className="font-semibold text-neutral-900">Signature</div>
                      <img className="mt-2 max-h-24 w-full rounded-xl border border-neutral-200 bg-white object-contain" src={draft.extras.signature} />
                    </div>
                  ) : null}
                  {draft.extras.stamp ? (
                    <div>
                      <div className="font-semibold text-neutral-900">Stamp</div>
                      <img className="mt-2 max-h-24 w-full rounded-xl border border-neutral-200 bg-white object-contain" src={draft.extras.stamp} />
                      {draft.extras.stampHash ? <div className="mt-2 break-words text-[10px] text-neutral-500">Hash: {draft.extras.stampHash}</div> : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="rounded-2xl bg-white p-5 text-sm">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Subtotal</span>
                  <span className="font-medium text-neutral-900">{money(rawSubtotal)}</span>
                </div>
                {discount > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Discount</span>
                    <span className="font-medium text-neutral-900">-{money(discount)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">{vatExempt ? 'Tax' : `Tax Vat (${vatRate}%)`}</span>
                  <span className="font-medium text-neutral-900">{money(tax)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
                  <span className="font-semibold text-neutral-900">Total</span>
                  <span className="font-semibold text-neutral-900">{money(total)}</span>
                </div>
                {alreadyPaid > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-600">Paid</span>
                      <span className="font-medium text-neutral-900">-{money(alreadyPaid)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-neutral-900">Balance Due</span>
                      <span className="font-semibold text-neutral-900">{money(balanceAfterPaid)}</span>
                    </div>
                  </>
                ) : null}
                {depositPercent > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-600">Deposit ({depositPercent}%)</span>
                      <span className="font-medium text-neutral-900">{money(depositRequested)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-neutral-900">Balance After Deposit</span>
                      <span className="font-semibold text-neutral-900">{money(balanceAfterDeposit)}</span>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-3 text-xs text-neutral-600 md:grid-cols-2">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-200 text-neutral-900">✉</div>
              <div>{draft.company.vatNumber ? `VAT: ${draft.company.vatNumber}` : '—'}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-200 text-neutral-900">⌂</div>
              <div className="line-clamp-2">{draft.company.address || '—'}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

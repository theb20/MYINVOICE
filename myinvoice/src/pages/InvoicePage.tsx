import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { InvoicePreview } from '@/components/invoice/InvoicePreview'
import { defaultDraft, type Currency, type InvoiceDraft } from '@/lib/invoice'
import { loadDraft } from '@/lib/invoiceStorage'

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function pickCurrency(v: unknown): Currency {
  return v === 'EUR' || v === 'USD' || v === 'GBP' || v === 'CHF' || v === 'CAD' ? v : 'EUR'
}

export function InvoicePage() {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const pageRef = useRef<HTMLDivElement | null>(null)
  const [draft] = useState<InvoiceDraft>(() => {
    if (typeof window === 'undefined') return defaultDraft()

    const base = loadDraft()
    try {
      const emitter = JSON.parse(localStorage.getItem('emitter') || 'null') ?? null
      const currentClient = JSON.parse(localStorage.getItem('currentClient') || 'null') ?? null
      const extInvoice = JSON.parse(localStorage.getItem('extInvoice') || 'null') ?? null
      const extPayment = JSON.parse(localStorage.getItem('extPayment') || 'null') ?? null
      const extExtras = JSON.parse(localStorage.getItem('extExtras') || 'null') ?? null

      const e = asRecord(emitter)
      const c = asRecord(currentClient)
      const i = asRecord(extInvoice)
      const p = asRecord(extPayment)
      const x = asRecord(extExtras)

      return {
        ...base,
        currency: pickCurrency(base.currency),
        company: {
          ...base.company,
          name: typeof e.name === 'string' ? e.name : base.company.name,
          address: typeof e.address === 'string' ? e.address : base.company.address,
          siret: typeof e.siret === 'string' ? e.siret : base.company.siret,
          vatNumber: typeof e.vatNumber === 'string' ? e.vatNumber : base.company.vatNumber,
          logoDataUrl: typeof e.logo === 'string' ? e.logo : base.company.logoDataUrl,
          legalForm: typeof e.legalForm === 'string' ? e.legalForm : base.company.legalForm,
          postalCode: typeof e.postalCode === 'string' ? e.postalCode : base.company.postalCode,
          city: typeof e.city === 'string' ? e.city : base.company.city,
          country: typeof e.country === 'string' ? e.country : base.company.country,
          email: typeof e.email === 'string' ? e.email : base.company.email,
          phone: typeof e.phone === 'string' ? e.phone : base.company.phone,
          website: typeof e.website === 'string' ? e.website : base.company.website,
          legalMention: typeof e.legalMention === 'string' ? e.legalMention : base.company.legalMention,
        },
        client: {
          ...base.client,
          name: typeof c.name === 'string' ? c.name : base.client.name,
          contactName: typeof c.contactName === 'string' ? c.contactName : base.client.contactName,
          siret: typeof c.siret === 'string' ? c.siret : base.client.siret,
          email: typeof c.email === 'string' ? c.email : base.client.email,
          phone: typeof c.phone === 'string' ? c.phone : base.client.phone,
          address: typeof c.address === 'string' ? c.address : base.client.address,
          postalCode: typeof c.postalCode === 'string' ? c.postalCode : base.client.postalCode,
          city: typeof c.city === 'string' ? c.city : base.client.city,
          country: typeof c.country === 'string' ? c.country : base.client.country,
          vatNumber: typeof c.vatNumber === 'string' ? c.vatNumber : base.client.vatNumber,
        },
        invoice: {
          ...base.invoice,
          number: typeof i.number === 'string' ? i.number : base.invoice.number,
          issueDate: typeof i.issueDate === 'string' ? i.issueDate : base.invoice.issueDate,
          dueDate: typeof i.dueDate === 'string' ? i.dueDate : base.invoice.dueDate,
          deliveryDate: typeof i.deliveryDate === 'string' ? i.deliveryDate : base.invoice.deliveryDate,
          status: i.status === 'draft' || i.status === 'pending' || i.status === 'paid' ? i.status : base.invoice.status,
          type: i.type === 'invoice' || i.type === 'quote' || i.type === 'credit_note' || i.type === 'deposit' ? i.type : base.invoice.type,
          object: typeof i.object === 'string' ? i.object : base.invoice.object,
          clientOrderRef: typeof i.clientOrderRef === 'string' ? i.clientOrderRef : typeof i.orderRef === 'string' ? i.orderRef : base.invoice.clientOrderRef,
          internalProjectRef: typeof i.internalProjectRef === 'string' ? i.internalProjectRef : typeof i.projectRef === 'string' ? i.projectRef : base.invoice.internalProjectRef,
          language: i.language === 'fr' || i.language === 'en' || i.language === 'es' || i.language === 'de' ? i.language : base.invoice.language,
          discount: Number.isFinite(Number(i.discount)) ? Number(i.discount) : base.invoice.discount,
          discountAmount: Number.isFinite(Number(i.discountAmount)) ? Number(i.discountAmount) : base.invoice.discountAmount,
          discountType: i.discountType === 'amount' || i.discountType === 'percent' ? i.discountType : base.invoice.discountType,
          deposit: Number.isFinite(Number(i.deposit)) ? Number(i.deposit) : base.invoice.deposit,
          penaltyRate: typeof i.penaltyRate === 'string' ? i.penaltyRate : base.invoice.penaltyRate,
          lateFeeFlatRate: typeof i.lateFeeFlatRate === 'string' ? i.lateFeeFlatRate : base.invoice.lateFeeFlatRate,
          vatRate: Number.isFinite(Number(i.vatRate)) ? Number(i.vatRate) : base.invoice.vatRate,
          vatExempt: typeof i.vatExempt === 'boolean' ? i.vatExempt : base.invoice.vatExempt,
        },
        payment: {
          ...base.payment,
          method: p.method === 'transfer' || p.method === 'card' || p.method === 'cash' || p.method === 'paypal' || p.method === 'stripe' || p.method === 'revolut' || p.method === 'other' ? p.method : base.payment.method,
          terms: typeof p.terms === 'string' ? p.terms : base.payment.terms,
          iban: typeof p.iban === 'string' ? p.iban : base.payment.iban,
          stripeLink: typeof p.stripeLink === 'string' ? p.stripeLink : '',
          revolutLink: typeof p.revolutLink === 'string' ? p.revolutLink : '',
          bic: typeof p.bic === 'string' ? p.bic : base.payment.bic,
          bankName: typeof p.bankName === 'string' ? p.bankName : base.payment.bankName,
          accountHolder: typeof p.accountHolder === 'string' ? p.accountHolder : base.payment.accountHolder,
          paypalEmail: typeof p.paypalEmail === 'string' ? p.paypalEmail : base.payment.paypalEmail,
        },
        extras: {
          ...base.extras,
          notes: typeof x.notes === 'string' ? x.notes : base.extras.notes,
          terms: typeof x.terms === 'string' ? x.terms : base.extras.terms,
          attachmentName: typeof x.attachmentName === 'string' ? x.attachmentName : base.extras.attachmentName,
          attachmentUrl: typeof x.attachmentUrl === 'string' ? x.attachmentUrl : base.extras.attachmentUrl,
          signature: typeof x.signature === 'string' ? x.signature : base.extras.signature,
          stamp: typeof x.stamp === 'string' ? x.stamp : base.extras.stamp,
          stampHash: typeof x.stampHash === 'string' ? x.stampHash : base.extras.stampHash,
          depositPercent: Number.isFinite(Number(x.depositPercent)) ? Number(x.depositPercent) : base.extras.depositPercent,
          internalComment: typeof x.internalComment === 'string' ? x.internalComment : base.extras.internalComment,
          recurring: typeof x.recurring === 'boolean' ? x.recurring : base.extras.recurring,
          recurringFrequency: x.recurringFrequency === 'monthly' || x.recurringFrequency === 'quarterly' || x.recurringFrequency === 'yearly' ? x.recurringFrequency : base.extras.recurringFrequency,
          deliveryMode: x.deliveryMode === 'email' || x.deliveryMode === 'mail' || x.deliveryMode === 'hand' || x.deliveryMode === 'portal' ? x.deliveryMode : base.extras.deliveryMode,
          ccEmails: typeof x.ccEmails === 'string' ? x.ccEmails : base.extras.ccEmails,
        },
      }
    } catch {
      return base
    }
  })

  const title = useMemo(() => {
    if (draft.invoice.type === 'quote') return 'Devis'
    if (draft.invoice.type === 'credit_note') return 'Avoir'
    if (draft.invoice.type === 'deposit') return 'Acompte'
    return 'Facture'
  }, [draft.invoice.type])

  useEffect(() => {
    const computeScale = () => {
      const wrap = wrapperRef.current
      const page = pageRef.current
      if (!wrap || !page) return
      const paper = wrap.querySelector('.invoice-paper') as HTMLElement | null
      if (!paper) return

      const pageRect = page.getBoundingClientRect()
      const paperRect = paper.getBoundingClientRect()
      if (!pageRect.width || !pageRect.height || !paperRect.width || !paperRect.height) return

      const s = Math.min(1, pageRect.width / paperRect.width, pageRect.height / paperRect.height)
      const clamped = Math.max(0.5, Math.min(1, s))
      wrap.style.setProperty('--print-scale', String(clamped))
    }

    const before = () => computeScale()
    const after = () => wrapperRef.current?.style.removeProperty('--print-scale')

    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="print-page-measure" ref={pageRef} />
      <div className="print-hidden mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-neutral-900">{title}</div>
          <div className="text-xs text-neutral-600">{draft.invoice.number || ''}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-xl bg-lime-300 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-lime-200"
            onClick={() => window.print()}
            type="button"
          >
            Télécharger PDF
          </button>
          <Link
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50"
            to="/"
          >
            Retour formulaire
          </Link>
        </div>
      </div>

      <div className="invoice-print-root" ref={wrapperRef}>
        <InvoicePreview draft={draft} variant="invoice" />
      </div>
    </div>
  )
}

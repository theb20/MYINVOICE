import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { InvoicePreview } from '@/components/invoice/InvoicePreview'
import { ApiError, apiFetch } from '@/lib/api'
import { defaultDraft, type InvoiceDraft } from '@/lib/invoice'

type PublicInvoiceResponse = {
  invoiceNumber: string
  status: string
  currency: string
  clientName: string | null
  clientEmail: string | null
  data: unknown
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function pickStatus(v: unknown): 'draft' | 'pending' | 'paid' {
  return v === 'draft' || v === 'pending' || v === 'paid' ? v : 'draft'
}

function pickType(v: unknown): 'invoice' | 'quote' | 'credit_note' | 'deposit' {
  return v === 'invoice' || v === 'quote' || v === 'credit_note' || v === 'deposit' ? v : 'invoice'
}

function pickPaymentMethod(v: unknown): 'transfer' | 'card' | 'cash' | 'paypal' | 'stripe' | 'revolut' | 'other' {
  return v === 'transfer' || v === 'card' || v === 'cash' || v === 'paypal' || v === 'stripe' || v === 'revolut' || v === 'other'
    ? v
    : 'transfer'
}

function pickCurrency(v: unknown): 'EUR' | 'USD' | 'GBP' | 'CHF' | 'CAD' {
  return v === 'EUR' || v === 'USD' || v === 'GBP' || v === 'CHF' || v === 'CAD' ? v : 'EUR'
}

export function PublicInvoicePage() {
  const { token } = useParams()
  const [draft, setDraft] = useState<InvoiceDraft | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = String(token || '')
    if (!t) return
    apiFetch<PublicInvoiceResponse>(`/public/invoices/${encodeURIComponent(t)}`)
      .then((res) => {
        const base = defaultDraft()
        const data = asRecord(res.data)
        const emitter = asRecord(data.emitter)
        const client = asRecord(data.client)
        const invoice = asRecord(data.invoice)
        const payment = asRecord(data.payment)
        const extras = asRecord(data.extras)
        const items = Array.isArray(data.items) ? data.items : []

        setDraft({
          ...base,
          currency: pickCurrency(data.currency),
          company: {
            ...base.company,
            name: typeof emitter.name === 'string' ? emitter.name : base.company.name,
            address: typeof emitter.address === 'string' ? emitter.address : base.company.address,
            siret: typeof emitter.siret === 'string' ? emitter.siret : '',
            vatNumber: typeof emitter.vatNumber === 'string' ? emitter.vatNumber : '',
            logoDataUrl: typeof emitter.logo === 'string' ? emitter.logo : base.company.logoDataUrl,
            legalForm: typeof emitter.legalForm === 'string' ? emitter.legalForm : '',
            postalCode: typeof emitter.postalCode === 'string' ? emitter.postalCode : '',
            city: typeof emitter.city === 'string' ? emitter.city : '',
            country: typeof emitter.country === 'string' ? emitter.country : '',
            email: typeof emitter.email === 'string' ? emitter.email : '',
            phone: typeof emitter.phone === 'string' ? emitter.phone : '',
            website: typeof emitter.website === 'string' ? emitter.website : '',
            legalMention: typeof emitter.legalMention === 'string' ? emitter.legalMention : '',
          },
          client: {
            ...base.client,
            name: typeof client.name === 'string' ? client.name : '',
            contactName: typeof client.contactName === 'string' ? client.contactName : '',
            siret: typeof client.siret === 'string' ? client.siret : '',
            email: typeof client.email === 'string' ? client.email : '',
            phone: typeof client.phone === 'string' ? client.phone : '',
            address: typeof client.address === 'string' ? client.address : '',
            postalCode: typeof client.postalCode === 'string' ? client.postalCode : '',
            city: typeof client.city === 'string' ? client.city : '',
            country: typeof client.country === 'string' ? client.country : 'France',
            vatNumber: typeof client.vatNumber === 'string' ? client.vatNumber : '',
          },
          invoice: {
            ...base.invoice,
            number: typeof res.invoiceNumber === 'string' ? res.invoiceNumber : base.invoice.number,
            issueDate: typeof invoice.issueDate === 'string' ? invoice.issueDate : base.invoice.issueDate,
            dueDate: typeof invoice.dueDate === 'string' ? invoice.dueDate : base.invoice.dueDate,
            deliveryDate: typeof invoice.deliveryDate === 'string' ? invoice.deliveryDate : base.invoice.deliveryDate,
            status: pickStatus(invoice.status),
            type: pickType(invoice.type),
            object: typeof invoice.object === 'string' ? invoice.object : '',
            clientOrderRef: typeof invoice.clientOrderRef === 'string' ? invoice.clientOrderRef : '',
            internalProjectRef: typeof invoice.internalProjectRef === 'string' ? invoice.internalProjectRef : '',
            language: invoice.language === 'fr' || invoice.language === 'en' || invoice.language === 'es' || invoice.language === 'de' ? (invoice.language as any) : base.invoice.language,
            discount: Number.isFinite(Number(invoice.discount)) ? Number(invoice.discount) : 0,
            discountAmount: Number.isFinite(Number(invoice.discountAmount)) ? Number(invoice.discountAmount) : 0,
            discountType: invoice.discountType === 'amount' || invoice.discountType === 'percent' ? (invoice.discountType as any) : base.invoice.discountType,
            deposit: Number.isFinite(Number(invoice.deposit)) ? Number(invoice.deposit) : 0,
            penaltyRate: typeof invoice.penaltyRate === 'string' ? invoice.penaltyRate : '',
            lateFeeFlatRate: typeof invoice.lateFeeFlatRate === 'string' ? invoice.lateFeeFlatRate : '',
            vatRate: Number.isFinite(Number(invoice.vatRate)) ? Number(invoice.vatRate) : base.invoice.vatRate,
            vatExempt: typeof invoice.vatExempt === 'boolean' ? (invoice.vatExempt as any) : base.invoice.vatExempt,
          },
          payment: {
            ...base.payment,
            method: pickPaymentMethod(payment.method),
            terms: typeof payment.terms === 'string' ? payment.terms : base.payment.terms,
            iban: typeof payment.iban === 'string' ? payment.iban : '',
            bic: typeof payment.bic === 'string' ? payment.bic : '',
            bankName: typeof payment.bankName === 'string' ? payment.bankName : '',
            accountHolder: typeof payment.accountHolder === 'string' ? payment.accountHolder : '',
            paypalEmail: typeof payment.paypalEmail === 'string' ? payment.paypalEmail : '',
            stripeLink:
              typeof asRecord(payment.stripe).checkoutUrl === 'string'
                ? String(asRecord(payment.stripe).checkoutUrl)
                : typeof payment.stripeLink === 'string'
                  ? payment.stripeLink
                  : '',
            revolutLink:
              typeof asRecord(payment.revolut).checkoutUrl === 'string'
                ? String(asRecord(payment.revolut).checkoutUrl)
                : typeof payment.revolutLink === 'string'
                  ? payment.revolutLink
                  : '',
          },
          extras: {
            ...base.extras,
            notes: typeof extras.notes === 'string' ? extras.notes : '',
            terms: typeof extras.terms === 'string' ? extras.terms : '',
            attachmentName: typeof extras.attachmentName === 'string' ? extras.attachmentName : '',
            attachmentUrl: typeof extras.attachmentUrl === 'string' ? extras.attachmentUrl : '',
            signature: typeof extras.signature === 'string' ? extras.signature : '',
            stamp: typeof extras.stamp === 'string' ? extras.stamp : '',
            stampHash: typeof extras.stampHash === 'string' ? extras.stampHash : '',
            depositPercent: Number.isFinite(Number(extras.depositPercent)) ? Number(extras.depositPercent) : 0,
            internalComment: typeof extras.internalComment === 'string' ? extras.internalComment : '',
            recurring: typeof extras.recurring === 'boolean' ? extras.recurring : false,
            recurringFrequency: extras.recurringFrequency === 'monthly' || extras.recurringFrequency === 'quarterly' || extras.recurringFrequency === 'yearly' ? (extras.recurringFrequency as any) : base.extras.recurringFrequency,
            deliveryMode: extras.deliveryMode === 'email' || extras.deliveryMode === 'mail' || extras.deliveryMode === 'hand' || extras.deliveryMode === 'portal' ? (extras.deliveryMode as any) : base.extras.deliveryMode,
            ccEmails: typeof extras.ccEmails === 'string' ? extras.ccEmails : '',
          },
          items: items.map((it) => {
            const row = asRecord(it)
            return {
              description: typeof row.description === 'string' ? row.description : '',
              quantity: Number.isFinite(Number(row.quantity)) ? Number(row.quantity) : 1,
              unitPriceHt: Number.isFinite(Number(row.unitPriceHt)) ? Number(row.unitPriceHt) : 0,
              vatPercent: 0,
            }
          }),
        })
      })
      .catch((e) => {
        if (e instanceof ApiError && (e.status === 401 || e.status === 404)) {
          setError('Lien invalide ou expiré.')
          return
        }
        setError('Impossible de charger la facture.')
      })
  }, [token])

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-6 px-6 py-14">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Facture</h1>
        <p className="mt-2 text-neutral-600">Consultation sécurisée.</p>
      </header>
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {draft ? <InvoicePreview draft={draft} /> : null}
    </main>
  )
}

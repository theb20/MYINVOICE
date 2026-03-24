export type InvoiceStatus = 'draft' | 'pending' | 'paid'

export type PaymentMethod = 'transfer' | 'card' | 'cash' | 'paypal' | 'stripe' | 'revolut' | 'other'

export type Currency = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'CAD'

export type LineItem = {
  description: string
  quantity: number
  unitPriceHt: number
  vatPercent: number
}

export type ClientInfo = {
  name: string
  contactName: string
  siret: string
  email: string
  phone: string
  address: string
  postalCode: string
  city: string
  country: string
  vatNumber: string
}

export type CompanyInfo = {
  name: string
  address: string
  siret: string
  vatNumber: string
  logoDataUrl: string
  legalForm?: string
  postalCode?: string
  city?: string
  country?: string
  email?: string
  phone?: string
  website?: string
  legalMention?: string
}

export type PaymentInfo = {
  method: PaymentMethod
  terms: string
  iban: string
  stripeLink?: string
  revolutLink?: string
  bic?: string
  bankName?: string
  accountHolder?: string
  paypalEmail?: string
}

export type InvoiceInfo = {
  number: string
  issueDate: string
  dueDate: string
  deliveryDate?: string
  status: InvoiceStatus
  type?: 'invoice' | 'quote' | 'credit_note' | 'deposit'
  object?: string
  clientOrderRef?: string
  internalProjectRef?: string
  language?: 'fr' | 'en' | 'es' | 'de'
  discount?: number
  discountAmount?: number
  discountType?: 'percent' | 'amount'
  deposit?: number
  penaltyRate?: string
  lateFeeFlatRate?: string
  vatRate?: number
  vatExempt?: boolean
}

export type InvoiceExtras = {
  notes: string
  terms: string
  attachmentName: string
  attachmentUrl?: string
  signature?: string
  stamp?: string
  stampHash?: string
  depositPercent?: number
  internalComment?: string
  recurring?: boolean
  recurringFrequency?: 'monthly' | 'quarterly' | 'yearly'
  deliveryMode?: 'email' | 'mail' | 'hand' | 'portal'
  ccEmails?: string
}

export type InvoiceDraft = {
  client: ClientInfo
  company: CompanyInfo
  invoice: InvoiceInfo
  payment: PaymentInfo
  items: LineItem[]
  extras: InvoiceExtras
  currency: Currency
}

export function addDays(dateIso: string, days: number) {
  const d = new Date(dateIso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function formatCurrency(amount: number, currency: Currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

export function safeNumber(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

export function calculateLineTotals(item: LineItem) {
  const quantity = Math.max(1, safeNumber(item.quantity))
  const unitPriceHt = Math.max(0, safeNumber(item.unitPriceHt))
  const vatPercent = 0

  const totalHt = quantity * unitPriceHt
  const totalVat = (totalHt * vatPercent) / 100
  const totalTtc = totalHt + totalVat

  return { totalHt, totalVat, totalTtc }
}

export function calculateInvoiceTotals(items: LineItem[]) {
  return items.reduce(
    (acc, item) => {
      const { totalHt, totalVat, totalTtc } = calculateLineTotals(item)
      return {
        totalHt: acc.totalHt + totalHt,
        totalVat: acc.totalVat + totalVat,
        totalTtc: acc.totalTtc + totalTtc,
      }
    },
    { totalHt: 0, totalVat: 0, totalTtc: 0 },
  )
}

export function defaultDraft(): InvoiceDraft {
  const issueDate = todayIso()
  const dueDate = addDays(issueDate, 30)

  return {
    currency: 'EUR',
    client: {
      name: '',
      contactName: '',
      siret: '',
      email: '',
      phone: '',
      address: '',
      postalCode: '',
      city: '',
      country: 'France',
      vatNumber: '',
    },
    invoice: {
      number: '',
      issueDate,
      dueDate,
      deliveryDate: issueDate,
      status: 'draft',
      type: 'invoice',
      object: '',
      clientOrderRef: '',
      internalProjectRef: '',
      language: 'fr',
      discount: 0,
      discountAmount: 0,
      discountType: 'percent',
      deposit: 0,
      penaltyRate: '',
      lateFeeFlatRate: '',
      vatRate: 20,
      vatExempt: false,
    },
    items: [{ description: '', quantity: 1, unitPriceHt: 0, vatPercent: 0 }],
    payment: {
      method: 'transfer',
      terms: '30 jours',
      iban: '',
      stripeLink: '',
      revolutLink: '',
      bic: '',
      bankName: '',
      accountHolder: '',
      paypalEmail: '',
    },
    extras: {
      notes: 'Merci pour votre confiance.',
      terms: '',
      attachmentName: '',
      attachmentUrl: '',
      signature: '',
      stamp: '',
      stampHash: '',
      depositPercent: 0,
      internalComment: '',
      recurring: false,
      recurringFrequency: 'monthly',
      deliveryMode: 'email',
      ccEmails: '',
    },
    company: {
      name: 'stack',
      address: 'France',
      siret: '',
      vatNumber: '',
      logoDataUrl: '/logo-stack.svg',
      legalForm: '',
      postalCode: '',
      city: '',
      country: 'France',
      email: '',
      phone: '',
      website: '',
      legalMention: '',
    },
  }
}

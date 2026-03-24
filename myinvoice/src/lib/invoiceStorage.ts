import { defaultDraft, type ClientInfo, type InvoiceDraft } from '@/lib/invoice'
import { DEFAULT_CLIENTS } from '@/lib/catalog'

const DRAFT_KEY = 'myinvoice:draft:v1'
const CLIENTS_KEY = 'myinvoice:clients:v1'
const NUMBER_KEY = 'myinvoice:invoiceNumber:v1'

export function loadDraft(): InvoiceDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return defaultDraft()
    const parsed = JSON.parse(raw) as InvoiceDraft
    const base = defaultDraft()
    return {
      ...base,
      ...parsed,
      client: { ...base.client, ...(parsed.client ?? {}) },
      company: base.company,
      invoice: { ...base.invoice, ...(parsed.invoice ?? {}) },
      payment: { ...base.payment, ...(parsed.payment ?? {}) },
      extras: { ...base.extras, ...(parsed.extras ?? {}) },
      items:
        Array.isArray(parsed.items) && parsed.items.length
          ? parsed.items.map((it) => ({
              description: typeof it?.description === 'string' ? it.description : '',
              quantity: Math.max(1, typeof it?.quantity === 'number' ? it.quantity : 1),
              unitPriceHt: Math.max(0, typeof it?.unitPriceHt === 'number' ? it.unitPriceHt : 0),
              vatPercent: 0,
            }))
          : base.items,
    }
  } catch {
    return defaultDraft()
  }
}

export function saveDraft(draft: InvoiceDraft) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}

export function loadClients(): ClientInfo[] {
  try {
    const raw = localStorage.getItem(CLIENTS_KEY)
    if (!raw) return DEFAULT_CLIENTS
    const parsed = JSON.parse(raw) as ClientInfo[]
    if (!Array.isArray(parsed)) return DEFAULT_CLIENTS
    return parsed.map((c) => ({
      name: typeof c?.name === 'string' ? c.name : '',
      contactName: typeof c?.contactName === 'string' ? c.contactName : '',
      siret: typeof c?.siret === 'string' ? c.siret : '',
      email: typeof c?.email === 'string' ? c.email : '',
      phone: typeof c?.phone === 'string' ? c.phone : '',
      address: typeof c?.address === 'string' ? c.address : '',
      postalCode: typeof c?.postalCode === 'string' ? c.postalCode : '',
      city: typeof c?.city === 'string' ? c.city : '',
      country: typeof c?.country === 'string' ? c.country : 'France',
      vatNumber: typeof c?.vatNumber === 'string' ? c.vatNumber : '',
    }))
  } catch {
    return DEFAULT_CLIENTS
  }
}

export function upsertClient(client: ClientInfo) {
  const name = client.name.trim()
  if (!name) return

  const clients = loadClients()
  const next = [
    client,
    ...clients.filter((c) => c.name.trim().toLowerCase() !== name.toLowerCase()),
  ].slice(0, 25)

  localStorage.setItem(CLIENTS_KEY, JSON.stringify(next))
}

function pad(num: number, size: number) {
  return String(num).padStart(size, '0')
}

export function getNextInvoiceNumber() {
  const today = new Date().toISOString().slice(0, 10).replaceAll('-', '')

  try {
    const raw = localStorage.getItem(NUMBER_KEY)
    if (!raw) {
      const next = `INV-${today}-${pad(1, 4)}`
      localStorage.setItem(NUMBER_KEY, JSON.stringify({ date: today, counter: 1 }))
      return next
    }

    const parsed = JSON.parse(raw) as { date?: string; counter?: number }
    const prevDate = parsed?.date ?? ''
    const prevCounter = typeof parsed?.counter === 'number' ? parsed.counter : 0

    const counter = prevDate === today ? prevCounter + 1 : 1
    const next = `INV-${today}-${pad(counter, 4)}`
    localStorage.setItem(NUMBER_KEY, JSON.stringify({ date: today, counter }))
    return next
  } catch {
    const next = `INV-${today}-${pad(1, 4)}`
    localStorage.setItem(NUMBER_KEY, JSON.stringify({ date: today, counter: 1 }))
    return next
  }
}

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { LineItemsEditor } from '@/components/invoice/LineItemsEditor'
import { ApiError, apiFetch } from '@/lib/api'
import {
  addDays,
  calculateInvoiceTotals,
  defaultDraft,
  formatCurrency,
  type Currency,
  type InvoiceStatus,
  type PaymentMethod,
  type InvoiceDraft,
} from '@/lib/invoice'
import { getNextInvoiceNumber, loadClients, loadDraft, saveDraft } from '@/lib/invoiceStorage'

// ─── Types étendus ────────────────────────────────────────────────────────────

type InvoiceLanguage = 'fr' | 'en' | 'es' | 'de'
type InvoiceType = 'invoice' | 'quote' | 'credit_note' | 'deposit'
type DeliveryMode = 'email' | 'mail' | 'hand' | 'portal'

const TOKEN_KEY = 'myinvoice:adminToken:v1'
const DEPOSIT_PRESETS_KEY = 'myinvoice:depositPresets:v1'

interface Emitter {
  name: string
  legalForm: string       // SARL, SAS, auto-entrepreneur…
  siret: string
  vatNumber: string       // N° TVA intracommunautaire
  address: string
  postalCode: string
  city: string
  country: string
  email: string
  phone: string
  website: string
  logo: string            // base64 ou URL
  legalMention: string    // "Exonéré de TVA – Art. 293B du CGI"
}

interface ClientInfo {
  name: string
  contactName: string
  siret: string
  vatNumber: string
  address: string
  postalCode: string
  city: string
  country: string
  email: string
  phone: string
}

interface ExtendedInvoice {
  number: string
  type: InvoiceType
  language: InvoiceLanguage
  issueDate: string
  dueDate: string
  deliveryDate: string    // Date de livraison / prestation
  status: InvoiceStatus
  orderRef: string        // Bon de commande client
  projectRef: string      // Référence projet interne
  object: string          // Objet de la facture
  discount: number        // Remise globale en %
  discountAmount: number  // Remise globale en montant (€)
  discountType: 'percent' | 'amount'
  deposit: number         // Acompte déjà versé (€)
  penaltyRate: string     // Taux pénalités retard
  lateFeeFlatRate: string // Indemnité forfaitaire retard (40€ légal)
  vatRate: number         // Taux TVA global par défaut
  vatExempt: boolean      // TVA non applicable
}

interface ExtendedPayment {
  method: PaymentMethod
  terms: string
  iban: string
  bic: string
  bankName: string
  accountHolder: string
  paypalEmail: string
  stripeLink: string
  revolutLink: string
}

interface ExtendedExtras {
  notes: string
  terms: string
  attachmentName: string
  attachmentUrl: string
  internalComment: string   // Note interne (non visible sur facture)
  signature: string         // base64 image signature
  stamp: string             // base64 image tampon
  stampHash: string
  depositPercent: number
  recurring: boolean
  recurringFrequency: 'monthly' | 'quarterly' | 'yearly'
  deliveryMode: DeliveryMode
  ccEmails: string          // CC emails séparés par virgule
}

// ─── Valeurs par défaut ───────────────────────────────────────────────────────

function defaultEmitter(): Emitter {
  return {
    name: '', legalForm: '', siret: '', vatNumber: '',
    address: '', postalCode: '', city: '', country: 'France',
    email: '', phone: '', website: '', logo: '', legalMention: '',
  }
}

function defaultClientInfo(): ClientInfo {
  return {
    name: '', contactName: '', siret: '', vatNumber: '',
    address: '', postalCode: '', city: '', country: 'France',
    email: '', phone: '',
  }
}

function defaultExtendedInvoice(): ExtendedInvoice {
  const today = new Date().toISOString().split('T')[0]
  return {
    number: '', type: 'invoice', language: 'fr',
    issueDate: today, dueDate: addDays(today, 30), deliveryDate: today,
    status: 'draft', orderRef: '', projectRef: '', object: '',
    discount: 0, discountAmount: 0, discountType: 'percent',
    deposit: 0, penaltyRate: '3 fois le taux légal',
    lateFeeFlatRate: '40', vatRate: 20, vatExempt: false,
  }
}

function defaultExtendedPayment(): ExtendedPayment {
  return {
    method: 'transfer', terms: '30 jours', iban: '', bic: '',
    bankName: '', accountHolder: '', paypalEmail: '', stripeLink: '', revolutLink: '',
  }
}

function defaultExtendedExtras(): ExtendedExtras {
  return {
    notes: '', terms: '', attachmentName: '', internalComment: '',
    attachmentUrl: '',
    signature: '', stamp: '', stampHash: '', depositPercent: 0, recurring: false, recurringFrequency: 'monthly',
    deliveryMode: 'email', ccEmails: '',
  }
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="text-left">
      <label className="text-xs font-medium text-neutral-700">{label}</label>
      {hint && <span className="ml-1.5 text-xs text-neutral-400">{hint}</span>}
      {children}
    </div>
  )
}

const inputCls =
  'mt-1 w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400'
const selectCls = inputCls

// ─── Composant principal ──────────────────────────────────────────────────────

export function HomePage() {
  const navigate = useNavigate()

  const [savedClients, setSavedClients] = useState<
    Array<{
      id: string
      name: string
      email: string | null
      phone: string | null
      address: string | null
      postalCode: string | null
      city: string | null
      country: string | null
      vatNumber: string | null
    }>
  >([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [serviceItems, setServiceItems] = useState<Array<{ id: string; name: string; unitPriceHt: number; isActive: boolean }>>([])

  const [emitter, setEmitter] = useState<Emitter>(() => {
    try { return JSON.parse(localStorage.getItem('emitter') || 'null') ?? defaultEmitter() }
    catch { return defaultEmitter() }
  })
  const ownerLoadedRef = useRef(false)
  const lastOwnerPayloadRef = useRef<string>('')

  const [client, setClient] = useState<ClientInfo>(() => {
    try {
      const clients = loadClients()
      return clients[0] ?? defaultClientInfo()
    } catch { return defaultClientInfo() }
  })

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return
    apiFetch<
      Array<{
        id: string
        name: string
        email: string | null
        phone: string | null
        address: string | null
        postalCode: string | null
        city: string | null
        country: string | null
        vatNumber: string | null
      }>
    >('/clients', { token })
      .then((rows) => {
        if (Array.isArray(rows)) setSavedClients(rows)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return
    apiFetch<Array<{ id: string; name: string; unitPriceHt: number; isActive: boolean }>>('/service-items', { token })
      .then((rows) => {
        if (Array.isArray(rows)) setServiceItems(rows)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return
    apiFetch<{
      name: string
      legalForm: string
      siret: string
      vatNumber: string
      address: string
      postalCode: string
      city: string
      country: string
      email: string
      phone: string
      website: string
      legalMention: string
      logo: string
    }>('/owner-profile', { token })
      .then((profile) => {
        ownerLoadedRef.current = true
        if (profile && typeof profile === 'object' && String(profile.name || '').trim()) {
          setEmitter({
            ...defaultEmitter(),
            name: String(profile.name || ''),
            legalForm: String(profile.legalForm || ''),
            siret: String(profile.siret || ''),
            vatNumber: String(profile.vatNumber || ''),
            address: String(profile.address || ''),
            postalCode: String(profile.postalCode || ''),
            city: String(profile.city || ''),
            country: String(profile.country || ''),
            email: String(profile.email || ''),
            phone: String(profile.phone || ''),
            website: String(profile.website || ''),
            legalMention: String(profile.legalMention || ''),
            logo: String(profile.logo || ''),
          })
        }
      })
      .catch(() => {})
  }, [])

  const [draft, setDraft] = useState<InvoiceDraft>(() => {
    const base = defaultDraft()
    if (typeof window === 'undefined') return base
    const loaded = loadDraft()
    const token = localStorage.getItem(TOKEN_KEY)
    const invoiceNumber = loaded.invoice.number?.trim()
      ? loaded.invoice.number
      : token
        ? ''
        : getNextInvoiceNumber()
    const clients = loadClients()
    const clientLoaded = loaded.client?.name?.trim() ? loaded.client : (clients[0] ?? base.client)
    return {
      ...loaded,
      client: clientLoaded,
      invoice: {
        ...loaded.invoice,
        number: invoiceNumber,
        dueDate: loaded.invoice.dueDate || addDays(loaded.invoice.issueDate, 30),
      },
    }
  })

  const [invoice, setInvoice] = useState<ExtendedInvoice>(() => {
    try { return JSON.parse(localStorage.getItem('extInvoice') || 'null') ?? defaultExtendedInvoice() }
    catch { return defaultExtendedInvoice() }
  })

  const [payment, setPayment] = useState<ExtendedPayment>(() => {
    try { return JSON.parse(localStorage.getItem('extPayment') || 'null') ?? defaultExtendedPayment() }
    catch { return defaultExtendedPayment() }
  })

  const [extras, setExtras] = useState<ExtendedExtras>(() => {
    try { return JSON.parse(localStorage.getItem('extExtras') || 'null') ?? defaultExtendedExtras() }
    catch { return defaultExtendedExtras() }
  })

  const dueDateManuallySetRef = useRef(false)
  const [sendMessage, setSendMessage] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [depositPresets, setDepositPresets] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(DEPOSIT_PRESETS_KEY)
      const parsed = raw ? (JSON.parse(raw) as unknown) : null
      return Array.isArray(parsed)
        ? parsed.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0 && n <= 100).slice(0, 10)
        : [30, 50]
    } catch {
      return [30, 50]
    }
  })

  useEffect(() => {
    localStorage.setItem(DEPOSIT_PRESETS_KEY, JSON.stringify(depositPresets))
  }, [depositPresets])

  // Autosave
  useEffect(() => {
    const h = window.setTimeout(() => {
      saveDraft(draft)
      localStorage.setItem('emitter', JSON.stringify(emitter))
      localStorage.setItem('currentClient', JSON.stringify(client))
      localStorage.setItem('extInvoice', JSON.stringify(invoice))
      localStorage.setItem('extPayment', JSON.stringify(payment))
      localStorage.setItem('extExtras', JSON.stringify(extras))
    }, 250)
    return () => clearTimeout(h)
  }, [client, draft, emitter, extras, invoice, payment])

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return
    if (!ownerLoadedRef.current) return
    const name = String(emitter.name || '').trim()
    if (!name) return

    const payload = {
      name,
      legalForm: String(emitter.legalForm || '').trim() || undefined,
      siret: String(emitter.siret || '').trim() || undefined,
      vatNumber: String(emitter.vatNumber || '').trim() || undefined,
      address: String(emitter.address || '').trim() || undefined,
      postalCode: String(emitter.postalCode || '').trim() || undefined,
      city: String(emitter.city || '').trim() || undefined,
      country: String(emitter.country || '').trim() || undefined,
      email: String(emitter.email || '').trim() || undefined,
      phone: String(emitter.phone || '').trim() || undefined,
      website: String(emitter.website || '').trim() || undefined,
      legalMention: String(emitter.legalMention || '').trim() || undefined,
      logo: String(emitter.logo || '').trim() || undefined,
    }
    const key = JSON.stringify(payload)
    if (lastOwnerPayloadRef.current === key) return

    const h = window.setTimeout(() => {
      apiFetch('/owner-profile', { method: 'PUT', token, body: JSON.stringify(payload) })
        .then(() => {
          lastOwnerPayloadRef.current = key
        })
        .catch(() => {})
    }, 900)
    return () => clearTimeout(h)
  }, [emitter])

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return
    const h = window.setTimeout(() => {
      const invoiceNumber = draft.invoice.number.trim()
      if (!invoiceNumber) return
      apiFetch('/invoice-drafts/upsert', {
        method: 'POST',
        token,
        body: JSON.stringify({
          invoiceNumber,
          status: invoice.status,
          currency: draft.currency,
          clientName: client.name || undefined,
          clientEmail: client.email || undefined,
          data: {
            emitter,
            client,
            invoice,
            payment,
            items: draft.items,
            extras,
            currency: draft.currency,
          },
        }),
      }).catch(() => {})
    }, 1200)
    return () => clearTimeout(h)
  }, [client, draft.currency, draft.invoice.number, draft.items, emitter, extras, invoice, payment])

  const generateInvoiceNumber = async ({ force }: { force: boolean }) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      if (!draft.invoice.number.trim() || force) {
        const n = getNextInvoiceNumber()
        setDraft((p) => ({ ...p, invoice: { ...p.invoice, number: n } }))
        setInvoice((p) => ({ ...p, number: n }))
      }
      return
    }

    if (draft.invoice.number.trim() && !force) return
    const issueDate = draft.invoice.issueDate
    const docType = invoice.type
    const res = await apiFetch<{ invoiceNumber: string }>(
      `/invoices/next-number?issueDate=${encodeURIComponent(issueDate)}&docType=${encodeURIComponent(docType)}`,
      { token },
    )
    setDraft((p) => ({ ...p, invoice: { ...p.invoice, number: res.invoiceNumber } }))
    setInvoice((p) => ({ ...p, number: res.invoiceNumber }))
  }

  useEffect(() => {
    generateInvoiceNumber({ force: false }).catch(() => {})
  }, [draft.invoice.issueDate, invoice.type])

  useEffect(() => {
    if (!draft.invoice.number.trim()) return
    if (invoice.number === draft.invoice.number) return
    setInvoice((p) => ({ ...p, number: draft.invoice.number }))
  }, [draft.invoice.number, invoice.number])

  const totals = useMemo(() => {
    const raw = calculateInvoiceTotals(draft.items)
    // Applique remise globale
    let remise = 0
    if (invoice.discountType === 'percent' && invoice.discount > 0) {
      remise = raw.totalHt * invoice.discount / 100
    } else if (invoice.discountType === 'amount' && invoice.discountAmount > 0) {
      remise = invoice.discountAmount
    }
    const htAfterDiscount = Math.max(0, raw.totalHt - remise)
    const vatAmount = invoice.vatExempt ? 0 : htAfterDiscount * (invoice.vatRate / 100)
    const ttc = htAfterDiscount + vatAmount
    const net = Math.max(0, ttc - invoice.deposit)
    return { ...raw, remise, htAfterDiscount, vatAmount, ttc, net }
  }, [draft.items, invoice.discount, invoice.discountAmount, invoice.discountType, invoice.vatRate, invoice.vatExempt, invoice.deposit])

  const upsertToServer = async (token: string) => {
    const invoiceNumber = draft.invoice.number.trim()
    if (!invoiceNumber) return
    await apiFetch('/invoice-drafts/upsert', {
      method: 'POST',
      token,
      body: JSON.stringify({
        invoiceNumber,
        status: invoice.status,
        currency: draft.currency,
        clientName: client.name || undefined,
        clientEmail: client.email || undefined,
        data: {
          emitter,
          client,
          invoice,
          payment,
          items: draft.items,
          extras,
          currency: draft.currency,
          summary: { totals },
        },
      }),
    })
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    saveDraft(draft)
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      await upsertToServer(token).catch(() => {})
    }
    navigate('/invoice')
  }

  const sendInvoice = async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    const invoiceNumber = draft.invoice.number.trim()
    if (!token) {
      setSendMessage('Connecte-toi en admin pour envoyer.')
      return
    }
    if (!invoiceNumber) {
      setSendMessage('Numéro de facture manquant.')
      return
    }
    if (!client.email) {
      setSendMessage("Email client manquant.")
      return
    }
    setSending(true)
    setSendMessage(null)
    try {
      await upsertToServer(token)
      const res = await apiFetch<{ ok: true; shareUrl?: string; paymentUrl?: string | null }>(
        `/invoices/${encodeURIComponent(invoiceNumber)}/send`,
        { method: 'POST', token },
      )
      setSendMessage(res?.paymentUrl ? 'Facture envoyée + lien de paiement créé.' : 'Facture envoyée.')
    } catch (e: unknown) {
      if (e instanceof ApiError && e.body && typeof e.body === 'object' && 'message' in e.body) {
        setSendMessage(String((e.body as any).message))
      } else {
        setSendMessage("Impossible d'envoyer la facture.")
      }
    } finally {
      setSending(false)
    }
  }

  const generateStripeLink = async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    const invoiceNumber = draft.invoice.number.trim()
    if (!token) {
      setSendMessage('Connecte-toi en admin pour générer le lien Stripe.')
      return
    }
    if (!invoiceNumber) {
      setSendMessage('Numéro de facture manquant.')
      return
    }
    try {
      await upsertToServer(token).catch(() => {})
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
      const depositPercent = Number(extras.depositPercent || 0)
      const amountMajor = depositPercent > 0 ? (totals.net * depositPercent) / 100 : totals.net
      const res = await apiFetch<{ url: string }>(`/payments/stripe/checkout`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          invoiceNumber,
          amountMajor,
          currency: draft.currency,
          customerEmail: client.email || undefined,
          successUrl: `${origin}/invoice`,
          cancelUrl: `${origin}/invoice`,
        }),
      })
      if (res.url) updPayment({ stripeLink: res.url })
    } catch (e: unknown) {
      if (e instanceof ApiError && e.body && typeof e.body === 'object' && 'message' in e.body) {
        setSendMessage(String((e.body as any).message))
      } else {
        setSendMessage("Impossible de générer le lien Stripe.")
      }
    }
  }

  const generateRevolutLink = async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    const invoiceNumber = draft.invoice.number.trim()
    if (!token) {
      setSendMessage('Connecte-toi en admin pour générer le lien Revolut.')
      return
    }
    if (!invoiceNumber) {
      setSendMessage('Numéro de facture manquant.')
      return
    }
    try {
      await upsertToServer(token).catch(() => {})
      const depositPercent = Number(extras.depositPercent || 0)
      const amountMajor = depositPercent > 0 ? (totals.net * depositPercent) / 100 : totals.net
      const res = await apiFetch<{ checkoutUrl: string }>(`/payments/revolut/order`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          invoiceNumber,
          amountMajor,
          currency: draft.currency,
          customerEmail: client.email || undefined,
        }),
      })
      if (res.checkoutUrl) updPayment({ revolutLink: res.checkoutUrl })
    } catch (e: unknown) {
      if (e instanceof ApiError && e.body && typeof e.body === 'object' && 'message' in e.body) {
        setSendMessage(String((e.body as any).message))
      } else {
        setSendMessage("Impossible de générer le lien Revolut.")
      }
    }
  }

  const upd = <K extends object>(setter: React.Dispatch<React.SetStateAction<K>>) =>
    (patch: Partial<K>) => setter((p) => ({ ...p, ...patch }))

  const updEmitter = upd(setEmitter)
  const updClient = upd(setClient)
  const updInvoice = upd(setInvoice)
  const updPayment = upd(setPayment)
  const updExtras = upd(setExtras)

  type UploadResponse = {
    attachment?: { url: string; name: string }
    signature?: { url: string }
    stamp?: { url: string; hash: string }
  }

  const uploadFiles = async (files: { attachment?: File; signature?: File; stamp?: File }): Promise<UploadResponse | null> => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return null
    const base = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001'

    const fd = new FormData()
    if (files.attachment) fd.append('attachment', files.attachment)
    if (files.signature) fd.append('signature', files.signature)
    if (files.stamp) fd.append('stamp', files.stamp)
    fd.append('issueDate', invoice.issueDate)
    fd.append('companyName', emitter.name)
    fd.append('clientName', client.name)
    fd.append('clientEmail', client.email)

    const res = await fetch(`${base}/uploads`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: fd })
    const text = await res.text()
    const bodyUnknown: unknown = text
      ? (() => {
          try {
            return JSON.parse(text)
          } catch {
            return null
          }
        })()
      : null
    if (!res.ok) throw new Error('upload_failed')
    if (!bodyUnknown || typeof bodyUnknown !== 'object') return null
    return bodyUnknown as UploadResponse
  }

  return (
    <div className="min-h-dvh w-full bg-neutral-50">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_20%,rgba(190,242,100,0.35),transparent_55%),radial-gradient(900px_circle_at_80%_0%,rgba(10,10,10,0.08),transparent_55%)]" />
        <div className="relative mx-auto w-full max-w-none px-6 py-10 md:px-10">
          <div className="mx-auto w-full max-w-7xl">
            <div className="flex flex-col gap-6">

              {/* ── Header ── */}
              <header className="animate-fade-in-up rounded-3xl border border-neutral-200 bg-white/80 p-6 shadow-sm backdrop-blur md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 overflow-hidden p-1 rounded-xl bg-lime-200">
                      <div className="absolute inset-0 animate-shimmer bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)]" />
                      <img alt="Logo" className="relative h-10 w-10 animate-float object-contain" src="/logo.png" />
                    </div>
                    <div className="flex flex-col items-start">
                      <div className="text-xs font-semibold tracking-wide text-neutral-700">STACK</div>
                      <div className="text-lg font-semibold tracking-tight text-neutral-900">Création de facture</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-full bg-lime-300 px-3 py-1 text-xs font-semibold text-neutral-900">
                      TVA {invoice.vatExempt ? '0%' : `${invoice.vatRate}%`}
                    </span>
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                      autosave navigateur
                    </span>
                  </div>
                </div>
                <div className="mt-5 flex flex-col">
                  <h1 className="text-3xl font-semibold tracking-tight text-black md:text-4xl">
                    Créer une facture
                  </h1>
                  <p className="mt-2   text-sm text-neutral-600">
                    Tout est enregistré automatiquement. Le client est automatique et n'apparaît sur la facture
                    que lorsque le statut est en brouillon.
                  </p>
                </div>
              </header>

              <form className="w-full animate-fade-in-up" onSubmit={onSubmit}>
                <div className="grid gap-4 lg:grid-cols-12">

                  {/* ── 1. Émetteur ── */}
                  <details className="group lg:col-span-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 select-none">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-neutral-900">Émetteur</span>
                        <span className="text-xs text-neutral-500">Votre société / identité</span>
                      </div>
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 transition group-open:bg-lime-200">ouvrir</span>
                    </summary>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Field label="Nom / Raison sociale" hint="*">
                        <input className={inputCls} value={emitter.name} onChange={e => updEmitter({ name: e.target.value })} placeholder="Dupont Consulting" required />
                      </Field>
                      <Field label="Forme juridique">
                        <select className={selectCls} value={emitter.legalForm} onChange={e => updEmitter({ legalForm: e.target.value })}>
                          <option value="">—</option>
                          <option value="auto">Auto-entrepreneur</option>
                          <option value="ei">EI</option>
                          <option value="eurl">EURL</option>
                          <option value="sarl">SARL</option>
                          <option value="sas">SAS</option>
                          <option value="sasu">SASU</option>
                          <option value="sa">SA</option>
                          <option value="other">Autre</option>
                        </select>
                      </Field>
                      <Field label="SIRET">
                        <input className={inputCls} value={emitter.siret} onChange={e => updEmitter({ siret: e.target.value })} placeholder="123 456 789 00010" />
                      </Field>
                      <Field label="N° TVA intracommunautaire">
                        <input className={inputCls} value={emitter.vatNumber} onChange={e => updEmitter({ vatNumber: e.target.value })} placeholder="FR12345678901" />
                      </Field>
                      <Field label="Adresse">
                        <input className={inputCls} value={emitter.address} onChange={e => updEmitter({ address: e.target.value })} placeholder="12 rue de la Paix" />
                      </Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Code postal">
                          <input className={inputCls} value={emitter.postalCode} onChange={e => updEmitter({ postalCode: e.target.value })} placeholder="75001" />
                        </Field>
                        <Field label="Ville">
                          <input className={inputCls} value={emitter.city} onChange={e => updEmitter({ city: e.target.value })} placeholder="Paris" />
                        </Field>
                      </div>
                      <Field label="Pays">
                        <input className={inputCls} value={emitter.country} onChange={e => updEmitter({ country: e.target.value })} />
                      </Field>
                      <Field label="Email">
                        <input className={inputCls} type="email" value={emitter.email} onChange={e => updEmitter({ email: e.target.value })} placeholder="contact@moi.fr" />
                      </Field>
                      <Field label="Téléphone">
                        <input className={inputCls} type="tel" value={emitter.phone} onChange={e => updEmitter({ phone: e.target.value })} placeholder="+33 6 00 00 00 00" />
                      </Field>
                      <Field label="Site web">
                        <input className={inputCls} value={emitter.website} onChange={e => updEmitter({ website: e.target.value })} placeholder="https://moi.fr" />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field label="Mention légale" hint="(ex: auto-entrepreneur)">
                          <input className={inputCls} value={emitter.legalMention} onChange={e => updEmitter({ legalMention: e.target.value })} placeholder="Exonéré de TVA – Art. 293B du CGI" />
                        </Field>
                      </div>
                      <div className="sm:col-span-2">
                        <Field label="Logo (URL ou base64)">
                          <input className={inputCls} value={emitter.logo} onChange={e => updEmitter({ logo: e.target.value })} placeholder="https://... ou data:image/png;base64,..." />
                        </Field>
                      </div>
                    </div>
                  </details>

                  {/* ── 2. Client ── */}
                  <details className="group lg:col-span-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 select-none">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-neutral-900">Client</span>
                        <span className="text-xs text-neutral-500">Destinataire de la facture</span>
                      </div>
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 transition group-open:bg-lime-200">ouvrir</span>
                    </summary>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Field label="Client enregistré">
                          <select
                            className={selectCls}
                            onChange={(e) => {
                              const id = e.target.value
                              setSelectedClientId(id)
                              const found = savedClients.find((c) => c.id === id)
                              if (!found) return
                              updClient({
                                name: found.name ?? '',
                                email: found.email ?? '',
                                phone: found.phone ?? '',
                                address: found.address ?? '',
                                postalCode: found.postalCode ?? '',
                                city: found.city ?? '',
                                country: found.country ?? 'France',
                                vatNumber: found.vatNumber ?? '',
                              })
                            }}
                            value={selectedClientId}
                          >
                            <option value="">— Choisir —</option>
                            {savedClients.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <Field label="Société / Nom" hint="*">
                        <input className={inputCls} value={client.name} onChange={e => updClient({ name: e.target.value })} placeholder="ACME Corp" required />
                      </Field>
                      <Field label="Contact (prénom nom)">
                        <input className={inputCls} value={client.contactName} onChange={e => updClient({ contactName: e.target.value })} placeholder="Jean Martin" />
                      </Field>
                      <Field label="SIRET">
                        <input className={inputCls} value={client.siret} onChange={e => updClient({ siret: e.target.value })} placeholder="987 654 321 00014" />
                      </Field>
                      <Field label="N° TVA intracommunautaire">
                        <input className={inputCls} value={client.vatNumber} onChange={e => updClient({ vatNumber: e.target.value })} placeholder="FR98765432100" />
                      </Field>
                      <Field label="Adresse">
                        <input className={inputCls} value={client.address} onChange={e => updClient({ address: e.target.value })} placeholder="5 avenue des Champs" />
                      </Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Code postal">
                          <input className={inputCls} value={client.postalCode} onChange={e => updClient({ postalCode: e.target.value })} placeholder="69000" />
                        </Field>
                        <Field label="Ville">
                          <input className={inputCls} value={client.city} onChange={e => updClient({ city: e.target.value })} placeholder="Lyon" />
                        </Field>
                      </div>
                      <Field label="Pays">
                        <input className={inputCls} value={client.country} onChange={e => updClient({ country: e.target.value })} />
                      </Field>
                      <Field label="Email de facturation">
                        <input className={inputCls} type="email" value={client.email} onChange={e => updClient({ email: e.target.value })} placeholder="compta@acme.fr" />
                      </Field>
                      <Field label="Téléphone">
                        <input className={inputCls} type="tel" value={client.phone} onChange={e => updClient({ phone: e.target.value })} placeholder="+33 1 00 00 00 00" />
                      </Field>
                    </div>
                  </details>

                  {/* ── 3. Informations de facture ── */}
                  <details className="group lg:col-span-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 select-none">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-neutral-900">Informations de facture</span>
                        <span className="text-xs text-neutral-500">Numéro, dates, statut, références</span>
                      </div>
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 transition group-open:bg-lime-200">ouvrir</span>
                    </summary>
                    <div className="mt-5 grid gap-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Type de document">
                          <select className={selectCls} value={invoice.type} onChange={e => updInvoice({ type: e.target.value as InvoiceType })}>
                            <option value="invoice">Facture</option>
                            <option value="quote">Devis</option>
                            <option value="credit_note">Avoir</option>
                            <option value="deposit">Facture d'acompte</option>
                          </select>
                        </Field>
                        <Field label="Langue">
                          <select className={selectCls} value={invoice.language} onChange={e => updInvoice({ language: e.target.value as InvoiceLanguage })}>
                            <option value="fr">Français</option>
                            <option value="en">English</option>
                            <option value="es">Español</option>
                            <option value="de">Deutsch</option>
                          </select>
                        </Field>
                      </div>
                      <Field label="Numéro de facture">
                        <div className="flex gap-2">
                          <input className={inputCls} readOnly value={draft.invoice.number} />
                          <button
                            className="mt-1 shrink-0 rounded-2xl bg-lime-300 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-lime-200 disabled:opacity-50"
                            disabled={sending}
                            onClick={() => {
                              setSending(true)
                              setSendMessage(null)
                              generateInvoiceNumber({ force: true })
                                .catch((e: unknown) => {
                                  if (e instanceof ApiError && e.body && typeof e.body === 'object' && 'message' in e.body) {
                                    setSendMessage(String((e.body as any).message))
                                  } else {
                                    setSendMessage("Impossible de générer le numéro.")
                                  }
                                })
                                .finally(() => setSending(false))
                            }}
                            type="button"
                          >
                            Auto
                          </button>
                        </div>
                      </Field>
                      <Field label="Objet / Désignation globale">
                        <input className={inputCls} value={invoice.object} onChange={e => updInvoice({ object: e.target.value })} placeholder="Prestation développement web – mars 2025" />
                      </Field>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Date d'émission">
                          <input
                            className={inputCls}
                            type="date"
                            value={draft.invoice.issueDate}
                            onChange={e => {
                              const issueDate = e.target.value
                              setDraft(p => ({
                                ...p,
                                invoice: {
                                  ...p.invoice,
                                  issueDate,
                                  dueDate: dueDateManuallySetRef.current ? p.invoice.dueDate : addDays(issueDate, 30),
                                },
                              }))
                            }}
                          />
                        </Field>
                        <Field label="Date d'échéance">
                          <input
                            className={inputCls}
                            type="date"
                            value={draft.invoice.dueDate}
                            onChange={e => {
                              dueDateManuallySetRef.current = true
                              setDraft(p => ({ ...p, invoice: { ...p.invoice, dueDate: e.target.value } }))
                            }}
                          />
                        </Field>
                        <Field label="Date de livraison / prestation">
                          <input className={inputCls} type="date" value={invoice.deliveryDate} onChange={e => updInvoice({ deliveryDate: e.target.value })} />
                        </Field>
                        <Field label="Statut">
                          <select
                            className={selectCls}
                            value={draft.invoice.status}
                            onChange={e => setDraft(p => ({ ...p, invoice: { ...p.invoice, status: e.target.value as InvoiceStatus } }))}
                          >
                            <option value="draft">brouillon</option>
                            <option value="pending">en attente</option>
                            <option value="paid">payé</option>
                          </select>
                        </Field>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Réf. bon de commande client">
                          <input className={inputCls} value={invoice.orderRef} onChange={e => updInvoice({ orderRef: e.target.value })} placeholder="BC-2025-042" />
                        </Field>
                        <Field label="Réf. projet interne">
                          <input className={inputCls} value={invoice.projectRef} onChange={e => updInvoice({ projectRef: e.target.value })} placeholder="PRJ-007" />
                        </Field>
                      </div>
                    </div>
                  </details>

                  {/* ── 4. TVA & Remise ── */}
                  <details className="group lg:col-span-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 select-none">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-neutral-900">TVA & Remise</span>
                        <span className="text-xs text-neutral-500">Taux, exonération, escompte</span>
                      </div>
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 transition group-open:bg-lime-200">ouvrir</span>
                    </summary>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Field label="Taux TVA par défaut (%)">
                        <select className={selectCls} value={invoice.vatRate} onChange={e => updInvoice({ vatRate: Number(e.target.value) })} disabled={invoice.vatExempt}>
                          <option value={0}>0%</option>
                          <option value={5.5}>5,5%</option>
                          <option value={10}>10%</option>
                          <option value={20}>20%</option>
                        </select>
                      </Field>
                      <Field label="Devise">
                        <select
                          className={selectCls}
                          value={draft.currency}
                          onChange={e => setDraft(p => ({ ...p, currency: e.target.value as Currency }))}
                        >
                          <option value="EUR">EUR €</option>
                          <option value="USD">USD $</option>
                          <option value="GBP">GBP £</option>
                          <option value="CHF">CHF</option>
                          <option value="CAD">CAD $</option>
                        </select>
                      </Field>
                      <div className="sm:col-span-2 flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                        <input
                          id="vatExempt"
                          type="checkbox"
                          className="h-4 w-4 rounded accent-lime-400"
                          checked={invoice.vatExempt}
                          onChange={e => updInvoice({ vatExempt: e.target.checked })}
                        />
                        <label htmlFor="vatExempt" className="text-xs text-neutral-700 cursor-pointer">
                          TVA non applicable (auto-entrepreneur, art. 293B CGI)
                        </label>
                      </div>
                      <Field label="Type de remise globale">
                        <select className={selectCls} value={invoice.discountType} onChange={e => updInvoice({ discountType: e.target.value as 'percent' | 'amount' })}>
                          <option value="percent">En pourcentage (%)</option>
                          <option value="amount">En montant (€)</option>
                        </select>
                      </Field>
                      {invoice.discountType === 'percent' ? (
                        <Field label="Remise (%)">
                          <input className={inputCls} type="number" min={0} max={100} step={0.1} value={invoice.discount} onChange={e => updInvoice({ discount: Number(e.target.value) })} placeholder="0" />
                        </Field>
                      ) : (
                        <Field label={`Remise (${draft.currency})`}>
                          <input className={inputCls} type="number" min={0} step={0.01} value={invoice.discountAmount} onChange={e => updInvoice({ discountAmount: Number(e.target.value) })} placeholder="0.00" />
                        </Field>
                      )}
                      <Field label={`Acompte déjà versé (${draft.currency})`}>
                        <input className={inputCls} type="number" min={0} step={0.01} value={invoice.deposit} onChange={e => updInvoice({ deposit: Number(e.target.value) })} placeholder="0.00" />
                      </Field>
                    </div>
                  </details>

                  {/* ── 5. Pénalités de retard ── */}
                  <details className="group lg:col-span-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 select-none">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-neutral-900">Pénalités de retard</span>
                        <span className="text-xs text-neutral-500">Mentions légales obligatoires B2B</span>
                      </div>
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 transition group-open:bg-lime-200">ouvrir</span>
                    </summary>
                    <div className="mt-5 grid gap-3">
                      <Field label="Taux de pénalités" hint="(ex: 3× taux légal)">
                        <input className={inputCls} value={invoice.penaltyRate} onChange={e => updInvoice({ penaltyRate: e.target.value })} placeholder="3 fois le taux d'intérêt légal" />
                      </Field>
                      <Field label="Indemnité forfaitaire (€)" hint="40€ légal">
                        <input className={inputCls} type="number" min={0} value={invoice.lateFeeFlatRate} onChange={e => updInvoice({ lateFeeFlatRate: e.target.value })} placeholder="40" />
                      </Field>
                      <div className="rounded-2xl bg-neutral-50 border border-neutral-200 p-3 text-xs text-neutral-500 leading-relaxed">
                        Mention automatique sur la facture : <em>"En cas de retard de paiement, des pénalités de {invoice.penaltyRate} seront appliquées, ainsi qu'une indemnité forfaitaire de {invoice.lateFeeFlatRate}€ pour frais de recouvrement."</em>
                      </div>
                    </div>
                  </details>

                  {/* ── 6. Produits / services ── */}
                  <details className="group lg:col-span-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm" open>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 select-none">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-neutral-900">Produits / services</span>
                        <span className="text-xs text-neutral-500">Sélection + quantités</span>
                      </div>
                      <span className="rounded-full bg-lime-200 px-3 py-1 text-xs font-semibold text-neutral-900">
                        net à payer {formatCurrency(totals.net, draft.currency)}
                      </span>
                    </summary>
                    <div className="mt-5 flex flex-col gap-4">
                      <LineItemsEditor
                        currency={draft.currency}
                        items={draft.items}
                        onChange={(items) => setDraft(p => ({ ...p, items }))}
                        serviceItems={serviceItems}
                      />
                      <div className="rounded-3xl border border-neutral-200 bg-white p-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <Field label="Acompte demandé (%)">
                            <input
                              className={inputCls}
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={extras.depositPercent}
                              onChange={(e) => updExtras({ depositPercent: Number(e.target.value) })}
                              placeholder="0"
                            />
                          </Field>
                          <div className="sm:col-span-2 flex flex-wrap items-end gap-2">
                            {depositPresets.map((p) => (
                              <button
                                key={p}
                                className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-900 transition hover:bg-neutral-50"
                                onClick={() => updExtras({ depositPercent: p })}
                                type="button"
                              >
                                {p}%
                              </button>
                            ))}
                            <button
                              className="rounded-2xl bg-neutral-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800"
                              onClick={() => {
                                const next = Number(extras.depositPercent || 0)
                                if (!Number.isFinite(next) || next <= 0 || next > 100) return
                                setDepositPresets((prev) =>
                                  [next, ...prev.filter((x) => x !== next)].slice(0, 10),
                                )
                              }}
                              type="button"
                            >
                              + Ajouter
                            </button>
                            <button
                              className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-900 transition hover:bg-neutral-50"
                              onClick={() => setDepositPresets([])}
                              type="button"
                            >
                              Reset
                            </button>
                          </div>
                        </div>
                        {extras.depositPercent > 0 ? (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                              <div className="text-xs text-neutral-600">Acompte à payer</div>
                              <div className="mt-1 text-base font-semibold text-neutral-900">
                                {formatCurrency((totals.net * extras.depositPercent) / 100, draft.currency)}
                              </div>
                            </div>
                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                              <div className="text-xs text-neutral-600">Solde restant</div>
                              <div className="mt-1 text-base font-semibold text-neutral-900">
                                {formatCurrency(totals.net - (totals.net * extras.depositPercent) / 100, draft.currency)}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      {/* Totaux détaillés */}
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                          <div className="text-xs text-neutral-600">Total HT brut</div>
                          <div className="mt-1 text-base font-semibold text-neutral-900">{formatCurrency(totals.totalHt, draft.currency)}</div>
                        </div>
                        {totals.remise > 0 && (
                          <div className="rounded-2xl border border-lime-200 bg-lime-50 p-4">
                            <div className="text-xs text-neutral-600">Remise</div>
                            <div className="mt-1 text-base font-semibold text-neutral-900">− {formatCurrency(totals.remise, draft.currency)}</div>
                          </div>
                        )}
                        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                          <div className="text-xs text-neutral-600">Total HT net</div>
                          <div className="mt-1 text-base font-semibold text-neutral-900">{formatCurrency(totals.htAfterDiscount, draft.currency)}</div>
                        </div>
                        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                          <div className="text-xs text-neutral-600">TVA ({invoice.vatExempt ? '0%' : `${invoice.vatRate}%`})</div>
                          <div className="mt-1 text-base font-semibold text-neutral-900">{formatCurrency(totals.vatAmount, draft.currency)}</div>
                        </div>
                        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                          <div className="text-xs text-neutral-600">Total TTC</div>
                          <div className="mt-1 text-base font-semibold text-neutral-900">{formatCurrency(totals.ttc, draft.currency)}</div>
                        </div>
                        {invoice.deposit > 0 && (
                          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                            <div className="text-xs text-neutral-600">Acompte versé</div>
                            <div className="mt-1 text-base font-semibold text-neutral-900">− {formatCurrency(invoice.deposit, draft.currency)}</div>
                          </div>
                        )}
                        <div className="rounded-2xl border border-neutral-200 bg-neutral-900 p-4">
                          <div className="text-xs text-neutral-300">Net à payer</div>
                          <div className="mt-1 text-lg font-semibold text-white">{formatCurrency(totals.net, draft.currency)}</div>
                        </div>
                      </div>
                    </div>
                  </details>

                  {/* ── 7. Paiement ── */}
                  <details className="group lg:col-span-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 select-none">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-neutral-900">Paiement</span>
                        <span className="text-xs text-neutral-500">Méthode, IBAN, BIC, PayPal</span>
                      </div>
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 transition group-open:bg-lime-200">ouvrir</span>
                    </summary>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Field label="Méthode">
                        <select className={selectCls} value={payment.method} onChange={e => updPayment({ method: e.target.value as PaymentMethod })}>
                          <option value="transfer">Virement bancaire</option>
                          <option value="card">Carte bancaire</option>
                          <option value="cash">Espèces</option>
                          <option value="check">Chèque</option>
                          <option value="paypal">PayPal</option>
                          <option value="stripe">Stripe / lien de paiement</option>
                          <option value="revolut">Revolut / lien de paiement</option>
                          <option value="other">Autre</option>
                        </select>
                      </Field>
                      <Field label="Conditions de règlement">
                        <input className={inputCls} value={payment.terms} onChange={e => updPayment({ terms: e.target.value })} placeholder="30 jours, immédiat…" />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field label="Titulaire du compte">
                          <input className={inputCls} value={payment.accountHolder} onChange={e => updPayment({ accountHolder: e.target.value })} placeholder="Jean Dupont" />
                        </Field>
                      </div>
                      <div className="sm:col-span-2">
                        <Field label="IBAN">
                          <input className={inputCls} value={payment.iban} onChange={e => updPayment({ iban: e.target.value })} placeholder="FR76 3000 6000 0112 3456 7890 189" />
                        </Field>
                      </div>
                      <Field label="BIC / SWIFT">
                        <input className={inputCls} value={payment.bic} onChange={e => updPayment({ bic: e.target.value })} placeholder="BNPAFRPP" />
                      </Field>
                      <Field label="Banque">
                        <input className={inputCls} value={payment.bankName} onChange={e => updPayment({ bankName: e.target.value })} placeholder="BNP Paribas" />
                      </Field>
                      {(payment.method === 'paypal') && (
                        <div className="sm:col-span-2">
                          <Field label="Email PayPal">
                            <input className={inputCls} type="email" value={payment.paypalEmail} onChange={e => updPayment({ paypalEmail: e.target.value })} placeholder="paiement@paypal.com" />
                          </Field>
                        </div>
                      )}
                      {(payment.method === 'stripe') && (
                        <div className="sm:col-span-2">
                          <Field label="Lien Stripe Checkout">
                            <div className="flex gap-2">
                              <input className={inputCls} value={payment.stripeLink} onChange={e => updPayment({ stripeLink: e.target.value })} placeholder="https://checkout.stripe.com/..." />
                              <button
                                className="mt-1 shrink-0 rounded-2xl bg-lime-300 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-lime-200 disabled:opacity-50"
                                disabled={sending}
                                onClick={generateStripeLink}
                                type="button"
                              >
                                Générer
                              </button>
                            </div>
                          </Field>
                        </div>
                      )}
                      {(payment.method === 'revolut') && (
                        <div className="sm:col-span-2">
                          <Field label="Lien Revolut Checkout">
                            <div className="flex gap-2">
                              <input className={inputCls} value={payment.revolutLink} onChange={e => updPayment({ revolutLink: e.target.value })} placeholder="https://checkout.revolut.com/..." />
                              <button
                                className="mt-1 shrink-0 rounded-2xl bg-lime-300 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-lime-200 disabled:opacity-50"
                                disabled={sending}
                                onClick={generateRevolutLink}
                                type="button"
                              >
                                Générer
                              </button>
                            </div>
                          </Field>
                        </div>
                      )}
                    </div>
                  </details>

                  {/* ── 8. Envoi & livraison ── */}
                  <details className="group lg:col-span-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 select-none">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-neutral-900">Envoi & livraison</span>
                        <span className="text-xs text-neutral-500">Mode d'envoi, récurrence, CC</span>
                      </div>
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 transition group-open:bg-lime-200">ouvrir</span>
                    </summary>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Field label="Mode de transmission">
                        <select className={selectCls} value={extras.deliveryMode} onChange={e => updExtras({ deliveryMode: e.target.value as DeliveryMode })}>
                          <option value="email">Email</option>
                          <option value="mail">Courrier postal</option>
                          <option value="hand">Remise en main propre</option>
                          <option value="portal">Portail client</option>
                        </select>
                      </Field>
                      <div className="sm:col-span-2">
                        <Field label="CC (copies email)" hint="séparés par virgule">
                          <input className={inputCls} value={extras.ccEmails} onChange={e => updExtras({ ccEmails: e.target.value })} placeholder="direction@acme.fr, legal@acme.fr" />
                        </Field>
                      </div>
                      <div className="sm:col-span-2 flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                        <input
                          id="recurring"
                          type="checkbox"
                          className="h-4 w-4 rounded accent-lime-400"
                          checked={extras.recurring}
                          onChange={e => updExtras({ recurring: e.target.checked })}
                        />
                        <label htmlFor="recurring" className="text-xs text-neutral-700 cursor-pointer">Facture récurrente</label>
                      </div>
                      {extras.recurring && (
                        <Field label="Fréquence">
                          <select className={selectCls} value={extras.recurringFrequency} onChange={e => updExtras({ recurringFrequency: e.target.value as ExtendedExtras['recurringFrequency'] })}>
                            <option value="monthly">Mensuelle</option>
                            <option value="quarterly">Trimestrielle</option>
                            <option value="yearly">Annuelle</option>
                          </select>
                        </Field>
                      )}
                    </div>
                  </details>

                  {/* ── 9. Informations complémentaires ── */}
                  <details className="group lg:col-span-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 select-none">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-neutral-900">Informations complémentaires</span>
                        <span className="text-xs text-neutral-500">Notes, conditions générales, pièce jointe</span>
                      </div>
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 transition group-open:bg-lime-200">ouvrir</span>
                    </summary>
                    <div className="mt-5 grid gap-3">
                      <Field label="Notes visibles sur la facture">
                        <textarea className={inputCls} rows={3} value={extras.notes} onChange={e => updExtras({ notes: e.target.value })} placeholder="Merci pour votre confiance…" />
                      </Field>
                      <Field label="Conditions générales de vente">
                        <textarea className={inputCls} rows={3} value={extras.terms} onChange={e => updExtras({ terms: e.target.value })} placeholder="Toute commande implique l'acceptation…" />
                      </Field>
                      <Field label="Note interne" hint="(non visible sur la facture)">
                        <textarea className={inputCls} rows={2} value={extras.internalComment} onChange={e => updExtras({ internalComment: e.target.value })} placeholder="Client difficile, relancer le 15…" />
                      </Field>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Signature (image)">
                          <input
                            className={inputCls}
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              try {
                                const out = await uploadFiles({ signature: file })
                                const url = out?.signature?.url
                                if (url) updExtras({ signature: url })
                              } catch {
                                setSendMessage('Upload signature impossible.')
                              }
                            }}
                          />
                          <input className={inputCls} value={extras.signature} onChange={e => updExtras({ signature: e.target.value })} placeholder="URL signature" />
                        </Field>
                        <Field label="Tampon / cachet (image)">
                          <input
                            className={inputCls}
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              try {
                                const out = await uploadFiles({ stamp: file })
                                const url = out?.stamp?.url
                                const hash = out?.stamp?.hash
                                updExtras({ stamp: url || extras.stamp, stampHash: hash || extras.stampHash })
                              } catch {
                                setSendMessage('Upload tampon impossible.')
                              }
                            }}
                          />
                          <input className={inputCls} value={extras.stamp} onChange={e => updExtras({ stamp: e.target.value })} placeholder="URL tampon" />
                        </Field>
                      </div>
                      <Field label="Tampon (hash)">
                        <input className={inputCls} readOnly value={extras.stampHash} placeholder="sha256(date|societe|client)" />
                      </Field>
                      <Field label="Pièce jointe (optionnel)">
                        <input
                          className={inputCls}
                          type="file"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            updExtras({ attachmentName: file ? file.name : '', attachmentUrl: '' })
                            if (!file) return
                            try {
                              const out = await uploadFiles({ attachment: file })
                              const url = out?.attachment?.url
                              updExtras({ attachmentUrl: url || '', attachmentName: file.name })
                            } catch {
                              setSendMessage('Upload pièce jointe impossible.')
                            }
                          }}
                        />
                      </Field>
                    </div>
                  </details>

                  {/* ── Footer actions ── */}
                  <div className="lg:col-span-12 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
                    <div className="text-xs text-neutral-600">
                      Client automatique · Visible sur la facture uniquement en brouillon
                    </div>
                    {sendMessage ? <div className="text-xs text-neutral-700">{sendMessage}</div> : null}
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50"
                        to="/invoice"
                      >
                        Voir la facture
                      </Link>
                      <button
                        className="rounded-2xl bg-lime-300 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-lime-200"
                        type="submit"
                      >
                        Ouvrir facture + PDF
                      </button>
                      <button
                        className="rounded-2xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50"
                        disabled={sending}
                        onClick={sendInvoice}
                        type="button"
                      >
                        <Send />
                      </button>
                    </div>
                  </div>

                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

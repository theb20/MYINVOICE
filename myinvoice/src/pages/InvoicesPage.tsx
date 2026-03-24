import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ApiError, apiFetch } from '@/lib/api'
import { defaultDraft, type InvoiceDraft } from '@/lib/invoice'
import { saveDraft } from '@/lib/invoiceStorage'

const TOKEN_KEY = 'myinvoice:adminToken:v1'

type Row = {
  id: string
  invoiceNumber: string
  status: string
  currency: string
  clientName: string | null
  clientEmail: string | null
  updatedAt: string
  createdAt: string
  docType: string | null
}

type DraftRow = {
  id: string
  invoiceNumber: string
  status: string
  currency: string
  clientName: string | null
  clientEmail: string | null
  data: any
  updatedAt: string
  createdAt: string
}

function labelType(type: string | null) {
  if (type === 'quote') return 'Devis'
  if (type === 'credit_note') return 'Avoir'
  if (type === 'deposit') return "Acompte"
  return 'Facture'
}

function statusLabel(status: string) {
  if (status === 'paid') return 'payée'
  if (status === 'pending') return 'en attente'
  return 'brouillon'
}

function statusCls(status: string) {
  if (status === 'paid') return 'bg-emerald-100 text-emerald-900'
  if (status === 'pending') return 'bg-amber-100 text-amber-900'
  return 'bg-neutral-100 text-neutral-700'
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

export function InvoicesPage() {
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
  )
  const navigate = useNavigate()
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(() =>
    token ? null : 'Connecte-toi en admin pour voir les factures.',
  )
  const [info, setInfo] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'pending' | 'paid'>('all')
  const [filterType, setFilterType] = useState<'all' | 'invoice' | 'quote' | 'credit_note' | 'deposit'>('all')

  useEffect(() => {
    if (!token) return
    apiFetch<Row[]>('/invoice-drafts?limit=500', { token })
      .then((r) => setRows(Array.isArray(r) ? r : []))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) setError('Session expirée. Reconnecte-toi.')
        else setError('Impossible de charger les factures.')
      })
  }, [token])

  useEffect(() => {
    const onUpdated = () => setToken(localStorage.getItem(TOKEN_KEY))
    window.addEventListener('myinvoice:authUpdated', onUpdated)
    return () => window.removeEventListener('myinvoice:authUpdated', onUpdated)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false
      if (filterType !== 'all' && (r.docType || 'invoice') !== filterType) return false
      if (!q) return true
      return (
        (r.invoiceNumber || '').toLowerCase().includes(q) ||
        (r.clientName || '').toLowerCase().includes(q) ||
        (r.clientEmail || '').toLowerCase().includes(q)
      )
    })
  }, [filterStatus, filterType, query, rows])

  const refresh = async () => {
    if (!token) return
    const r = await apiFetch<Row[]>('/invoice-drafts?limit=500', { token })
    setRows(Array.isArray(r) ? r : [])
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setInfo('Copié.')
      window.setTimeout(() => setInfo(null), 1500)
    } catch {
      setInfo(text)
    }
  }

  const openInvoice = async (invoiceNumber: string) => {
    if (!token) return
    setInfo(null)
    try {
      const row = await apiFetch<DraftRow>(`/invoice-drafts/${encodeURIComponent(invoiceNumber)}`, { token })
      const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
      const base = defaultDraft()
      const emitter = asRecord(data?.emitter)
      const client = asRecord(data?.client)
      const invoice = asRecord(data?.invoice)
      const payment = asRecord(data?.payment)
      const extras = asRecord(data?.extras)
      const items = Array.isArray(data?.items) ? data.items : []

      const draft: InvoiceDraft = {
        ...base,
        currency: (row.currency as any) ?? base.currency,
        company: {
          ...base.company,
          name: typeof emitter.name === 'string' ? emitter.name : base.company.name,
          address: typeof emitter.address === 'string' ? emitter.address : base.company.address,
          siret: typeof emitter.siret === 'string' ? emitter.siret : base.company.siret,
          vatNumber: typeof emitter.vatNumber === 'string' ? emitter.vatNumber : base.company.vatNumber,
          logoDataUrl: typeof emitter.logo === 'string' ? emitter.logo : base.company.logoDataUrl,
        },
        client: {
          ...base.client,
          name: typeof client.name === 'string' ? client.name : row.clientName || '',
          contactName: typeof client.contactName === 'string' ? client.contactName : '',
          siret: typeof client.siret === 'string' ? client.siret : '',
          email: typeof client.email === 'string' ? client.email : row.clientEmail || '',
          phone: typeof client.phone === 'string' ? client.phone : '',
          address: typeof client.address === 'string' ? client.address : '',
          postalCode: typeof client.postalCode === 'string' ? client.postalCode : '',
          city: typeof client.city === 'string' ? client.city : '',
          country: typeof client.country === 'string' ? client.country : 'France',
          vatNumber: typeof client.vatNumber === 'string' ? client.vatNumber : '',
        },
        invoice: {
          ...base.invoice,
          number: row.invoiceNumber,
          issueDate: typeof invoice.issueDate === 'string' ? invoice.issueDate : base.invoice.issueDate,
          dueDate: typeof invoice.dueDate === 'string' ? invoice.dueDate : base.invoice.dueDate,
          deliveryDate: typeof invoice.deliveryDate === 'string' ? invoice.deliveryDate : base.invoice.deliveryDate,
          status: row.status === 'paid' || row.status === 'pending' || row.status === 'draft' ? (row.status as any) : 'draft',
          type: invoice.type === 'invoice' || invoice.type === 'quote' || invoice.type === 'credit_note' || invoice.type === 'deposit' ? (invoice.type as any) : 'invoice',
          object: typeof invoice.object === 'string' ? invoice.object : '',
          clientOrderRef: typeof invoice.clientOrderRef === 'string' ? invoice.clientOrderRef : '',
          internalProjectRef: typeof invoice.internalProjectRef === 'string' ? invoice.internalProjectRef : '',
        },
        payment: {
          ...base.payment,
          method: payment.method === 'transfer' || payment.method === 'card' || payment.method === 'cash' || payment.method === 'paypal' || payment.method === 'stripe' || payment.method === 'other' ? (payment.method as any) : base.payment.method,
          terms: typeof payment.terms === 'string' ? payment.terms : base.payment.terms,
          iban: typeof payment.iban === 'string' ? payment.iban : '',
          stripeLink: typeof payment.stripeLink === 'string' ? payment.stripeLink : '',
        },
        extras: {
          ...base.extras,
          notes: typeof extras.notes === 'string' ? extras.notes : base.extras.notes,
          terms: typeof extras.terms === 'string' ? extras.terms : base.extras.terms,
          attachmentName: typeof extras.attachmentName === 'string' ? extras.attachmentName : '',
          attachmentUrl: typeof extras.attachmentUrl === 'string' ? extras.attachmentUrl : '',
          signature: typeof extras.signature === 'string' ? extras.signature : '',
          stamp: typeof extras.stamp === 'string' ? extras.stamp : '',
          stampHash: typeof extras.stampHash === 'string' ? extras.stampHash : '',
          depositPercent: Number.isFinite(Number(extras.depositPercent)) ? Number(extras.depositPercent) : 0,
        },
        items: items.length
          ? items.map((it: any) => ({
              description: typeof it?.description === 'string' ? it.description : '',
              quantity: Number.isFinite(Number(it?.quantity)) ? Number(it.quantity) : 1,
              unitPriceHt: Number.isFinite(Number(it?.unitPriceHt)) ? Number(it.unitPriceHt) : 0,
              vatPercent: 0,
            }))
          : base.items,
      }

      saveDraft(draft)
      localStorage.setItem('emitter', JSON.stringify(data?.emitter ?? null))
      localStorage.setItem('currentClient', JSON.stringify(data?.client ?? null))
      localStorage.setItem('extInvoice', JSON.stringify(data?.invoice ?? null))
      localStorage.setItem('extPayment', JSON.stringify(data?.payment ?? null))
      localStorage.setItem('extExtras', JSON.stringify(data?.extras ?? null))
      navigate('/invoice')
    } catch (e) {
      if (e instanceof ApiError && e.body && typeof e.body === 'object' && 'message' in e.body) setError(String((e.body as any).message))
      else setError('Ouverture impossible.')
    }
  }

  const send = async (invoiceNumber: string) => {
    if (!token) return
    setInfo(null)
    try {
      const res = await apiFetch<{ ok: true; shareUrl?: string; paymentUrl?: string | null }>(`/invoices/${encodeURIComponent(invoiceNumber)}/send`, { method: 'POST', token })
      if (res?.shareUrl) await copyToClipboard(res.shareUrl)
      else setInfo('Envoyée.')
    } catch (e) {
      if (e instanceof ApiError && e.body && typeof e.body === 'object' && 'message' in e.body) setError(String((e.body as any).message))
      else setError("Envoi impossible.")
    }
  }

  const copyShareLink = async (invoiceNumber: string) => {
    if (!token) return
    setInfo(null)
    try {
      const res = await apiFetch<{ url: string }>(`/invoice-shares/${encodeURIComponent(invoiceNumber)}`, { method: 'POST', token })
      await copyToClipboard(res.url)
    } catch {
      setError('Impossible de générer le lien.')
    }
  }

  const updateStatus = async (invoiceNumber: string, status: 'draft' | 'pending' | 'paid') => {
    if (!token) return
    try {
      await apiFetch(`/invoice-drafts/${encodeURIComponent(invoiceNumber)}`, { method: 'PATCH', token, body: JSON.stringify({ status }) })
      await refresh()
    } catch {
      setError('Changement de statut impossible.')
    }
  }

  const remove = async (invoiceNumber: string) => {
    if (!token) return
    if (!confirm(`Supprimer ${invoiceNumber} ?`)) return
    try {
      await apiFetch(`/invoice-drafts/${encodeURIComponent(invoiceNumber)}`, { method: 'DELETE', token })
      await refresh()
    } catch {
      setError('Suppression impossible.')
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 px-6 py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Invoices</h1>
          <p className="mt-2 text-neutral-600">Factures, devis, avoirs, statuts, actions rapides.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="w-72 rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm outline-none focus:border-lime-400"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher n°, client, email…"
            value={query}
          />
          <select className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400" onChange={(e) => setFilterType(e.target.value as any)} value={filterType}>
            <option value="all">Tous types</option>
            <option value="invoice">Facture</option>
            <option value="quote">Devis</option>
            <option value="credit_note">Avoir</option>
            <option value="deposit">Acompte</option>
          </select>
          <select className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400" onChange={(e) => setFilterStatus(e.target.value as any)} value={filterStatus}>
            <option value="all">Tous statuts</option>
            <option value="draft">Brouillon</option>
            <option value="pending">En attente</option>
            <option value="paid">Payée</option>
          </select>
          <button className="rounded-2xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800" onClick={() => refresh().catch(() => {})} type="button">
            Rafraîchir
          </button>
        </div>
      </header>
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {info ? <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">{info}</div> : null}
      <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-700">
            <tr>
              <th className="px-5 py-3 font-medium">N°</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Client</th>
              <th className="px-5 py-3 font-medium">Statut</th>
              <th className="px-5 py-3 font-medium">Maj</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {filtered.map((r) => (
              <tr key={r.id} className="text-neutral-900">
                <td className="px-5 py-3 font-medium">{r.invoiceNumber}</td>
                <td className="px-5 py-3">{labelType(r.docType)}</td>
                <td className="px-5 py-3">
                  <div className="text-sm">{r.clientName || '—'}</div>
                  <div className="text-xs text-neutral-500">{r.clientEmail || ''}</div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className={['inline-flex rounded-full px-3 py-1 text-xs font-medium', statusCls(r.status)].join(' ')}>
                      {statusLabel(r.status)}
                    </span>
                    <select
                      className="rounded-xl border border-neutral-200 bg-white px-2 py-1 text-xs outline-none focus:border-lime-400"
                      onChange={(e) => updateStatus(r.invoiceNumber, e.target.value as any)}
                      value={r.status}
                    >
                      <option value="draft">brouillon</option>
                      <option value="pending">en attente</option>
                      <option value="paid">payée</option>
                    </select>
                  </div>
                </td>
                <td className="px-5 py-3 text-xs text-neutral-600">{String(r.updatedAt || '').slice(0, 19).replace('T', ' ')}</td>
                <td className="px-5 py-3 text-right">
                  <button className="rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-100" onClick={() => openInvoice(r.invoiceNumber)} type="button">
                    Ouvrir
                  </button>
                  <button className="rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-100" onClick={() => send(r.invoiceNumber)} type="button">
                    Envoyer
                  </button>
                  <button className="rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-100" onClick={() => copyShareLink(r.invoiceNumber)} type="button">
                    Lien
                  </button>
                  <button className="rounded-xl px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50" onClick={() => remove(r.invoiceNumber)} type="button">
                    Suppr.
                  </button>
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td className="px-5 py-6 text-sm text-neutral-600" colSpan={6}>
                  Aucun résultat.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  )
}

import { useEffect, useMemo, useState } from 'react'

import { ApiError, apiFetch } from '@/lib/api'

const TOKEN_KEY = 'myinvoice:adminToken:v1'

type ServiceItem = {
  id: string
  name: string
  description: string | null
  unit: string
  unitPriceHt: number
  isActive: boolean
  updatedAt: string
}

export function ServicesPage() {
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
  )
  const [rows, setRows] = useState<ServiceItem[]>([])
  const [error, setError] = useState<string | null>(() => (token ? null : 'Connecte-toi en admin pour gérer les services.'))
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<ServiceItem | null>(null)
  const [form, setForm] = useState<{ name: string; description: string; unit: string; unitPriceHt: string; isActive: boolean }>({
    name: '',
    description: '',
    unit: 'unit',
    unitPriceHt: '0',
    isActive: true,
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => (r.name || '').toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q))
  }, [query, rows])

  const load = async () => {
    if (!token) return
    const list = await apiFetch<ServiceItem[]>('/service-items', { token })
    setRows(Array.isArray(list) ? list : [])
  }

  useEffect(() => {
    if (!token) return
    setError(null)
    load().catch(() => setError('Impossible de charger les services.'))
  }, [token])

  useEffect(() => {
    const onUpdated = () => setToken(localStorage.getItem(TOKEN_KEY))
    window.addEventListener('myinvoice:authUpdated', onUpdated)
    return () => window.removeEventListener('myinvoice:authUpdated', onUpdated)
  }, [])

  const startCreate = () => {
    setEditing(null)
    setForm({ name: '', description: '', unit: 'unit', unitPriceHt: '0', isActive: true })
  }

  const startEdit = (row: ServiceItem) => {
    setEditing(row)
    setForm({
      name: row.name,
      description: row.description || '',
      unit: row.unit || 'unit',
      unitPriceHt: String(row.unitPriceHt ?? 0),
      isActive: row.isActive,
    })
  }

  const save = async () => {
    if (!token) return
    const body = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      unit: form.unit.trim() || 'unit',
      unitPriceHt: Number(form.unitPriceHt || 0),
      isActive: form.isActive,
    }
    try {
      if (editing) {
        await apiFetch(`/service-items/${editing.id}`, { method: 'PATCH', token, body: JSON.stringify(body) })
      } else {
        await apiFetch('/service-items', { method: 'POST', token, body: JSON.stringify(body) })
      }
      await load()
      startCreate()
      setError(null)
    } catch (e) {
      if (e instanceof ApiError && e.body && typeof e.body === 'object' && 'message' in e.body) setError(String((e.body as any).message))
      else setError('Enregistrement impossible.')
    }
  }

  const remove = async (row: ServiceItem) => {
    if (!token) return
    if (!confirm(`Supprimer "${row.name}" ?`)) return
    try {
      await apiFetch(`/service-items/${row.id}`, { method: 'DELETE', token })
      await load()
    } catch {
      setError('Suppression impossible.')
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 px-6 py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Services</h1>
          <p className="mt-2 text-neutral-600">Catalogue pour le dropdown Produits / services.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="w-72 rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm outline-none focus:border-lime-400"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher…"
            value={query}
          />
          <button
            className="rounded-2xl bg-lime-300 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-lime-200"
            onClick={startCreate}
            type="button"
          >
            + Nouveau
          </button>
        </div>
      </header>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-700">
              <tr>
                <th className="px-5 py-3 font-medium">Nom</th>
                <th className="px-5 py-3 font-medium">PU HT</th>
                <th className="px-5 py-3 font-medium">Actif</th>
                <th className="px-5 py-3 font-medium w-44 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filtered.map((r) => (
                <tr key={r.id} className="text-neutral-900">
                  <td className="px-5 py-3">
                    <div className="font-medium">{r.name}</div>
                    {r.description ? <div className="mt-1 text-xs text-neutral-500 line-clamp-2">{r.description}</div> : null}
                  </td>
                  <td className="px-5 py-3">{Number(r.unitPriceHt || 0).toFixed(2)} €</td>
                  <td className="px-5 py-3">
                    <span className={['inline-flex rounded-full px-3 py-1 text-xs font-medium', r.isActive ? 'bg-lime-100 text-lime-900' : 'bg-neutral-100 text-neutral-700'].join(' ')}>
                      {r.isActive ? 'Oui' : 'Non'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button className="rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-100" onClick={() => startEdit(r)} type="button">
                      Modifier
                    </button>
                    <button className="rounded-xl px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50" onClick={() => remove(r)} type="button">
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td className="px-5 py-6 text-sm text-neutral-600" colSpan={4}>
                    Aucun service.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-neutral-900">{editing ? 'Modifier un service' : 'Créer un service'}</div>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-xs font-medium text-neutral-700">
              Nom
              <input className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400" onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} value={form.name} />
            </label>
            <label className="grid gap-1 text-xs font-medium text-neutral-700">
              Description
              <textarea className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400" rows={4} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} value={form.description} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-medium text-neutral-700">
                Unité
                <input className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400" onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} value={form.unit} />
              </label>
              <label className="grid gap-1 text-xs font-medium text-neutral-700">
                Prix HT
                <input className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400" inputMode="decimal" onChange={(e) => setForm((p) => ({ ...p, unitPriceHt: e.target.value }))} value={form.unitPriceHt} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} type="checkbox" />
              Actif
            </label>
            <button className="rounded-2xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800" onClick={save} type="button">
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

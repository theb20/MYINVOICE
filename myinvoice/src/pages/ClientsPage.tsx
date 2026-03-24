import { useEffect, useMemo, useState } from 'react'

import { apiFetch, ApiError } from '@/lib/api'

type Client = {
  id: string
  name: string
  contactName: string | null
  siret: string | null
  email: string | null
  phone: string | null
  address: string | null
  postalCode: string | null
  city: string | null
  country: string | null
  vatNumber: string | null
  lastCompletedAt: string | null
  createdAt: string
  updatedAt: string
}

const TOKEN_KEY = 'myinvoice:adminToken:v1'

export function ClientsPage() {
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) ?? '')
  const [authMode, setAuthMode] = useState<'login' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const [resetEmail, setResetEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetDone, setResetDone] = useState(false)

  const [clients, setClients] = useState<Client[]>([])
  const [query, setQuery] = useState('')
  const [filterHasEmail, setFilterHasEmail] = useState<'all' | 'yes' | 'no'>('all')
  const [filterCompleted, setFilterCompleted] = useState<'all' | 'complete' | 'incomplete'>('all')
  const [filterCountry, setFilterCountry] = useState<string>('all')

  const [selectedId, setSelectedId] = useState<string>('')
  const [edit, setEdit] = useState<{
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
  } | null>(null)

  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')

  const [inviteUrlByClientId, setInviteUrlByClientId] = useState<Record<string, string>>({})

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return clients
      .filter((c) => {
        if (filterHasEmail === 'yes' && !c.email) return false
        if (filterHasEmail === 'no' && c.email) return false
        if (filterCompleted === 'complete' && !c.lastCompletedAt) return false
        if (filterCompleted === 'incomplete' && c.lastCompletedAt) return false
        if (filterCountry !== 'all' && (c.country || '—') !== filterCountry) return false
        if (!q) return true
        return (
          c.name.toLowerCase().includes(q) ||
          (c.email ?? '').toLowerCase().includes(q) ||
          (c.city ?? '').toLowerCase().includes(q) ||
          (c.phone ?? '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
  }, [clients, filterCompleted, filterCountry, filterHasEmail, query])

  const countries = useMemo(() => {
    const set = new Set<string>()
    clients.forEach((c) => set.add((c.country || '—').trim() || '—'))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [clients])

  const load = async (t: string) => {
    setLoading(true)
    setError(null)
    try {
      const list = await apiFetch<Client[]>('/clients', { token: t })
      setClients(list)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setError('Session expirée. Reconnecte-toi.')
      else setError('Impossible de charger les clients.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) return
    load(token)
  }, [token])

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      localStorage.setItem(TOKEN_KEY, res.accessToken)
      setToken(res.accessToken)
      setEmail('')
      setPassword('')
    } catch {
      setError('Identifiants invalides.')
    } finally {
      setLoading(false)
    }
  }

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResetDone(false)
    try {
      const res = await apiFetch<{ ok: true; token?: string }>('/auth/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail }),
      })
      if (res.token) setResetToken(res.token)
      else setResetToken('')
      setResetDone(true)
    } catch {
      setError('Impossible de générer un reset.')
    } finally {
      setLoading(false)
    }
  }

  const confirmReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, newPassword: resetNewPassword }),
      })
      setAuthMode('login')
      setEmail(resetEmail)
      setPassword('')
      setResetToken('')
      setResetNewPassword('')
      setResetDone(false)
    } catch (e) {
      if (e instanceof ApiError && (e.status === 400 || e.status === 401)) setError('Token invalide ou expiré.')
      else setError('Impossible de changer le mot de passe.')
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken('')
    setClients([])
    setInviteUrlByClientId({})
  }

  const createClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setLoading(true)
    setError(null)
    setInfo(null)
    try {
      const res = await apiFetch<{ client?: Client; invite?: { url: string }; mail?: { sent: boolean; mode: string } }>(
        '/clients',
        { method: 'POST', token, body: JSON.stringify({ name: newName, email: newEmail || undefined }) },
      )
      setNewName('')
      setNewEmail('')
      const createdClientId = res?.client?.id
      const createdInviteUrl = res?.invite?.url
      if (createdClientId && createdInviteUrl) {
        setInviteUrlByClientId((p) => ({ ...p, [createdClientId]: createdInviteUrl }))
      }
      if (res?.mail?.sent && newEmail) setInfo(`Lien envoyé à ${newEmail}`)
      await load(token)
    } catch {
      setError('Impossible de créer le client.')
    } finally {
      setLoading(false)
    }
  }

  const removeClient = async (id: string) => {
    if (!token) return
    if (!confirm('Supprimer ce client ?')) return
    setLoading(true)
    setError(null)
    try {
      await apiFetch(`/clients/${id}`, { method: 'DELETE', token })
      await load(token)
    } catch {
      setError('Impossible de supprimer le client.')
    } finally {
      setLoading(false)
    }
  }

  const createInvite = async (id: string) => {
    if (!token) return
    setLoading(true)
    setError(null)
    setInfo(null)
    try {
      const res = await apiFetch<{ url: string; expiresAt: string; mail?: { sent: boolean } }>(
        `/clients/${id}/invites?sendEmail=1`,
        { method: 'POST', token },
      )
      setInviteUrlByClientId((p) => ({ ...p, [id]: res.url }))
      await navigator.clipboard.writeText(res.url)
      if (res?.mail?.sent) setInfo('Lien envoyé par email')
    } catch {
      setError('Impossible de générer le lien.')
    } finally {
      setLoading(false)
    }
  }

  const selectClient = (c: Client) => {
    setSelectedId(c.id)
    setEdit({
      name: c.name || '',
      contactName: c.contactName || '',
      siret: c.siret || '',
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || '',
      postalCode: c.postalCode || '',
      city: c.city || '',
      country: c.country || 'France',
      vatNumber: c.vatNumber || '',
    })
  }

  const saveEdit = async () => {
    if (!token || !selectedId || !edit) return
    setLoading(true)
    setError(null)
    setInfo(null)
    try {
      await apiFetch(`/clients/${selectedId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          name: edit.name.trim(),
          contactName: edit.contactName.trim() || undefined,
          siret: edit.siret.trim() || undefined,
          email: edit.email.trim() || undefined,
          phone: edit.phone.trim() || undefined,
          address: edit.address.trim() || undefined,
          postalCode: edit.postalCode.trim() || undefined,
          city: edit.city.trim() || undefined,
          country: edit.country.trim() || undefined,
          vatNumber: edit.vatNumber.trim() || undefined,
        }),
      })
      await load(token)
      setInfo('Client mis à jour.')
    } catch (e) {
      if (e instanceof ApiError && e.body && typeof e.body === 'object' && 'message' in e.body) setError(String((e.body as any).message))
      else setError('Impossible de modifier le client.')
    } finally {
      setLoading(false)
    }
  }

  const copyInvite = async (id: string) => {
    const url = inviteUrlByClientId[id]
    if (!url) return
    setError(null)
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      setError('Impossible de copier le lien.')
    }
  }

  return (
    <div className="min-h-dvh w-full bg-neutral-50">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6">
          <header className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Clients</h1>
                <p className="mt-1 text-sm text-neutral-600">Gestion + lien sécurisé de collecte d’informations</p>
              </div>
              {token ? (
                <button
                  className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50"
                  onClick={logout}
                  type="button"
                >
                  Déconnexion
                </button>
              ) : null}
            </div>
          </header>

          {!token ? (
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              {authMode === 'login' ? (
                <form onSubmit={login}>
                  <div className="text-sm font-semibold text-neutral-900">Connexion admin</div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-neutral-700">Email</label>
                      <input
                        className="mt-1 w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400"
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        value={email}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-neutral-700">Mot de passe</label>
                      <input
                        className="mt-1 w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400"
                        onChange={(e) => setPassword(e.target.value)}
                        type="password"
                        value={password}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <button
                      className="text-xs font-medium text-neutral-600 underline underline-offset-4"
                      onClick={() => {
                        setAuthMode('reset')
                        setError(null)
                        setResetEmail(email)
                      }}
                      type="button"
                    >
                      Mot de passe oublié ?
                    </button>
                    <button
                      className="rounded-2xl bg-lime-300 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-lime-200 disabled:opacity-50"
                      disabled={loading || !email || password.length < 8}
                      type="submit"
                    >
                      Se connecter
                    </button>
                  </div>
                  {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}
                </form>
              ) : (
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-neutral-900">Reset password</div>
                    <button
                      className="text-xs font-medium text-neutral-600 underline underline-offset-4"
                      onClick={() => {
                        setAuthMode('login')
                        setError(null)
                        setResetDone(false)
                      }}
                      type="button"
                    >
                      Retour
                    </button>
                  </div>

                  <form className="mt-4 grid gap-4" onSubmit={requestReset}>
                    <div>
                      <label className="text-xs font-medium text-neutral-700">Email</label>
                      <input
                        className="mt-1 w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400"
                        onChange={(e) => setResetEmail(e.target.value)}
                        type="email"
                        value={resetEmail}
                      />
                    </div>
                    <button
                      className="w-fit rounded-2xl bg-lime-300 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-lime-200 disabled:opacity-50"
                      disabled={loading || !resetEmail}
                      type="submit"
                    >
                      Générer un lien
                    </button>
                  </form>

                  {resetDone ? (
                    <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                      <div className="text-xs text-neutral-700">Token de reset (dev)</div>
                      <input
                        className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-lime-400"
                        onChange={(e) => setResetToken(e.target.value)}
                        value={resetToken}
                      />
                      <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={confirmReset}>
                        <div className="sm:col-span-2">
                          <label className="text-xs font-medium text-neutral-700">Nouveau mot de passe</label>
                          <input
                            className="mt-1 w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400"
                            onChange={(e) => setResetNewPassword(e.target.value)}
                            type="password"
                            value={resetNewPassword}
                          />
                        </div>
                        <button
                          className="w-fit rounded-2xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
                          disabled={loading || resetNewPassword.length < 8 || resetToken.length < 10}
                          type="submit"
                        >
                          Changer le mot de passe
                        </button>
                      </form>
                    </div>
                  ) : null}

                  {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-4 flex flex-col gap-4">
                <form className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm" onSubmit={createClient}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-neutral-900">Créer un client</div>
                    <button
                      className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-900 transition hover:bg-neutral-50"
                      onClick={() => load(token).catch(() => {})}
                      type="button"
                    >
                      Rafraîchir
                    </button>
                  </div>
                  {info ? <div className="mt-2 text-sm text-neutral-700">{info}</div> : null}
                  <div className="mt-4 grid gap-4">
                    <div>
                      <label className="text-xs font-medium text-neutral-700">Société / Nom</label>
                      <input className="mt-1 w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400" onChange={(e) => setNewName(e.target.value)} value={newName} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-neutral-700">Email (optionnel)</label>
                      <input className="mt-1 w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400" onChange={(e) => setNewEmail(e.target.value)} type="email" value={newEmail} />
                    </div>
                    <button className="rounded-2xl bg-lime-300 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-lime-200 disabled:opacity-50" disabled={loading || newName.trim().length < 2} type="submit">
                      Ajouter + envoyer lien
                    </button>
                    <div className="text-xs text-neutral-500">
                      Astuce: un client “complété” a rempli ses infos via le lien sécurisé.
                    </div>
                  </div>
                </form>

                <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <div className="text-sm font-semibold text-neutral-900">Filtres</div>
                  <div className="mt-4 grid gap-3">
                    <input className="w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400" onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher nom, email, ville…" value={query} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <select className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400" onChange={(e) => setFilterHasEmail(e.target.value as any)} value={filterHasEmail}>
                        <option value="all">Email: tous</option>
                        <option value="yes">Email: oui</option>
                        <option value="no">Email: non</option>
                      </select>
                      <select className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400" onChange={(e) => setFilterCompleted(e.target.value as any)} value={filterCompleted}>
                        <option value="all">Statut: tous</option>
                        <option value="complete">Statut: complété</option>
                        <option value="incomplete">Statut: à compléter</option>
                      </select>
                    </div>
                    <select className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400" onChange={(e) => setFilterCountry(e.target.value)} value={filterCountry}>
                      <option value="all">Pays: tous</option>
                      {countries.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                        <div className="text-xs text-neutral-600">Clients</div>
                        <div className="mt-1 text-base font-semibold text-neutral-900">{clients.length}</div>
                      </div>
                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                        <div className="text-xs text-neutral-600">Résultats</div>
                        <div className="mt-1 text-base font-semibold text-neutral-900">{filtered.length}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-neutral-900">Édition</div>
                    {selectedId ? (
                      <button className="text-xs font-medium text-neutral-600 underline underline-offset-4" onClick={() => { setSelectedId(''); setEdit(null) }} type="button">
                        Fermer
                      </button>
                    ) : null}
                  </div>
                  {edit ? (
                    <div className="mt-4 grid gap-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-1 text-xs font-medium text-neutral-700">
                          Société / Nom
                          <input className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400" onChange={(e) => setEdit((p) => (p ? { ...p, name: e.target.value } : p))} value={edit.name} />
                        </label>
                        <label className="grid gap-1 text-xs font-medium text-neutral-700">
                          Contact
                          <input className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400" onChange={(e) => setEdit((p) => (p ? { ...p, contactName: e.target.value } : p))} value={edit.contactName} />
                        </label>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-1 text-xs font-medium text-neutral-700">
                          Email
                          <input className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400" onChange={(e) => setEdit((p) => (p ? { ...p, email: e.target.value } : p))} value={edit.email} />
                        </label>
                        <label className="grid gap-1 text-xs font-medium text-neutral-700">
                          Téléphone
                          <input className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400" onChange={(e) => setEdit((p) => (p ? { ...p, phone: e.target.value } : p))} value={edit.phone} />
                        </label>
                      </div>
                      <label className="grid gap-1 text-xs font-medium text-neutral-700">
                        Adresse
                        <input className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400" onChange={(e) => setEdit((p) => (p ? { ...p, address: e.target.value } : p))} value={edit.address} />
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-1 text-xs font-medium text-neutral-700">
                          Code postal
                          <input className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400" onChange={(e) => setEdit((p) => (p ? { ...p, postalCode: e.target.value } : p))} value={edit.postalCode} />
                        </label>
                        <label className="grid gap-1 text-xs font-medium text-neutral-700">
                          Ville
                          <input className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400" onChange={(e) => setEdit((p) => (p ? { ...p, city: e.target.value } : p))} value={edit.city} />
                        </label>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-1 text-xs font-medium text-neutral-700">
                          Pays
                          <input className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400" onChange={(e) => setEdit((p) => (p ? { ...p, country: e.target.value } : p))} value={edit.country} />
                        </label>
                        <label className="grid gap-1 text-xs font-medium text-neutral-700">
                          TVA
                          <input className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400" onChange={(e) => setEdit((p) => (p ? { ...p, vatNumber: e.target.value } : p))} value={edit.vatNumber} />
                        </label>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-1 text-xs font-medium text-neutral-700">
                          SIRET
                          <input className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400" onChange={(e) => setEdit((p) => (p ? { ...p, siret: e.target.value } : p))} value={edit.siret} />
                        </label>
                      </div>
                      <button className="rounded-2xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50" disabled={loading || edit.name.trim().length < 2} onClick={saveEdit} type="button">
                        Enregistrer
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 text-sm text-neutral-600">Sélectionne un client dans la liste.</div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-neutral-900">Liste clients</div>
                  <div className="text-xs text-neutral-600">Tri: derniers modifiés</div>
                </div>

                {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}
                {loading ? <div className="mt-4 text-sm text-neutral-600">Chargement…</div> : null}

                <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-50 text-neutral-700">
                      <tr>
                        <th className="px-4 py-3 font-medium">Client</th>
                        <th className="px-4 py-3 font-medium">Contact</th>
                        <th className="px-4 py-3 font-medium">Statut</th>
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {filtered.map((c) => (
                        <tr key={c.id} className={['text-neutral-900', selectedId === c.id ? 'bg-lime-50' : ''].join(' ')}>
                          <td className="px-4 py-3">
                            <div className="font-semibold">{c.name}</div>
                            <div className="mt-1 text-xs text-neutral-500">{c.email || '—'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm">{c.contactName || '—'}</div>
                            <div className="mt-1 text-xs text-neutral-500">{c.phone || ''}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={[
                                'inline-flex rounded-full px-3 py-1 text-xs font-medium',
                                c.lastCompletedAt ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900',
                              ].join(' ')}
                            >
                              {c.lastCompletedAt ? 'complété' : 'à compléter'}
                            </span>
                            {c.lastCompletedAt ? (
                              <div className="mt-1 text-xs text-neutral-500">
                                {new Date(c.lastCompletedAt).toLocaleDateString('fr-FR')}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button className="rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-100" onClick={() => selectClient(c)} type="button">
                              Modifier
                            </button>
                            <button className="rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-100 disabled:opacity-50" disabled={loading} onClick={() => createInvite(c.id)} type="button">
                              Lien
                            </button>
                            <button className="rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-100 disabled:opacity-50" disabled={loading || !inviteUrlByClientId[c.id]} onClick={() => copyInvite(c.id)} type="button">
                              Copier
                            </button>
                            <button className="rounded-xl px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50" disabled={loading} onClick={() => removeClient(c.id)} type="button">
                              Suppr.
                            </button>
                            {inviteUrlByClientId[c.id] ? (
                              <div className="mt-2 max-w-xs truncate text-right text-xs text-neutral-500">
                                <span className="font-mono">{inviteUrlByClientId[c.id]}</span>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                      {!filtered.length && !loading ? (
                        <tr>
                          <td className="px-4 py-8 text-sm text-neutral-600" colSpan={5}>
                            Aucun client.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

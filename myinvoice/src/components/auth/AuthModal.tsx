import { useEffect, useState } from 'react'

import { ApiError, apiFetch } from '@/lib/api'

const TOKEN_KEY = 'myinvoice:adminToken:v1'

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setPassword('')
    setError(null)
  }, [open])

  if (!open) return null

  const login = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      localStorage.setItem(TOKEN_KEY, res.accessToken)
      window.dispatchEvent(new CustomEvent('myinvoice:authUpdated'))
      onClose()
      window.location.reload()
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setError('Identifiants invalides.')
      else setError('Connexion impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold tracking-tight text-neutral-900">Connexion requise</div>
            <div className="mt-1 text-sm text-neutral-600">Ta session a expiré. Reconnecte-toi pour continuer.</div>
          </div>
          <button
            className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-900 transition hover:bg-neutral-50"
            onClick={onClose}
            type="button"
          >
            Fermer
          </button>
        </div>

        <div className="mt-5 grid gap-4">
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

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <button
            className="rounded-2xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
            disabled={loading || !email || password.length < 8}
            onClick={login}
            type="button"
          >
            Se connecter
          </button>
        </div>
      </div>
    </div>
  )
}


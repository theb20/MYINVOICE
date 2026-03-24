import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import { apiFetch, ApiError } from '@/lib/api'

type InviteInfo = { clientId: string; clientName: string; expiresAt: string }
type ClientInfo = {
  name: string; contactName: string; siret: string; email: string
  phone: string; address: string; postalCode: string; city: string
  country: string; vatNumber: string
}

function Field({
  label, optional, children,
}: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-neutral-700">
        {label}
        {optional && <span className="ml-1.5 font-normal text-neutral-400">facultatif</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-300 outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-200'

export function ClientInvitePage() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const [form, setForm] = useState<ClientInfo>({
    name: '', contactName: '', siret: '', email: '',
    phone: '', address: '', postalCode: '', city: '',
    country: 'France', vatNumber: '',
  })

  useEffect(() => {
    if (!token) return
    apiFetch<InviteInfo>(`/invites/${token}`)
      .then((data) => {
        setInvite(data)
        setForm((p) => ({ ...p, name: data.clientName || p.name }))
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) setError('Lien invalide ou expiré.')
        else setError('Impossible de charger le formulaire.')
      })
      .finally(() => setLoading(false))
  }, [token])

  const canSubmit = useMemo(() => form.name.trim().length >= 2, [form.name])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setError(null)
    try {
      await apiFetch(`/invites/${token}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          contactName: form.contactName || undefined,
          siret: form.siret || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          address: form.address || undefined,
          postalCode: form.postalCode || undefined,
          city: form.city || undefined,
          country: form.country || undefined,
          vatNumber: form.vatNumber || undefined,
        }),
      })
      setSubmitted(true)
    } catch {
      setError("Erreur lors de l'envoi. Vérifiez vos informations et réessayez.")
    }
  }

  const set = (k: keyof ClientInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }))

  return (
    <div className="min-h-dvh w-full bg-neutral-50">

      {/* ── Top nav bar ── */}
      <header className="flex h-14 items-center border-b border-neutral-200 bg-white px-6">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Logo" className="h-7 w-auto" />
        </div>
      </header>

      {/* ── Page body ── */}
      <main className="mx-auto w-full max-w-xl px-4 py-10">

        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Informations client
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Complétez vos coordonnées pour finaliser le dossier. Les prix ne sont pas modifiables ici.
          </p>
        </div>

        {/* ── Card ── */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">

          {/* Card top accent bar */}
          <div className="h-1 w-full bg-lime-300" />

          {/* Card header */}
          <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-6 py-4">
            <div className="flex items-center gap-2">
              {/* document icon */}
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-100">
                <svg className="h-4 w-4 text-lime-700" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V6L9 1z"/>
                  <path d="M9 1v5h5M5 9h6M5 11h4"/>
                </svg>
              </div>
              <span className="text-sm font-semibold text-neutral-800">
                {invite?.clientName ? `Dossier — ${invite.clientName}` : 'Formulaire de renseignements'}
              </span>
            </div>
            {invite && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-lime-300 bg-lime-50 px-2.5 py-1 text-xs font-semibold text-lime-800">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-500" />
                Expire le {new Date(invite.expiresAt).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center gap-2.5 py-12 text-sm text-neutral-400">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity=".2"/>
                <path d="M14 8a6 6 0 00-6-6" stroke="#a3e635" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Chargement…
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mx-6 mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="8" r="7"/><path d="M8 5v3.5M8 11h.01"/>
              </svg>
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          )}

          {/* Success */}
          {submitted && (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-lime-100">
                <svg className="h-7 w-7 text-lime-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12l6 6L20 6"/>
                </svg>
              </div>
              <p className="text-base font-bold text-neutral-900">Informations envoyées !</p>
              <p className="mt-1.5 text-sm text-neutral-500">
                Vos coordonnées ont été transmises avec succès.<br/>Vous pouvez fermer cette page.
              </p>
            </div>
          )}

          {/* ── Form ── */}
          {!submitted && invite && (
            <form onSubmit={submit}>
              <div className="space-y-6 px-6 py-6">

                {/* Section — Identité */}
                <div>
                  <p className="mb-4 text-xs font-bold uppercase tracking-widest text-neutral-400">
                    Identité
                  </p>
                  <div className="space-y-4">
                    <Field label="Société ou nom *">
                      <input className={inputCls} value={form.name} onChange={set('name')} placeholder="Acme SAS" />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Contact" optional>
                        <input className={inputCls} value={form.contactName} onChange={set('contactName')} placeholder="Prénom Nom" />
                      </Field>
                      <Field label="SIRET" optional>
                        <input className={inputCls} value={form.siret} onChange={set('siret')} placeholder="000 000 000 00000" />
                      </Field>
                    </div>
                    <Field label="N° TVA intracommunautaire" optional>
                      <input className={inputCls} value={form.vatNumber} onChange={set('vatNumber')} placeholder="FR00000000000" />
                    </Field>
                  </div>
                </div>

                <hr className="border-neutral-100" />

                {/* Section — Contact */}
                <div>
                  <p className="mb-4 text-xs font-bold uppercase tracking-widest text-neutral-400">
                    Contact
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Email de facturation">
                      <input className={inputCls} type="email" value={form.email} onChange={set('email')} placeholder="contact@acme.fr" />
                    </Field>
                    <Field label="Téléphone">
                      <input className={inputCls} value={form.phone} onChange={set('phone')} placeholder="+33 6 00 00 00 00" />
                    </Field>
                  </div>
                </div>

                <hr className="border-neutral-100" />

                {/* Section — Adresse */}
                <div>
                  <p className="mb-4 text-xs font-bold uppercase tracking-widest text-neutral-400">
                    Adresse
                  </p>
                  <div className="space-y-4">
                    <Field label="Adresse">
                      <input className={inputCls} value={form.address} onChange={set('address')} placeholder="12 rue de la Paix" />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Code postal">
                        <input className={inputCls} value={form.postalCode} onChange={set('postalCode')} placeholder="75001" />
                      </Field>
                      <Field label="Ville">
                        <input className={inputCls} value={form.city} onChange={set('city')} placeholder="Paris" />
                      </Field>
                    </div>
                    <Field label="Pays">
                      <input className={inputCls} value={form.country} onChange={set('country')} placeholder="France" />
                    </Field>
                  </div>
                </div>

              </div>

              {/* Card footer */}
              <div className="flex items-center justify-between gap-3 border-t border-neutral-100 bg-neutral-50 px-6 py-4">
                <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 1L2 4v3c0 3 2.5 5.5 6 6 3.5-.5 6-3 6-6V4L8 1z"/>
                  </svg>
                  Envoi sécurisé via lien unique
                </div>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex items-center gap-2 rounded-xl bg-lime-300 px-5 py-2.5 text-sm font-bold text-neutral-900 transition hover:bg-lime-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Envoyer
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8h10M9 4l4 4-4 4"/>
                  </svg>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Bottom note */}
        <p className="mt-5 text-center text-xs text-neutral-400">
          Ce lien est à usage unique et strictement personnel.
        </p>

      </main>
    </div>
  )
}
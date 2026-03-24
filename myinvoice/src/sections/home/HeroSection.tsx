import { Link } from 'react-router-dom'

export function HeroSection() {
  return (
    <header className="animate-fade-in-up">
      <p className="text-sm font-medium text-neutral-900">MYINVOICE</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-neutral-900">
        App scalable (Vite + React Router + Tailwind)
      </h1>
      <p className="mt-4 max-w-2xl text-neutral-600">
        Structure recommandée: pages pour les routes, components pour UI réutilisable, sections
        pour les blocs de page.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          className="rounded-xl bg-lime-300 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-lime-200"
          to="/invoices"
        >
          Aller à Invoices
        </Link>
        <Link
          className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50"
          to="/clients"
        >
          Aller à Clients
        </Link>
      </div>
    </header>
  )
}

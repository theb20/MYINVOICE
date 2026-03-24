import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-6 px-6 py-14">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">404</h1>
        <p className="mt-2 text-neutral-600">Page introuvable.</p>
      </header>
      <Link className="w-fit rounded-xl bg-lime-300 px-4 py-2 text-sm font-semibold text-neutral-900" to="/">
        Retour Home
      </Link>
    </main>
  )
}

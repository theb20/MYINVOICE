import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { AuthModal } from '@/components/auth/AuthModal'

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      className={({ isActive }) =>
        [
          'rounded-xl px-3 py-2 text-sm font-medium transition',
          isActive ? 'bg-lime-300 text-neutral-900' : 'text-neutral-700 hover:bg-neutral-100',
        ].join(' ')
      }
      to={to}
    >
      {label}
    </NavLink>
  )
}

export function AppLayout() {
  const location = useLocation()
  const [authOpen, setAuthOpen] = useState(false)
  const hideHeader = useMemo(() => location.pathname === '/invoice', [location.pathname])

  useEffect(() => {
    const onExpired = () => {
      localStorage.removeItem('myinvoice:adminToken:v1')
      setAuthOpen(true)
    }
    window.addEventListener('myinvoice:authExpired', onExpired)
    return () => window.removeEventListener('myinvoice:authExpired', onExpired)
  }, [])

  return (
    <div className="min-h-dvh bg-neutral-50 text-neutral-900">
      {!hideHeader ? (
        <div className="app-header border-b border-neutral-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex w-full items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-lime-200 p-1 object-contain">
                <img alt="Logo" src="/logo.png" />
              </div>
              <span className="text-sm font-semibold tracking-tight">STACK</span>
            </div>
            <nav className="flex items-center gap-2">
              <NavItem label="Home" to="/" />
              <NavItem label="Facture" to="/invoice" />
              <NavItem label="Invoices" to="/invoices" />
              <NavItem label="Services" to="/services" />
              <NavItem label="Clients" to="/clients" />
            </nav>
          </div>
        </div>
      ) : null}

      <Outlet />
      <AuthModal onClose={() => setAuthOpen(false)} open={authOpen} />
    </div>
  )
}

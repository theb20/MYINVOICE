import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { FileText, Home, Package, PlusCircle, Users } from 'lucide-react'

import { AuthModal } from '@/components/auth/AuthModal'

const NAV: { to: string; label: string; icon: React.ElementType; exact?: boolean }[] = [
  { to: '/', label: 'Accueil', icon: Home, exact: true },
  { to: '/invoice', label: 'Nouvelle facture', icon: PlusCircle },
  { to: '/invoices', label: 'Factures', icon: FileText },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/services', label: 'Services', icon: Package },
]

export function AppLayout() {
  const location = useLocation()
  const [authOpen, setAuthOpen] = useState(false)
  const isInvoicePage = location.pathname === '/invoice'

  useEffect(() => {
    const onExpired = () => {
      localStorage.removeItem('myinvoice:adminToken:v1')
      setAuthOpen(true)
    }
    window.addEventListener('myinvoice:authExpired', onExpired)
    return () => window.removeEventListener('myinvoice:authExpired', onExpired)
  }, [])

  return (
    <div className="flex min-h-dvh bg-slate-50">
      {/* Sidebar */}
      <aside className="app-header fixed inset-y-0 left-0 z-30 flex w-56 flex-col bg-slate-900">
        {/* Logo */}
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-slate-800 px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 p-1">
            <img alt="Logo" className="h-full w-full object-contain" src="/logo.png" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">STACK</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {NAV.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              end={exact}
              className={({ isActive }) =>
                [
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                ].join(' ')
              }
              to={to}
            >
              <Icon size={15} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-800 px-4 py-3">
          <span className="text-xs text-slate-500">myinvoice · v1.0</span>
        </div>
      </aside>

      {/* Content */}
      <div className={['flex-1 transition-all', isInvoicePage ? 'ml-0' : 'ml-56'].join(' ')}>
        {isInvoicePage ? (
          /* Top mini-bar on invoice page only */
          <div className="app-header sticky top-0 z-20 flex h-11 items-center gap-3 border-b border-slate-200 bg-white px-4">
            <NavLink
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
              to="/invoices"
            >
              ← Retour aux factures
            </NavLink>
          </div>
        ) : null}
        <Outlet />
      </div>

      <AuthModal onClose={() => setAuthOpen(false)} open={authOpen} />
    </div>
  )
}

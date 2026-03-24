import { Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/components/layout/AppLayout'
import { ClientInvitePage } from '@/pages/ClientInvitePage'
import { ClientsPage } from '@/pages/ClientsPage'
import { HomePage } from '@/pages/HomePage'
import { InvoicePage } from '@/pages/InvoicePage'
import { InvoicesPage } from '@/pages/InvoicesPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PublicInvoicePage } from '@/pages/PublicInvoicePage'
import { ServicesPage } from '@/pages/ServicesPage'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<ClientInvitePage />} path="/client/:token" />
      <Route element={<PublicInvoicePage />} path="/public/invoice/:token" />
      <Route element={<AppLayout />} path="/">
        <Route element={<HomePage />} index />
        <Route element={<InvoicePage />} path="invoice" />
        <Route element={<InvoicesPage />} path="invoices" />
        <Route element={<ServicesPage />} path="services" />
        <Route element={<ClientsPage />} path="clients" />
        <Route element={<Navigate replace to="/" />} path="home" />
        <Route element={<NotFoundPage />} path="*" />
      </Route>
    </Routes>
  )
}

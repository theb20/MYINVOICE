import { authRouter } from './auth.routes.js'
import { clientsRouter } from './clients.routes.js'
import { invoiceDraftsRouter } from './invoiceDrafts.routes.js'
import { invoiceSharesRouter, publicInvoiceRouter } from './invoiceShares.routes.js'
import { invitesRouter } from './invites.routes.js'
import { invoicesRouter } from './invoices.routes.js'
import { ownerProfileRouter } from './ownerProfile.routes.js'
import { paymentsRouter } from './payments.routes.js'
import { serviceItemsRouter } from './serviceItems.routes.js'
import { uploadsRouter } from './uploads.routes.js'

export function registerRoutes(app, { env }) {
  app.use('/auth', authRouter())
  app.use('/clients', clientsRouter(env))
  app.use('/invoice-drafts', invoiceDraftsRouter(env))
  app.use('/invoice-shares', invoiceSharesRouter(env))
  app.use('/public', publicInvoiceRouter())
  app.use('/invites', invitesRouter())
  app.use('/invoices', invoicesRouter(env))
  app.use('/owner-profile', ownerProfileRouter(env))
  app.use('/payments', paymentsRouter(env))
  app.use('/service-items', serviceItemsRouter(env))
  app.use('/uploads', uploadsRouter(env))
}

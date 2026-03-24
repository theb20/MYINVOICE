export async function createInvoiceShare(db, { id, invoiceDraftId, tokenHash, expiresAt }) {
  await db.query(
    'INSERT INTO invoice_shares (id, invoiceDraftId, tokenHash, expiresAt) VALUES (?, ?, ?, ?)',
    [id, invoiceDraftId, tokenHash, expiresAt],
  )
}

export async function findInvoiceShareByTokenHash(db, tokenHash) {
  const [rows] = await db.query(
    `SELECT s.id, s.invoiceDraftId, s.expiresAt, d.invoiceNumber, d.status, d.currency, d.clientName, d.clientEmail, d.data
     FROM invoice_shares s
     JOIN invoice_drafts d ON d.id = s.invoiceDraftId
     WHERE s.tokenHash = ?
     LIMIT 1`,
    [tokenHash],
  )
  return rows[0] ?? null
}


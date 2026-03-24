export async function findInvoiceDraftByNumber(db, invoiceNumber) {
  const [rows] = await db.query('SELECT * FROM invoice_drafts WHERE invoiceNumber = ? LIMIT 1', [
    invoiceNumber,
  ])
  return rows[0] ?? null
}

export async function insertInvoiceDraft(db, draft) {
  await db.query(
    `INSERT INTO invoice_drafts
      (id, invoiceNumber, status, currency, clientName, clientEmail, data)
     VALUES
      (?, ?, ?, ?, ?, ?, CAST(? AS JSON))`,
    [
      draft.id,
      draft.invoiceNumber,
      draft.status,
      draft.currency,
      draft.clientName ?? null,
      draft.clientEmail ?? null,
      JSON.stringify(draft.data),
    ],
  )
}

export async function updateInvoiceDraftByNumber(db, invoiceNumber, patch) {
  await db.query(
    `UPDATE invoice_drafts
      SET status = ?, currency = ?, clientName = ?, clientEmail = ?, data = CAST(? AS JSON)
     WHERE invoiceNumber = ?`,
    [
      patch.status,
      patch.currency,
      patch.clientName ?? null,
      patch.clientEmail ?? null,
      JSON.stringify(patch.data),
      invoiceNumber,
    ],
  )
}

export async function listInvoiceDrafts(db, { limit = 100 } = {}) {
  const [rows] = await db.query(
    "SELECT id, invoiceNumber, status, currency, clientName, clientEmail, updatedAt, createdAt, JSON_UNQUOTE(JSON_EXTRACT(data, '$.invoice.type')) AS docType FROM invoice_drafts ORDER BY updatedAt DESC LIMIT ?",
    [Number(limit)],
  )
  return rows
}

export async function deleteInvoiceDraftByNumber(db, invoiceNumber) {
  await db.query('DELETE FROM invoice_drafts WHERE invoiceNumber = ?', [invoiceNumber])
}

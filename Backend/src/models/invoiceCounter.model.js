export async function nextInvoiceSequence(db, { counterDate, docType }) {
  const [result] = await db.query(
    `INSERT INTO invoice_counters (counterDate, docType, seq)
     VALUES (?, ?, LAST_INSERT_ID(1))
     ON DUPLICATE KEY UPDATE seq = LAST_INSERT_ID(seq + 1)`,
    [counterDate, docType],
  )
  const seq = Number(result?.insertId || 0)
  return seq
}

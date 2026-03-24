export async function createInvite(db, { id, tokenHash, clientId, expiresAt }) {
  await db.query(
    'INSERT INTO client_invites (id, tokenHash, clientId, expiresAt, usedAt) VALUES (?, ?, ?, ?, NULL)',
    [id, tokenHash, clientId, expiresAt],
  )
}

export async function findInviteByTokenHash(db, tokenHash) {
  const [rows] = await db.query(
    `SELECT i.id, i.clientId, i.expiresAt, i.usedAt, c.name AS clientName
     FROM client_invites i
     JOIN clients c ON c.id = i.clientId
     WHERE i.tokenHash = ?
     LIMIT 1`,
    [tokenHash],
  )
  return rows[0] ?? null
}

export async function markInviteUsed(db, id) {
  await db.query('UPDATE client_invites SET usedAt = CURRENT_TIMESTAMP WHERE id = ?', [id])
}


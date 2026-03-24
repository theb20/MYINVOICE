export async function createPasswordReset(db, { id, userId, tokenHash, expiresAt }) {
  await db.query(
    'INSERT INTO password_resets (id, userId, tokenHash, expiresAt, usedAt) VALUES (?, ?, ?, ?, NULL)',
    [id, userId, tokenHash, expiresAt],
  )
}

export async function findPasswordResetByTokenHash(db, tokenHash) {
  const [rows] = await db.query(
    'SELECT id, userId, expiresAt, usedAt FROM password_resets WHERE tokenHash = ? LIMIT 1',
    [tokenHash],
  )
  return rows[0] ?? null
}

export async function markPasswordResetUsed(db, id) {
  await db.query('UPDATE password_resets SET usedAt = CURRENT_TIMESTAMP WHERE id = ?', [id])
}


export async function findUserByEmail(db, email) {
  const [rows] = await db.query(
    'SELECT id, email, passwordHash, isActive FROM users WHERE email = ? LIMIT 1',
    [email.toLowerCase()],
  )
  return rows[0] ?? null
}

export async function createUser(db, { id, email, passwordHash }) {
  await db.query('INSERT INTO users (id, email, passwordHash, isActive) VALUES (?, ?, ?, TRUE)', [
    id,
    email.toLowerCase(),
    passwordHash,
  ])
}

export async function updateUserPassword(db, userId, passwordHash) {
  await db.query('UPDATE users SET passwordHash = ? WHERE id = ?', [passwordHash, userId])
}

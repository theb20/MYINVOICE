export async function listClients(db) {
  const [rows] = await db.query('SELECT * FROM clients ORDER BY updatedAt DESC')
  return rows
}

export async function findClientById(db, id) {
  const [rows] = await db.query('SELECT * FROM clients WHERE id = ? LIMIT 1', [id])
  return rows[0] ?? null
}

export async function createClient(db, { id, name, email }) {
  await db.query('INSERT INTO clients (id, name, email) VALUES (?, ?, ?)', [id, name, email])
  return findClientById(db, id)
}

export async function updateClient(db, id, patch) {
  const fields = []
  const values = []
  for (const key of Object.keys(patch)) {
    fields.push(`${key} = ?`)
    values.push(patch[key])
  }
  if (!fields.length) return findClientById(db, id)
  values.push(id)
  await db.query(`UPDATE clients SET ${fields.join(', ')} WHERE id = ?`, values)
  return findClientById(db, id)
}

export async function deleteClient(db, id) {
  await db.query('DELETE FROM clients WHERE id = ?', [id])
}


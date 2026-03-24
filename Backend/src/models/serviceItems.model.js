export async function listServiceItems(db, { activeOnly = false } = {}) {
  const sql = activeOnly
    ? 'SELECT * FROM service_items WHERE isActive = TRUE ORDER BY updatedAt DESC'
    : 'SELECT * FROM service_items ORDER BY updatedAt DESC'
  const [rows] = await db.query(sql)
  return rows
}

export async function getServiceItem(db, id) {
  const [rows] = await db.query('SELECT * FROM service_items WHERE id = ? LIMIT 1', [id])
  return rows[0] ?? null
}

export async function createServiceItem(db, item) {
  await db.query(
    `INSERT INTO service_items (id, name, description, unit, unitPriceCents, isActive)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.name,
      item.description ?? null,
      item.unit,
      item.unitPriceCents,
      item.isActive ? 1 : 0,
    ],
  )
}

export async function updateServiceItem(db, id, patch) {
  const fields = []
  const values = []

  if (patch.name !== undefined) {
    fields.push('name = ?')
    values.push(patch.name)
  }
  if (patch.description !== undefined) {
    fields.push('description = ?')
    values.push(patch.description ?? null)
  }
  if (patch.unit !== undefined) {
    fields.push('unit = ?')
    values.push(patch.unit)
  }
  if (patch.unitPriceCents !== undefined) {
    fields.push('unitPriceCents = ?')
    values.push(patch.unitPriceCents)
  }
  if (patch.isActive !== undefined) {
    fields.push('isActive = ?')
    values.push(patch.isActive ? 1 : 0)
  }

  if (!fields.length) return
  values.push(id)
  await db.query(`UPDATE service_items SET ${fields.join(', ')} WHERE id = ?`, values)
}

export async function deleteServiceItem(db, id) {
  await db.query('DELETE FROM service_items WHERE id = ?', [id])
}


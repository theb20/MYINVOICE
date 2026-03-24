import { v4 as uuidv4 } from 'uuid'

import { ApiError } from '../errors.js'
import {
  createServiceItem,
  deleteServiceItem,
  getServiceItem,
  listServiceItems,
  updateServiceItem,
} from '../models/serviceItems.model.js'

function toCents(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

export async function list(ctx, { activeOnly } = {}) {
  const rows = await listServiceItems(ctx.db, { activeOnly })
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    unit: r.unit,
    unitPriceHt: Number(r.unitPriceCents) / 100,
    isActive: !!r.isActive,
    updatedAt: r.updatedAt,
  }))
}

export async function create(ctx, payload) {
  const name = String(payload.name || '').trim()
  if (!name) throw new ApiError(400, 'Invalid name')
  const unit = String(payload.unit || 'unit').trim() || 'unit'
  const description = payload.description ? String(payload.description).trim() : null
  const unitPriceCents = toCents(payload.unitPriceHt)
  const isActive = payload.isActive === undefined ? true : !!payload.isActive

  const id = uuidv4()
  await createServiceItem(ctx.db, { id, name, description, unit, unitPriceCents, isActive })
  return { id }
}

export async function update(ctx, idRaw, payload) {
  const id = String(idRaw || '').trim()
  if (!id) throw new ApiError(400, 'Invalid id')

  const existing = await getServiceItem(ctx.db, id)
  if (!existing) throw new ApiError(404, 'Not found')

  const patch = {}
  if (payload.name !== undefined) patch.name = String(payload.name || '').trim()
  if (payload.description !== undefined) patch.description = payload.description ? String(payload.description).trim() : null
  if (payload.unit !== undefined) patch.unit = String(payload.unit || 'unit').trim() || 'unit'
  if (payload.unitPriceHt !== undefined) patch.unitPriceCents = toCents(payload.unitPriceHt)
  if (payload.isActive !== undefined) patch.isActive = !!payload.isActive

  await updateServiceItem(ctx.db, id, patch)
  return { ok: true }
}

export async function remove(ctx, idRaw) {
  const id = String(idRaw || '').trim()
  if (!id) throw new ApiError(400, 'Invalid id')
  await deleteServiceItem(ctx.db, id)
  return { ok: true }
}


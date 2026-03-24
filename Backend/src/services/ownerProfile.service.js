import { ApiError } from '../errors.js'
import { getOwnerProfile, upsertOwnerProfile } from '../models/ownerProfile.model.js'

export async function get(ctx) {
  const row = await getOwnerProfile(ctx.db)
  if (!row) {
    return {
      name: '',
      legalForm: '',
      siret: '',
      vatNumber: '',
      address: '',
      postalCode: '',
      city: '',
      country: '',
      email: '',
      phone: '',
      website: '',
      legalMention: '',
      logo: '',
    }
  }
  return {
    name: row.name || '',
    legalForm: row.legalForm || '',
    siret: row.siret || '',
    vatNumber: row.vatNumber || '',
    address: row.address || '',
    postalCode: row.postalCode || '',
    city: row.city || '',
    country: row.country || '',
    email: row.email || '',
    phone: row.phone || '',
    website: row.website || '',
    legalMention: row.legalMention || '',
    logo: row.logo || '',
  }
}

export async function update(ctx, payload) {
  const name = String(payload.name || '').trim()
  if (!name) throw new ApiError(400, 'Invalid name')
  const profile = {
    name,
    legalForm: payload.legalForm ? String(payload.legalForm).trim() : null,
    siret: payload.siret ? String(payload.siret).trim() : null,
    vatNumber: payload.vatNumber ? String(payload.vatNumber).trim() : null,
    address: payload.address ? String(payload.address).trim() : null,
    postalCode: payload.postalCode ? String(payload.postalCode).trim() : null,
    city: payload.city ? String(payload.city).trim() : null,
    country: payload.country ? String(payload.country).trim() : null,
    email: payload.email ? String(payload.email).trim() : null,
    phone: payload.phone ? String(payload.phone).trim() : null,
    website: payload.website ? String(payload.website).trim() : null,
    legalMention: payload.legalMention ? String(payload.legalMention).trim() : null,
    logo: payload.logo ? String(payload.logo).trim() : null,
  }
  await upsertOwnerProfile(ctx.db, profile)
  return { ok: true }
}


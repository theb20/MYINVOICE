import { ApiError } from '../errors.js'
import { createClient, deleteClient, findClientById, listClients, updateClient } from '../models/client.model.js'

export async function list({ db }) {
  return listClients(db)
}

export async function create({ db }, { id, name, email }) {
  return createClient(db, { id, name: name.trim(), email: email?.trim() ?? null })
}

export async function update({ db }, id, patch) {
  const existing = await findClientById(db, id)
  if (!existing) throw new ApiError(404, 'Not found')
  return updateClient(db, id, patch)
}

export async function remove({ db }, id) {
  await deleteClient(db, id)
  return { ok: true }
}


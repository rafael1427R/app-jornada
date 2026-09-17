import { collectionConfig } from './collections'
import { supabase } from './supabaseClient'

async function run(promise) {
  const { data, error } = await promise
  if (error) throw new Error(error.message)
  return data
}

/**
 * O front-end usa string vazia para "sem data"; no Postgres essas colunas
 * são `date`/`timestamptz` e exigem NULL.
 */
function normalize(name, record) {
  const { dateFields = [] } = collectionConfig(name)
  const clean = { ...record }
  dateFields.forEach((field) => {
    if (clean[field] === '' || clean[field] === undefined) clean[field] = null
  })
  return clean
}

/** Converte NULL de volta para string vazia, como o front-end espera. */
function denormalize(name, row) {
  const { dateFields = [] } = collectionConfig(name)
  const clean = { ...row }
  dateFields.forEach((field) => {
    if (clean[field] == null) clean[field] = ''
  })
  return clean
}

export const supabaseAdapter = {
  async list(name) {
    const { table, seed } = collectionConfig(name)
    const rows = await run(supabase.from(table).select('*').order('criado_em', { ascending: true }))
    if (rows && rows.length) return rows.map((row) => denormalize(name, row))

    const initial = seed ? seed() : []
    if (!initial.length) return []
    const inserted = await run(supabase.from(table).insert(initial.map((record) => normalize(name, record))).select())
    return (inserted || initial).map((row) => denormalize(name, row))
  },

  async insert(name, record) {
    const { table } = collectionConfig(name)
    const rows = await run(supabase.from(table).insert(normalize(name, record)).select())
    return rows?.[0] ? denormalize(name, rows[0]) : record
  },

  async update(name, id, patch) {
    const { table } = collectionConfig(name)
    const rows = await run(supabase.from(table).update(normalize(name, patch)).eq('id', id).select())
    return rows?.[0] ? denormalize(name, rows[0]) : null
  },

  async remove(name, id) {
    const { table } = collectionConfig(name)
    await run(supabase.from(table).delete().eq('id', id))
    return true
  },

  async replaceAll(name, records) {
    const { table } = collectionConfig(name)
    await run(supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'))
    if (!records.length) return []
    const rows = await run(supabase.from(table).insert(records.map((record) => normalize(name, record))).select())
    return (rows || records).map((row) => denormalize(name, row))
  },
}

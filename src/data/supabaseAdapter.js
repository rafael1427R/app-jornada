import { collectionConfig } from './collections'
import { supabase } from './supabaseClient'

async function run(promise) {
  const { data, error } = await promise
  if (error) throw new Error(error.message)
  return data
}

export const supabaseAdapter = {
  async list(name) {
    const { table, seed } = collectionConfig(name)
    const rows = await run(supabase.from(table).select('*'))
    if (rows && rows.length) return rows
    const initial = seed ? seed() : []
    if (!initial.length) return []
    const inserted = await run(supabase.from(table).insert(initial).select())
    return inserted || initial
  },
  async insert(name, record) {
    const { table } = collectionConfig(name)
    const rows = await run(supabase.from(table).insert(record).select())
    return rows?.[0] ?? record
  },
  async update(name, id, patch) {
    const { table } = collectionConfig(name)
    const rows = await run(supabase.from(table).update(patch).eq('id', id).select())
    return rows?.[0] ?? null
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
    const rows = await run(supabase.from(table).insert(records).select())
    return rows || records
  },
}

import { readStorage, writeStorage } from '@/lib/storage'
import { collectionConfig } from './collections'

export const localAdapter = {
  async list(name) {
    const { key, seed } = collectionConfig(name)
    const stored = readStorage(key, null)
    if (Array.isArray(stored)) return stored
    const initial = seed ? seed() : []
    writeStorage(key, initial)
    return initial
  },
  async insert(name, record) {
    const { key } = collectionConfig(name)
    const current = await localAdapter.list(name)
    const next = [...current, record]
    writeStorage(key, next)
    return record
  },
  async update(name, id, patch) {
    const { key } = collectionConfig(name)
    const current = await localAdapter.list(name)
    let updated = null
    const next = current.map((item) => {
      if (item.id !== id) return item
      updated = { ...item, ...patch }
      return updated
    })
    writeStorage(key, next)
    return updated
  },
  async remove(name, id) {
    const { key } = collectionConfig(name)
    const current = await localAdapter.list(name)
    writeStorage(key, current.filter((item) => item.id !== id))
    return true
  },
  async replaceAll(name, records) {
    const { key } = collectionConfig(name)
    writeStorage(key, records)
    return records
  },
}

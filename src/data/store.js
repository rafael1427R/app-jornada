import { useCallback, useEffect, useMemo, useState } from 'react'
import { uid } from '@/lib/format'
import { localAdapter } from './localAdapter'
import { supabaseAdapter } from './supabaseAdapter'
import { supabaseEnabled } from './supabaseClient'

const primary = supabaseEnabled ? supabaseAdapter : localAdapter

/** Estado em memória compartilhado entre todas as telas. */
const cache = new Map()
const listeners = new Map()
const inflight = new Map()

export const backendState = { remote: supabaseEnabled, degraded: false, message: '' }

const backendListeners = new Set()

function marcarDegradado(mensagem) {
  if (backendState.degraded && backendState.message === mensagem) return
  backendState.degraded = true
  backendState.message = mensagem
  backendListeners.forEach((listener) => listener())
}

/** Estado real da origem dos dados, incluindo a queda para o modo local. */
export function useBackendStatus() {
  const [, forcar] = useState(0)
  useEffect(() => {
    const listener = () => forcar((valor) => valor + 1)
    backendListeners.add(listener)
    return () => backendListeners.delete(listener)
  }, [])

  if (!backendState.remote) return { modo: 'local', rotulo: 'Local (offline)', alerta: false }
  if (backendState.degraded) return { modo: 'degradado', rotulo: 'Supabase indisponível — salvando local', alerta: true, message: backendState.message }
  return { modo: 'supabase', rotulo: 'Supabase', alerta: false }
}

function stateOf(name) {
  if (!cache.has(name)) {
    cache.set(name, { items: [], loading: true, error: null, loaded: false })
  }
  return cache.get(name)
}

function emit(name) {
  const set = listeners.get(name)
  if (set) set.forEach((listener) => listener())
}

function setState(name, patch) {
  cache.set(name, { ...stateOf(name), ...patch })
  emit(name)
}

function subscribe(name, listener) {
  if (!listeners.has(name)) listeners.set(name, new Set())
  listeners.get(name).add(listener)
  return () => listeners.get(name)?.delete(listener)
}

/** Executa no Supabase e, em caso de falha, cai para o modo local. */
async function withFallback(operation, ...args) {
  try {
    return await primary[operation](...args)
  } catch (error) {
    if (primary === localAdapter) throw error
    marcarDegradado(error.message)
    // eslint-disable-next-line no-console
    console.warn('[dados] Supabase indisponível, usando armazenamento local:', error.message)
    return localAdapter[operation](...args)
  }
}

export async function loadCollection(name, { force = false } = {}) {
  const current = stateOf(name)
  if (current.loaded && !force) return current.items
  if (inflight.has(name)) return inflight.get(name)

  setState(name, { loading: true, error: null })
  const request = withFallback('list', name)
    .then((items) => {
      setState(name, { items: items || [], loading: false, loaded: true, error: null })
      return items
    })
    .catch((error) => {
      setState(name, { loading: false, loaded: true, error: error.message })
      return []
    })
    .finally(() => inflight.delete(name))

  inflight.set(name, request)
  return request
}

export async function createRecord(name, values) {
  const record = { id: values.id || uid(), criado_em: values.criado_em || new Date().toISOString(), ...values }
  const saved = (await withFallback('insert', name, record)) || record
  setState(name, { items: [...stateOf(name).items, saved] })
  return saved
}

export async function updateRecord(name, id, patch) {
  const saved = await withFallback('update', name, id, patch)
  setState(name, {
    items: stateOf(name).items.map((item) => (item.id === id ? { ...item, ...patch, ...(saved || {}) } : item)),
  })
  return saved
}

export async function removeRecord(name, id) {
  await withFallback('remove', name, id)
  setState(name, { items: stateOf(name).items.filter((item) => item.id !== id) })
  return true
}

export async function replaceCollection(name, records) {
  const saved = (await withFallback('replaceAll', name, records)) || records
  setState(name, { items: saved, loaded: true, loading: false })
  return saved
}

/** Hook principal de acesso aos dados. */
export function useCollection(name) {
  const [snapshot, setSnapshot] = useState(() => stateOf(name))

  useEffect(() => {
    const unsubscribe = subscribe(name, () => setSnapshot(stateOf(name)))
    setSnapshot(stateOf(name))
    loadCollection(name)
    return unsubscribe
  }, [name])

  const create = useCallback((values) => createRecord(name, values), [name])
  const update = useCallback((id, patch) => updateRecord(name, id, patch), [name])
  const remove = useCallback((id) => removeRecord(name, id), [name])
  const replaceAll = useCallback((records) => replaceCollection(name, records), [name])
  const refresh = useCallback(() => loadCollection(name, { force: true }), [name])

  return useMemo(
    () => ({
      items: snapshot.items,
      loading: snapshot.loading && !snapshot.loaded,
      error: snapshot.error,
      create,
      update,
      remove,
      replaceAll,
      refresh,
    }),
    [snapshot, create, update, remove, replaceAll, refresh],
  )
}

/** Carrega várias coleções de uma vez (usado no Dashboard e Indicadores). */
export function useCollections(names) {
  const key = names.join('|')
  const list = useMemo(() => key.split('|'), [key])
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const unsubscribers = list.map((name) => subscribe(name, () => setTick((value) => value + 1)))
    list.forEach((name) => loadCollection(name))
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [list])

  return useMemo(() => {
    const result = { loading: false }
    list.forEach((name) => {
      const state = stateOf(name)
      result[name] = state.items
      if (state.loading && !state.loaded) result.loading = true
    })
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, tick])
}

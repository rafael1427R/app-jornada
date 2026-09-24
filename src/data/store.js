import { useCallback, useEffect, useMemo, useState } from 'react'
import { uid } from '@/lib/format'
import { localAdapter } from './localAdapter'
import { supabaseAdapter } from './supabaseAdapter'
import { supabaseEnabled } from './supabaseClient'

/**
 * MODO ESTRITO
 *
 * Com o Supabase configurado, o localStorage nunca é usado para dados
 * clínicos. Se o banco falhar, a operação falha de forma visível — nada é
 * gravado no navegador. Isso existe para que um teste do sistema seja um
 * teste do banco de verdade: o que aparece na tela está no Postgres.
 *
 * O adaptador local só entra quando o app roda sem VITE_SUPABASE_URL,
 * isto é, em desenvolvimento offline.
 */
const primary = supabaseEnabled ? supabaseAdapter : localAdapter

/** Cópia em memória apenas para renderizar; a fonte da verdade é o banco. */
const cache = new Map()
const listeners = new Map()
const inflight = new Map()

export const backendState = { remote: supabaseEnabled, erro: false, message: '' }

const backendListeners = new Set()

function notificarBackend() {
  backendListeners.forEach((listener) => listener())
}

function marcarErro(mensagem) {
  if (backendState.erro && backendState.message === mensagem) return
  backendState.erro = true
  backendState.message = mensagem
  notificarBackend()
  reportarFalha(mensagem)
}

function limparErro() {
  if (!backendState.erro) return
  backendState.erro = false
  backendState.message = ''
  notificarBackend()
}

/**
 * Canal para a interface avisar o usuário. O ToastProvider registra aqui,
 * de modo que uma falha de gravação nunca passe despercebida mesmo nas
 * telas que não tratam o erro localmente.
 */
let relatorDeFalha = null

export function registrarRelatorDeFalha(fn) {
  relatorDeFalha = fn
  return () => {
    if (relatorDeFalha === fn) relatorDeFalha = null
  }
}

function reportarFalha(mensagem) {
  if (!relatorDeFalha) return
  try {
    relatorDeFalha(mensagem)
  } catch {
    /* a notificação nunca pode derrubar a operação */
  }
}

/** Estado real da origem dos dados. */
export function useBackendStatus() {
  const [, forcar] = useState(0)
  useEffect(() => {
    const listener = () => forcar((valor) => valor + 1)
    backendListeners.add(listener)
    return () => backendListeners.delete(listener)
  }, [])

  if (!backendState.remote) return { modo: 'local', rotulo: 'Local (offline)', alerta: false }
  if (backendState.erro) {
    return {
      modo: 'erro',
      rotulo: 'Sem conexão com o banco — nada está sendo salvo',
      alerta: true,
      message: backendState.message,
    }
  }
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

/**
 * Executa a operação no banco. Sem rede de segurança: o erro sobe para
 * quem chamou e o estado degradado fica visível no cabeçalho.
 */
/** O supabase-js às vezes embrulha a mensagem em "Error: ..."; sai da frente do usuário. */
function textoDoErro(error) {
  const bruto = error?.message || 'Falha ao falar com o banco de dados.'
  return bruto.replace(/^(Error|TypeError):\s*/i, '').trim()
}

async function execute(operation, ...args) {
  try {
    const resultado = await primary[operation](...args)
    limparErro()
    return resultado
  } catch (error) {
    if (backendState.remote) marcarErro(textoDoErro(error))
    throw error
  }
}

/**
 * Busca a coleção no banco. `force` refaz a consulta; sem ele, uma coleção
 * já carregada é revalidada em segundo plano para que alterações feitas em
 * outro computador apareçam sem recarregar a página.
 */
export async function loadCollection(name, { force = false } = {}) {
  const current = stateOf(name)
  if (inflight.has(name)) return inflight.get(name)

  const revalidando = current.loaded && !force
  if (!revalidando) setState(name, { loading: true, error: null })

  const request = execute('list', name)
    .then((items) => {
      setState(name, { items: items || [], loading: false, loaded: true, error: null })
      return items
    })
    .catch((error) => {
      // Numa revalidação mantemos o que já está na tela e sinalizamos o erro;
      // numa primeira carga não há o que mostrar.
      setState(name, {
        items: revalidando ? stateOf(name).items : [],
        loading: false,
        loaded: true,
        error: error.message,
      })
      return revalidando ? stateOf(name).items : []
    })
    .finally(() => inflight.delete(name))

  inflight.set(name, request)
  return revalidando ? current.items : request
}

/** Refaz a consulta de tudo que já foi carregado (usado ao voltar para a aba). */
export function revalidateAll() {
  cache.forEach((state, name) => {
    if (state.loaded) loadCollection(name, { force: true })
  })
}

if (typeof window !== 'undefined') {
  window.addEventListener('focus', revalidateAll)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') revalidateAll()
  })
}

export async function createRecord(name, values) {
  const record = { id: values.id || uid(), criado_em: values.criado_em || new Date().toISOString(), ...values }
  const saved = (await execute('insert', name, record)) || record
  setState(name, { items: [...stateOf(name).items, saved] })
  return saved
}

export async function updateRecord(name, id, patch) {
  const saved = await execute('update', name, id, patch)
  setState(name, {
    items: stateOf(name).items.map((item) => (item.id === id ? { ...item, ...patch, ...(saved || {}) } : item)),
  })
  return saved
}

export async function removeRecord(name, id) {
  await execute('remove', name, id)
  setState(name, { items: stateOf(name).items.filter((item) => item.id !== id) })
  return true
}

export async function replaceCollection(name, records) {
  const saved = (await execute('replaceAll', name, records)) || records
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

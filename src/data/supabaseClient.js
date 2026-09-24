import { createClient } from '@supabase/supabase-js'

const url = import.meta.env?.VITE_SUPABASE_URL
const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY

/** Quando as variáveis não estão definidas o app opera 100% em localStorage. */
export const supabaseEnabled = Boolean(url && anonKey)

/**
 * Sem limite de tempo, uma rede ruim deixa a tela travada em "Carregando"
 * por minutos. Com o limite, a falha aparece rápido e o aviso vermelho
 * entra no lugar do silêncio.
 */
const TIMEOUT_MS = 12000

function fetchComTimeout(input, init = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  return fetch(input, { ...init, signal: controller.signal })
    .catch((error) => {
      if (error?.name === 'AbortError') {
        throw new Error(`O banco de dados não respondeu em ${TIMEOUT_MS / 1000} segundos.`)
      }
      throw new Error('Não foi possível falar com o banco de dados. Verifique a conexão.')
    })
    .finally(() => clearTimeout(timer))
}

export const supabase = supabaseEnabled
  ? createClient(url, anonKey, {
      auth: { persistSession: false },
      global: { fetch: fetchComTimeout },
    })
  : null

export const backendLabel = supabaseEnabled ? 'Supabase' : 'Local (offline)'

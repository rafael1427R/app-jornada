import { createClient } from '@supabase/supabase-js'

const url = import.meta.env?.VITE_SUPABASE_URL
const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY

/** Quando as variáveis não estão definidas o app opera 100% em localStorage. */
export const supabaseEnabled = Boolean(url && anonKey)

export const supabase = supabaseEnabled
  ? createClient(url, anonKey, { auth: { persistSession: false } })
  : null

export const backendLabel = supabaseEnabled ? 'Supabase' : 'Local (offline)'

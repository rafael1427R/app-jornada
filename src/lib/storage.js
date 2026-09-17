import { useCallback, useEffect, useRef, useState } from 'react'

const isBrowser = () => typeof window !== 'undefined'

export function readStorage(key, fallback) {
  if (!isBrowser()) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (raw == null) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

export function writeStorage(key, value) {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    window.dispatchEvent(new CustomEvent('local-storage-change', { detail: { key } }))
  } catch {
    /* quota cheia ou modo privado: o app continua funcionando em memória */
  }
}

/**
 * Hook de estado persistido com hidratação SSR-safe.
 * Na primeira renderização devolve `initialValue`; o valor do localStorage
 * entra no efeito de montagem (evita divergência de hidratação).
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(initialValue)
  const [hydrated, setHydrated] = useState(false)
  const keyRef = useRef(key)
  keyRef.current = key

  useEffect(() => {
    if (typeof window === 'undefined') return
    setValue(readStorage(key, initialValue))
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    if (!hydrated) return
    writeStorage(key, value)
  }, [key, value, hydrated])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sync = (event) => {
      const changed = event?.detail?.key ?? event?.key
      if (changed && changed !== keyRef.current) return
      setValue(readStorage(keyRef.current, initialValue))
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const update = useCallback((updater) => {
    setValue((current) => (typeof updater === 'function' ? updater(current) : updater))
  }, [])

  return [value, update, hydrated]
}

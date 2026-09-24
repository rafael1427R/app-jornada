import { useEffect, useState } from 'react'

/** Relógio compartilhado: força re-render a cada `interval` ms. */
export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), interval)
    return () => window.clearInterval(timer)
  }, [interval])
  return now
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { uid } from '@/lib/format'
import { registrarRelatorDeFalha } from '@/data/store'

const ToastContext = createContext(null)

const VARIANTS = {
  success: { icon: CheckCircle2, className: 'border-emerald-200 bg-emerald-50 text-emerald-800', iconClass: 'text-emerald-600' },
  error: { icon: XCircle, className: 'border-red-200 bg-red-50 text-red-800', iconClass: 'text-red-600' },
  warning: { icon: AlertTriangle, className: 'border-amber-200 bg-amber-50 text-amber-800', iconClass: 'text-amber-600' },
  info: { icon: Info, className: 'border-blue-200 bg-blue-50 text-blue-800', iconClass: 'text-blue-600' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (message, variant = 'success', duration = 4000) => {
      const id = uid()
      setToasts((current) => [...current, { id, message, variant }])
      timers.current.set(id, window.setTimeout(() => dismiss(id), duration))
      return id
    },
    [dismiss],
  )

  const api = useMemo(
    () => ({
      toast: push,
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'error', 6000),
      warning: (message) => push(message, 'warning', 5000),
      info: (message) => push(message, 'info'),
      dismiss,
    }),
    [push, dismiss],
  )

  /**
   * Falha de gravação no banco vira aviso na tela mesmo quando a página não
   * trata o erro. Sem isso, o modo estrito do store recusaria a gravação em
   * silêncio — pior do que o antigo fallback para o navegador.
   */
  useEffect(
    () => registrarRelatorDeFalha((mensagem) => push(`Não foi salvo no banco: ${mensagem}`, 'error', 9000)),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {typeof document !== 'undefined'
        ? createPortal(
            <div className="no-print pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,22rem)] flex-col gap-2">
              {toasts.map((toast) => {
                const variant = VARIANTS[toast.variant] || VARIANTS.info
                const Icon = variant.icon
                return (
                  <div key={toast.id} className={`pointer-events-auto flex animate-fade-in items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${variant.className}`}>
                    <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${variant.iconClass}`} />
                    <p className="flex-1 text-sm font-medium">{toast.message}</p>
                    <button type="button" onClick={() => dismiss(toast.id)} className="rounded p-0.5 opacity-60 transition hover:opacity-100" aria-label="Fechar aviso">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast precisa estar dentro de ToastProvider')
  return context
}

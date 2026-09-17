import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import { Loader2, Search, X, Inbox } from 'lucide-react'

export function cn(...values) {
  return values.filter(Boolean).join(' ')
}

/* ------------------------------------------------------------------ Card */

export function Card({ className, children, ...props }) {
  return (
    <div className={cn('card', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ title, description, icon: Icon, actions, className }) {
  return (
    <div className={cn('flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
        <div>
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

/* ----------------------------------------------------------------- Badge */

export function Badge({ children, className, dot }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold', className || 'border-slate-200 bg-slate-100 text-slate-700')}>
      {dot ? <span className={cn('h-1.5 w-1.5 rounded-full', dot)} /> : null}
      {children}
    </span>
  )
}

export function StatusBadge({ map, value, fallback = '—' }) {
  const config = map?.[value]
  if (!config) return <Badge>{fallback}</Badge>
  return (
    <Badge className={config.badge} dot={config.dot}>
      {config.label}
    </Badge>
  )
}

/* ------------------------------------------------------------------- KPI */

export function KpiCard({ label, value, hint, icon: Icon, tone = 'primary' }) {
  const tones = {
    primary: 'bg-primary-light text-primary',
    accent: 'bg-accent-light text-accent-dark',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    slate: 'bg-slate-100 text-slate-600',
    violet: 'bg-violet-50 text-violet-600',
  }
  return (
    <div className="card flex items-center gap-4 p-4">
      {Icon ? (
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', tones[tone] || tones.primary)}>
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-2xl font-bold leading-tight text-slate-800">{value}</p>
        {hint ? <p className="truncate text-xs text-slate-400">{hint}</p> : null}
      </div>
    </div>
  )
}

export function KpiGrid({ children, className }) {
  return <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4', className)}>{children}</div>
}

/* ---------------------------------------------------------------- Inputs */

export function Field({ label, error, hint, children, className }) {
  return (
    <div className={className}>
      {label ? <label className="label">{label}</label> : null}
      {children}
      {error ? <p className="mt-1 text-xs font-medium text-red-600">{error}</p> : null}
      {!error && hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  )
}

export function Input({ className, ...props }) {
  return <input className={cn('input', className)} {...props} />
}

export function Textarea({ className, ...props }) {
  return <textarea className={cn('input min-h-[90px] resize-y', className)} {...props} />
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cn('input appearance-none bg-white', className)} {...props}>
      {children}
    </select>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Buscar...', className }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input className="input pl-9" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  )
}

export function Pill({ active, children, onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
        active ? 'border-primary bg-primary text-white' : 'border-border bg-white text-slate-600 hover:bg-slate-50',
        className,
      )}
    >
      {children}
    </button>
  )
}

/* ---------------------------------------------------------------- Modal */

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
      <div className={cn('w-full animate-scale-in rounded-2xl bg-white shadow-xl', sizes[size] || sizes.md)} role="dialog" aria-modal="true">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
            {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 scrollbar-thin">{children}</div>
        {footer ? <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-slate-50 px-5 py-3">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}

/* ---------------------------------------------------------------- Estados */

export function Spinner({ className }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-primary', className)} />
}

export function LoadingState({ label = 'Carregando dados...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-slate-500">
      <Spinner className="h-7 w-7" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  )
}

export function EmptyState({ title = 'Nenhum registro encontrado', description, icon: Icon = Inbox, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <Icon className="h-6 w-6" />
      </span>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description ? <p className="max-w-sm text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}

/* ---------------------------------------------------------------- Tabela */

export function TableWrapper({ children, className }) {
  return (
    <div className={cn('w-full overflow-x-auto scrollbar-thin', className)}>
      <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
    </div>
  )
}

export function Th({ children, className }) {
  return <th className={cn('table-head whitespace-nowrap px-4 py-3 text-left', className)}>{children}</th>
}

export function Td({ children, className }) {
  return <td className={cn('whitespace-nowrap px-4 py-3 align-middle text-slate-700', className)}>{children}</td>
}

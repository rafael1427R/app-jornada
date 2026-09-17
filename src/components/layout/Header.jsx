import { Menu } from 'lucide-react'
import { HOSPITAL_NAME } from '@/lib/brand'

export default function Header({ title, description, onOpenMenu }) {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <button type="button" onClick={onOpenMenu} className="rounded-lg border border-border p-2 text-slate-600 transition hover:bg-slate-50 lg:hidden" aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-slate-800 sm:text-xl">{title}</h1>
          <p className="truncate text-xs text-slate-500">{description || HOSPITAL_NAME}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="hidden text-xs font-semibold text-emerald-700 sm:inline">Sistema Online</span>
        </div>
      </div>
    </header>
  )
}

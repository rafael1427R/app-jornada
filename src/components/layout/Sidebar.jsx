import { NavLink } from 'react-router-dom'
import { Activity, ChevronRight, ExternalLink, LogOut, ShieldCheck, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { APP_NAME, LGPD_NOTICE, SIDEBAR_SUBTITLE, SIDEBAR_TITLE } from '@/lib/brand'
import { backendLabel } from '@/data/supabaseClient'
import { moduleIcon } from './icons'

export default function Sidebar({ open, onClose }) {
  const { user, logout, allowedModules } = useAuth()

  return (
    <>
      {open ? <div className="no-print fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} aria-hidden="true" /> : null}

      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-primary text-white transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/90 text-primary-dark shadow">
            <Activity className="h-6 w-6" strokeWidth={2.6} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight">{SIDEBAR_TITLE}</p>
            <p className="truncate text-xs text-white/70">{SIDEBAR_SUBTITLE}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white lg:hidden" aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          {allowedModules.map((module) => {
            const Icon = moduleIcon(module.icon)
            return (
              <NavLink
                key={module.id}
                to={module.path}
                end={module.path === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="flex-1 truncate">{module.label}</span>
                    {isActive ? <ChevronRight className="h-4 w-4 text-emerald-300" /> : null}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="space-y-3 border-t border-white/10 px-3 py-4">
          <a
            href="/status"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/20"
          >
            <ExternalLink className="h-4 w-4" />
            Painel Acompanhantes
          </a>

          <div className="rounded-lg bg-white/5 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user?.nome || 'Visitante'}</p>
                <p className="truncate text-xs text-white/60">{user?.funcao || '—'}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="flex shrink-0 items-center gap-1 rounded-md bg-white/10 px-2 py-1.5 text-xs font-semibold text-white/90 transition hover:bg-red-500/80"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            <p className="text-[11px] font-medium leading-snug text-emerald-100">{LGPD_NOTICE}</p>
          </div>

          <p className="px-1 text-[10px] text-white/40">
            {APP_NAME} · v1.0 · dados: {backendLabel}
          </p>
        </div>
      </aside>
    </>
  )
}

import { NavLink } from 'react-router-dom'
import { AlertTriangle, ChevronRight, ExternalLink, LogOut, ShieldCheck, X } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/context/AuthContext'
import { APP_NAME, LGPD_NOTICE, SIDEBAR_SUBTITLE, SIDEBAR_TITLE } from '@/lib/brand'
import { useBackendStatus } from '@/data/store'
import { moduleIcon } from './icons'

export default function Sidebar({ open, onClose }) {
  const { user, logout, allowedModules } = useAuth()
  const backend = useBackendStatus()

  return (
    <>
      {open ? <div className="no-print fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} aria-hidden="true" /> : null}

      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-primary text-white transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-start gap-2">
            <span className="flex min-w-0 flex-1 items-center rounded-lg bg-white px-2.5 py-2 shadow-sm">
              <Logo variant="hospital" className="h-7 max-w-full" />
            </span>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white lg:hidden" aria-label="Fechar menu">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-3 truncate text-sm font-bold leading-tight">{SIDEBAR_TITLE}</p>
          <p className="truncate text-xs text-white/70">{SIDEBAR_SUBTITLE}</p>
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

          <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2">
            <Logo variant="isac" className="h-9" />
            <p className="text-[10px] font-semibold leading-tight text-slate-500">Gestão<br />ISAC</p>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            <p className="text-[11px] font-medium leading-snug text-emerald-100">{LGPD_NOTICE}</p>
          </div>

          {backend.alerta ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-400/40 bg-red-500/20 px-3 py-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
              <p className="text-[11px] font-semibold leading-snug text-red-100">
                Banco indisponível — nada está sendo salvo. Não registre atendimentos até a conexão voltar.
              </p>
            </div>
          ) : null}

          <p className={`px-1 text-[10px] ${backend.alerta ? 'text-red-200' : 'text-white/40'}`}>
            {APP_NAME} · v1.0 · dados: {backend.rotulo}
          </p>
        </div>
      </aside>
    </>
  )
}

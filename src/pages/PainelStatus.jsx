import { useMemo, useState } from 'react'
import { Clock, Info, Search, ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { useCollections } from '@/data/store'
import { LoadingState } from '@/components/ui'
import { SURGERY_STATUS } from '@/lib/constants'
import { formatTime, normalize, todayISO } from '@/lib/format'
import { useNow } from '@/lib/useNow'
import { APP_NAME, HOSPITAL_NAME, INSTITUTION_NAME } from '@/lib/brand'

const STATUS_STYLE = {
  agendada: 'bg-slate-100 text-slate-700 border-slate-200',
  em_preparo: 'bg-amber-100 text-amber-800 border-amber-200',
  em_andamento: 'bg-blue-100 text-blue-800 border-blue-200',
  em_rpa: 'bg-violet-100 text-violet-800 border-violet-200',
  finalizada: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelada: 'bg-red-100 text-red-800 border-red-200',
  suspensa: 'bg-orange-100 text-orange-800 border-orange-200',
}

const ORDEM = ['em_andamento', 'em_rpa', 'em_preparo', 'agendada', 'finalizada', 'suspensa', 'cancelada']

export default function PainelStatus() {
  const data = useCollections(['cirurgias'])
  const now = useNow(30000)
  const [busca, setBusca] = useState('')

  const lista = useMemo(() => {
    return (data.cirurgias || [])
      .filter((cirurgia) => cirurgia.data_prevista === todayISO())
      .filter((cirurgia) => (busca ? normalize(cirurgia.prontuario).includes(normalize(busca)) : true))
      .sort((a, b) => {
        const posicao = ORDEM.indexOf(a.status) - ORDEM.indexOf(b.status)
        if (posicao !== 0) return posicao
        return String(a.hora_prevista).localeCompare(String(b.hora_prevista))
      })
  }, [data.cirurgias, busca])

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-primary text-white shadow">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center rounded-lg bg-white px-2.5 py-2">
              <Logo variant="hospital" className="h-8" />
            </span>
            <div>
              <p className="text-lg font-bold leading-tight">Painel de Acompanhantes</p>
              <p className="text-xs text-white/70">
                {HOSPITAL_NAME} · {INSTITUTION_NAME}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm">
            <Clock className="h-4 w-4" />
            <span className="font-mono font-semibold">{new Date(now).toLocaleTimeString('pt-BR')}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="card mb-5 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className="input py-3 pl-10 text-base"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Digite o número do prontuário para localizar"
              inputMode="numeric"
            />
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-primary-light px-3 py-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs leading-snug text-primary">
              Por respeito à privacidade e em conformidade com a LGPD, as informações são exibidas apenas pelo número de prontuário. Em caso de dúvida, procure a recepção do centro cirúrgico.
            </p>
          </div>
        </div>

        {data.loading ? (
          <LoadingState label="Carregando painel..." />
        ) : lista.length === 0 ? (
          <div className="card px-6 py-16 text-center">
            <p className="text-lg font-semibold text-slate-700">Nenhum registro encontrado</p>
            <p className="mt-1 text-sm text-slate-500">Não há procedimentos para exibir no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map((cirurgia) => (
              <article key={cirurgia.id} className={`rounded-2xl border-2 p-5 shadow-sm ${STATUS_STYLE[cirurgia.status] || STATUS_STYLE.agendada}`}>
                <p className="text-xs font-bold uppercase tracking-wider opacity-70">Prontuário</p>
                <p className="font-mono text-3xl font-extrabold tracking-tight">{cirurgia.prontuario}</p>
                <p className="mt-3 text-lg font-bold">{SURGERY_STATUS[cirurgia.status]?.public || 'Aguardando'}</p>
                <p className="mt-1 text-sm opacity-80">
                  Horário previsto: {cirurgia.hora_prevista}
                  {cirurgia.inicio_real ? ` · início ${formatTime(cirurgia.inicio_real)}` : ''}
                </p>
              </article>
            ))}
          </div>
        )}

        <footer className="mt-8 flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <p className="text-xs font-semibold text-emerald-700">Sem dados pessoais identificáveis — LGPD (Lei 13.709/2018)</p>
          </div>
          <div className="flex items-center gap-3">
            <Logo variant="isac" className="h-12" />
            <p className="text-left text-xs text-slate-400">
              {APP_NAME} · atualização automática a cada 30 segundos
              <br />
              {INSTITUTION_NAME}
            </p>
          </div>
        </footer>
      </main>
    </div>
  )
}

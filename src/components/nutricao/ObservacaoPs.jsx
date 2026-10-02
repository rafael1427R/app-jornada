import { useMemo } from 'react'
import { Clock, Salad, Stethoscope, TriangleAlert, UtensilsCrossed } from 'lucide-react'
import { Badge, Card, CardHeader, EmptyState, KpiCard, KpiGrid } from '@/components/ui'
import { PS_OBSERVATION_LIMIT_HOURS } from '@/lib/constants'
import { proximaRefeicao, usaSonda } from '@/lib/nutricao'
import { formatDateTime, formatDuration, minutesBetween } from '@/lib/format'

/**
 * Visão da Nutrição sobre o Pronto-Socorro: quem está em observação, há quanto
 * tempo e qual a próxima refeição — a dificuldade que a coordenação aponta como
 * a maior do setor. Admissão e alta continuam no módulo Pronto Socorro Digital.
 */
export default function ObservacaoPs({ psLeitos, dietas, onPrescrever }) {
  const emObservacao = useMemo(
    () =>
      psLeitos
        .filter((leito) => leito.status === 'em_atendimento')
        .map((leito) => {
          const dieta = dietas.find((item) => item.prontuario === leito.prontuario && item.status === 'ativa')
          const minutos = minutesBetween(leito.admitido_em)
          return {
            ...leito,
            dieta,
            minutos,
            excedido: minutos / 60 >= PS_OBSERVATION_LIMIT_HOURS,
            refeicao: proximaRefeicao(new Date(), usaSonda(dieta || {})),
          }
        })
        .sort((a, b) => b.minutos - a.minutos),
    [psLeitos, dietas],
  )

  const kpis = useMemo(
    () => ({
      total: emObservacao.length,
      comDieta: emObservacao.filter((item) => item.dieta).length,
      semDieta: emObservacao.filter((item) => !item.dieta).length,
      excedidos: emObservacao.filter((item) => item.excedido).length,
    }),
    [emObservacao],
  )

  return (
    <div className="space-y-5">
      <KpiGrid>
        <KpiCard label="Em observação" value={kpis.total} icon={Stethoscope} tone="primary" />
        <KpiCard label="Com dieta prescrita" value={kpis.comDieta} icon={Salad} tone="emerald" />
        <KpiCard label="Sem dieta" value={kpis.semDieta} hint="Pendente de conduta" icon={UtensilsCrossed} tone={kpis.semDieta ? 'amber' : 'slate'} />
        <KpiCard label={`Acima de ${PS_OBSERVATION_LIMIT_HOURS}h`} value={kpis.excedidos} icon={TriangleAlert} tone={kpis.excedidos ? 'red' : 'emerald'} />
      </KpiGrid>

      <Card>
        <CardHeader
          title="Observação — Pronto-Socorro"
          description={`Tempo de permanência e próxima refeição calculada pelo horário de entrada (limite de ${PS_OBSERVATION_LIMIT_HOURS}h)`}
          icon={Stethoscope}
        />

        {emObservacao.length === 0 ? (
          <EmptyState title="Nenhum registro encontrado" description="Nenhum paciente em atendimento no Pronto Socorro Digital neste momento." />
        ) : (
          <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-2">
            {emObservacao.map((paciente) => (
              <div key={paciente.id} className={`rounded-xl border p-4 ${paciente.excedido ? 'border-red-300 bg-red-50' : 'border-amber-200 bg-amber-50/60'}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-base font-bold text-primary">{paciente.prontuario}</p>
                    <p className="text-xs text-slate-500">Quarto {paciente.nome}</p>
                  </div>
                  <Badge className={paciente.excedido ? 'border-red-200 bg-red-100 text-red-700' : 'border-amber-200 bg-amber-100 text-amber-700'}>
                    <Clock className="h-3 w-3" />
                    {formatDuration(paciente.minutos)} / {PS_OBSERVATION_LIMIT_HOURS}h
                  </Badge>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-white/70 p-3 text-xs">
                  <div>
                    <dt className="font-semibold uppercase tracking-wide text-slate-400">Entrada</dt>
                    <dd className="text-slate-700">{formatDateTime(paciente.admitido_em)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase tracking-wide text-slate-400">Próxima refeição</dt>
                    <dd className="font-semibold text-slate-700">
                      {paciente.refeicao.label} · {paciente.refeicao.horario}
                      {paciente.refeicao.amanha ? ' (amanhã)' : ''}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="font-semibold uppercase tracking-wide text-slate-400">Dieta</dt>
                    <dd className="text-slate-700">
                      {paciente.dieta ? (
                        <>
                          {paciente.dieta.consistencia} · {paciente.dieta.modificacao}
                          {usaSonda(paciente.dieta) ? <Badge className="ml-2 border-violet-200 bg-violet-100 text-violet-700">sonda</Badge> : null}
                        </>
                      ) : (
                        <span className="font-semibold text-amber-700">Sem dieta prescrita</span>
                      )}
                    </dd>
                  </div>
                  {paciente.queixa ? (
                    <div className="col-span-2">
                      <dt className="font-semibold uppercase tracking-wide text-slate-400">Queixa</dt>
                      <dd className="text-slate-600">{paciente.queixa}</dd>
                    </div>
                  ) : null}
                </dl>

                {onPrescrever ? (
                  <button type="button" className="btn-primary mt-3 w-full" onClick={() => onPrescrever(paciente)}>
                    <Salad className="h-4 w-4" />
                    {paciente.dieta ? 'Revisar dieta' : 'Prescrever dieta'}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

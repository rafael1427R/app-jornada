import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Activity, AlertTriangle, BedDouble, CalendarDays, ClipboardList, HeartPulse, LayoutGrid, Users } from 'lucide-react'
import { useCollections } from '@/data/store'
import { Card, CardHeader, EmptyState, KpiCard, KpiGrid, LoadingState, StatusBadge, TableWrapper, Td, Th } from '@/components/ui'
import { ROOM_STATUS, SURGERY_STATUS, SURGERY_TYPES, VISIT_LIMIT_MINUTES } from '@/lib/constants'
import { formatDate, minutesBetween, percent, todayISO } from '@/lib/format'
import { useAuth } from '@/context/AuthContext'
import { HOSPITAL_NAME } from '@/lib/brand'

export default function Dashboard() {
  const data = useCollections(['cirurgias', 'salas', 'leitos', 'visitantes', 'psLeitos', 'equipamentos', 'rpa'])
  const { user } = useAuth()

  const cirurgiasHoje = useMemo(
    () => (data.cirurgias || []).filter((item) => item.data_prevista === todayISO()).sort((a, b) => String(a.hora_prevista).localeCompare(String(b.hora_prevista))),
    [data.cirurgias],
  )

  const stats = useMemo(() => {
    const salas = data.salas || []
    const leitos = data.leitos || []
    const visitantes = data.visitantes || []
    const psLeitos = data.psLeitos || []
    const equipamentos = data.equipamentos || []
    const rpa = data.rpa || []

    const dentro = visitantes.filter((visitante) => !visitante.saida)
    const expirados = dentro.filter((visitante) => minutesBetween(visitante.entrada) >= VISIT_LIMIT_MINUTES)
    const manutencaoAtrasada = equipamentos.filter(
      (equipamento) => equipamento.proxima_manutencao && equipamento.proxima_manutencao < todayISO(),
    )

    return {
      totalHoje: cirurgiasHoje.length,
      emAndamento: cirurgiasHoje.filter((item) => item.status === 'em_andamento').length,
      finalizadas: cirurgiasHoje.filter((item) => item.status === 'finalizada').length,
      salasDisponiveis: salas.filter((sala) => sala.status === 'disponivel').length,
      salasTotal: salas.length,
      leitosOcupados: leitos.filter((leito) => leito.status === 'ocupado').length,
      leitosTotal: leitos.length,
      visitantesDentro: dentro.length,
      visitantesExpirados: expirados.length,
      psAtendimento: psLeitos.filter((leito) => leito.status === 'em_atendimento').length,
      rpaOcupados: rpa.filter((leito) => leito.status === 'ocupado').length,
      manutencaoAtrasada,
    }
  }, [cirurgiasHoje, data])

  if (data.loading) return <LoadingState />

  return (
    <div className="space-y-5">
      <div className="card bg-gradient-to-r from-primary to-primary-hover p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">{HOSPITAL_NAME}</p>
        <h2 className="mt-1 text-xl font-bold sm:text-2xl">Olá, {user?.nome?.split(' ')[0] || 'equipe'} — resumo de {formatDate(todayISO())}</h2>
        <p className="mt-1 text-sm text-white/80">
          {stats.totalHoje} cirurgia(s) programadas · {stats.emAndamento} em andamento · {stats.salasDisponiveis} de {stats.salasTotal} salas livres
        </p>
      </div>

      <KpiGrid>
        <KpiCard label="Cirurgias hoje" value={stats.totalHoje} hint={`${stats.finalizadas} finalizadas`} icon={CalendarDays} tone="primary" />
        <KpiCard label="Em andamento" value={stats.emAndamento} hint="Salas em procedimento" icon={Activity} tone="red" />
        <KpiCard label="Salas disponíveis" value={`${stats.salasDisponiveis}/${stats.salasTotal}`} hint="Mapa cirúrgico" icon={LayoutGrid} tone="emerald" />
        <KpiCard
          label="Ocupação de leitos"
          value={`${percent(stats.leitosOcupados, stats.leitosTotal)}%`}
          hint={`${stats.leitosOcupados} de ${stats.leitosTotal} leitos`}
          icon={BedDouble}
          tone="accent"
        />
      </KpiGrid>

      <KpiGrid>
        <KpiCard label="Pronto Socorro" value={stats.psAtendimento} hint="Em atendimento agora" icon={ClipboardList} tone="violet" />
        <KpiCard label="RPA ocupada" value={stats.rpaOcupados} hint="Recuperação pós-anestésica" icon={HeartPulse} tone="amber" />
        <KpiCard label="Acompanhantes" value={stats.visitantesDentro} hint={`${stats.visitantesExpirados} com tempo excedido`} icon={Users} tone="slate" />
        <KpiCard label="Manutenções atrasadas" value={stats.manutencaoAtrasada.length} hint="Equipamentos" icon={AlertTriangle} tone={stats.manutencaoAtrasada.length ? 'red' : 'emerald'} />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Cirurgias de hoje"
            description="Programação do centro cirúrgico"
            icon={CalendarDays}
            actions={
              <Link to="/agendamento" className="btn-ghost">
                Ver agendamento
              </Link>
            }
          />
          {cirurgiasHoje.length === 0 ? (
            <EmptyState title="Nenhum registro encontrado" description="Não há cirurgias programadas para hoje." />
          ) : (
            <TableWrapper>
              <thead>
                <tr>
                  <Th>Horário</Th>
                  <Th>Prontuário</Th>
                  <Th>Procedimento</Th>
                  <Th>Sala</Th>
                  <Th>Tipo</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cirurgiasHoje.map((cirurgia) => (
                  <tr key={cirurgia.id} className="transition hover:bg-slate-50">
                    <Td className="font-semibold">{cirurgia.hora_prevista || '—'}</Td>
                    <Td className="font-mono text-xs font-semibold text-primary">{cirurgia.prontuario}</Td>
                    <Td className="max-w-[240px] truncate">{cirurgia.procedimento}</Td>
                    <Td>{cirurgia.sala || '—'}</Td>
                    <Td>
                      <StatusBadge map={SURGERY_TYPES} value={cirurgia.tipo} />
                    </Td>
                    <Td>
                      <StatusBadge map={SURGERY_STATUS} value={cirurgia.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrapper>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Salas cirúrgicas"
            description="Situação em tempo real"
            icon={LayoutGrid}
            actions={
              <Link to="/mapa" className="btn-ghost">
                Mapa
              </Link>
            }
          />
          <div className="space-y-2 p-4">
            {(data.salas || []).length === 0 ? (
              <EmptyState title="Nenhum registro encontrado" />
            ) : (
              (data.salas || []).map((sala) => (
                <div key={sala.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${ROOM_STATUS[sala.status]?.card || 'border-border bg-white'}`}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{sala.nome}</p>
                    <p className="truncate text-xs text-slate-500">{sala.setor}</p>
                  </div>
                  <StatusBadge map={ROOM_STATUS} value={sala.status} />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {stats.manutencaoAtrasada.length > 0 ? (
        <Card className="border-amber-200">
          <CardHeader title="Alertas de manutenção" description="Equipamentos com manutenção preventiva vencida" icon={AlertTriangle} />
          <div className="divide-y divide-border">
            {stats.manutencaoAtrasada.map((equipamento) => (
              <div key={equipamento.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{equipamento.nome}</p>
                  <p className="truncate text-xs text-slate-500">
                    {equipamento.codigo} · {equipamento.sala || 'Sem sala'}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-amber-700">Vencida em {formatDate(equipamento.proxima_manutencao)}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  )
}

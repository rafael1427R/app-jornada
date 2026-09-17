import { useMemo, useState } from 'react'
import { ScrollText, ShieldCheck, User } from 'lucide-react'
import { useCollection } from '@/data/store'
import { Card, CardHeader, EmptyState, Input, KpiCard, KpiGrid, LoadingState, Pill, SearchInput, StatusBadge, TableWrapper, Td, Th } from '@/components/ui'
import { AUDIT_ACTIONS } from '@/lib/constants'
import { dateOf, formatDateTime, matches, todayISO } from '@/lib/format'

export default function Auditoria() {
  const { items: registros, loading } = useCollection('auditoria')
  const [busca, setBusca] = useState('')
  const [filtroAcao, setFiltroAcao] = useState('todas')
  const [filtroData, setFiltroData] = useState('')

  const lista = useMemo(
    () =>
      registros
        .filter((registro) => (filtroAcao === 'todas' ? true : registro.acao === filtroAcao))
        .filter((registro) => (filtroData ? dateOf(registro.data) === filtroData : true))
        .filter((registro) => matches(busca, registro.usuario, registro.referencia, registro.prontuario, registro.detalhe, registro.setor))
        .sort((a, b) => String(b.data).localeCompare(String(a.data))),
    [registros, filtroAcao, filtroData, busca],
  )

  const kpis = useMemo(() => {
    const hoje = registros.filter((registro) => dateOf(registro.data) === todayISO())
    return {
      total: registros.length,
      hoje: hoje.length,
      usuarios: new Set(registros.map((registro) => registro.usuario)).size,
      exclusoes: registros.filter((registro) => registro.acao === 'excluir').length,
    }
  }, [registros])

  if (loading) return <LoadingState />

  return (
    <div className="space-y-5">
      <KpiGrid>
        <KpiCard label="Registros" value={kpis.total} icon={ScrollText} tone="primary" />
        <KpiCard label="Hoje" value={kpis.hoje} icon={ScrollText} tone="accent" />
        <KpiCard label="Usuários com ações" value={kpis.usuarios} icon={User} tone="emerald" />
        <KpiCard label="Exclusões" value={kpis.exclusoes} icon={ShieldCheck} tone={kpis.exclusoes ? 'amber' : 'slate'} />
      </KpiGrid>

      <Card>
        <CardHeader title="Log de auditoria" description="Rastreabilidade das ações realizadas no sistema — quem fez, o quê e quando" icon={ScrollText} />

        <div className="space-y-3 border-b border-border px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SearchInput value={busca} onChange={setBusca} placeholder="Usuário, leito, prontuário ou descrição..." className="sm:col-span-2" />
            <Input type="date" value={filtroData} onChange={(event) => setFiltroData(event.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill active={filtroAcao === 'todas'} onClick={() => setFiltroAcao('todas')}>
              Todas ({registros.length})
            </Pill>
            {Object.entries(AUDIT_ACTIONS).map(([key, config]) => (
              <Pill key={key} active={filtroAcao === key} onClick={() => setFiltroAcao(key)}>
                {config.label} ({registros.filter((registro) => registro.acao === key).length})
              </Pill>
            ))}
          </div>
        </div>

        {lista.length === 0 ? (
          <EmptyState title="Nenhum registro encontrado" description="As ações realizadas no mapa de leitos aparecem aqui automaticamente." />
        ) : (
          <TableWrapper>
            <thead>
              <tr>
                <Th>Data / hora</Th>
                <Th>Usuário</Th>
                <Th>Ação</Th>
                <Th>Registro</Th>
                <Th>Prontuário</Th>
                <Th>Descrição</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((registro) => (
                <tr key={registro.id} className="transition hover:bg-slate-50">
                  <Td className="text-slate-500">{formatDateTime(registro.data)}</Td>
                  <Td>
                    <span className="font-semibold">{registro.usuario}</span>
                    <span className="ml-1 text-xs text-slate-400">({registro.funcao})</span>
                  </Td>
                  <Td>
                    <StatusBadge map={AUDIT_ACTIONS} value={registro.acao} />
                  </Td>
                  <Td className="font-semibold">
                    {registro.referencia || '—'}
                    {registro.setor ? <span className="ml-1 text-xs font-normal text-slate-400">{registro.setor}</span> : null}
                  </Td>
                  <Td className="font-mono text-xs font-semibold text-primary">{registro.prontuario || '—'}</Td>
                  <Td className="max-w-[360px] whitespace-normal text-slate-600">{registro.detalhe}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
        )}
      </Card>
    </div>
  )
}

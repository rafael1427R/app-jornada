import { useMemo, useState } from 'react'
import { ChevronRight, FileText, Printer } from 'lucide-react'
import { useCollections } from '@/data/store'
import { Card, CardHeader, EmptyState, KpiCard, KpiGrid, LoadingState, Modal, SearchInput, StatusBadge, TableWrapper, Td, Th } from '@/components/ui'
import { SURGERY_STATUS, SURGERY_TYPES } from '@/lib/constants'
import { formatDate, formatDateTime, matches } from '@/lib/format'
import { runPrint } from '@/lib/print'
import PrintArea from '@/components/PrintArea'
import PrintHeader from '@/components/PrintHeader'

export default function Prontuarios() {
  const data = useCollections(['cirurgias', 'psLeitos', 'psAltas'])
  const [busca, setBusca] = useState('')
  const [detalhe, setDetalhe] = useState(null)
  const [printData, setPrintData] = useState(null)

  const grupos = useMemo(() => {
    const map = new Map()
    ;(data.cirurgias || []).forEach((cirurgia) => {
      const chave = String(cirurgia.prontuario)
      if (!map.has(chave)) map.set(chave, [])
      map.get(chave).push(cirurgia)
    })
    return Array.from(map.entries())
      .map(([prontuario, cirurgias]) => {
        const ordenadas = [...cirurgias].sort((a, b) => `${b.data_prevista}${b.hora_prevista}`.localeCompare(`${a.data_prevista}${a.hora_prevista}`))
        return {
          prontuario,
          cirurgias: ordenadas,
          total: ordenadas.length,
          ultima: ordenadas[0],
          finalizadas: ordenadas.filter((item) => item.status === 'finalizada').length,
          canceladas: ordenadas.filter((item) => ['cancelada', 'suspensa'].includes(item.status)).length,
        }
      })
      .filter((grupo) => matches(busca, grupo.prontuario, grupo.ultima?.procedimento, grupo.ultima?.especialidade))
      .sort((a, b) => a.prontuario.localeCompare(b.prontuario))
  }, [data.cirurgias, busca])

  const atendimentosPs = useMemo(() => {
    const mapa = new Map()
    ;(data.psAltas || []).forEach((alta) => {
      const chave = String(alta.prontuario)
      mapa.set(chave, (mapa.get(chave) || 0) + 1)
    })
    return mapa
  }, [data.psAltas])

  function imprimir(grupo) {
    setPrintData(grupo)
    window.setTimeout(() => runPrint('a4'), 60)
  }

  if (data.loading) return <LoadingState />

  return (
    <div className="space-y-5">
      <KpiGrid className="xl:grid-cols-3">
        <KpiCard label="Prontuários com histórico" value={grupos.length} icon={FileText} tone="primary" />
        <KpiCard label="Cirurgias registradas" value={(data.cirurgias || []).length} icon={FileText} tone="accent" />
        <KpiCard label="Altas do pronto socorro" value={(data.psAltas || []).length} icon={FileText} tone="emerald" />
      </KpiGrid>

      <Card>
        <CardHeader title="Prontuários" description="Histórico cirúrgico agrupado por número de prontuário" icon={FileText} />
        <div className="border-b border-border px-5 py-4">
          <SearchInput value={busca} onChange={setBusca} placeholder="Buscar por prontuário ou procedimento..." />
        </div>

        {grupos.length === 0 ? (
          <EmptyState title="Nenhum registro encontrado" description="Nenhum prontuário corresponde à busca." />
        ) : (
          <TableWrapper>
            <thead>
              <tr>
                <Th>Prontuário</Th>
                <Th>Cirurgias</Th>
                <Th>Último procedimento</Th>
                <Th>Data</Th>
                <Th>Status</Th>
                <Th>Passagens no PS</Th>
                <Th className="text-right">Detalhe</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {grupos.map((grupo) => (
                <tr key={grupo.prontuario} className="cursor-pointer transition hover:bg-slate-50" onClick={() => setDetalhe(grupo)}>
                  <Td className="font-mono text-sm font-bold text-primary">{grupo.prontuario}</Td>
                  <Td>
                    <span className="font-semibold">{grupo.total}</span>
                    <span className="ml-2 text-xs text-slate-400">{grupo.finalizadas} finalizadas · {grupo.canceladas} canceladas</span>
                  </Td>
                  <Td className="max-w-[260px] truncate">{grupo.ultima?.procedimento}</Td>
                  <Td>{formatDate(grupo.ultima?.data_prevista)}</Td>
                  <Td>
                    <StatusBadge map={SURGERY_STATUS} value={grupo.ultima?.status} />
                  </Td>
                  <Td>{atendimentosPs.get(grupo.prontuario) || 0}</Td>
                  <Td className="text-right">
                    <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
        )}
      </Card>

      <Modal
        open={Boolean(detalhe)}
        onClose={() => setDetalhe(null)}
        size="lg"
        title={detalhe ? `Prontuário ${detalhe.prontuario}` : ''}
        description="Histórico completo de procedimentos — sem dados pessoais identificáveis"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setDetalhe(null)}>
              Fechar
            </button>
            <button type="button" className="btn-primary" onClick={() => imprimir(detalhe)}>
              <Printer className="h-4 w-4" /> Imprimir histórico
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {(detalhe?.cirurgias || []).map((cirurgia) => (
            <div key={cirurgia.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-800">{cirurgia.procedimento}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(cirurgia.data_prevista)} às {cirurgia.hora_prevista} · {cirurgia.sala}
                  </p>
                </div>
                <div className="flex gap-2">
                  <StatusBadge map={SURGERY_TYPES} value={cirurgia.tipo} />
                  <StatusBadge map={SURGERY_STATUS} value={cirurgia.status} />
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-slate-400">Técnica</dt>
                  <dd className="text-slate-700">{cirurgia.tecnica || '—'}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-slate-400">Anestesia</dt>
                  <dd className="text-slate-700">{cirurgia.anestesia || '—'}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-slate-400">Cirurgião</dt>
                  <dd className="text-slate-700">{cirurgia.cirurgiao || '—'}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-slate-400">Checklist OMS</dt>
                  <dd className="text-slate-700">{(cirurgia.checklist_oms || []).length}/10 itens</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-slate-400">Início real</dt>
                  <dd className="text-slate-700">{cirurgia.inicio_real ? formatDateTime(cirurgia.inicio_real) : '—'}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-slate-400">Fim real</dt>
                  <dd className="text-slate-700">{cirurgia.fim_real ? formatDateTime(cirurgia.fim_real) : '—'}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-slate-400">Leito RPA</dt>
                  <dd className="text-slate-700">{cirurgia.leito_rpa || '—'}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-slate-400">Intercorrências</dt>
                  <dd className="text-slate-700">
                    {[cirurgia.convertida && 'Conversão', cirurgia.reoperacao && 'Reoperação', cirurgia.infeccao && 'Infecção', cirurgia.evento_adverso && 'Evento adverso', cirurgia.obito && 'Óbito']
                      .filter(Boolean)
                      .join(', ') || 'Nenhuma'}
                  </dd>
                </div>
              </dl>
              {cirurgia.observacao ? <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{cirurgia.observacao}</p> : null}
            </div>
          ))}
        </div>
      </Modal>

      <PrintArea active={Boolean(printData)}>
        {printData ? (
          <div className="p-6 font-sans text-[12px] text-black">
            <PrintHeader titulo={`Histórico cirúrgico — Prontuário ${printData.prontuario}`} subtitulo={`${printData.total} procedimento(s) registrado(s)`} />
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black px-2 py-1 text-left">Data</th>
                  <th className="border border-black px-2 py-1 text-left">Procedimento</th>
                  <th className="border border-black px-2 py-1 text-left">Sala</th>
                  <th className="border border-black px-2 py-1 text-left">Técnica</th>
                  <th className="border border-black px-2 py-1 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {printData.cirurgias.map((cirurgia) => (
                  <tr key={cirurgia.id}>
                    <td className="border border-black px-2 py-1">{formatDate(cirurgia.data_prevista)}</td>
                    <td className="border border-black px-2 py-1">{cirurgia.procedimento}</td>
                    <td className="border border-black px-2 py-1">{cirurgia.sala}</td>
                    <td className="border border-black px-2 py-1">{cirurgia.tecnica}</td>
                    <td className="border border-black px-2 py-1">{SURGERY_STATUS[cirurgia.status]?.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-[10px]">Documento gerado sem dados pessoais identificáveis, em conformidade com a LGPD (Lei 13.709/2018).</p>
          </div>
        ) : null}
      </PrintArea>
    </div>
  )
}

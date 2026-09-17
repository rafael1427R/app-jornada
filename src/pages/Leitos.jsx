import { useMemo, useState } from 'react'
import { BedDouble, Building2, LogIn, LogOut, Sparkles, Wrench } from 'lucide-react'
import { useCollection } from '@/data/store'
import { useToast } from '@/context/ToastContext'
import { Card, CardHeader, EmptyState, Field, Input, KpiCard, KpiGrid, LoadingState, Modal, Pill, SearchInput, StatusBadge, Textarea } from '@/components/ui'
import { BED_SECTORS, BED_STATUS } from '@/lib/constants'
import { formatDate, formatDateTime, matches, percent } from '@/lib/format'

const SECTOR_ORDER = BED_SECTORS.map((item) => item.setor)

export default function Leitos() {
  const { items: leitos, loading, update } = useCollection('leitos')
  const toast = useToast()
  const [busca, setBusca] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [ocupacao, setOcupacao] = useState(null)
  const [form, setForm] = useState({ prontuario: '', previsao_alta: '', observacao: '' })
  const [errors, setErrors] = useState({})

  const kpis = useMemo(() => {
    const ocupados = leitos.filter((leito) => leito.status === 'ocupado').length
    return {
      total: leitos.length,
      ocupados,
      disponiveis: leitos.filter((leito) => leito.status === 'disponivel').length,
      indisponiveis: leitos.filter((leito) => ['manutencao', 'limpeza'].includes(leito.status)).length,
      taxa: percent(ocupados, leitos.length),
    }
  }, [leitos])

  const filtrados = useMemo(
    () =>
      leitos
        .filter((leito) => (filtroSetor === 'todos' ? true : leito.setor === filtroSetor))
        .filter((leito) => (filtroStatus === 'todos' ? true : leito.status === filtroStatus))
        .filter((leito) => matches(busca, leito.nome, leito.setor, leito.prontuario)),
    [leitos, filtroSetor, filtroStatus, busca],
  )

  const porSetor = useMemo(() => {
    const grupos = new Map()
    filtrados.forEach((leito) => {
      if (!grupos.has(leito.setor)) grupos.set(leito.setor, [])
      grupos.get(leito.setor).push(leito)
    })
    return Array.from(grupos.entries())
      .sort((a, b) => SECTOR_ORDER.indexOf(a[0]) - SECTOR_ORDER.indexOf(b[0]))
      .map(([setor, lista]) => [setor, lista.sort((a, b) => (a.numero || 0) - (b.numero || 0))])
  }, [filtrados])

  function abrirOcupacao(leito) {
    setForm({ prontuario: leito.prontuario || '', previsao_alta: leito.previsao_alta || '', observacao: leito.observacao || '' })
    setErrors({})
    setOcupacao(leito)
  }

  async function confirmarOcupacao(event) {
    event.preventDefault()
    if (!/^\d{3,12}$/.test(form.prontuario.trim())) {
      setErrors({ prontuario: 'Informe um número de prontuário válido.' })
      return
    }
    await update(ocupacao.id, {
      status: 'ocupado',
      prontuario: form.prontuario.trim(),
      previsao_alta: form.previsao_alta,
      observacao: form.observacao.trim(),
      ocupado_em: new Date().toISOString(),
    })
    toast.success(`Leito ${ocupacao.nome} ocupado pelo prontuário ${form.prontuario.trim()}.`)
    setOcupacao(null)
  }

  async function darAlta(leito) {
    if (!window.confirm(`Registrar alta do prontuário ${leito.prontuario} no leito ${leito.nome}?`)) return
    await update(leito.id, { status: 'limpeza', prontuario: '', ocupado_em: '', previsao_alta: '' })
    toast.success('Alta registrada. Leito enviado para higienização.')
  }

  async function mudarStatus(leito, status) {
    await update(leito.id, { status })
    toast.success(`Leito ${leito.nome}: ${BED_STATUS[status].label.toLowerCase()}.`)
  }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-5">
      <KpiGrid className="xl:grid-cols-5">
        <KpiCard label="Leitos cadastrados" value={kpis.total} icon={BedDouble} tone="primary" />
        <KpiCard label="Ocupados" value={kpis.ocupados} icon={BedDouble} tone="red" />
        <KpiCard label="Disponíveis" value={kpis.disponiveis} icon={BedDouble} tone="emerald" />
        <KpiCard label="Limpeza / manutenção" value={kpis.indisponiveis} icon={Wrench} tone="amber" />
        <KpiCard label="Taxa de ocupação" value={`${kpis.taxa}%`} icon={BedDouble} tone="accent" />
      </KpiGrid>

      <Card>
        <CardHeader title="Mapa de leitos" description="150 leitos distribuídos em 9 setores — identificação por prontuário" icon={BedDouble} />

        <div className="space-y-3 border-b border-border px-5 py-4">
          <SearchInput value={busca} onChange={setBusca} placeholder="Leito, setor ou prontuário..." />
          <div className="flex flex-wrap gap-2">
            <Pill active={filtroSetor === 'todos'} onClick={() => setFiltroSetor('todos')}>
              Todos os setores ({leitos.length})
            </Pill>
            {BED_SECTORS.map((setor) => (
              <Pill key={setor.setor} active={filtroSetor === setor.setor} onClick={() => setFiltroSetor(setor.setor)}>
                {setor.setor} ({leitos.filter((leito) => leito.setor === setor.setor).length})
              </Pill>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill active={filtroStatus === 'todos'} onClick={() => setFiltroStatus('todos')}>
              Todos os status
            </Pill>
            {Object.entries(BED_STATUS).map(([key, config]) => (
              <Pill key={key} active={filtroStatus === key} onClick={() => setFiltroStatus(key)}>
                {config.label} ({leitos.filter((leito) => leito.status === key).length})
              </Pill>
            ))}
          </div>
        </div>

        {porSetor.length === 0 ? (
          <EmptyState title="Nenhum registro encontrado" description="Nenhum leito corresponde aos filtros selecionados." />
        ) : (
          <div className="space-y-7 p-5">
            {porSetor.map(([setor, lista]) => {
              const ocupados = lista.filter((leito) => leito.status === 'ocupado').length
              return (
                <section key={setor}>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">{setor}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                      {ocupados}/{lista.length} ocupados · {percent(ocupados, lista.length)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {lista.map((leito) => {
                      const config = BED_STATUS[leito.status] || BED_STATUS.disponivel
                      return (
                        <div key={leito.id} className={`rounded-xl border p-3 ${config.card}`}>
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-sm font-bold text-slate-800">{leito.nome}</p>
                            <span className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
                          </div>
                          <p className="mt-1 truncate font-mono text-xs font-semibold text-primary">{leito.prontuario || '—'}</p>
                          {leito.status === 'ocupado' ? (
                            <p className="mt-0.5 truncate text-[10px] text-slate-500">
                              Desde {formatDateTime(leito.ocupado_em)}
                              {leito.previsao_alta ? ` · alta ${formatDate(leito.previsao_alta)}` : ''}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-[10px] text-slate-400">{config.label}</p>
                          )}

                          <div className="mt-2 flex flex-wrap gap-1">
                            {leito.status === 'disponivel' ? (
                              <button type="button" className="btn-primary flex-1 px-2 py-1 text-[11px]" onClick={() => abrirOcupacao(leito)}>
                                <LogIn className="h-3.5 w-3.5" /> Ocupar
                              </button>
                            ) : null}
                            {leito.status === 'ocupado' ? (
                              <button type="button" className="btn-accent flex-1 px-2 py-1 text-[11px]" onClick={() => darAlta(leito)}>
                                <LogOut className="h-3.5 w-3.5" /> Alta
                              </button>
                            ) : null}
                            {leito.status === 'limpeza' ? (
                              <button type="button" className="btn-ghost flex-1 px-2 py-1 text-[11px]" onClick={() => mudarStatus(leito, 'disponivel')}>
                                <Sparkles className="h-3.5 w-3.5" /> Liberar
                              </button>
                            ) : null}
                            {leito.status === 'manutencao' ? (
                              <button type="button" className="btn-ghost flex-1 px-2 py-1 text-[11px]" onClick={() => mudarStatus(leito, 'disponivel')}>
                                Concluir
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn-ghost px-2 py-1 text-[11px]"
                                onClick={() => mudarStatus(leito, 'manutencao')}
                                aria-label="Enviar para manutenção"
                                disabled={leito.status === 'ocupado'}
                              >
                                <Wrench className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(ocupacao)}
        onClose={() => setOcupacao(null)}
        size="sm"
        title={ocupacao ? `Ocupar leito ${ocupacao.nome}` : ''}
        description="Registre somente o número do prontuário do paciente."
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setOcupacao(null)}>
              Cancelar
            </button>
            <button type="submit" form="form-leito" className="btn-primary">
              Confirmar ocupação
            </button>
          </>
        }
      >
        <form id="form-leito" onSubmit={confirmarOcupacao} className="space-y-4">
          <Field label="Prontuário" error={errors.prontuario}>
            <Input value={form.prontuario} inputMode="numeric" onChange={(event) => setForm({ ...form, prontuario: event.target.value })} autoFocus />
          </Field>
          <Field label="Previsão de alta">
            <Input type="date" value={form.previsao_alta} onChange={(event) => setForm({ ...form, previsao_alta: event.target.value })} />
          </Field>
          <Field label="Observações">
            <Textarea value={form.observacao} onChange={(event) => setForm({ ...form, observacao: event.target.value })} />
          </Field>
        </form>
      </Modal>
    </div>
  )
}

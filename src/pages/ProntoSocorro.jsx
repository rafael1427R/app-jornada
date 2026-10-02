import { useMemo, useState } from 'react'
import { Ambulance, ClipboardList, DoorOpen, FileText, LogIn, Stethoscope } from 'lucide-react'
import { useCollection } from '@/data/store'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Card, CardHeader, EmptyState, Field, Input, KpiCard, KpiGrid, LoadingState, Modal, Pill, SearchInput, Select, StatusBadge, TableWrapper, Td, Textarea, Th } from '@/components/ui'
import { PS_CLASSIFICATION, PS_STATUS } from '@/lib/constants'
import { dateOf, formatDateTime, formatDuration, matches, minutesBetween, todayISO, uid } from '@/lib/format'

const EMPTY_ADMISSAO = { prontuario: '', classificacao: 'verde', queixa: '' }

export default function ProntoSocorro() {
  const { items: leitos, loading, update } = useCollection('psLeitos')
  const { items: altas, create: registrarAlta } = useCollection('psAltas')
  const { user, canDo } = useAuth()
  const toast = useToast()
  const podeCriar = canDo('pronto-socorro', 'criar')
  const podeEditar = canDo('pronto-socorro', 'editar')
  const podeExcluir = canDo('pronto-socorro', 'excluir')

  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [admissao, setAdmissao] = useState(null)
  const [formAdmissao, setFormAdmissao] = useState(EMPTY_ADMISSAO)
  const [errors, setErrors] = useState({})
  const [detalhe, setDetalhe] = useState(null)
  const [evolucao, setEvolucao] = useState('')
  const [erroEvolucao, setErroEvolucao] = useState('')
  const [altaMotivo, setAltaMotivo] = useState('Alta médica')
  const [aba, setAba] = useState('leitos')

  const leitoAtual = useMemo(() => leitos.find((leito) => leito.id === detalhe?.id) || detalhe, [leitos, detalhe])

  const kpis = useMemo(() => {
    const emAtendimento = leitos.filter((leito) => leito.status === 'em_atendimento')
    const evoluidos = emAtendimento.filter((leito) => (leito.evolucoes || []).some((registro) => dateOf(registro.data) === todayISO()))
    return {
      emAtendimento: emAtendimento.length,
      evoluidos: evoluidos.length,
      disponiveis: leitos.filter((leito) => leito.status === 'disponivel').length,
      altasHoje: altas.filter((alta) => dateOf(alta.data) === todayISO()).length,
    }
  }, [leitos, altas])

  const lista = useMemo(
    () =>
      leitos
        .filter((leito) => (filtro === 'todos' ? true : leito.status === filtro))
        .filter((leito) => matches(busca, leito.nome, leito.prontuario, leito.queixa))
        .sort((a, b) => String(a.nome).localeCompare(String(b.nome))),
    [leitos, filtro, busca],
  )

  const altasOrdenadas = useMemo(() => [...altas].sort((a, b) => String(b.data).localeCompare(String(a.data))), [altas])

  function abrirAdmissao(leito) {
    setFormAdmissao(EMPTY_ADMISSAO)
    setErrors({})
    setAdmissao(leito)
  }

  async function confirmarAdmissao(event) {
    event.preventDefault()
    if (!/^\d{3,12}$/.test(formAdmissao.prontuario.trim())) {
      setErrors({ prontuario: 'Informe um número de prontuário válido.' })
      return
    }
    await update(admissao.id, {
      status: 'em_atendimento',
      prontuario: formAdmissao.prontuario.trim(),
      classificacao: formAdmissao.classificacao,
      queixa: formAdmissao.queixa.trim(),
      admitido_em: new Date().toISOString(),
      admitido_por: user?.nome || 'Sistema',
      evolucoes: [],
    })
    toast.success(`Prontuário ${formAdmissao.prontuario.trim()} admitido no ${admissao.nome}.`)
    setAdmissao(null)
  }

  async function salvarEvolucao(event) {
    event.preventDefault()
    if (evolucao.trim().length < 10) {
      setErroEvolucao('Descreva a evolução com pelo menos 10 caracteres.')
      return
    }
    const registro = {
      id: uid(),
      texto: evolucao.trim(),
      autor: user?.nome || 'Profissional',
      funcao: user?.funcao || '—',
      data: new Date().toISOString(),
    }
    await update(leitoAtual.id, { evolucoes: [...(leitoAtual.evolucoes || []), registro] })
    setEvolucao('')
    setErroEvolucao('')
    toast.success('Evolução registrada no histórico do leito.')
  }

  async function darAlta() {
    if (!window.confirm(`Registrar alta do prontuário ${leitoAtual.prontuario} do ${leitoAtual.nome}?`)) return
    await registrarAlta({
      leito: leitoAtual.nome,
      prontuario: leitoAtual.prontuario,
      classificacao: leitoAtual.classificacao,
      queixa: leitoAtual.queixa,
      motivo: altaMotivo,
      admitido_em: leitoAtual.admitido_em,
      data: new Date().toISOString(),
      responsavel: user?.nome || 'Sistema',
      funcao_responsavel: user?.funcao || '—',
      evolucoes: leitoAtual.evolucoes || [],
    })
    await update(leitoAtual.id, {
      status: 'higienizacao',
      prontuario: '',
      classificacao: '',
      queixa: '',
      admitido_em: '',
      admitido_por: '',
      evolucoes: [],
    })
    toast.success('Alta registrada e leito liberado para higienização.')
    setDetalhe(null)
  }

  async function liberar(leito) {
    await update(leito.id, { status: 'disponivel' })
    toast.success(`${leito.nome} disponível para novo atendimento.`)
  }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-5">
      <KpiGrid>
        <KpiCard label="Em atendimento" value={kpis.emAtendimento} icon={Ambulance} tone="primary" />
        <KpiCard label="Evoluídos hoje" value={kpis.evoluidos} icon={FileText} tone="accent" />
        <KpiCard label="Disponíveis" value={kpis.disponiveis} icon={DoorOpen} tone="emerald" />
        <KpiCard label="Altas hoje" value={kpis.altasHoje} icon={ClipboardList} tone="violet" />
      </KpiGrid>

      <div className="flex flex-wrap gap-2">
        <Pill active={aba === 'leitos'} onClick={() => setAba('leitos')}>
          Quartos digitais
        </Pill>
        <Pill active={aba === 'altas'} onClick={() => setAba('altas')}>
          Log de altas ({altas.length})
        </Pill>
      </div>

      {aba === 'leitos' ? (
        <Card>
          <CardHeader title="Pronto Socorro Digital" description="30 quartos digitais · admissão, evolução clínica e alta" icon={Ambulance} />

          <div className="space-y-3 border-b border-border px-5 py-4">
            <SearchInput value={busca} onChange={setBusca} placeholder="Quarto, prontuário ou queixa..." />
            <div className="flex flex-wrap gap-2">
              <Pill active={filtro === 'todos'} onClick={() => setFiltro('todos')}>
                Todos ({leitos.length})
              </Pill>
              {Object.entries(PS_STATUS).map(([key, config]) => (
                <Pill key={key} active={filtro === key} onClick={() => setFiltro(key)}>
                  {config.label} ({leitos.filter((leito) => leito.status === key).length})
                </Pill>
              ))}
            </div>
          </div>

          {lista.length === 0 ? (
            <EmptyState title="Nenhum registro encontrado" description="Ajuste os filtros para visualizar os quartos digitais." />
          ) : (
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {lista.map((leito) => {
                const config = PS_STATUS[leito.status] || PS_STATUS.disponivel
                const permanencia = leito.admitido_em ? minutesBetween(leito.admitido_em) : null
                return (
                  <div key={leito.id} className={`rounded-xl border p-4 ${config.card}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-base font-bold text-slate-800">{leito.nome}</p>
                      <StatusBadge map={PS_STATUS} value={leito.status} />
                    </div>

                    {leito.status === 'em_atendimento' ? (
                      <div className="mt-3 space-y-1 rounded-lg bg-white/70 px-3 py-2 text-xs">
                        <p className="font-mono text-sm font-bold text-primary">{leito.prontuario}</p>
                        {leito.classificacao ? <StatusBadge map={PS_CLASSIFICATION} value={leito.classificacao} /> : null}
                        <p className="line-clamp-2 text-slate-600">{leito.queixa || 'Queixa não informada'}</p>
                        <p className="text-slate-500">Permanência: {formatDuration(permanencia)}</p>
                        <p className="text-slate-500">{(leito.evolucoes || []).length} evolução(ões)</p>
                      </div>
                    ) : (
                      <p className="mt-3 rounded-lg bg-white/70 px-3 py-5 text-center text-xs text-slate-400">
                        {leito.status === 'higienizacao' ? 'Aguardando higienização' : 'Quarto livre'}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {podeCriar && leito.status === 'disponivel' ? (
                        <button type="button" className="btn-primary flex-1" onClick={() => abrirAdmissao(leito)}>
                          <LogIn className="h-4 w-4" /> Admitir
                        </button>
                      ) : null}
                      {leito.status === 'em_atendimento' ? (
                        <button type="button" className="btn-accent flex-1" onClick={() => { setDetalhe(leito); setEvolucao(''); setErroEvolucao(''); setAltaMotivo('Alta médica') }}>
                          <Stethoscope className="h-4 w-4" /> Atender
                        </button>
                      ) : null}
                      {podeEditar && leito.status === 'higienizacao' ? (
                        <button type="button" className="btn-ghost flex-1" onClick={() => liberar(leito)}>
                          Liberar quarto
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader title="Log de altas" description="Registro das altas do pronto socorro digital" icon={ClipboardList} />
          {altasOrdenadas.length === 0 ? (
            <EmptyState title="Nenhum registro encontrado" description="Ainda não há altas registradas." />
          ) : (
            <TableWrapper>
              <thead>
                <tr>
                  <Th>Data da alta</Th>
                  <Th>Quarto</Th>
                  <Th>Prontuário</Th>
                  <Th>Permanência</Th>
                  <Th>Motivo</Th>
                  <Th>Responsável</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {altasOrdenadas.map((alta) => (
                  <tr key={alta.id} className="transition hover:bg-slate-50">
                    <Td>{formatDateTime(alta.data)}</Td>
                    <Td className="font-semibold">{alta.leito}</Td>
                    <Td className="font-mono text-xs font-semibold text-primary">{alta.prontuario}</Td>
                    <Td className="text-slate-500">{alta.admitido_em ? formatDuration(minutesBetween(alta.admitido_em, alta.data)) : '—'}</Td>
                    <Td>{alta.motivo}</Td>
                    <Td className="text-slate-500">
                      {alta.responsavel}
                      <span className="ml-1 text-xs text-slate-400">({alta.funcao_responsavel})</span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrapper>
          )}
        </Card>
      )}

      <Modal
        open={Boolean(admissao)}
        onClose={() => setAdmissao(null)}
        size="sm"
        title={admissao ? `Admissão — ${admissao.nome}` : ''}
        description="Identificação exclusivamente por número de prontuário."
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setAdmissao(null)}>
              Cancelar
            </button>
            <button type="submit" form="form-ps-admissao" className="btn-primary">
              Admitir
            </button>
          </>
        }
      >
        <form id="form-ps-admissao" onSubmit={confirmarAdmissao} className="space-y-4">
          <Field label="Prontuário" error={errors.prontuario}>
            <Input value={formAdmissao.prontuario} inputMode="numeric" onChange={(event) => setFormAdmissao({ ...formAdmissao, prontuario: event.target.value })} autoFocus />
          </Field>
          <Field label="Classificação de risco">
            <Select value={formAdmissao.classificacao} onChange={(event) => setFormAdmissao({ ...formAdmissao, classificacao: event.target.value })}>
              {Object.entries(PS_CLASSIFICATION).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Queixa principal">
            <Textarea value={formAdmissao.queixa} onChange={(event) => setFormAdmissao({ ...formAdmissao, queixa: event.target.value })} placeholder="Dor abdominal há 2 dias" />
          </Field>
        </form>
      </Modal>

      <Modal
        open={Boolean(detalhe)}
        onClose={() => setDetalhe(null)}
        size="lg"
        title={leitoAtual ? `${leitoAtual.nome} — prontuário ${leitoAtual.prontuario}` : ''}
        description="Evolução clínica e alta"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setDetalhe(null)}>
              Fechar
            </button>
            {podeEditar ? (
              <button type="button" className="btn-danger" onClick={darAlta}>
                <DoorOpen className="h-4 w-4" /> Registrar alta
              </button>
            ) : null}
          </>
        }
      >
        {leitoAtual ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-xs sm:grid-cols-4">
              <div>
                <p className="font-semibold uppercase tracking-wide text-slate-400">Admissão</p>
                <p className="text-slate-700">{formatDateTime(leitoAtual.admitido_em)}</p>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wide text-slate-400">Permanência</p>
                <p className="text-slate-700">{formatDuration(minutesBetween(leitoAtual.admitido_em))}</p>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wide text-slate-400">Classificação</p>
                <p className="text-slate-700">{PS_CLASSIFICATION[leitoAtual.classificacao]?.label || '—'}</p>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wide text-slate-400">Admitido por</p>
                <p className="text-slate-700">{leitoAtual.admitido_por || '—'}</p>
              </div>
              <div className="col-span-2 sm:col-span-4">
                <p className="font-semibold uppercase tracking-wide text-slate-400">Queixa principal</p>
                <p className="text-slate-700">{leitoAtual.queixa || '—'}</p>
              </div>
            </div>

            <form onSubmit={salvarEvolucao} className={`space-y-3 ${podeEditar ? '' : 'hidden'}`}>
              <Field label="Nova evolução clínica" error={erroEvolucao} hint={`Registro assinado por ${user?.nome || 'profissional'} (${user?.funcao || '—'})`}>
                <Textarea value={evolucao} onChange={(event) => setEvolucao(event.target.value)} placeholder="Paciente em bom estado geral, consciente, orientado..." />
              </Field>
              <div className="flex justify-end">
                <button type="submit" className="btn-primary">
                  Registrar evolução
                </button>
              </div>
            </form>

            <section>
              <p className="label">Histórico de evoluções ({(leitoAtual.evolucoes || []).length})</p>
              {(leitoAtual.evolucoes || []).length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">Nenhum registro encontrado.</p>
              ) : (
                <div className="space-y-2">
                  {[...(leitoAtual.evolucoes || [])].reverse().map((registro) => (
                    <div key={registro.id} className="rounded-xl border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-700">
                          {registro.autor} <span className="font-normal text-slate-400">· {registro.funcao}</span>
                        </p>
                        <p className="text-xs text-slate-400">{formatDateTime(registro.data)}</p>
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700">{registro.texto}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <Field label="Motivo da alta">
              <Select value={altaMotivo} onChange={(event) => setAltaMotivo(event.target.value)}>
                {['Alta médica', 'Alta a pedido', 'Transferência interna', 'Transferência externa', 'Evasão', 'Óbito'].map((motivo) => (
                  <option key={motivo} value={motivo}>
                    {motivo}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

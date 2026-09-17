import { useMemo, useState } from 'react'
import { Clock, Download, Eye, ListChecks, Lock, Pencil, Plus, Printer, Salad, Trash2, UtensilsCrossed } from 'lucide-react'
import { useCollection } from '@/data/store'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useAudit } from '@/lib/audit'
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  KpiCard,
  KpiGrid,
  LoadingState,
  Modal,
  Pill,
  SearchInput,
  Select,
  StatusBadge,
  TableWrapper,
  Td,
  Textarea,
  Th,
} from '@/components/ui'
import {
  BED_SECTORS,
  DIET_ADEQUACOES,
  DIET_CONSISTENCY,
  DIET_GROUPS,
  DIET_MODIFICATIONS,
  DIET_REGIMES,
  DIET_STATUS,
  ENTERAL_ROUTES,
  ENTERAL_TYPES,
  FEEDING_ROUTES,
  MEALS,
  NUTRITION_FLOW,
  OBSERVATION_HOURS,
  grupoDaDieta,
} from '@/lib/constants'
import { viaDaDieta, usaSonda } from '@/lib/nutricao'
import { formatDate, formatDateTime, formatDuration, matches, minutesBetween, todayISO } from '@/lib/format'
import { useNow } from '@/lib/useNow'
import { baixarCsv, carimboArquivo } from '@/lib/csv'
import { runPrint } from '@/lib/print'
import PrintArea from '@/components/PrintArea'
import PrintHeader from '@/components/PrintHeader'

const EMPTY = {
  prontuario: '',
  leito: '',
  setor: '',
  regime: 'internacao',
  consistencia: 'Livre',
  modificacao: 'Sem modificação',
  adequacoes: [],
  via_enteral: 'VO',
  enteral_tipo: '',
  enteral_formula: '',
  enteral_volume: '',
  dieta_prescrita: '',
  preparacao_diferenciada: '',
  acompanhante_refeicao: false,
  observacoes: '',
  status: 'ativa',
  data_prescricao: todayISO(),
  inicio_em: '',
  // Campos usados apenas quando a etiqueta é emitida com identificação nominal.
  nome_paciente: '',
  nome_mae: '',
  data_nascimento: '',
}

/** Cor do tempo de permanência conforme as faixas de alerta. */
export function toneDoTempo(minutos, regime) {
  const horas = minutos / 60
  if (regime !== 'observacao') return 'text-slate-500'
  if (horas >= OBSERVATION_HOURS.limite) return 'font-bold text-red-600'
  if (horas >= OBSERVATION_HOURS.critico) return 'font-semibold text-red-500'
  if (horas >= OBSERVATION_HOURS.atencao) return 'font-semibold text-amber-600'
  return 'font-semibold text-emerald-600'
}

export default function Nutricao() {
  const { items: dietas, loading, create, update, remove } = useCollection('dietas')
  const { items: leitos, update: atualizarLeito } = useCollection('leitos')
  const { user, canDo } = useAuth()
  const toast = useToast()
  const registrarLog = useAudit()
  useNow(30000)

  const podeCriar = canDo('nutricao', 'criar')
  const podeEditar = canDo('nutricao', 'editar')
  const podeExcluir = canDo('nutricao', 'excluir')

  const [aba, setAba] = useState('prescricoes')
  const [busca, setBusca] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('todos')
  const [filtroRegime, setFiltroRegime] = useState('todos')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [imprimindo, setImprimindo] = useState(false)

  const ativas = useMemo(() => dietas.filter((dieta) => dieta.status === 'ativa'), [dietas])

  /** Minutos desde o início do regime atual (ou do cadastro, em registros antigos). */
  const tempoDe = (dieta) => minutesBetween(dieta.inicio_em || dieta.criado_em)

  const kpis = useMemo(
    () => ({
      ativas: ativas.length,
      observacao: ativas.filter((dieta) => dieta.regime === 'observacao').length,
      enteral: ativas.filter((dieta) => usaSonda(dieta)).length,
      acompanhantes: ativas.filter((dieta) => dieta.acompanhante_refeicao).length,
      excedidos: ativas.filter((dieta) => dieta.regime === 'observacao' && tempoDe(dieta) / 60 >= OBSERVATION_HOURS.limite).length,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ativas],
  )

  const lista = useMemo(
    () =>
      dietas
        .filter((dieta) => (filtroSetor === 'todos' ? true : dieta.setor === filtroSetor))
        .filter((dieta) => (filtroRegime === 'todos' ? true : (dieta.regime || 'internacao') === filtroRegime))
        .filter((dieta) => matches(busca, dieta.prontuario, dieta.leito, dieta.setor, dieta.consistencia, dieta.modificacao))
        .sort((a, b) => String(a.leito).localeCompare(String(b.leito))),
    [dietas, filtroSetor, filtroRegime, busca],
  )

  /** Leitos agrupados: ocupados primeiro, para a prescrição do dia a dia. */
  const leitosAgrupados = useMemo(() => {
    const ordenados = [...leitos].sort((a, b) => String(a.nome).localeCompare(String(b.nome)))
    return {
      ocupados: ordenados.filter((leito) => leito.status === 'ocupado'),
      outros: ordenados.filter((leito) => leito.status !== 'ocupado'),
    }
  }, [leitos])

  const mapaRefeicoes = useMemo(() => {
    const setores = new Map()
    ativas.forEach((dieta) => {
      const chave = dieta.setor || 'Sem setor'
      if (!setores.has(chave)) setores.set(chave, { setor: chave, total: 0, acompanhantes: 0, enteral: 0, observacao: 0, consistencias: {} })
      const registro = setores.get(chave)
      registro.total += 1
      if (dieta.acompanhante_refeicao) registro.acompanhantes += 1
      if (usaSonda(dieta)) registro.enteral += 1
      if (dieta.regime === 'observacao') registro.observacao += 1
      registro.consistencias[dieta.consistencia] = (registro.consistencias[dieta.consistencia] || 0) + 1
    })
    return Array.from(setores.values()).sort((a, b) => a.setor.localeCompare(b.setor))
  }, [ativas])

  const totalRefeicoes = mapaRefeicoes.reduce((total, item) => total + item.total + item.acompanhantes, 0)

  function abrirNova() {
    setForm({ ...EMPTY })
    setErrors({})
    setModal('nova')
  }

  function abrirEdicao(dieta) {
    setForm({ ...EMPTY, ...dieta, regime: dieta.regime || 'internacao' })
    setErrors({})
    setModal(dieta.id)
  }

  /** Ao escolher o leito, setor e prontuário vêm junto quando existem. */
  function selecionarLeito(nomeLeito) {
    const leito = leitos.find((item) => item.nome === nomeLeito)
    setForm((current) => ({
      ...current,
      leito: nomeLeito,
      setor: leito?.setor || current.setor,
      prontuario: leito?.prontuario || current.prontuario,
    }))
  }

  async function salvar(event) {
    event.preventDefault()
    const nextErrors = {}
    const prontuario = String(form.prontuario).trim()
    if (!/^\d{3,12}$/.test(prontuario)) nextErrors.prontuario = 'Informe um número de prontuário válido.'
    if (!form.leito.trim()) nextErrors.leito = 'Selecione o leito.'
    const duplicada = dietas.find((dieta) => dieta.prontuario === prontuario && dieta.status === 'ativa' && dieta.id !== modal)
    if (duplicada && form.status === 'ativa') nextErrors.prontuario = `Este prontuário já possui dieta ativa no leito ${duplicada.leito}.`
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const anterior = modal !== 'nova' ? dietas.find((dieta) => dieta.id === modal) : null
    const mudouRegime = anterior && anterior.regime !== form.regime
    const payload = {
      ...form,
      prontuario,
      prescrito_por: user?.nome || 'Sistema',
      // O cronômetro reinicia quando o regime muda (ex.: internação -> observação).
      inicio_em: modal === 'nova' || mudouRegime ? new Date().toISOString() : form.inicio_em || new Date().toISOString(),
    }
    delete payload.id

    if (modal === 'nova') {
      const criada = await create(payload)
      await registrarLog({
        acao: 'criar',
        entidade: 'dieta',
        entidade_id: criada.id,
        referencia: form.leito,
        prontuario,
        setor: form.setor,
        detalhe: `Dieta ${form.consistencia} / ${form.modificacao} (${DIET_REGIMES[form.regime].label}) prescrita para o prontuário ${prontuario}`,
      })
      toast.success('Dieta prescrita.')
      await sugerirOcupacao(form.leito, prontuario)
    } else {
      await update(modal, payload)
      await registrarLog({
        acao: 'editar',
        entidade: 'dieta',
        entidade_id: modal,
        referencia: form.leito,
        prontuario,
        setor: form.setor,
        detalhe: `Prescrição atualizada: ${form.consistencia} / ${form.modificacao} · ${DIET_REGIMES[form.regime].label} · ${DIET_STATUS[form.status].label}`,
      })
      toast.success(mudouRegime ? 'Prescrição atualizada e contagem de tempo reiniciada.' : 'Prescrição atualizada.')
    }
    setModal(null)
  }

  /** Mantém o mapa de leitos coerente com a prescrição recém-criada. */
  async function sugerirOcupacao(nomeLeito, prontuario) {
    const leito = leitos.find((item) => item.nome === nomeLeito)
    if (!leito || leito.status === 'ocupado') return
    if (!canDo('leitos', 'editar')) return
    if (!window.confirm(`O leito ${nomeLeito} está como "${leito.status}" no mapa de leitos. Deseja marcá-lo como ocupado pelo prontuário ${prontuario}?`)) return

    await atualizarLeito(leito.id, { status: 'ocupado', prontuario, ocupado_em: new Date().toISOString() })
    toast.success(`Leito ${nomeLeito} atualizado para ocupado.`)
  }

  async function excluir(dieta) {
    if (!window.confirm(`Excluir a prescrição do prontuário ${dieta.prontuario} (leito ${dieta.leito})?`)) return
    await remove(dieta.id)
    await registrarLog({
      acao: 'excluir',
      entidade: 'dieta',
      entidade_id: dieta.id,
      referencia: dieta.leito,
      prontuario: dieta.prontuario,
      setor: dieta.setor,
      detalhe: 'Prescrição de dieta excluída',
    })
    toast.success('Prescrição excluída.')
  }

  function exportar() {
    baixarCsv(
      carimboArquivo('dietas'),
      [
        { label: 'Leito', valor: (d) => d.leito },
        { label: 'Prontuário', valor: (d) => d.prontuario },
        { label: 'Setor', valor: (d) => d.setor },
        { label: 'Regime', valor: (d) => DIET_REGIMES[d.regime || 'internacao'].label },
        { label: 'Tempo (h)', valor: (d) => (tempoDe(d) / 60).toFixed(1) },
        { label: 'Consistência', valor: (d) => d.consistencia },
        { label: 'Modificação', valor: (d) => d.modificacao },
        { label: 'Via', valor: (d) => viaDaDieta(d) },
        { label: 'Listagem UAN', valor: (d) => grupoDaDieta(d).label },
        { label: 'Adequações', valor: (d) => (d.adequacoes || []).join(' / ') },
        { label: 'Acompanhante', valor: (d) => (d.acompanhante_refeicao ? 'Sim' : 'Não') },
        { label: 'Status', valor: (d) => DIET_STATUS[d.status].label },
        { label: 'Início', valor: (d) => formatDateTime(d.inicio_em || d.criado_em) },
        { label: 'Prescrito por', valor: (d) => d.prescrito_por || '' },
      ],
      lista,
    )
    toast.success('Arquivo CSV gerado.')
  }

  function imprimirMapa() {
    setImprimindo(true)
    window.setTimeout(() => {
      runPrint('a4-landscape')
      window.setTimeout(() => setImprimindo(false), 1200)
    }, 60)
  }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-5">
      <KpiGrid className="xl:grid-cols-5">
        <KpiCard label="Dietas ativas" value={kpis.ativas} icon={Salad} tone="primary" />
        <KpiCard label="Em observação" value={kpis.observacao} hint={`Alerta acima de ${OBSERVATION_HOURS.limite}h`} icon={Eye} tone={kpis.observacao ? 'amber' : 'slate'} />
        <KpiCard label="Tempo excedido" value={kpis.excedidos} icon={Clock} tone={kpis.excedidos ? 'red' : 'emerald'} />
        <KpiCard label="Terapia enteral" value={kpis.enteral} icon={UtensilsCrossed} tone="violet" />
        <KpiCard label="Acompanhantes" value={kpis.acompanhantes} icon={UtensilsCrossed} tone="accent" />
      </KpiGrid>

      <div className="flex flex-wrap gap-2">
        <Pill active={aba === 'prescricoes'} onClick={() => setAba('prescricoes')}>
          Prescrições ({dietas.length})
        </Pill>
        <Pill active={aba === 'mapa'} onClick={() => setAba('mapa')}>
          Mapa de refeições ({totalRefeicoes})
        </Pill>
        <Pill active={aba === 'fluxo'} onClick={() => setAba('fluxo')}>
          Fluxo do plantão
        </Pill>
      </div>

      {aba === 'prescricoes' ? (
        <Card>
          <CardHeader
            title="Prescrição de dietas"
            description="Dieta por prontuário e leito — consistência, modificação terapêutica, via e regime de permanência"
            icon={Salad}
            actions={
              <>
                <button type="button" className="btn-ghost" onClick={exportar}>
                  <Download className="h-4 w-4" /> CSV
                </button>
                {podeCriar ? (
                  <button type="button" className="btn-primary" onClick={abrirNova}>
                    <Plus className="h-4 w-4" /> Nova prescrição
                  </button>
                ) : (
                  <Badge className="border-slate-200 bg-slate-100 text-slate-500">
                    <Lock className="h-3 w-3" /> Somente leitura
                  </Badge>
                )}
              </>
            }
          />

          <div className="space-y-3 border-b border-border px-5 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SearchInput value={busca} onChange={setBusca} placeholder="Prontuário, leito ou dieta..." className="sm:col-span-2" />
              <Select value={filtroSetor} onChange={(event) => setFiltroSetor(event.target.value)}>
                <option value="todos">Todos os setores</option>
                {BED_SECTORS.map((setor) => (
                  <option key={setor.setor} value={setor.setor}>
                    {setor.setor}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Pill active={filtroRegime === 'todos'} onClick={() => setFiltroRegime('todos')}>
                Todos os regimes ({dietas.length})
              </Pill>
              {Object.entries(DIET_REGIMES).map(([key, config]) => (
                <Pill key={key} active={filtroRegime === key} onClick={() => setFiltroRegime(key)}>
                  {config.label} ({dietas.filter((dieta) => (dieta.regime || 'internacao') === key).length})
                </Pill>
              ))}
            </div>
          </div>

          {lista.length === 0 ? (
            <EmptyState title="Nenhum registro encontrado" description="Prescreva a primeira dieta para começar o mapa de refeições." />
          ) : (
            <TableWrapper>
              <thead>
                <tr>
                  <Th>Leito</Th>
                  <Th>Prontuário</Th>
                  <Th>Setor</Th>
                  <Th>Listagem UAN</Th>
                  <Th>Regime</Th>
                  <Th>Tempo</Th>
                  <Th>Consistência</Th>
                  <Th>Modificação</Th>
                  <Th>Via</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Ações</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map((dieta) => {
                  const minutos = tempoDe(dieta)
                  const regime = dieta.regime || 'internacao'
                  const excedido = regime === 'observacao' && minutos / 60 >= OBSERVATION_HOURS.limite
                  return (
                    <tr key={dieta.id} className={`transition ${excedido ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                      <Td className="font-semibold">{dieta.leito}</Td>
                      <Td className="font-mono text-xs font-semibold text-primary">{dieta.prontuario}</Td>
                      <Td className="text-slate-500">{dieta.setor}</Td>
                      <Td className="text-xs text-slate-500">{grupoDaDieta(dieta).label}</Td>
                      <Td>
                        <StatusBadge map={DIET_REGIMES} value={regime} />
                      </Td>
                      <Td>
                        <span className={`inline-flex items-center gap-1 ${toneDoTempo(minutos, regime)}`}>
                          <Clock className="h-3.5 w-3.5" />
                          {formatDuration(minutos)}
                          {excedido ? ' · EXCEDIDO' : ''}
                        </span>
                      </Td>
                      <Td>{dieta.consistencia}</Td>
                      <Td className="text-slate-500">{dieta.modificacao}</Td>
                      <Td className="text-slate-500">
                        {viaDaDieta(dieta)}
                        {usaSonda(dieta) ? <Badge className="ml-2 border-violet-200 bg-violet-100 text-violet-700">sonda</Badge> : null}
                        {dieta.acompanhante_refeicao ? <Badge className="ml-2 border-accent/30 bg-accent-light text-accent-dark">+ acomp.</Badge> : null}
                      </Td>
                      <Td>
                        <StatusBadge map={DIET_STATUS} value={dieta.status} />
                      </Td>
                      <Td className="text-right">
                        <div className="inline-flex gap-1">
                          {podeEditar ? (
                            <button type="button" onClick={() => abrirEdicao(dieta)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-primary" aria-label="Editar">
                              <Pencil className="h-4 w-4" />
                            </button>
                          ) : null}
                          {podeExcluir ? (
                            <button type="button" onClick={() => excluir(dieta)} className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600" aria-label="Excluir">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                          {!podeEditar && !podeExcluir ? <span className="text-xs text-slate-300">—</span> : null}
                        </div>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </TableWrapper>
          )}
        </Card>
      ) : aba === 'fluxo' ? (
        <div className="space-y-5">
          <Card>
            <CardHeader title="Fluxo do plantão (07h às 19h)" description="Prazos de atualização e entrega das etiquetas à UAN" icon={ListChecks} />
            <ol className="relative space-y-0 p-5">
              {NUTRITION_FLOW.map((etapa, indice) => (
                <li key={etapa.hora} className="relative flex gap-4 pb-6 last:pb-0">
                  {indice < NUTRITION_FLOW.length - 1 ? <span className="absolute left-[27px] top-9 h-full w-px bg-border" aria-hidden="true" /> : null}
                  <span className={`z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${etapa.prazo ? 'bg-amber-100 text-amber-700' : 'bg-primary-light text-primary'}`}>
                    {etapa.hora}
                  </span>
                  <div className="pt-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {etapa.titulo}
                      {etapa.prazo ? <Badge className="ml-2 border-amber-200 bg-amber-100 text-amber-700">prazo</Badge> : null}
                    </p>
                    <p className="text-sm text-slate-500">{etapa.detalhe}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Horários das refeições" description="Fluxo geral e fluxo de UTI / sondas" icon={UtensilsCrossed} />
              <TableWrapper>
                <thead>
                  <tr>
                    <Th>Refeição</Th>
                    <Th>Geral</Th>
                    <Th>UTI / sonda</Th>
                    <Th>Acompanhante</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MEALS.map((refeicao) => (
                    <tr key={refeicao.id}>
                      <Td className="font-semibold">{refeicao.label}</Td>
                      <Td>{refeicao.hora}</Td>
                      <Td className="text-slate-500">{refeicao.horaUti}</Td>
                      <Td>
                        {refeicao.acompanhante ? (
                          <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">Recebe</Badge>
                        ) : (
                          <Badge className="border-slate-200 bg-slate-100 text-slate-500">Não recebe</Badge>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrapper>
              <p className="border-t border-border px-5 py-3 text-xs text-slate-500">
                Pacientes recebem 6 refeições; acompanhantes recebem 4 (desjejum, almoço, lanche da tarde e jantar), com
                cardápio padrão — sem a dieta terapêutica do paciente.
              </p>
            </Card>

            <Card>
              <CardHeader title="Listagens entregues à UAN" description="Como as etiquetas são organizadas" icon={ListChecks} />
              <TableWrapper>
                <thead>
                  <tr>
                    <Th>Listagem</Th>
                    <Th>Dietas ativas</Th>
                    <Th>Horário</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {DIET_GROUPS.map((grupo) => (
                    <tr key={grupo.id}>
                      <Td className="font-semibold">{grupo.label}</Td>
                      <Td>{ativas.filter((dieta) => grupoDaDieta(dieta).id === grupo.id).length}</Td>
                      <Td className="text-slate-500">{grupo.horarioUti ? 'UTI / sonda' : 'Geral'}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrapper>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader
            title="Mapa de refeições"
            description="Quantitativo por setor para a produção da UAN"
            icon={UtensilsCrossed}
            actions={
              <button type="button" className="btn-ghost" onClick={imprimirMapa}>
                <Printer className="h-4 w-4" /> Imprimir mapa
              </button>
            }
          />
          {mapaRefeicoes.length === 0 ? (
            <EmptyState title="Nenhum registro encontrado" description="Nenhuma dieta ativa no momento." />
          ) : (
            <>
              <div className="border-b border-border px-5 py-3 text-sm text-slate-600">
                Total geral: <b>{totalRefeicoes}</b> refeições por horário ·{' '}
                {MEALS.map((refeicao) => `${refeicao.label} ${refeicao.hora}`).join(' · ')}
              </div>
              <TableWrapper>
                <thead>
                  <tr>
                    <Th>Setor</Th>
                    <Th>Pacientes</Th>
                    <Th>Em observação</Th>
                    <Th>Acompanhantes</Th>
                    <Th>Enteral</Th>
                    <Th>Total</Th>
                    <Th>Consistências</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mapaRefeicoes.map((registro) => (
                    <tr key={registro.setor} className="transition hover:bg-slate-50">
                      <Td className="font-semibold">{registro.setor}</Td>
                      <Td>{registro.total}</Td>
                      <Td>{registro.observacao}</Td>
                      <Td>{registro.acompanhantes}</Td>
                      <Td>{registro.enteral}</Td>
                      <Td className="font-bold text-primary">{registro.total + registro.acompanhantes}</Td>
                      <Td className="whitespace-normal text-xs text-slate-500">
                        {Object.entries(registro.consistencias)
                          .map(([nome, quantidade]) => `${nome}: ${quantidade}`)
                          .join(' · ')}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrapper>
            </>
          )}
        </Card>
      )}

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        size="lg"
        title={modal === 'nova' ? 'Nova prescrição de dieta' : 'Editar prescrição'}
        description="O paciente é identificado apenas pelo número de prontuário."
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setModal(null)}>
              Cancelar
            </button>
            <button type="submit" form="form-dieta" className="btn-primary">
              Salvar
            </button>
          </>
        }
      >
        <form id="form-dieta" onSubmit={salvar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Leito" error={errors.leito} hint={`${leitos.length} leitos cadastrados · ${leitosAgrupados.ocupados.length} ocupados`}>
            <Select value={form.leito} onChange={(event) => selecionarLeito(event.target.value)}>
              <option value="">Selecione...</option>
              {leitosAgrupados.ocupados.length ? (
                <optgroup label="Leitos ocupados">
                  {leitosAgrupados.ocupados.map((leito) => (
                    <option key={leito.id} value={leito.nome}>
                      {leito.nome} — {leito.setor} (prontuário {leito.prontuario})
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {leitosAgrupados.outros.length ? (
                <optgroup label="Demais leitos">
                  {leitosAgrupados.outros.map((leito) => (
                    <option key={leito.id} value={leito.nome}>
                      {leito.nome} — {leito.setor}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </Select>
          </Field>
          <Field label="Prontuário" error={errors.prontuario}>
            <Input value={form.prontuario} inputMode="numeric" onChange={(event) => setForm({ ...form, prontuario: event.target.value })} />
          </Field>
          <Field label="Setor">
            <Select value={form.setor} onChange={(event) => setForm({ ...form, setor: event.target.value })}>
              <option value="">Selecione...</option>
              {BED_SECTORS.map((setor) => (
                <option key={setor.setor} value={setor.setor}>
                  {setor.setor}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Regime de permanência"
            hint={form.regime === 'observacao' ? `O tempo é contado a partir de agora. Alerta em ${OBSERVATION_HOURS.limite}h.` : 'Contagem de tempo iniciada na prescrição.'}
          >
            <Select value={form.regime} onChange={(event) => setForm({ ...form, regime: event.target.value })}>
              {Object.entries(DIET_REGIMES).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Data da prescrição">
            <Input type="date" value={form.data_prescricao} onChange={(event) => setForm({ ...form, data_prescricao: event.target.value })} />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              {Object.entries(DIET_STATUS).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Consistência">
            <Select value={form.consistencia} onChange={(event) => setForm({ ...form, consistencia: event.target.value })}>
              {DIET_CONSISTENCY.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Modificação terapêutica">
            <Select value={form.modificacao} onChange={(event) => setForm({ ...form, modificacao: event.target.value })}>
              {DIET_MODIFICATIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Via de alimentação" hint={ENTERAL_ROUTES.includes(form.via_enteral) ? 'Paciente em terapia enteral: segue os horários da UTI e entra na listagem de sondas.' : ''}>
            <Select value={form.via_enteral} onChange={(event) => setForm({ ...form, via_enteral: event.target.value })}>
              {FEEDING_ROUTES.map((item) => (
                <option key={item} value={item}>
                  {item === 'VO' ? 'VO — via oral' : item}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Listagem da UAN">
            <Input value={grupoDaDieta(form).label} readOnly className="bg-slate-50" />
          </Field>

          {ENTERAL_ROUTES.includes(form.via_enteral) ? (
            <>
              <Field label="Tipo de dieta enteral">
                <Select value={form.enteral_tipo} onChange={(event) => setForm({ ...form, enteral_tipo: event.target.value })}>
                  <option value="">Selecione...</option>
                  {ENTERAL_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Fórmula">
                <Input value={form.enteral_formula} onChange={(event) => setForm({ ...form, enteral_formula: event.target.value })} placeholder="Ex.: padrão 1.0 kcal/mL" />
              </Field>
              <Field label="Volume" className="sm:col-span-2">
                <Input value={form.enteral_volume} onChange={(event) => setForm({ ...form, enteral_volume: event.target.value })} placeholder="Ex.: 6 x 200 mL" />
              </Field>
            </>
          ) : null}

          <div className="sm:col-span-2">
            <p className="label">Adequações complementares</p>
            <div className="flex flex-wrap gap-2">
              {DIET_ADEQUACOES.map((item) => (
                <Pill
                  key={item}
                  active={(form.adequacoes || []).includes(item)}
                  onClick={() =>
                    setForm((atual) => ({
                      ...atual,
                      adequacoes: (atual.adequacoes || []).includes(item)
                        ? atual.adequacoes.filter((valor) => valor !== item)
                        : [...(atual.adequacoes || []), item],
                    }))
                  }
                >
                  {item}
                </Pill>
              ))}
            </div>
          </div>
          <Field label="Dieta prescrita (descrição)" className="sm:col-span-2">
            <Input value={form.dieta_prescrita} onChange={(event) => setForm({ ...form, dieta_prescrita: event.target.value })} placeholder="Ex.: Branda hipossódica fracionada em 6 refeições" />
          </Field>
          <div className="sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                checked={form.acompanhante_refeicao}
                onChange={() => setForm({ ...form, acompanhante_refeicao: !form.acompanhante_refeicao })}
              />
              Acompanhante recebe refeição
            </label>
          </div>
          <Field label="Preparação diferenciada" className="sm:col-span-2" hint="Comunicar à UAN até 10h para o almoço e antes das 18h para o jantar.">
            <Input value={form.preparacao_diferenciada} onChange={(event) => setForm({ ...form, preparacao_diferenciada: event.target.value })} placeholder="Ex.: substituir peixe por frango" />
          </Field>

          <div className="sm:col-span-2 rounded-xl border border-border bg-slate-50 p-4">
            <p className="label mb-2">Identificação nominal (opcional)</p>
            <p className="mb-3 text-xs text-slate-500">
              Preencha apenas se as etiquetas do seu setor forem emitidas com o nome do paciente. Em Etiquetas de Dieta é
              possível alternar entre identificar por prontuário (padrão) ou pelo nome completo.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Nome completo">
                <Input value={form.nome_paciente} onChange={(event) => setForm({ ...form, nome_paciente: event.target.value })} />
              </Field>
              <Field label="Nome da mãe">
                <Input value={form.nome_mae} onChange={(event) => setForm({ ...form, nome_mae: event.target.value })} />
              </Field>
              <Field label="Data de nascimento">
                <Input type="date" value={form.data_nascimento} onChange={(event) => setForm({ ...form, data_nascimento: event.target.value })} />
              </Field>
            </div>
          </div>

          <Field label="Observações nutricionais" className="sm:col-span-2">
            <Textarea value={form.observacoes} onChange={(event) => setForm({ ...form, observacoes: event.target.value })} placeholder="Alergias, restrições, preferências (sem dados pessoais)" />
          </Field>
        </form>
      </Modal>

      <PrintArea active={imprimindo}>
        <div className="p-4 font-sans text-[11px] text-black">
          <PrintHeader titulo={`Mapa de refeições — ${formatDate(todayISO())}`} subtitulo={`Total geral: ${totalRefeicoes} refeições por horário`} />
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black px-2 py-1 text-left">Setor</th>
                <th className="border border-black px-2 py-1 text-left">Pacientes</th>
                <th className="border border-black px-2 py-1 text-left">Em observação</th>
                <th className="border border-black px-2 py-1 text-left">Acompanhantes</th>
                <th className="border border-black px-2 py-1 text-left">Enteral</th>
                <th className="border border-black px-2 py-1 text-left">Total</th>
                <th className="border border-black px-2 py-1 text-left">Consistências</th>
              </tr>
            </thead>
            <tbody>
              {mapaRefeicoes.map((registro) => (
                <tr key={registro.setor}>
                  <td className="border border-black px-2 py-1">{registro.setor}</td>
                  <td className="border border-black px-2 py-1">{registro.total}</td>
                  <td className="border border-black px-2 py-1">{registro.observacao}</td>
                  <td className="border border-black px-2 py-1">{registro.acompanhantes}</td>
                  <td className="border border-black px-2 py-1">{registro.enteral}</td>
                  <td className="border border-black px-2 py-1 font-bold">{registro.total + registro.acompanhantes}</td>
                  <td className="border border-black px-2 py-1">
                    {Object.entries(registro.consistencias)
                      .map(([nome, quantidade]) => `${nome}: ${quantidade}`)
                      .join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[9px]">Documento em conformidade com a LGPD — identificação exclusivamente por número de prontuário.</p>
        </div>
      </PrintArea>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { ClipboardCheck, Download, Lock, Pencil, Plus, Printer, Trash2, TriangleAlert } from 'lucide-react'
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
  ACCEPTANCE,
  APPETITE,
  ASG_CLASSES,
  BED_SECTORS,
  DYSPHAGIA,
  FEEDING_ROUTES,
  LAB_TESTS,
  MOBILITY,
  NRS_ITEMS,
} from '@/lib/constants'
import { formatDate, formatDateTime, matches, todayISO, uid } from '@/lib/format'
import { baixarCsv, carimboArquivo } from '@/lib/csv'
import { runPrint } from '@/lib/print'
import PrintArea from '@/components/PrintArea'
import PrintHeader from '@/components/PrintHeader'

const EMPTY = {
  prontuario: '',
  nome_paciente: '',
  data_nascimento: '',
  sexo: '',
  setor: '',
  leito: '',
  data_admissao: '',
  data_avaliacao: todayISO(),
  diagnostico_medico: '',
  nrs: {},
  peso_atual: '',
  altura: '',
  altura_joelho: '',
  peso_usual: '',
  cb: '',
  cmb: '',
  panturrilha: '',
  antropometria_obs: '',
  asg: '',
  condicao_clinica: '',
  apetite: 'Sem informação',
  nausea: false,
  diarreia: false,
  constipacao: false,
  disfagia: 'Não',
  edema: false,
  edema_local: '',
  lesoes: false,
  mobilidade: 'Deambula',
  via: 'VO',
  tipo_dieta: '',
  aceitacao: 'Sem informação',
  consumo_habitual: '',
  alergias: '',
  jejum: false,
  jejum_motivo: '',
  exames: [],
  diagnostico_nutricional: '',
  kcal_dia: '',
  proteina_g_dia: '',
  via_tipo_dieta: '',
  suplementacao: false,
  suplemento_qual: '',
  observacoes: '',
  nutricionista: '',
  crn: '',
  evolucoes: [],
}

const numero = (valor) => {
  const convertido = Number(String(valor).replace(',', '.'))
  return Number.isFinite(convertido) ? convertido : 0
}

/** IMC = peso / altura². Retorna string vazia sem dados suficientes. */
export function calcularImc(peso, altura) {
  const p = numero(peso)
  const a = numero(altura)
  if (!p || !a) return ''
  return (p / (a * a)).toFixed(1)
}

/** Percentual de perda de peso em relação ao peso usual. */
export function calcularPerdaPeso(pesoUsual, pesoAtual) {
  const usual = numero(pesoUsual)
  const atual = numero(pesoAtual)
  if (!usual || !atual) return ''
  return (((usual - atual) / usual) * 100).toFixed(1)
}

/** Triagem NRS-2002: qualquer resposta "sim" já indica risco nutricional. */
export function avaliarNrs(nrs = {}) {
  const positivos = NRS_ITEMS.filter((item) => nrs[item.id] === true).length
  return { total: positivos, risco: positivos > 0 }
}

/** Indicador do setor: avaliação realizada em até 24h da admissão. */
export function dentroDe24h(avaliacao) {
  if (!avaliacao?.data_admissao || !avaliacao?.data_avaliacao) return null
  const admissao = new Date(`${avaliacao.data_admissao}T00:00:00`)
  const feita = new Date(`${avaliacao.data_avaliacao}T00:00:00`)
  const dias = (feita - admissao) / 86400000
  return dias >= 0 && dias <= 1
}

export default function AvaliacaoNutricional() {
  const { items: avaliacoes, loading, create, update, remove } = useCollection('avaliacoes')
  const { user, canDo } = useAuth()
  const toast = useToast()
  const registrarLog = useAudit()

  const podeCriar = canDo('avaliacao-nutricional', 'criar')
  const podeEditar = canDo('avaliacao-nutricional', 'editar')
  const podeExcluir = canDo('avaliacao-nutricional', 'excluir')

  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todas')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [evolucao, setEvolucao] = useState({ resumo: '', conduta: '' })
  const [imprimindo, setImprimindo] = useState(null)

  const imc = calcularImc(form.peso_atual, form.altura)
  const perdaPeso = calcularPerdaPeso(form.peso_usual, form.peso_atual)
  const nrs = avaliarNrs(form.nrs)
  const proteinaPorKg = numero(form.proteina_g_dia) && numero(form.peso_atual)
    ? (numero(form.proteina_g_dia) / numero(form.peso_atual)).toFixed(2)
    : ''

  const kpis = useMemo(() => {
    const comRisco = avaliacoes.filter((item) => avaliarNrs(item.nrs).risco)
    const avaliadas24h = avaliacoes.filter((item) => dentroDe24h(item) === true)
    const comPrazo = avaliacoes.filter((item) => dentroDe24h(item) !== null)
    return {
      total: avaliacoes.length,
      risco: comRisco.length,
      taxa24h: comPrazo.length ? Math.round((avaliadas24h.length / comPrazo.length) * 100) : 0,
      reavaliacoes: avaliacoes.reduce((soma, item) => soma + (item.evolucoes || []).length, 0),
    }
  }, [avaliacoes])

  const lista = useMemo(
    () =>
      avaliacoes
        .filter((item) => {
          if (filtro === 'risco') return avaliarNrs(item.nrs).risco
          if (filtro === 'enteral') return ['SNG', 'SOG', 'SNE', 'GTT'].includes(item.via)
          if (filtro === 'sem_evolucao') return (item.evolucoes || []).length === 0
          return true
        })
        .filter((item) => matches(busca, item.prontuario, item.nome_paciente, item.setor, item.leito, item.diagnostico_medico))
        .sort((a, b) => String(b.data_avaliacao).localeCompare(String(a.data_avaliacao))),
    [avaliacoes, filtro, busca],
  )

  function abrirNova() {
    setForm({ ...EMPTY, exames: LAB_TESTS.map((exame) => ({ ...exame, data: '', resultado: '' })), nutricionista: user?.nome || '' })
    setErrors({})
    setEvolucao({ resumo: '', conduta: '' })
    setModal('nova')
  }

  function abrirEdicao(avaliacao) {
    setForm({
      ...EMPTY,
      ...avaliacao,
      nrs: avaliacao.nrs || {},
      exames: avaliacao.exames?.length ? avaliacao.exames : LAB_TESTS.map((exame) => ({ ...exame, data: '', resultado: '' })),
      evolucoes: avaliacao.evolucoes || [],
    })
    setErrors({})
    setEvolucao({ resumo: '', conduta: '' })
    setModal(avaliacao.id)
  }

  function alternarNrs(id) {
    setForm((atual) => ({ ...atual, nrs: { ...atual.nrs, [id]: !atual.nrs?.[id] } }))
  }

  function atualizarExame(id, campo, valor) {
    setForm((atual) => ({
      ...atual,
      exames: atual.exames.map((exame) => (exame.id === id ? { ...exame, [campo]: valor } : exame)),
    }))
  }

  function adicionarEvolucao() {
    if (evolucao.resumo.trim().length < 5) {
      toast.warning('Descreva o resumo da evolução.')
      return
    }
    setForm((atual) => ({
      ...atual,
      evolucoes: [
        ...(atual.evolucoes || []),
        {
          id: uid(),
          data: new Date().toISOString(),
          resumo: evolucao.resumo.trim(),
          conduta: evolucao.conduta.trim(),
          autor: user?.nome || 'Nutricionista',
          crn: form.crn || '',
        },
      ],
    }))
    setEvolucao({ resumo: '', conduta: '' })
    toast.success('Evolução adicionada. Lembre de salvar a ficha.')
  }

  async function salvar(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!/^\d{3,12}$/.test(String(form.prontuario).trim())) nextErrors.prontuario = 'Informe um prontuário válido.'
    if (!form.data_avaliacao) nextErrors.data_avaliacao = 'Informe a data da avaliação.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const payload = {
      ...form,
      prontuario: String(form.prontuario).trim(),
      imc,
      perda_peso_percent: perdaPeso,
      proteina_g_kg: proteinaPorKg,
      nrs_total: nrs.total,
      nrs_risco: nrs.risco,
    }
    delete payload.id

    if (modal === 'nova') {
      const criada = await create(payload)
      await registrarLog({
        acao: 'criar',
        entidade: 'avaliacao_nutricional',
        entidade_id: criada.id,
        referencia: form.leito,
        prontuario: payload.prontuario,
        setor: form.setor,
        detalhe: `Avaliação nutricional registrada${nrs.risco ? ' — com risco nutricional' : ''}`,
      })
      toast.success('Avaliação registrada.')
    } else {
      await update(modal, payload)
      await registrarLog({
        acao: 'editar',
        entidade: 'avaliacao_nutricional',
        entidade_id: modal,
        referencia: form.leito,
        prontuario: payload.prontuario,
        setor: form.setor,
        detalhe: 'Avaliação nutricional atualizada',
      })
      toast.success('Avaliação atualizada.')
    }
    setModal(null)
  }

  async function excluir(avaliacao) {
    if (!window.confirm(`Excluir a avaliação do prontuário ${avaliacao.prontuario}?`)) return
    await remove(avaliacao.id)
    await registrarLog({
      acao: 'excluir',
      entidade: 'avaliacao_nutricional',
      entidade_id: avaliacao.id,
      prontuario: avaliacao.prontuario,
      setor: avaliacao.setor,
      detalhe: 'Avaliação nutricional excluída',
    })
    toast.success('Avaliação excluída.')
  }

  function imprimir(avaliacao) {
    setImprimindo(avaliacao)
    window.setTimeout(() => {
      runPrint('a4')
      window.setTimeout(() => setImprimindo(null), 1500)
    }, 80)
  }

  function exportar() {
    baixarCsv(
      carimboArquivo('avaliacoes-nutricionais'),
      [
        { label: 'Data', valor: (a) => formatDate(a.data_avaliacao) },
        { label: 'Prontuário', valor: (a) => a.prontuario },
        { label: 'Setor', valor: (a) => a.setor },
        { label: 'Leito', valor: (a) => a.leito },
        { label: 'NRS-2002', valor: (a) => (avaliarNrs(a.nrs).risco ? 'Risco nutricional' : 'Sem risco') },
        { label: 'Pontuação', valor: (a) => avaliarNrs(a.nrs).total },
        { label: 'IMC', valor: (a) => a.imc || '' },
        { label: '% perda de peso', valor: (a) => a.perda_peso_percent || '' },
        { label: 'ASG', valor: (a) => a.asg || '' },
        { label: 'Via', valor: (a) => a.via },
        { label: 'Aceitação', valor: (a) => a.aceitacao },
        { label: 'Em até 24h', valor: (a) => (dentroDe24h(a) === null ? '—' : dentroDe24h(a) ? 'Sim' : 'Não') },
        { label: 'Reavaliações', valor: (a) => (a.evolucoes || []).length },
        { label: 'Nutricionista', valor: (a) => a.nutricionista || '' },
      ],
      lista,
    )
    toast.success('Arquivo CSV gerado.')
  }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-5">
      <KpiGrid>
        <KpiCard label="Avaliações" value={kpis.total} icon={ClipboardCheck} tone="primary" />
        <KpiCard label="Com risco nutricional" value={kpis.risco} hint="Triagem NRS-2002" icon={TriangleAlert} tone={kpis.risco ? 'amber' : 'emerald'} />
        <KpiCard label="Avaliadas em até 24h" value={`${kpis.taxa24h}%`} hint="Indicador do setor" icon={ClipboardCheck} tone={kpis.taxa24h >= 80 ? 'emerald' : 'amber'} />
        <KpiCard label="Reavaliações registradas" value={kpis.reavaliacoes} icon={ClipboardCheck} tone="accent" />
      </KpiGrid>

      <Card>
        <CardHeader
          title="Avaliação e triagem nutricional"
          description="Ficha do setor: NRS-2002, antropometria, avaliação clínica e dietética, exames, diagnóstico e conduta"
          icon={ClipboardCheck}
          actions={
            <>
              <button type="button" className="btn-ghost" onClick={exportar}>
                <Download className="h-4 w-4" /> CSV
              </button>
              {podeCriar ? (
                <button type="button" className="btn-primary" onClick={abrirNova}>
                  <Plus className="h-4 w-4" /> Nova avaliação
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
          <SearchInput value={busca} onChange={setBusca} placeholder="Prontuário, nome, setor ou diagnóstico..." />
          <div className="flex flex-wrap gap-2">
            <Pill active={filtro === 'todas'} onClick={() => setFiltro('todas')}>
              Todas ({avaliacoes.length})
            </Pill>
            <Pill active={filtro === 'risco'} onClick={() => setFiltro('risco')}>
              Com risco ({kpis.risco})
            </Pill>
            <Pill active={filtro === 'enteral'} onClick={() => setFiltro('enteral')}>
              Terapia enteral ({avaliacoes.filter((item) => ['SNG', 'SOG', 'SNE', 'GTT'].includes(item.via)).length})
            </Pill>
            <Pill active={filtro === 'sem_evolucao'} onClick={() => setFiltro('sem_evolucao')}>
              Sem reavaliação ({avaliacoes.filter((item) => (item.evolucoes || []).length === 0).length})
            </Pill>
          </div>
        </div>

        {lista.length === 0 ? (
          <EmptyState title="Nenhum registro encontrado" description="Registre a primeira avaliação nutricional." />
        ) : (
          <TableWrapper>
            <thead>
              <tr>
                <Th>Data</Th>
                <Th>Prontuário</Th>
                <Th>Setor / leito</Th>
                <Th>Triagem</Th>
                <Th>IMC</Th>
                <Th>ASG</Th>
                <Th>Via</Th>
                <Th>Em 24h</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((avaliacao) => {
                const triagem = avaliarNrs(avaliacao.nrs)
                const prazo = dentroDe24h(avaliacao)
                return (
                  <tr key={avaliacao.id} className={`transition ${triagem.risco ? 'bg-amber-50/60' : 'hover:bg-slate-50'}`}>
                    <Td>{formatDate(avaliacao.data_avaliacao)}</Td>
                    <Td className="font-mono text-xs font-semibold text-primary">{avaliacao.prontuario}</Td>
                    <Td className="text-slate-500">
                      {avaliacao.setor || '—'} {avaliacao.leito ? `· ${avaliacao.leito}` : ''}
                    </Td>
                    <Td>
                      {triagem.risco ? (
                        <Badge className="border-amber-200 bg-amber-100 text-amber-700">Risco ({triagem.total})</Badge>
                      ) : (
                        <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">Sem risco</Badge>
                      )}
                    </Td>
                    <Td>{avaliacao.imc || '—'}</Td>
                    <Td>{avaliacao.asg ? <StatusBadge map={ASG_CLASSES} value={avaliacao.asg} /> : '—'}</Td>
                    <Td className="text-slate-500">{avaliacao.via}</Td>
                    <Td>
                      {prazo === null ? (
                        <span className="text-xs text-slate-300">—</span>
                      ) : prazo ? (
                        <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">Sim</Badge>
                      ) : (
                        <Badge className="border-red-200 bg-red-100 text-red-700">Não</Badge>
                      )}
                    </Td>
                    <Td className="text-right">
                      <div className="inline-flex gap-1">
                        <button type="button" onClick={() => imprimir(avaliacao)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-primary" aria-label="Imprimir ficha">
                          <Printer className="h-4 w-4" />
                        </button>
                        {podeEditar ? (
                          <button type="button" onClick={() => abrirEdicao(avaliacao)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-primary" aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </button>
                        ) : null}
                        {podeExcluir ? (
                          <button type="button" onClick={() => excluir(avaliacao)} className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600" aria-label="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </TableWrapper>
        )}
      </Card>

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        size="xl"
        title={modal === 'nova' ? 'Nova avaliação nutricional' : 'Editar avaliação nutricional'}
        description="Ficha de avaliação e triagem — Nutrição Clínica"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setModal(null)}>
              Cancelar
            </button>
            <button type="submit" form="form-avaliacao" className="btn-primary">
              Salvar ficha
            </button>
          </>
        }
      >
        <form id="form-avaliacao" onSubmit={salvar} className="space-y-6">
          {/* ---------------------------------------------------- Identificação */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Prontuário" error={errors.prontuario}>
              <Input value={form.prontuario} inputMode="numeric" onChange={(event) => setForm({ ...form, prontuario: event.target.value })} />
            </Field>
            <Field label="Nome completo" className="sm:col-span-2">
              <Input value={form.nome_paciente} onChange={(event) => setForm({ ...form, nome_paciente: event.target.value })} />
            </Field>
            <Field label="Data de nascimento">
              <Input type="date" value={form.data_nascimento} onChange={(event) => setForm({ ...form, data_nascimento: event.target.value })} />
            </Field>
            <Field label="Sexo">
              <Select value={form.sexo} onChange={(event) => setForm({ ...form, sexo: event.target.value })}>
                <option value="">Selecione...</option>
                <option value="F">Feminino</option>
                <option value="M">Masculino</option>
              </Select>
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
            <Field label="Leito">
              <Input value={form.leito} onChange={(event) => setForm({ ...form, leito: event.target.value })} />
            </Field>
            <Field label="Data de admissão">
              <Input type="date" value={form.data_admissao} onChange={(event) => setForm({ ...form, data_admissao: event.target.value })} />
            </Field>
            <Field label="Data da avaliação" error={errors.data_avaliacao}>
              <Input type="date" value={form.data_avaliacao} onChange={(event) => setForm({ ...form, data_avaliacao: event.target.value })} />
            </Field>
            <Field label="Diagnóstico médico" className="sm:col-span-3">
              <Input value={form.diagnostico_medico} onChange={(event) => setForm({ ...form, diagnostico_medico: event.target.value })} />
            </Field>
          </section>

          {/* ------------------------------------------------- 1. Triagem NRS */}
          <section className="rounded-xl border border-border p-4">
            <p className="label">1. Triagem nutricional (NRS-2002)</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {NRS_ITEMS.map((item) => (
                <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={Boolean(form.nrs?.[item.id])}
                    onChange={() => alternarNrs(item.id)}
                  />
                  {item.label}
                </label>
              ))}
            </div>
            <p className={`mt-3 rounded-lg px-3 py-2 text-sm font-semibold ${nrs.risco ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
              Pontuação: {nrs.total} — {nrs.risco ? 'Risco nutricional' : 'Sem risco'}
            </p>
          </section>

          {/* -------------------------------------------- 2. Antropometria */}
          <section className="rounded-xl border border-border p-4">
            <p className="label">2. Avaliação antropométrica</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Peso atual (kg)">
                <Input value={form.peso_atual} inputMode="decimal" onChange={(event) => setForm({ ...form, peso_atual: event.target.value })} />
              </Field>
              <Field label="Altura (m)">
                <Input value={form.altura} inputMode="decimal" onChange={(event) => setForm({ ...form, altura: event.target.value })} placeholder="1,70" />
              </Field>
              <Field label="Peso usual (kg)">
                <Input value={form.peso_usual} inputMode="decimal" onChange={(event) => setForm({ ...form, peso_usual: event.target.value })} />
              </Field>
              <Field label="Altura do joelho (cm)">
                <Input value={form.altura_joelho} inputMode="decimal" onChange={(event) => setForm({ ...form, altura_joelho: event.target.value })} />
              </Field>
              <Field label="CB (cm)">
                <Input value={form.cb} inputMode="decimal" onChange={(event) => setForm({ ...form, cb: event.target.value })} />
              </Field>
              <Field label="CMB (cm)">
                <Input value={form.cmb} inputMode="decimal" onChange={(event) => setForm({ ...form, cmb: event.target.value })} />
              </Field>
              <Field label="Panturrilha (cm)">
                <Input value={form.panturrilha} inputMode="decimal" onChange={(event) => setForm({ ...form, panturrilha: event.target.value })} />
              </Field>
              <Field label="ASG">
                <Select value={form.asg} onChange={(event) => setForm({ ...form, asg: event.target.value })}>
                  <option value="">Selecione...</option>
                  {Object.entries(ASG_CLASSES).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className="border-primary/20 bg-primary-light text-primary">IMC: {imc || '—'}</Badge>
              <Badge className={perdaPeso && Number(perdaPeso) >= 5 ? 'border-amber-200 bg-amber-100 text-amber-700' : 'border-slate-200 bg-slate-100 text-slate-600'}>
                Perda de peso: {perdaPeso ? `${perdaPeso}%` : '—'}
              </Badge>
            </div>
            <Field label="Observações da antropometria" className="mt-3">
              <Input value={form.antropometria_obs} onChange={(event) => setForm({ ...form, antropometria_obs: event.target.value })} />
            </Field>
          </section>

          {/* ------------------------------------------ 3. Avaliação clínica */}
          <section className="rounded-xl border border-border p-4">
            <p className="label">3. Avaliação clínica / funcional</p>
            <Field label="Condição clínica geral">
              <Input value={form.condicao_clinica} onChange={(event) => setForm({ ...form, condicao_clinica: event.target.value })} />
            </Field>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Apetite">
                <Select value={form.apetite} onChange={(event) => setForm({ ...form, apetite: event.target.value })}>
                  {APPETITE.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Disfagia">
                <Select value={form.disfagia} onChange={(event) => setForm({ ...form, disfagia: event.target.value })}>
                  {DYSPHAGIA.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Mobilidade">
                <Select value={form.mobilidade} onChange={(event) => setForm({ ...form, mobilidade: event.target.value })}>
                  {MOBILITY.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                ['nausea', 'Náuseas / vômitos'],
                ['diarreia', 'Diarreia'],
                ['constipacao', 'Constipação'],
                ['edema', 'Edema'],
                ['lesoes', 'Lesões de pele / úlceras'],
              ].map(([campo, rotulo]) => (
                <Pill key={campo} active={form[campo]} onClick={() => setForm({ ...form, [campo]: !form[campo] })}>
                  {rotulo}
                </Pill>
              ))}
            </div>
            {form.edema ? (
              <Field label="Local do edema" className="mt-3">
                <Input value={form.edema_local} onChange={(event) => setForm({ ...form, edema_local: event.target.value })} />
              </Field>
            ) : null}
          </section>

          {/* --------------------------------------- 4. Avaliação dietética */}
          <section className="rounded-xl border border-border p-4">
            <p className="label">4. Avaliação dietética</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Via de alimentação">
                <Select value={form.via} onChange={(event) => setForm({ ...form, via: event.target.value })}>
                  {FEEDING_ROUTES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tipo de dieta prescrita" className="sm:col-span-2">
                <Input value={form.tipo_dieta} onChange={(event) => setForm({ ...form, tipo_dieta: event.target.value })} />
              </Field>
              <Field label="Aceitação alimentar">
                <Select value={form.aceitacao} onChange={(event) => setForm({ ...form, aceitacao: event.target.value })}>
                  {ACCEPTANCE.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Alergias / intolerâncias" className="sm:col-span-2">
                <Input value={form.alergias} onChange={(event) => setForm({ ...form, alergias: event.target.value })} />
              </Field>
              <Field label="Consumo habitual antes da internação" className="sm:col-span-3">
                <Input value={form.consumo_habitual} onChange={(event) => setForm({ ...form, consumo_habitual: event.target.value })} />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Pill active={form.jejum} onClick={() => setForm({ ...form, jejum: !form.jejum })}>
                Jejum atual
              </Pill>
              {form.jejum ? (
                <Input className="max-w-xs" value={form.jejum_motivo} onChange={(event) => setForm({ ...form, jejum_motivo: event.target.value })} placeholder="Motivo do jejum" />
              ) : null}
            </div>
          </section>

          {/* ------------------------------------------------ 5. Exames */}
          <section className="rounded-xl border border-border p-4">
            <p className="label">5. Exames laboratoriais</p>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr>
                    <Th>Exame</Th>
                    <Th>Data</Th>
                    <Th>Resultado</Th>
                    <Th>Referência</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {form.exames.map((exame) => (
                    <tr key={exame.id}>
                      <Td className="font-medium">{exame.label}</Td>
                      <Td>
                        <Input type="date" className="py-1 text-xs" value={exame.data} onChange={(event) => atualizarExame(exame.id, 'data', event.target.value)} />
                      </Td>
                      <Td>
                        <Input className="py-1 text-xs" value={exame.resultado} onChange={(event) => atualizarExame(exame.id, 'resultado', event.target.value)} />
                      </Td>
                      <Td className="text-xs text-slate-400">{exame.referencia}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ------------------------------- 6 e 7. Diagnóstico e conduta */}
          <section className="rounded-xl border border-border p-4">
            <p className="label">6. Diagnóstico nutricional</p>
            <Textarea value={form.diagnostico_nutricional} onChange={(event) => setForm({ ...form, diagnostico_nutricional: event.target.value })} />

            <p className="label mt-4">7. Conduta e plano nutricional</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Necessidade energética (kcal/dia)">
                <Input value={form.kcal_dia} inputMode="decimal" onChange={(event) => setForm({ ...form, kcal_dia: event.target.value })} />
              </Field>
              <Field label="Proteína (g/dia)" hint={proteinaPorKg ? `${proteinaPorKg} g/kg` : ''}>
                <Input value={form.proteina_g_dia} inputMode="decimal" onChange={(event) => setForm({ ...form, proteina_g_dia: event.target.value })} />
              </Field>
              <Field label="Via / tipo de dieta">
                <Input value={form.via_tipo_dieta} onChange={(event) => setForm({ ...form, via_tipo_dieta: event.target.value })} />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Pill active={form.suplementacao} onClick={() => setForm({ ...form, suplementacao: !form.suplementacao })}>
                Suplementação
              </Pill>
              {form.suplementacao ? (
                <Input className="max-w-sm" value={form.suplemento_qual} onChange={(event) => setForm({ ...form, suplemento_qual: event.target.value })} placeholder="Qual suplemento" />
              ) : null}
            </div>
          </section>

          {/* ------------------------------- 8 e 9. Observações e evolução */}
          <section className="rounded-xl border border-border p-4">
            <p className="label">8. Observações gerais e preferências alimentares</p>
            <Textarea value={form.observacoes} onChange={(event) => setForm({ ...form, observacoes: event.target.value })} />

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nutricionista">
                <Input value={form.nutricionista} onChange={(event) => setForm({ ...form, nutricionista: event.target.value })} />
              </Field>
              <Field label="CRN">
                <Input value={form.crn} onChange={(event) => setForm({ ...form, crn: event.target.value })} />
              </Field>
            </div>

            <p className="label mt-4">9. Evolução / reavaliação</p>
            <div className="space-y-2">
              {(form.evolucoes || []).map((registro) => (
                <div key={registro.id} className="rounded-lg border border-border bg-slate-50 p-3 text-xs">
                  <p className="font-semibold text-slate-700">
                    {formatDateTime(registro.data)} · {registro.autor}
                    {registro.crn ? ` (CRN ${registro.crn})` : ''}
                  </p>
                  <p className="mt-1 text-slate-600">{registro.resumo}</p>
                  {registro.conduta ? <p className="mt-1 text-slate-500">Conduta: {registro.conduta}</p> : null}
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Resumo / alterações clínicas">
                <Textarea value={evolucao.resumo} onChange={(event) => setEvolucao({ ...evolucao, resumo: event.target.value })} />
              </Field>
              <Field label="Conduta nutricional">
                <Textarea value={evolucao.conduta} onChange={(event) => setEvolucao({ ...evolucao, conduta: event.target.value })} />
              </Field>
            </div>
            <div className="mt-2 flex justify-end">
              <button type="button" className="btn-ghost" onClick={adicionarEvolucao}>
                <Plus className="h-4 w-4" /> Adicionar evolução
              </button>
            </div>
          </section>
        </form>
      </Modal>

      {/* ------------------------------------------------- Impressão da ficha */}
      <PrintArea active={Boolean(imprimindo)}>
        {imprimindo ? (
          <div className="p-5 font-sans text-[11px] text-black">
            <PrintHeader
              titulo="Nutrição Clínica — Avaliação e triagem nutricional"
              subtitulo={`Prontuário ${imprimindo.prontuario} · ${imprimindo.setor || ''} ${imprimindo.leito || ''}`}
            />

            <table className="mb-3 w-full border-collapse text-[10px]">
              <tbody>
                <tr>
                  <td className="border border-black px-2 py-1"><b>Data da avaliação:</b> {formatDate(imprimindo.data_avaliacao)}</td>
                  <td className="border border-black px-2 py-1"><b>Admissão:</b> {imprimindo.data_admissao ? formatDate(imprimindo.data_admissao) : '—'}</td>
                  <td className="border border-black px-2 py-1"><b>Nascimento:</b> {imprimindo.data_nascimento ? formatDate(imprimindo.data_nascimento) : '—'}</td>
                  <td className="border border-black px-2 py-1"><b>Sexo:</b> {imprimindo.sexo || '—'}</td>
                </tr>
                <tr>
                  <td className="border border-black px-2 py-1" colSpan={4}><b>Diagnóstico médico:</b> {imprimindo.diagnostico_medico || '—'}</td>
                </tr>
              </tbody>
            </table>

            <p className="mb-1 font-bold">1. Triagem NRS-2002</p>
            <p className="mb-3">
              {NRS_ITEMS.map((item) => `${item.label}: ${imprimindo.nrs?.[item.id] ? 'Sim' : 'Não'}`).join(' · ')} — Pontuação{' '}
              {avaliarNrs(imprimindo.nrs).total} · <b>{avaliarNrs(imprimindo.nrs).risco ? 'Risco nutricional' : 'Sem risco'}</b>
            </p>

            <p className="mb-1 font-bold">2. Antropometria</p>
            <p className="mb-3">
              Peso atual {imprimindo.peso_atual || '—'} kg · Altura {imprimindo.altura || '—'} m · IMC {imprimindo.imc || '—'} ·
              Peso usual {imprimindo.peso_usual || '—'} kg · Perda {imprimindo.perda_peso_percent || '—'}% · CB {imprimindo.cb || '—'} ·
              CMB {imprimindo.cmb || '—'} · Panturrilha {imprimindo.panturrilha || '—'} · ASG {imprimindo.asg || '—'}
            </p>

            <p className="mb-1 font-bold">3. Avaliação clínica / funcional</p>
            <p className="mb-3">
              {imprimindo.condicao_clinica || '—'} · Apetite: {imprimindo.apetite} · Náuseas: {imprimindo.nausea ? 'Sim' : 'Não'} ·
              Diarreia: {imprimindo.diarreia ? 'Sim' : 'Não'} · Constipação: {imprimindo.constipacao ? 'Sim' : 'Não'} ·
              Disfagia: {imprimindo.disfagia} · Edema: {imprimindo.edema ? `Sim (${imprimindo.edema_local || '—'})` : 'Não'} ·
              Lesões: {imprimindo.lesoes ? 'Sim' : 'Não'} · Mobilidade: {imprimindo.mobilidade}
            </p>

            <p className="mb-1 font-bold">4. Avaliação dietética</p>
            <p className="mb-3">
              Via: {imprimindo.via} · Dieta: {imprimindo.tipo_dieta || '—'} · Aceitação: {imprimindo.aceitacao} ·
              Alergias: {imprimindo.alergias || '—'} · Jejum: {imprimindo.jejum ? `Sim (${imprimindo.jejum_motivo || '—'})` : 'Não'}
            </p>

            <p className="mb-1 font-bold">5. Exames laboratoriais</p>
            <table className="mb-3 w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black px-2 py-1 text-left">Exame</th>
                  <th className="border border-black px-2 py-1 text-left">Data</th>
                  <th className="border border-black px-2 py-1 text-left">Resultado</th>
                  <th className="border border-black px-2 py-1 text-left">Referência</th>
                </tr>
              </thead>
              <tbody>
                {(imprimindo.exames || []).map((exame) => (
                  <tr key={exame.id}>
                    <td className="border border-black px-2 py-1">{exame.label}</td>
                    <td className="border border-black px-2 py-1">{exame.data ? formatDate(exame.data) : '—'}</td>
                    <td className="border border-black px-2 py-1">{exame.resultado || '—'}</td>
                    <td className="border border-black px-2 py-1">{exame.referencia}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="mb-1 font-bold">6. Diagnóstico nutricional</p>
            <p className="mb-3">{imprimindo.diagnostico_nutricional || '—'}</p>

            <p className="mb-1 font-bold">7. Conduta e plano nutricional</p>
            <p className="mb-3">
              {imprimindo.kcal_dia || '—'} kcal/dia · Proteína {imprimindo.proteina_g_dia || '—'} g/dia
              {imprimindo.proteina_g_kg ? ` (${imprimindo.proteina_g_kg} g/kg)` : ''} · Via/tipo: {imprimindo.via_tipo_dieta || '—'} ·
              Suplementação: {imprimindo.suplementacao ? imprimindo.suplemento_qual || 'Sim' : 'Não'}
            </p>

            <p className="mb-1 font-bold">8. Observações gerais e preferências</p>
            <p className="mb-4">{imprimindo.observacoes || '—'}</p>

            {(imprimindo.evolucoes || []).length ? (
              <>
                <p className="mb-1 font-bold">9. Evolução / reavaliação</p>
                {imprimindo.evolucoes.map((registro) => (
                  <p key={registro.id} className="mb-1">
                    <b>{formatDateTime(registro.data)}</b> — {registro.resumo}
                    {registro.conduta ? ` · Conduta: ${registro.conduta}` : ''} · {registro.autor}
                  </p>
                ))}
              </>
            ) : null}

            <div className="mt-8 border-t border-black pt-2 text-[10px]">
              <p>Nutricionista: {imprimindo.nutricionista || '________________________________'} — CRN: {imprimindo.crn || '____________'}</p>
              <p className="mt-2 text-[9px]">Documento gerado pelo sistema em {formatDateTime(new Date().toISOString())}.</p>
            </div>
          </div>
        ) : null}
      </PrintArea>
    </div>
  )
}

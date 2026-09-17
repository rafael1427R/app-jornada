import { useMemo, useState } from 'react'
import { Lock, Pencil, Plus, Printer, Salad, Trash2, UtensilsCrossed } from 'lucide-react'
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
import { BED_SECTORS, DIET_CONSISTENCY, DIET_MODIFICATIONS, DIET_STATUS, ENTERAL_ROUTES, MEALS } from '@/lib/constants'
import { formatDate, matches, todayISO } from '@/lib/format'
import { runPrint } from '@/lib/print'
import PrintArea from '@/components/PrintArea'
import { HOSPITAL_NAME, INSTITUTION_NAME } from '@/lib/brand'

const EMPTY = {
  prontuario: '',
  leito: '',
  setor: '',
  consistencia: 'Geral',
  modificacao: 'Sem modificação',
  via_enteral: 'Não se aplica',
  dieta_prescrita: '',
  acompanhante_refeicao: false,
  observacoes: '',
  status: 'ativa',
  data_prescricao: todayISO(),
}

export default function Nutricao() {
  const { items: dietas, loading, create, update, remove } = useCollection('dietas')
  const { items: leitos } = useCollection('leitos')
  const { user, canDo } = useAuth()
  const toast = useToast()
  const registrarLog = useAudit()

  const podeCriar = canDo('nutricao', 'criar')
  const podeEditar = canDo('nutricao', 'editar')
  const podeExcluir = canDo('nutricao', 'excluir')

  const [aba, setAba] = useState('prescricoes')
  const [busca, setBusca] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('todos')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [imprimindo, setImprimindo] = useState(false)

  const ativas = useMemo(() => dietas.filter((dieta) => dieta.status === 'ativa'), [dietas])

  const kpis = useMemo(
    () => ({
      ativas: ativas.length,
      enteral: ativas.filter((dieta) => dieta.via_enteral && dieta.via_enteral !== 'Não se aplica').length,
      acompanhantes: ativas.filter((dieta) => dieta.acompanhante_refeicao).length,
      suspensas: dietas.filter((dieta) => dieta.status === 'suspensa').length,
    }),
    [dietas, ativas],
  )

  const lista = useMemo(
    () =>
      dietas
        .filter((dieta) => (filtroSetor === 'todos' ? true : dieta.setor === filtroSetor))
        .filter((dieta) => matches(busca, dieta.prontuario, dieta.leito, dieta.setor, dieta.consistencia, dieta.modificacao))
        .sort((a, b) => String(a.leito).localeCompare(String(b.leito))),
    [dietas, filtroSetor, busca],
  )

  /** Mapa de refeições: quantidades por setor e consistência. */
  const mapaRefeicoes = useMemo(() => {
    const setores = new Map()
    ativas.forEach((dieta) => {
      const chave = dieta.setor || 'Sem setor'
      if (!setores.has(chave)) setores.set(chave, { setor: chave, total: 0, acompanhantes: 0, enteral: 0, consistencias: {} })
      const registro = setores.get(chave)
      registro.total += 1
      if (dieta.acompanhante_refeicao) registro.acompanhantes += 1
      if (dieta.via_enteral && dieta.via_enteral !== 'Não se aplica') registro.enteral += 1
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
    setForm({ ...EMPTY, ...dieta })
    setErrors({})
    setModal(dieta.id)
  }

  /** Ao escolher o leito, o setor e o prontuário vêm junto. */
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

    const payload = { ...form, prontuario, prescrito_por: user?.nome || 'Sistema' }
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
        detalhe: `Dieta ${form.consistencia} / ${form.modificacao} prescrita para o prontuário ${prontuario}`,
      })
      toast.success('Dieta prescrita.')
    } else {
      await update(modal, payload)
      await registrarLog({
        acao: 'editar',
        entidade: 'dieta',
        entidade_id: modal,
        referencia: form.leito,
        prontuario,
        setor: form.setor,
        detalhe: `Prescrição atualizada: ${form.consistencia} / ${form.modificacao} (${DIET_STATUS[form.status].label})`,
      })
      toast.success('Prescrição atualizada.')
    }
    setModal(null)
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
      detalhe: `Prescrição de dieta excluída`,
    })
    toast.success('Prescrição excluída.')
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
      <KpiGrid>
        <KpiCard label="Dietas ativas" value={kpis.ativas} icon={Salad} tone="primary" />
        <KpiCard label="Terapia enteral" value={kpis.enteral} icon={UtensilsCrossed} tone="violet" />
        <KpiCard label="Acompanhantes com refeição" value={kpis.acompanhantes} icon={UtensilsCrossed} tone="accent" />
        <KpiCard label="Suspensas" value={kpis.suspensas} icon={Salad} tone={kpis.suspensas ? 'amber' : 'slate'} />
      </KpiGrid>

      <div className="flex flex-wrap gap-2">
        <Pill active={aba === 'prescricoes'} onClick={() => setAba('prescricoes')}>
          Prescrições ({dietas.length})
        </Pill>
        <Pill active={aba === 'mapa'} onClick={() => setAba('mapa')}>
          Mapa de refeições ({totalRefeicoes})
        </Pill>
      </div>

      {aba === 'prescricoes' ? (
        <Card>
          <CardHeader
            title="Prescrição de dietas"
            description="Dieta por prontuário e leito — consistência, modificação terapêutica e via de administração"
            icon={Salad}
            actions={
              podeCriar ? (
                <button type="button" className="btn-primary" onClick={abrirNova}>
                  <Plus className="h-4 w-4" /> Nova prescrição
                </button>
              ) : (
                <Badge className="border-slate-200 bg-slate-100 text-slate-500">
                  <Lock className="h-3 w-3" /> Somente leitura
                </Badge>
              )
            }
          />

          <div className="grid grid-cols-1 gap-3 border-b border-border px-5 py-4 sm:grid-cols-3">
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

          {lista.length === 0 ? (
            <EmptyState title="Nenhum registro encontrado" description="Prescreva a primeira dieta para começar o mapa de refeições." />
          ) : (
            <TableWrapper>
              <thead>
                <tr>
                  <Th>Leito</Th>
                  <Th>Prontuário</Th>
                  <Th>Setor</Th>
                  <Th>Consistência</Th>
                  <Th>Modificação</Th>
                  <Th>Via</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Ações</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map((dieta) => (
                  <tr key={dieta.id} className="transition hover:bg-slate-50">
                    <Td className="font-semibold">{dieta.leito}</Td>
                    <Td className="font-mono text-xs font-semibold text-primary">{dieta.prontuario}</Td>
                    <Td className="text-slate-500">{dieta.setor}</Td>
                    <Td>{dieta.consistencia}</Td>
                    <Td className="text-slate-500">{dieta.modificacao}</Td>
                    <Td className="text-slate-500">
                      {dieta.via_enteral === 'Não se aplica' ? 'Oral' : dieta.via_enteral}
                      {dieta.acompanhante_refeicao ? <Badge className="ml-2 border-accent/30 bg-accent-light text-accent-dark">+ acompanhante</Badge> : null}
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
                ))}
              </tbody>
            </TableWrapper>
          )}
        </Card>
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
          <Field label="Leito" error={errors.leito}>
            <Select value={form.leito} onChange={(event) => selecionarLeito(event.target.value)}>
              <option value="">Selecione...</option>
              {leitos
                .filter((leito) => leito.status === 'ocupado' || leito.nome === form.leito)
                .map((leito) => (
                  <option key={leito.id} value={leito.nome}>
                    {leito.nome} — {leito.setor}
                    {leito.prontuario ? ` (prontuário ${leito.prontuario})` : ''}
                  </option>
                ))}
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
          <Field label="Data da prescrição">
            <Input type="date" value={form.data_prescricao} onChange={(event) => setForm({ ...form, data_prescricao: event.target.value })} />
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
          <Field label="Via de administração">
            <Select value={form.via_enteral} onChange={(event) => setForm({ ...form, via_enteral: event.target.value })}>
              {ENTERAL_ROUTES.map((item) => (
                <option key={item} value={item}>
                  {item === 'Não se aplica' ? 'Oral' : item}
                </option>
              ))}
            </Select>
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
          <Field label="Observações nutricionais" className="sm:col-span-2">
            <Textarea value={form.observacoes} onChange={(event) => setForm({ ...form, observacoes: event.target.value })} placeholder="Alergias, restrições, preferências (sem dados pessoais)" />
          </Field>
        </form>
      </Modal>

      <PrintArea active={imprimindo}>
        <div className="p-4 font-sans text-[11px] text-black">
          <header className="mb-3 border-b-2 border-black pb-2">
            <h1 className="text-base font-bold">{HOSPITAL_NAME}</h1>
            <p className="text-[10px]">{INSTITUTION_NAME}</p>
            <p className="mt-1 text-sm font-semibold">Mapa de refeições — {formatDate(todayISO())}</p>
            <p className="text-[10px]">Total geral: {totalRefeicoes} refeições por horário</p>
          </header>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black px-2 py-1 text-left">Setor</th>
                <th className="border border-black px-2 py-1 text-left">Pacientes</th>
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

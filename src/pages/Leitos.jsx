import { useMemo, useState } from 'react'
import { BedDouble, Building2, Download, Lock, LogIn, LogOut, Pencil, Plus, Sparkles, Trash2, Users, Wrench } from 'lucide-react'
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
  Progress,
  SearchInput,
  Select,
  StatusBadge,
  Textarea,
} from '@/components/ui'
import { BED_SECTORS, BED_STATUS, DISCHARGE_REASONS } from '@/lib/constants'
import { formatDate, formatDateTime, matches, percent } from '@/lib/format'
import { baixarCsv, carimboArquivo } from '@/lib/csv'

const SECTOR_ORDER = BED_SECTORS.map((item) => item.setor)
const EMPTY_LEITO = { nome: '', setor: BED_SECTORS[0].setor, status: 'disponivel' }

export default function Leitos() {
  const { items: leitos, loading, create, update, remove } = useCollection('leitos')
  const { items: visitantes } = useCollection('visitantes')
  const { user, canDo } = useAuth()
  const toast = useToast()
  const registrarLog = useAudit()

  const podeCriar = canDo('leitos', 'criar')
  const podeEditar = canDo('leitos', 'editar')
  const podeExcluir = canDo('leitos', 'excluir')

  const [busca, setBusca] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [detalhe, setDetalhe] = useState(null)
  const [ocupacao, setOcupacao] = useState(null)
  const [alta, setAlta] = useState(null)
  const [motivoAlta, setMotivoAlta] = useState('alta')
  const [leitoForm, setLeitoForm] = useState(null)
  const [form, setForm] = useState({ prontuario: '', previsao_alta: '', observacao: '' })
  const [formLeito, setFormLeito] = useState(EMPTY_LEITO)
  const [errors, setErrors] = useState({})

  /** Reflete no modal as alterações salvas sem precisar reabrir. */
  const leitoAtual = useMemo(() => leitos.find((item) => item.id === detalhe?.id) || detalhe, [leitos, detalhe])

  const acompanhantesDoLeito = useMemo(() => {
    if (!leitoAtual) return []
    return visitantes.filter((visitante) => !visitante.saida && visitante.quarto_leito === leitoAtual.nome)
  }, [visitantes, leitoAtual])

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

  /** As ações seguem as permissões definidas pelo administrador no cadastro do usuário. */
  function exigePermissao(acao = 'editar') {
    if (canDo('leitos', acao)) return true
    toast.error(`Seu perfil não tem permissão para ${acao} no mapa de leitos.`)
    return false
  }

  /* ------------------------------------------------------------ Ocupação */

  function abrirOcupacao(leito) {
    if (!exigePermissao()) return
    setForm({ prontuario: leito.prontuario || '', previsao_alta: leito.previsao_alta || '', observacao: leito.observacao || '' })
    setErrors({})
    setOcupacao(leito)
  }

  async function confirmarOcupacao(event) {
    event.preventDefault()
    const prontuario = form.prontuario.trim()
    if (!/^\d{3,12}$/.test(prontuario)) {
      setErrors({ prontuario: 'Informe um número de prontuário válido.' })
      return
    }
    const duplicado = leitos.find((leito) => leito.status === 'ocupado' && leito.prontuario === prontuario && leito.id !== ocupacao.id)
    if (duplicado) {
      setErrors({ prontuario: `Este prontuário já ocupa o leito ${duplicado.nome}.` })
      return
    }

    await update(ocupacao.id, {
      status: 'ocupado',
      prontuario,
      previsao_alta: form.previsao_alta,
      observacao: form.observacao.trim(),
      ocupado_em: new Date().toISOString(),
    })
    await registrarLog({
      acao: 'ocupar',
      entidade_id: ocupacao.id,
      referencia: ocupacao.nome,
      prontuario,
      setor: ocupacao.setor,
      detalhe: `Prontuário ${prontuario} alocado no leito ${ocupacao.nome}`,
    })
    toast.success(`Leito ${ocupacao.nome} ocupado pelo prontuário ${prontuario}.`)
    setOcupacao(null)
  }

  /* ----------------------------------------------------------------- Alta */

  function abrirAlta(leito) {
    if (!exigePermissao()) return
    setMotivoAlta('alta')
    setAlta(leito)
  }

  async function confirmarAlta(event) {
    event.preventDefault()
    const motivo = DISCHARGE_REASONS[motivoAlta]
    await update(alta.id, { status: 'limpeza', prontuario: '', ocupado_em: '', previsao_alta: '', observacao: '' })
    await registrarLog({
      acao: 'alta',
      entidade_id: alta.id,
      referencia: alta.nome,
      prontuario: alta.prontuario,
      setor: alta.setor,
      detalhe: `${motivo.label} do prontuário ${alta.prontuario} no leito ${alta.nome}`,
    })
    toast.success(`${motivo.label} registrada. Leito ${alta.nome} enviado para higienização.`)
    setAlta(null)
    setDetalhe(null)
  }

  /* --------------------------------------------------------------- Status */

  async function mudarStatus(leito, status) {
    if (!exigePermissao()) return
    if (status === 'ocupado') {
      abrirOcupacao(leito)
      return
    }
    if (leito.status === 'ocupado' && !window.confirm(`O leito ${leito.nome} está ocupado pelo prontuário ${leito.prontuario}. Liberar mesmo assim?`)) return

    await update(leito.id, { status, prontuario: '', ocupado_em: '', previsao_alta: '' })
    await registrarLog({
      acao: 'status',
      entidade_id: leito.id,
      referencia: leito.nome,
      setor: leito.setor,
      detalhe: `Status alterado de "${BED_STATUS[leito.status]?.label}" para "${BED_STATUS[status]?.label}"`,
    })
    toast.success(`Leito ${leito.nome}: ${BED_STATUS[status].label.toLowerCase()}.`)
  }

  /* ------------------------------------------------------- CRUD de leitos */

  function abrirNovoLeito() {
    if (!exigePermissao('criar')) return
    setFormLeito({ ...EMPTY_LEITO, setor: filtroSetor === 'todos' ? BED_SECTORS[0].setor : filtroSetor })
    setErrors({})
    setLeitoForm('novo')
  }

  function abrirEdicaoLeito(leito) {
    if (!exigePermissao()) return
    setFormLeito({ nome: leito.nome, setor: leito.setor, status: leito.status })
    setErrors({})
    setLeitoForm(leito.id)
  }

  async function salvarLeito(event) {
    event.preventDefault()
    const nome = formLeito.nome.trim().toUpperCase()
    const nextErrors = {}
    if (!nome) nextErrors.nome = 'Informe o código do leito.'
    if (nome && leitos.some((leito) => leito.nome.toUpperCase() === nome && leito.id !== leitoForm)) {
      nextErrors.nome = 'Já existe um leito com este código.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const setorConfig = BED_SECTORS.find((item) => item.setor === formLeito.setor)

    if (leitoForm === 'novo') {
      const criado = await create({
        nome,
        setor: formLeito.setor,
        prefixo: setorConfig?.prefixo || nome.split('-')[0],
        numero: Number(nome.split('-')[1]) || leitos.filter((leito) => leito.setor === formLeito.setor).length + 1,
        status: formLeito.status,
        prontuario: '',
        ocupado_em: '',
        previsao_alta: '',
        observacao: '',
      })
      await registrarLog({ acao: 'criar', entidade_id: criado.id, referencia: nome, setor: formLeito.setor, detalhe: `Leito ${nome} cadastrado em ${formLeito.setor}` })
      toast.success(`Leito ${nome} cadastrado.`)
    } else {
      await update(leitoForm, { nome, setor: formLeito.setor, status: formLeito.status })
      await registrarLog({ acao: 'editar', entidade_id: leitoForm, referencia: nome, setor: formLeito.setor, detalhe: `Leito ${nome} atualizado` })
      toast.success(`Leito ${nome} atualizado.`)
    }
    setLeitoForm(null)
    setDetalhe(null)
  }

  async function excluirLeito(leito) {
    if (!exigePermissao('excluir')) return
    if (leito.status === 'ocupado') {
      toast.error(`O leito ${leito.nome} está ocupado e não pode ser excluído. Registre a alta primeiro.`)
      return
    }
    if (!window.confirm(`Excluir o leito ${leito.nome} do setor ${leito.setor}? Esta ação não pode ser desfeita.`)) return

    await remove(leito.id)
    await registrarLog({ acao: 'excluir', entidade_id: leito.id, referencia: leito.nome, setor: leito.setor, detalhe: `Leito ${leito.nome} excluído` })
    toast.success(`Leito ${leito.nome} excluído.`)
    setDetalhe(null)
  }

  function exportar() {
    baixarCsv(
      carimboArquivo('leitos'),
      [
        { label: 'Leito', valor: (l) => l.nome },
        { label: 'Setor', valor: (l) => l.setor },
        { label: 'Status', valor: (l) => BED_STATUS[l.status]?.label || l.status },
        { label: 'Prontuário', valor: (l) => l.prontuario || '' },
        { label: 'Ocupado desde', valor: (l) => (l.ocupado_em ? formatDateTime(l.ocupado_em) : '') },
        { label: 'Previsão de alta', valor: (l) => (l.previsao_alta ? formatDate(l.previsao_alta) : '') },
      ],
      filtrados,
    )
    toast.success('Arquivo CSV gerado.')
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
        <CardHeader
          title="Mapa de leitos"
          description="150 leitos distribuídos em 9 setores — identificação por prontuário"
          icon={BedDouble}
          actions={
            <>
              <button type="button" className="btn-ghost" onClick={exportar}>
                <Download className="h-4 w-4" /> CSV
              </button>
              {podeCriar ? (
                <button type="button" className="btn-primary" onClick={abrirNovoLeito}>
                  <Plus className="h-4 w-4" /> Novo leito
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
            <SearchInput value={busca} onChange={setBusca} placeholder="Código do leito ou prontuário..." className="sm:col-span-2" />
            <Select value={filtroSetor} onChange={(event) => setFiltroSetor(event.target.value)}>
              <option value="todos">Todos os setores ({leitos.length})</option>
              {BED_SECTORS.map((setor) => (
                <option key={setor.setor} value={setor.setor}>
                  {setor.setor} ({leitos.filter((leito) => leito.setor === setor.setor).length})
                </option>
              ))}
            </Select>
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
              const taxa = percent(ocupados, lista.length)
              return (
                <section key={setor}>
                  <div className="mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">{setor}</h3>
                      <Badge className="border-slate-200 bg-slate-100 text-slate-600">{lista.length} leitos</Badge>
                      <span className={`text-xs font-semibold ${taxa >= 90 ? 'text-red-600' : taxa >= 70 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {ocupados}/{lista.length} ocupados · {taxa}%
                      </span>
                    </div>
                    <Progress
                      className="mt-2"
                      value={taxa}
                      barClassName={taxa >= 90 ? 'bg-red-500' : taxa >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {lista.map((leito) => {
                      const config = BED_STATUS[leito.status] || BED_STATUS.disponivel
                      const temAcompanhante = visitantes.some((visitante) => !visitante.saida && visitante.quarto_leito === leito.nome)
                      return (
                        <button
                          type="button"
                          key={leito.id}
                          onClick={() => setDetalhe(leito)}
                          className={`rounded-xl border p-3 text-left transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30 ${config.card}`}
                        >
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
                          {temAcompanhante ? (
                            <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-accent-dark">
                              <Users className="h-3 w-3" /> Com acompanhante
                            </p>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </Card>

      {/* ---------------------------------------------------- Detalhes do leito */}
      <Modal
        open={Boolean(detalhe)}
        onClose={() => setDetalhe(null)}
        title={leitoAtual ? `Leito ${leitoAtual.nome}` : ''}
        description={leitoAtual ? `${leitoAtual.setor}` : ''}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setDetalhe(null)}>
              Fechar
            </button>
            {podeEditar ? (
              <button type="button" className="btn-ghost" onClick={() => abrirEdicaoLeito(leitoAtual)}>
                <Pencil className="h-4 w-4" /> Editar
              </button>
            ) : null}
            {podeExcluir ? (
              <button type="button" className="btn-danger" onClick={() => excluirLeito(leitoAtual)}>
                <Trash2 className="h-4 w-4" /> Excluir
              </button>
            ) : null}
          </>
        }
      >
        {leitoAtual ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge map={BED_STATUS} value={leitoAtual.status} />
              {leitoAtual.prontuario ? <Badge className="border-primary/20 bg-primary-light font-mono text-primary">Prontuário {leitoAtual.prontuario}</Badge> : null}
            </div>

            <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-xs">
              <div>
                <dt className="font-semibold uppercase tracking-wide text-slate-400">Ocupado desde</dt>
                <dd className="text-slate-700">{leitoAtual.ocupado_em ? formatDateTime(leitoAtual.ocupado_em) : '—'}</dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-slate-400">Previsão de alta</dt>
                <dd className="text-slate-700">{leitoAtual.previsao_alta ? formatDate(leitoAtual.previsao_alta) : '—'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="font-semibold uppercase tracking-wide text-slate-400">Acompanhante no leito</dt>
                <dd className="text-slate-700">
                  {acompanhantesDoLeito.length === 0
                    ? 'Nenhum acompanhante registrado no momento'
                    : acompanhantesDoLeito.map((visitante) => `${visitante.nome} (${visitante.parentesco})`).join(', ')}
                </dd>
              </div>
              {leitoAtual.observacao ? (
                <div className="col-span-2">
                  <dt className="font-semibold uppercase tracking-wide text-slate-400">Observações</dt>
                  <dd className="text-slate-700">{leitoAtual.observacao}</dd>
                </div>
              ) : null}
            </dl>

            {podeEditar ? (
              <>
                <section>
                  <p className="label">Ações</p>
                  <div className="flex flex-wrap gap-2">
                    {leitoAtual.status !== 'ocupado' ? (
                      <button type="button" className="btn-primary" onClick={() => abrirOcupacao(leitoAtual)}>
                        <LogIn className="h-4 w-4" /> Alocar prontuário
                      </button>
                    ) : (
                      <button type="button" className="btn-accent" onClick={() => abrirAlta(leitoAtual)}>
                        <LogOut className="h-4 w-4" /> Dar alta
                      </button>
                    )}
                    {leitoAtual.status === 'limpeza' ? (
                      <button type="button" className="btn-ghost" onClick={() => mudarStatus(leitoAtual, 'disponivel')}>
                        <Sparkles className="h-4 w-4" /> Liberar leito
                      </button>
                    ) : null}
                  </div>
                </section>

                <section>
                  <p className="label">Alterar status</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(BED_STATUS).map(([key, config]) => (
                      <Pill key={key} active={leitoAtual.status === key} onClick={() => mudarStatus(leitoAtual, key)}>
                        {config.label}
                      </Pill>
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Seu perfil ({user?.funcao}) tem acesso somente leitura ao mapa de leitos.
              </p>
            )}
          </div>
        ) : null}
      </Modal>

      {/* --------------------------------------------------------- Ocupação */}
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

      {/* -------------------------------------------------------------- Alta */}
      <Modal
        open={Boolean(alta)}
        onClose={() => setAlta(null)}
        size="sm"
        title={alta ? `Dar alta — leito ${alta.nome}` : ''}
        description={alta ? `Prontuário ${alta.prontuario}` : ''}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setAlta(null)}>
              Cancelar
            </button>
            <button type="submit" form="form-alta" className="btn-primary">
              Confirmar saída
            </button>
          </>
        }
      >
        <form id="form-alta" onSubmit={confirmarAlta} className="space-y-4">
          <Field label="Motivo da saída" hint="O leito segue para higienização e a ação fica registrada no log de auditoria.">
            <Select value={motivoAlta} onChange={(event) => setMotivoAlta(event.target.value)}>
              {Object.entries(DISCHARGE_REASONS).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.icon} {config.label}
                </option>
              ))}
            </Select>
          </Field>
        </form>
      </Modal>

      {/* ------------------------------------------------- Criar/editar leito */}
      <Modal
        open={Boolean(leitoForm)}
        onClose={() => setLeitoForm(null)}
        size="sm"
        title={leitoForm === 'novo' ? 'Novo leito' : 'Editar leito'}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setLeitoForm(null)}>
              Cancelar
            </button>
            <button type="submit" form="form-cadastro-leito" className="btn-primary">
              Salvar
            </button>
          </>
        }
      >
        <form id="form-cadastro-leito" onSubmit={salvarLeito} className="space-y-4">
          <Field label="Código do leito" error={errors.nome} hint="Padrão do hospital: prefixo do setor + número (ex.: CM-31).">
            <Input className="uppercase" value={formLeito.nome} onChange={(event) => setFormLeito({ ...formLeito, nome: event.target.value.toUpperCase() })} autoFocus />
          </Field>
          <Field label="Setor">
            <Select value={formLeito.setor} onChange={(event) => setFormLeito({ ...formLeito, setor: event.target.value })}>
              {BED_SECTORS.map((setor) => (
                <option key={setor.setor} value={setor.setor}>
                  {setor.setor}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status inicial">
            <Select value={formLeito.status} onChange={(event) => setFormLeito({ ...formLeito, status: event.target.value })}>
              {Object.entries(BED_STATUS)
                .filter(([key]) => key !== 'ocupado')
                .map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
            </Select>
          </Field>
        </form>
      </Modal>
    </div>
  )
}

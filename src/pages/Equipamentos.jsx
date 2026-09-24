import { useMemo, useState } from 'react'
import { AlertTriangle, Pencil, Plus, Trash2, Wrench } from 'lucide-react'
import { useCollection, useCollections } from '@/data/store'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Card, CardHeader, EmptyState, Field, Input, KpiCard, KpiGrid, LoadingState, Modal, Pill, SearchInput, Select, StatusBadge, TableWrapper, Td, Textarea, Th } from '@/components/ui'
import { EQUIPMENT_STATUS, EQUIPMENT_TYPES } from '@/lib/constants'
import { formatDate, matches, todayISO } from '@/lib/format'

const EMPTY = {
  nome: '',
  codigo: '',
  tipo: 'Monitorização',
  sala: '',
  status: 'operacional',
  patrimonio: '',
  fornecedor: '',
  ultima_manutencao: '',
  proxima_manutencao: '',
  observacao: '',
}

export default function Equipamentos() {
  const { items: equipamentos, loading, create, update, remove } = useCollection('equipamentos')
  const auxiliares = useCollections(['salas'])
  const toast = useToast()
  const { canDo } = useAuth()
  const podeCriar = canDo('equipamentos', 'criar')
  const podeEditar = canDo('equipamentos', 'editar')
  const podeExcluir = canDo('equipamentos', 'excluir')
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  const atrasado = (equipamento) => Boolean(equipamento.proxima_manutencao) && equipamento.proxima_manutencao < todayISO()

  const lista = useMemo(
    () =>
      equipamentos
        .filter((item) => (filtroStatus === 'todos' ? true : filtroStatus === 'atrasados' ? atrasado(item) : item.status === filtroStatus))
        .filter((item) => matches(busca, item.nome, item.codigo, item.tipo, item.sala))
        .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo))),
    [equipamentos, busca, filtroStatus],
  )

  const kpis = useMemo(
    () => ({
      total: equipamentos.length,
      operacionais: equipamentos.filter((item) => item.status === 'operacional').length,
      manutencao: equipamentos.filter((item) => item.status === 'manutencao').length,
      atrasados: equipamentos.filter(atrasado).length,
    }),
    [equipamentos],
  )

  function abrirNovo() {
    const proximoCodigo = `EQ-${String(equipamentos.length + 1).padStart(4, '0')}`
    setForm({ ...EMPTY, codigo: proximoCodigo })
    setErrors({})
    setModal('novo')
  }

  function abrirEdicao(equipamento) {
    setForm({ ...EMPTY, ...equipamento })
    setErrors({})
    setModal(equipamento.id)
  }

  async function salvar(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!form.nome.trim()) nextErrors.nome = 'Informe o nome do equipamento.'
    if (!form.codigo.trim()) nextErrors.codigo = 'Informe o código de identificação.'
    const duplicado = equipamentos.find((item) => item.codigo === form.codigo.trim() && item.id !== modal)
    if (duplicado) nextErrors.codigo = 'Já existe um equipamento com este código.'
    if (form.ultima_manutencao && form.proxima_manutencao && form.proxima_manutencao < form.ultima_manutencao) {
      nextErrors.proxima_manutencao = 'A próxima manutenção deve ser posterior à última.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const payload = { ...form, nome: form.nome.trim(), codigo: form.codigo.trim().toUpperCase() }
    delete payload.id
    if (modal === 'novo') {
      await create(payload)
      toast.success('Equipamento cadastrado.')
    } else {
      await update(modal, payload)
      toast.success('Equipamento atualizado.')
    }
    setModal(null)
  }

  async function excluir(equipamento) {
    if (!window.confirm(`Excluir o equipamento ${equipamento.nome} (${equipamento.codigo})?`)) return
    await remove(equipamento.id)
    toast.success('Equipamento excluído.')
  }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-5">
      <KpiGrid>
        <KpiCard label="Equipamentos" value={kpis.total} icon={Wrench} tone="primary" />
        <KpiCard label="Operacionais" value={kpis.operacionais} icon={Wrench} tone="emerald" />
        <KpiCard label="Em manutenção" value={kpis.manutencao} icon={Wrench} tone="amber" />
        <KpiCard label="Manutenção vencida" value={kpis.atrasados} icon={AlertTriangle} tone={kpis.atrasados ? 'red' : 'emerald'} />
      </KpiGrid>

      <Card>
        <CardHeader
          title="Equipamentos"
          description="Controle patrimonial e manutenção preventiva"
          icon={Wrench}
          actions={podeCriar ? (
              <button type="button" className="btn-primary" onClick={abrirNovo}>
              <Plus className="h-4 w-4" /> Novo equipamento
            </button>
            ) : null}
        />

        <div className="space-y-3 border-b border-border px-5 py-4">
          <SearchInput value={busca} onChange={setBusca} placeholder="Nome, código, tipo ou sala..." />
          <div className="flex flex-wrap gap-2">
            <Pill active={filtroStatus === 'todos'} onClick={() => setFiltroStatus('todos')}>
              Todos ({equipamentos.length})
            </Pill>
            {Object.entries(EQUIPMENT_STATUS).map(([key, config]) => (
              <Pill key={key} active={filtroStatus === key} onClick={() => setFiltroStatus(key)}>
                {config.label} ({equipamentos.filter((item) => item.status === key).length})
              </Pill>
            ))}
            <Pill active={filtroStatus === 'atrasados'} onClick={() => setFiltroStatus('atrasados')}>
              Manutenção vencida ({kpis.atrasados})
            </Pill>
          </div>
        </div>

        {lista.length === 0 ? (
          <EmptyState title="Nenhum registro encontrado" description="Cadastre equipamentos ou ajuste os filtros." />
        ) : (
          <TableWrapper>
            <thead>
              <tr>
                <Th>Código</Th>
                <Th>Equipamento</Th>
                <Th>Tipo</Th>
                <Th>Sala</Th>
                <Th>Status</Th>
                <Th>Última manutenção</Th>
                <Th>Próxima manutenção</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((equipamento) => (
                <tr key={equipamento.id} className={`transition hover:bg-slate-50 ${atrasado(equipamento) ? 'bg-red-50/60' : ''}`}>
                  <Td className="font-mono text-xs font-semibold text-primary">{equipamento.codigo}</Td>
                  <Td className="font-semibold">{equipamento.nome}</Td>
                  <Td className="text-slate-500">{equipamento.tipo}</Td>
                  <Td>{equipamento.sala || '—'}</Td>
                  <Td>
                    <StatusBadge map={EQUIPMENT_STATUS} value={equipamento.status} />
                  </Td>
                  <Td className="text-slate-500">{formatDate(equipamento.ultima_manutencao)}</Td>
                  <Td className={atrasado(equipamento) ? 'font-semibold text-red-600' : 'text-slate-500'}>
                    {formatDate(equipamento.proxima_manutencao)}
                    {atrasado(equipamento) ? <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase">Atrasada</span> : null}
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex gap-1">                      {podeEditar ? (
                        <button type="button" onClick={() => abrirEdicao(equipamento)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-primary" aria-label="Editar">
                        <Pencil className="h-4 w-4" />
                      </button>
                      ) : null}                      {podeExcluir ? (
                        <button type="button" onClick={() => excluir(equipamento)} className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600" aria-label="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </button>
                      ) : null}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
        )}
      </Card>

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal === 'novo' ? 'Novo equipamento' : 'Editar equipamento'}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setModal(null)}>
              Cancelar
            </button>
            <button type="submit" form="form-equipamento" className="btn-primary">
              Salvar
            </button>
          </>
        }
      >
        <form id="form-equipamento" onSubmit={salvar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome" error={errors.nome} className="sm:col-span-2">
            <Input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} placeholder="Torre de videolaparoscopia" />
          </Field>
          <Field label="Código" error={errors.codigo}>
            <Input value={form.codigo} onChange={(event) => setForm({ ...form, codigo: event.target.value })} placeholder="EQ-0007" />
          </Field>
          <Field label="Patrimônio">
            <Input value={form.patrimonio} onChange={(event) => setForm({ ...form, patrimonio: event.target.value })} />
          </Field>
          <Field label="Tipo">
            <Select value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value })}>
              {EQUIPMENT_TYPES.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sala">
            <Select value={form.sala} onChange={(event) => setForm({ ...form, sala: event.target.value })}>
              <option value="">Sem sala fixa</option>
              {(auxiliares.salas || []).map((sala) => (
                <option key={sala.id} value={sala.nome}>
                  {sala.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              {Object.entries(EQUIPMENT_STATUS).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fornecedor / assistência">
            <Input value={form.fornecedor} onChange={(event) => setForm({ ...form, fornecedor: event.target.value })} />
          </Field>
          <Field label="Última manutenção">
            <Input type="date" value={form.ultima_manutencao} onChange={(event) => setForm({ ...form, ultima_manutencao: event.target.value })} />
          </Field>
          <Field label="Próxima manutenção" error={errors.proxima_manutencao}>
            <Input type="date" value={form.proxima_manutencao} onChange={(event) => setForm({ ...form, proxima_manutencao: event.target.value })} />
          </Field>
          <Field label="Observações" className="sm:col-span-2">
            <Textarea value={form.observacao} onChange={(event) => setForm({ ...form, observacao: event.target.value })} />
          </Field>
        </form>
      </Modal>
    </div>
  )
}

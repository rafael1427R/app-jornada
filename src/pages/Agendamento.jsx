import { useMemo, useState } from 'react'
import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react'
import { useCollection, useCollections } from '@/data/store'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Card, CardHeader, EmptyState, Field, Input, LoadingState, Modal, Pill, SearchInput, Select, StatusBadge, TableWrapper, Td, Textarea, Th } from '@/components/ui'
import {
  ANESTHESIA_TYPES,
  LATERALITY,
  OMS_CHECKLIST,
  SURGERY_STATUS,
  SURGERY_STATUS_KEYS,
  SURGERY_TECHNIQUES,
  SURGERY_TYPES,
} from '@/lib/constants'
import { formatDate, matches, todayISO } from '@/lib/format'

const EMPTY = {
  prontuario: '',
  procedimento: '',
  especialidade: '',
  tipo: 'eletiva',
  tecnica: 'Convencional',
  lateralidade: 'Não se aplica',
  sala: '',
  data_prevista: todayISO(),
  hora_prevista: '07:30',
  inicio_real: '',
  fim_real: '',
  status: 'agendada',
  cirurgiao: '',
  anestesista: '',
  equipe: [],
  anestesia: 'Geral',
  checklist_oms: [],
  leito_rpa: '',
  convertida: false,
  reoperacao: false,
  infeccao: false,
  evento_adverso: false,
  obito: false,
  motivo_cancelamento: '',
  observacao: '',
}

export default function Agendamento() {
  const { items: cirurgias, loading, create, update, remove } = useCollection('cirurgias')
  const auxiliares = useCollections(['salas', 'equipe'])
  const toast = useToast()
  const { canDo } = useAuth()
  const podeCriar = canDo('agendamento', 'criar')
  const podeEditar = canDo('agendamento', 'editar')
  const podeExcluir = canDo('agendamento', 'excluir')

  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroData, setFiltroData] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const lista = useMemo(() => {
    return cirurgias
      .filter((item) => (filtroStatus === 'todos' ? true : item.status === filtroStatus))
      .filter((item) => (filtroData ? item.data_prevista === filtroData : true))
      .filter((item) => matches(busca, item.prontuario, item.procedimento, item.sala, item.especialidade, item.cirurgiao))
      .sort((a, b) => `${b.data_prevista} ${b.hora_prevista}`.localeCompare(`${a.data_prevista} ${a.hora_prevista}`))
  }, [cirurgias, filtroStatus, filtroData, busca])

  function abrirNova() {
    setForm({ ...EMPTY })
    setErrors({})
    setModal('nova')
  }

  function abrirEdicao(cirurgia) {
    setForm({ ...EMPTY, ...cirurgia, checklist_oms: cirurgia.checklist_oms || [], equipe: cirurgia.equipe || [] })
    setErrors({})
    setModal(cirurgia.id)
  }

  function toggleChecklist(id) {
    setForm((current) => ({
      ...current,
      checklist_oms: current.checklist_oms.includes(id) ? current.checklist_oms.filter((item) => item !== id) : [...current.checklist_oms, id],
    }))
  }

  function toggleEquipe(nome) {
    setForm((current) => ({
      ...current,
      equipe: current.equipe.includes(nome) ? current.equipe.filter((item) => item !== nome) : [...current.equipe, nome],
    }))
  }

  async function salvar(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!/^\d{3,12}$/.test(String(form.prontuario).trim())) nextErrors.prontuario = 'Informe o número do prontuário (somente dígitos).'
    if (!form.procedimento.trim()) nextErrors.procedimento = 'Informe o procedimento.'
    if (!form.sala.trim()) nextErrors.sala = 'Selecione a sala.'
    if (!form.data_prevista) nextErrors.data_prevista = 'Informe a data prevista.'
    if (!form.hora_prevista) nextErrors.hora_prevista = 'Informe o horário previsto.'
    if (form.status === 'cancelada' && !form.motivo_cancelamento.trim()) nextErrors.motivo_cancelamento = 'Informe o motivo do cancelamento.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSaving(true)
    const payload = { ...form, prontuario: String(form.prontuario).trim(), procedimento: form.procedimento.trim() }
    delete payload.id
    try {
      if (modal === 'nova') {
        await create(payload)
        toast.success('Cirurgia agendada com sucesso.')
      } else {
        await update(modal, payload)
        toast.success('Cirurgia atualizada com sucesso.')
      }
      setModal(null)
    } catch (error) {
      toast.error(`Não foi possível salvar: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function excluir(cirurgia) {
    if (!window.confirm(`Excluir o agendamento do prontuário ${cirurgia.prontuario}?`)) return
    await remove(cirurgia.id)
    toast.success('Agendamento excluído.')
  }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Agendamento cirúrgico"
          description="Cadastro e acompanhamento das cirurgias (identificação apenas por prontuário)"
          icon={CalendarDays}
          actions={podeCriar ? (
              <button type="button" className="btn-primary" onClick={abrirNova}>
              <Plus className="h-4 w-4" /> Nova cirurgia
            </button>
            ) : null}
        />

        <div className="space-y-3 border-b border-border px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SearchInput value={busca} onChange={setBusca} placeholder="Prontuário, procedimento, sala..." className="lg:col-span-2" />
            <Input type="date" value={filtroData} onChange={(event) => setFiltroData(event.target.value)} />
            <button type="button" className="btn-ghost" onClick={() => { setBusca(''); setFiltroData(''); setFiltroStatus('todos') }}>
              Limpar filtros
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill active={filtroStatus === 'todos'} onClick={() => setFiltroStatus('todos')}>
              Todos ({cirurgias.length})
            </Pill>
            {SURGERY_STATUS_KEYS.map((key) => (
              <Pill key={key} active={filtroStatus === key} onClick={() => setFiltroStatus(key)}>
                {SURGERY_STATUS[key].label} ({cirurgias.filter((item) => item.status === key).length})
              </Pill>
            ))}
          </div>
        </div>

        {lista.length === 0 ? (
          <EmptyState title="Nenhum registro encontrado" description="Ajuste os filtros ou cadastre uma nova cirurgia." />
        ) : (
          <TableWrapper>
            <thead>
              <tr>
                <Th>Data / Hora</Th>
                <Th>Prontuário</Th>
                <Th>Procedimento</Th>
                <Th>Sala</Th>
                <Th>Tipo</Th>
                <Th>Técnica</Th>
                <Th>Status</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((cirurgia) => (
                <tr key={cirurgia.id} className="transition hover:bg-slate-50">
                  <Td>
                    <span className="font-semibold">{formatDate(cirurgia.data_prevista)}</span>
                    <span className="ml-1 text-slate-500">{cirurgia.hora_prevista}</span>
                  </Td>
                  <Td className="font-mono text-xs font-semibold text-primary">{cirurgia.prontuario}</Td>
                  <Td className="max-w-[260px] truncate">{cirurgia.procedimento}</Td>
                  <Td>{cirurgia.sala}</Td>
                  <Td>
                    <StatusBadge map={SURGERY_TYPES} value={cirurgia.tipo} />
                  </Td>
                  <Td className="text-slate-500">{cirurgia.tecnica}</Td>
                  <Td>
                    <StatusBadge map={SURGERY_STATUS} value={cirurgia.status} />
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex gap-1">                      {podeEditar ? (
                        <button type="button" onClick={() => abrirEdicao(cirurgia)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-primary" aria-label="Editar">
                        <Pencil className="h-4 w-4" />
                      </button>
                      ) : null}                      {podeExcluir ? (
                        <button type="button" onClick={() => excluir(cirurgia)} className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600" aria-label="Excluir">
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
        size="lg"
        title={modal === 'nova' ? 'Nova cirurgia' : 'Editar cirurgia'}
        description="Nunca registre o nome do paciente — utilize somente o número do prontuário."
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setModal(null)}>
              Cancelar
            </button>
            <button type="submit" form="form-cirurgia" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar cirurgia'}
            </button>
          </>
        }
      >
        <form id="form-cirurgia" onSubmit={salvar} className="space-y-5">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Prontuário" error={errors.prontuario}>
              <Input value={form.prontuario} inputMode="numeric" onChange={(event) => setForm({ ...form, prontuario: event.target.value })} placeholder="Ex.: 204871" />
            </Field>
            <Field label="Especialidade">
              <Input value={form.especialidade} onChange={(event) => setForm({ ...form, especialidade: event.target.value })} placeholder="Cirurgia Geral" />
            </Field>
            <Field label="Procedimento" error={errors.procedimento} className="sm:col-span-2">
              <Input value={form.procedimento} onChange={(event) => setForm({ ...form, procedimento: event.target.value })} placeholder="Colecistectomia videolaparoscópica" />
            </Field>
            <Field label="Tipo">
              <Select value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value })}>
                {Object.entries(SURGERY_TYPES).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Técnica">
              <Select value={form.tecnica} onChange={(event) => setForm({ ...form, tecnica: event.target.value })}>
                {SURGERY_TECHNIQUES.map((tecnica) => (
                  <option key={tecnica} value={tecnica}>
                    {tecnica}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Lateralidade">
              <Select value={form.lateralidade} onChange={(event) => setForm({ ...form, lateralidade: event.target.value })}>
                {LATERALITY.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sala" error={errors.sala}>
              <Select value={form.sala} onChange={(event) => setForm({ ...form, sala: event.target.value })}>
                <option value="">Selecione...</option>
                {(auxiliares.salas || []).map((sala) => (
                  <option key={sala.id} value={sala.nome}>
                    {sala.nome} — {sala.setor}
                  </option>
                ))}
              </Select>
            </Field>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Field label="Data prevista" error={errors.data_prevista}>
              <Input type="date" value={form.data_prevista} onChange={(event) => setForm({ ...form, data_prevista: event.target.value })} />
            </Field>
            <Field label="Hora prevista" error={errors.hora_prevista}>
              <Input type="time" value={form.hora_prevista} onChange={(event) => setForm({ ...form, hora_prevista: event.target.value })} />
            </Field>
            <Field label="Início real">
              <Input type="datetime-local" value={form.inicio_real?.slice(0, 16) || ''} onChange={(event) => setForm({ ...form, inicio_real: event.target.value })} />
            </Field>
            <Field label="Fim real">
              <Input type="datetime-local" value={form.fim_real?.slice(0, 16) || ''} onChange={(event) => setForm({ ...form, fim_real: event.target.value })} />
            </Field>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Status">
              <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                {SURGERY_STATUS_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {SURGERY_STATUS[key].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Anestesia">
              <Select value={form.anestesia} onChange={(event) => setForm({ ...form, anestesia: event.target.value })}>
                {ANESTHESIA_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Leito de RPA">
              <Input value={form.leito_rpa} onChange={(event) => setForm({ ...form, leito_rpa: event.target.value })} placeholder="RPA-01" />
            </Field>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Cirurgião responsável">
              <Select value={form.cirurgiao} onChange={(event) => setForm({ ...form, cirurgiao: event.target.value })}>
                <option value="">Selecione...</option>
                {(auxiliares.equipe || []).filter((pessoa) => pessoa.funcao === 'Cirurgião').map((pessoa) => (
                  <option key={pessoa.id} value={pessoa.nome}>
                    {pessoa.nome}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Anestesista">
              <Select value={form.anestesista} onChange={(event) => setForm({ ...form, anestesista: event.target.value })}>
                <option value="">Selecione...</option>
                {(auxiliares.equipe || []).filter((pessoa) => pessoa.funcao === 'Anestesista').map((pessoa) => (
                  <option key={pessoa.id} value={pessoa.nome}>
                    {pessoa.nome}
                  </option>
                ))}
              </Select>
            </Field>
          </section>

          <section>
            <p className="label">Equipe escalada</p>
            <div className="flex flex-wrap gap-2">
              {(auxiliares.equipe || []).map((pessoa) => (
                <Pill key={pessoa.id} active={form.equipe.includes(pessoa.nome)} onClick={() => toggleEquipe(pessoa.nome)}>
                  {pessoa.nome} · {pessoa.funcao}
                </Pill>
              ))}
              {(auxiliares.equipe || []).length === 0 ? <p className="text-sm text-slate-400">Nenhum profissional cadastrado.</p> : null}
            </div>
          </section>

          <section>
            <p className="label">Checklist de Cirurgia Segura (OMS)</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {OMS_CHECKLIST.map((item) => (
                <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" checked={form.checklist_oms.includes(item.id)} onChange={() => toggleChecklist(item.id)} />
                  {item.label}
                </label>
              ))}
            </div>
          </section>

          <section>
            <p className="label">Desfechos</p>
            <div className="flex flex-wrap gap-2">
              {[
                ['convertida', 'Convertida para aberta'],
                ['reoperacao', 'Reoperação'],
                ['infeccao', 'Infecção de sítio cirúrgico'],
                ['evento_adverso', 'Evento adverso'],
                ['obito', 'Óbito'],
              ].map(([key, label]) => (
                <Pill key={key} active={form[key]} onClick={() => setForm({ ...form, [key]: !form[key] })}>
                  {label}
                </Pill>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {form.status === 'cancelada' || form.status === 'suspensa' ? (
              <Field label="Motivo do cancelamento/suspensão" error={errors.motivo_cancelamento} className="sm:col-span-2">
                <Input value={form.motivo_cancelamento} onChange={(event) => setForm({ ...form, motivo_cancelamento: event.target.value })} placeholder="Ex.: falta de vaga em UTI" />
              </Field>
            ) : null}
            <Field label="Observações" className="sm:col-span-2">
              <Textarea value={form.observacao} onChange={(event) => setForm({ ...form, observacao: event.target.value })} placeholder="Informações complementares (sem dados pessoais)" />
            </Field>
          </section>
        </form>
      </Modal>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Pencil, Plus, Stethoscope, Trash2 } from 'lucide-react'
import { useCollection } from '@/data/store'
import { useToast } from '@/context/ToastContext'
import { Card, CardHeader, EmptyState, Field, Input, KpiCard, KpiGrid, LoadingState, Modal, Pill, SearchInput, Select, StatusBadge, TableWrapper, Td, Textarea, Th } from '@/components/ui'
import { SHIFTS, TEAM_AVAILABILITY, TEAM_ROLES } from '@/lib/constants'
import { matches } from '@/lib/format'

const EMPTY = { nome: '', registro: '', funcao: 'Cirurgião', especialidade: '', turno: 'Manhã', disponibilidade: 'disponivel', telefone_ramal: '', observacao: '' }

export default function EquipeMedica() {
  const { items: equipe, loading, create, update, remove } = useCollection('equipe')
  const toast = useToast()
  const [busca, setBusca] = useState('')
  const [filtroFuncao, setFiltroFuncao] = useState('todas')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  const lista = useMemo(
    () =>
      equipe
        .filter((pessoa) => (filtroFuncao === 'todas' ? true : pessoa.funcao === filtroFuncao))
        .filter((pessoa) => matches(busca, pessoa.nome, pessoa.registro, pessoa.especialidade, pessoa.funcao))
        .sort((a, b) => String(a.nome).localeCompare(String(b.nome))),
    [equipe, busca, filtroFuncao],
  )

  const kpis = useMemo(
    () => ({
      total: equipe.length,
      disponiveis: equipe.filter((pessoa) => pessoa.disponibilidade === 'disponivel').length,
      emProcedimento: equipe.filter((pessoa) => pessoa.disponibilidade === 'em_procedimento').length,
      afastados: equipe.filter((pessoa) => ['folga', 'ferias'].includes(pessoa.disponibilidade)).length,
    }),
    [equipe],
  )

  function abrirNovo() {
    setForm(EMPTY)
    setErrors({})
    setModal('novo')
  }

  function abrirEdicao(pessoa) {
    setForm({ ...EMPTY, ...pessoa })
    setErrors({})
    setModal(pessoa.id)
  }

  async function salvar(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!form.nome.trim()) nextErrors.nome = 'Informe o nome do profissional.'
    if (!form.registro.trim()) nextErrors.registro = 'Informe o CRM ou COREN.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const payload = { ...form, nome: form.nome.trim(), registro: form.registro.trim().toUpperCase() }
    delete payload.id
    if (modal === 'novo') {
      await create(payload)
      toast.success('Profissional cadastrado.')
    } else {
      await update(modal, payload)
      toast.success('Cadastro atualizado.')
    }
    setModal(null)
  }

  async function excluir(pessoa) {
    if (!window.confirm(`Excluir o profissional ${pessoa.nome}?`)) return
    await remove(pessoa.id)
    toast.success('Profissional excluído.')
  }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-5">
      <KpiGrid>
        <KpiCard label="Profissionais" value={kpis.total} icon={Stethoscope} tone="primary" />
        <KpiCard label="Disponíveis" value={kpis.disponiveis} icon={Stethoscope} tone="emerald" />
        <KpiCard label="Em procedimento" value={kpis.emProcedimento} icon={Stethoscope} tone="accent" />
        <KpiCard label="Folga / Férias" value={kpis.afastados} icon={Stethoscope} tone="amber" />
      </KpiGrid>

      <Card>
        <CardHeader
          title="Equipe médica e assistencial"
          description="Cadastro de profissionais do centro cirúrgico"
          icon={Stethoscope}
          actions={
            <button type="button" className="btn-primary" onClick={abrirNovo}>
              <Plus className="h-4 w-4" /> Novo profissional
            </button>
          }
        />

        <div className="space-y-3 border-b border-border px-5 py-4">
          <SearchInput value={busca} onChange={setBusca} placeholder="Nome, registro ou especialidade..." />
          <div className="flex flex-wrap gap-2">
            <Pill active={filtroFuncao === 'todas'} onClick={() => setFiltroFuncao('todas')}>
              Todas ({equipe.length})
            </Pill>
            {TEAM_ROLES.map((funcao) => (
              <Pill key={funcao} active={filtroFuncao === funcao} onClick={() => setFiltroFuncao(funcao)}>
                {funcao} ({equipe.filter((pessoa) => pessoa.funcao === funcao).length})
              </Pill>
            ))}
          </div>
        </div>

        {lista.length === 0 ? (
          <EmptyState title="Nenhum registro encontrado" description="Cadastre profissionais para montar a equipe cirúrgica." />
        ) : (
          <TableWrapper>
            <thead>
              <tr>
                <Th>Profissional</Th>
                <Th>CRM / COREN</Th>
                <Th>Função</Th>
                <Th>Especialidade</Th>
                <Th>Turno</Th>
                <Th>Disponibilidade</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((pessoa) => (
                <tr key={pessoa.id} className="transition hover:bg-slate-50">
                  <Td className="font-semibold">{pessoa.nome}</Td>
                  <Td className="font-mono text-xs">{pessoa.registro}</Td>
                  <Td>{pessoa.funcao}</Td>
                  <Td className="text-slate-500">{pessoa.especialidade || '—'}</Td>
                  <Td>{pessoa.turno}</Td>
                  <Td>
                    <StatusBadge map={TEAM_AVAILABILITY} value={pessoa.disponibilidade} />
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex gap-1">
                      <button type="button" onClick={() => abrirEdicao(pessoa)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-primary" aria-label="Editar">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => excluir(pessoa)} className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600" aria-label="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </button>
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
        title={modal === 'novo' ? 'Novo profissional' : 'Editar profissional'}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setModal(null)}>
              Cancelar
            </button>
            <button type="submit" form="form-equipe" className="btn-primary">
              Salvar
            </button>
          </>
        }
      >
        <form id="form-equipe" onSubmit={salvar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome" error={errors.nome} className="sm:col-span-2">
            <Input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} placeholder="Dra. Helena Cabral" />
          </Field>
          <Field label="CRM / COREN" error={errors.registro}>
            <Input value={form.registro} onChange={(event) => setForm({ ...form, registro: event.target.value })} placeholder="CRM-PI 5514" />
          </Field>
          <Field label="Função">
            <Select value={form.funcao} onChange={(event) => setForm({ ...form, funcao: event.target.value })}>
              {TEAM_ROLES.map((funcao) => (
                <option key={funcao} value={funcao}>
                  {funcao}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Especialidade">
            <Input value={form.especialidade} onChange={(event) => setForm({ ...form, especialidade: event.target.value })} placeholder="Anestesiologia" />
          </Field>
          <Field label="Turno">
            <Select value={form.turno} onChange={(event) => setForm({ ...form, turno: event.target.value })}>
              {SHIFTS.map((turno) => (
                <option key={turno} value={turno}>
                  {turno}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Disponibilidade">
            <Select value={form.disponibilidade} onChange={(event) => setForm({ ...form, disponibilidade: event.target.value })}>
              {Object.entries(TEAM_AVAILABILITY).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ramal / contato interno">
            <Input value={form.telefone_ramal} onChange={(event) => setForm({ ...form, telefone_ramal: event.target.value })} placeholder="Ramal 2210" />
          </Field>
          <Field label="Observações" className="sm:col-span-2">
            <Textarea value={form.observacao} onChange={(event) => setForm({ ...form, observacao: event.target.value })} />
          </Field>
        </form>
      </Modal>
    </div>
  )
}

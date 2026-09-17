import { useMemo, useState } from 'react'
import { CalendarClock, ChevronLeft, ChevronRight, Pencil, Plus, Printer, Trash2 } from 'lucide-react'
import { useCollection, useCollections } from '@/data/store'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Card, CardHeader, Field, Input, LoadingState, Modal, Select, StatusBadge, Textarea } from '@/components/ui'
import { SCHEDULE_STATUS, SHIFTS, TEAM_ROLES } from '@/lib/constants'
import { formatDate, todayISO } from '@/lib/format'
import { runPrint } from '@/lib/print'
import PrintArea from '@/components/PrintArea'
import { HOSPITAL_NAME, INSTITUTION_NAME } from '@/lib/brand'

const WEEK_DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

function startOfWeek(reference) {
  const date = new Date(`${reference}T12:00:00`)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return date
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function toISO(date) {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10)
}

const EMPTY = { data: todayISO(), turno: 'Manhã', profissional: '', funcao: 'Cirurgião', sala: '', status: 'previsto', substituto: '', observacao: '' }

export default function EscalaPlantao() {
  const { items: escala, loading, create, update, remove } = useCollection('escala')
  const auxiliares = useCollections(['equipe', 'salas'])
  const toast = useToast()
  const { canDo } = useAuth()
  const podeCriar = canDo('escala', 'criar')
  const podeEditar = canDo('escala', 'editar')
  const podeExcluir = canDo('escala', 'excluir')

  const [referencia, setReferencia] = useState(todayISO())
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [imprimindo, setImprimindo] = useState(false)

  const dias = useMemo(() => {
    const inicio = startOfWeek(referencia)
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(inicio, index)
      return { iso: toISO(date), label: WEEK_DAYS[index], curto: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) }
    })
  }, [referencia])

  const porTurnoDia = useMemo(() => {
    const mapa = new Map()
    escala.forEach((item) => {
      const chave = `${item.turno}|${item.data}`
      if (!mapa.has(chave)) mapa.set(chave, [])
      mapa.get(chave).push(item)
    })
    return mapa
  }, [escala])

  const totalSemana = useMemo(() => {
    const isoSemana = new Set(dias.map((dia) => dia.iso))
    return escala.filter((item) => isoSemana.has(item.data))
  }, [escala, dias])

  function abrirNovo(data, turno) {
    setForm({ ...EMPTY, data: data || todayISO(), turno: turno || 'Manhã' })
    setErrors({})
    setModal('novo')
  }

  function abrirEdicao(item) {
    setForm({ ...EMPTY, ...item })
    setErrors({})
    setModal(item.id)
  }

  async function salvar(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!form.profissional.trim()) nextErrors.profissional = 'Selecione o profissional.'
    if (!form.data) nextErrors.data = 'Informe a data.'
    if (form.status === 'substituido' && !form.substituto.trim()) nextErrors.substituto = 'Informe o substituto.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const payload = { ...form }
    delete payload.id
    if (modal === 'novo') {
      await create(payload)
      toast.success('Plantão adicionado à escala.')
    } else {
      await update(modal, payload)
      toast.success('Escala atualizada.')
    }
    setModal(null)
  }

  async function excluir(item) {
    if (!window.confirm(`Remover ${item.profissional} da escala de ${formatDate(item.data)}?`)) return
    await remove(item.id)
    toast.success('Registro removido da escala.')
  }

  function imprimir() {
    setImprimindo(true)
    window.setTimeout(() => {
      runPrint('a4-landscape')
      window.setTimeout(() => setImprimindo(false), 1200)
    }, 60)
  }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Escala de plantão"
          description="Grade semanal por turno e função"
          icon={CalendarClock}
          actions={
            <>
              <button type="button" className="btn-ghost" onClick={imprimir}>
                <Printer className="h-4 w-4" /> Imprimir
              </button>              {podeCriar ? (
                <button type="button" className="btn-primary" onClick={() => abrirNovo()}>
                <Plus className="h-4 w-4" /> Novo plantão
              </button>
              ) : null}
            </>
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <button type="button" className="btn-ghost px-2.5" onClick={() => setReferencia(toISO(addDays(startOfWeek(referencia), -7)))} aria-label="Semana anterior">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-slate-700">
              {formatDate(dias[0].iso)} — {formatDate(dias[6].iso)}
            </span>
            <button type="button" className="btn-ghost px-2.5" onClick={() => setReferencia(toISO(addDays(startOfWeek(referencia), 7)))} aria-label="Próxima semana">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-ghost" onClick={() => setReferencia(todayISO())}>
              Semana atual
            </button>
            <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">{totalSemana.length} plantões</span>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="table-head w-32 px-4 py-3 text-left">Turno</th>
                {dias.map((dia) => (
                  <th key={dia.iso} className={`table-head px-3 py-3 text-left ${dia.iso === todayISO() ? 'bg-primary-light text-primary' : ''}`}>
                    {dia.label}
                    <span className="ml-1 font-normal normal-case text-slate-400">{dia.curto}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {SHIFTS.map((turno) => (
                <tr key={turno} className="align-top">
                  <td className="bg-muted/50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">{turno}</td>
                  {dias.map((dia) => {
                    const itens = porTurnoDia.get(`${turno}|${dia.iso}`) || []
                    return (
                      <td key={dia.iso} className="px-2 py-2">
                        <div className="space-y-1.5">
                          {itens.map((item) => (
                            <div key={item.id} className="group rounded-lg border border-border bg-white p-2 text-xs shadow-sm">
                              <p className="truncate font-semibold text-slate-800">{item.profissional}</p>
                              <p className="truncate text-[11px] text-slate-500">
                                {item.funcao}
                                {item.sala ? ` · ${item.sala}` : ''}
                              </p>
                              {item.substituto ? <p className="truncate text-[11px] text-amber-600">Subst.: {item.substituto}</p> : null}
                              <div className="mt-1.5 flex items-center justify-between gap-1">
                                <StatusBadge map={SCHEDULE_STATUS} value={item.status} />
                                <div className="flex gap-0.5 opacity-0 transition group-hover:opacity-100">                                  {podeEditar ? (
                                    <button type="button" onClick={() => abrirEdicao(item)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-primary" aria-label="Editar">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  ) : null}                                  {podeExcluir ? (
                                    <button type="button" onClick={() => excluir(item)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Excluir">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            disabled={!podeCriar}
                            onClick={() => abrirNovo(dia.iso, turno)}
                            className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-1.5 text-[11px] font-semibold text-slate-400 transition hover:border-primary hover:text-primary"
                          >
                            <Plus className="h-3.5 w-3.5" /> Adicionar
                          </button>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal === 'novo' ? 'Novo plantão' : 'Editar plantão'}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setModal(null)}>
              Cancelar
            </button>
            <button type="submit" form="form-escala" className="btn-primary">
              Salvar
            </button>
          </>
        }
      >
        <form id="form-escala" onSubmit={salvar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Data" error={errors.data}>
            <Input type="date" value={form.data} onChange={(event) => setForm({ ...form, data: event.target.value })} />
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
          <Field label="Profissional" error={errors.profissional}>
            <Select value={form.profissional} onChange={(event) => setForm({ ...form, profissional: event.target.value })}>
              <option value="">Selecione...</option>
              {(auxiliares.equipe || []).map((pessoa) => (
                <option key={pessoa.id} value={pessoa.nome}>
                  {pessoa.nome} — {pessoa.funcao}
                </option>
              ))}
            </Select>
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
          <Field label="Sala / setor">
            <Select value={form.sala} onChange={(event) => setForm({ ...form, sala: event.target.value })}>
              <option value="">Não definido</option>
              <option value="Centro Cirúrgico">Centro Cirúrgico</option>
              <option value="RPA">RPA</option>
              {(auxiliares.salas || []).map((sala) => (
                <option key={sala.id} value={sala.nome}>
                  {sala.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              {Object.entries(SCHEDULE_STATUS).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Substituto" error={errors.substituto} className="sm:col-span-2">
            <Select value={form.substituto} onChange={(event) => setForm({ ...form, substituto: event.target.value })}>
              <option value="">Sem substituto</option>
              {(auxiliares.equipe || []).map((pessoa) => (
                <option key={pessoa.id} value={pessoa.nome}>
                  {pessoa.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Observações" className="sm:col-span-2">
            <Textarea value={form.observacao} onChange={(event) => setForm({ ...form, observacao: event.target.value })} />
          </Field>
        </form>
      </Modal>

      <PrintArea active={imprimindo}>
        <div className="p-4 font-sans text-[11px] text-black">
          <header className="mb-3 border-b-2 border-black pb-2">
            <h1 className="text-base font-bold">{HOSPITAL_NAME}</h1>
            <p className="text-[10px]">{INSTITUTION_NAME}</p>
            <p className="mt-1 text-sm font-semibold">
              Escala de plantão — {formatDate(dias[0].iso)} a {formatDate(dias[6].iso)}
            </p>
          </header>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black px-2 py-1 text-left">Turno</th>
                {dias.map((dia) => (
                  <th key={dia.iso} className="border border-black px-2 py-1 text-left">
                    {dia.label} {dia.curto}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SHIFTS.map((turno) => (
                <tr key={turno}>
                  <td className="border border-black px-2 py-1 font-bold">{turno}</td>
                  {dias.map((dia) => (
                    <td key={dia.iso} className="border border-black px-2 py-1 align-top">
                      {(porTurnoDia.get(`${turno}|${dia.iso}`) || []).map((item) => (
                        <div key={item.id} className="mb-1">
                          <b>{item.profissional}</b>
                          <br />
                          {item.funcao}
                          {item.sala ? ` · ${item.sala}` : ''}
                          {item.substituto ? ` · Subst.: ${item.substituto}` : ''}
                        </div>
                      ))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PrintArea>
    </div>
  )
}

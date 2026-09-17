import { useMemo, useState } from 'react'
import { Clock, IdCard, LogOut, Pencil, Plus, Printer, RotateCcw, Trash2, Users } from 'lucide-react'
import { useCollection } from '@/data/store'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Card, CardHeader, EmptyState, Field, Input, KpiCard, KpiGrid, LoadingState, Modal, Pill, SearchInput, Select, TableWrapper, Td, Textarea, Th } from '@/components/ui'
import { SECTORS, VISIT_KINSHIP, VISIT_LIMIT_MINUTES } from '@/lib/constants'
import { dateOf, formatCountdown, formatDateTime, formatTime, matches, secondsUntil, todayISO, upper } from '@/lib/format'
import { useNow } from '@/lib/useNow'
import { runPrint } from '@/lib/print'
import PrintArea from '@/components/PrintArea'
import PrintHeader from '@/components/PrintHeader'
import { Logo } from '@/components/Logo'
import { HOSPITAL_SHORT } from '@/lib/brand'

const EMPTY = { nome: '', documento: '', prontuario: '', setor: 'Clínica Médica', quarto_leito: '', parentesco: 'Outro', observacao: '' }

const limiteDe = (entrada) => new Date(new Date(entrada).getTime() + VISIT_LIMIT_MINUTES * 60000).toISOString()

export default function Visitantes() {
  const { items: visitantes, loading, create, update, remove } = useCollection('visitantes')
  const toast = useToast()
  const { canDo } = useAuth()
  const podeCriar = canDo('visitantes', 'criar')
  const podeEditar = canDo('visitantes', 'editar')
  const podeExcluir = canDo('visitantes', 'excluir')
  useNow(1000)

  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('dentro')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [cracha, setCracha] = useState(null)
  const [relatorio, setRelatorio] = useState(false)

  const kpis = useMemo(() => {
    const dentro = visitantes.filter((visitante) => !visitante.saida)
    const expirados = dentro.filter((visitante) => secondsUntil(limiteDe(visitante.entrada)) <= 0)
    const sairamHoje = visitantes.filter((visitante) => visitante.saida && dateOf(visitante.saida) === todayISO())
    return { dentro: dentro.length, expirados: expirados.length, sairamHoje: sairamHoje.length, total: visitantes.length }
  }, [visitantes])

  const lista = useMemo(() => {
    return visitantes
      .filter((visitante) => {
        if (filtro === 'dentro') return !visitante.saida
        if (filtro === 'expirados') return !visitante.saida && secondsUntil(limiteDe(visitante.entrada)) <= 0
        if (filtro === 'sairam') return Boolean(visitante.saida) && dateOf(visitante.saida) === todayISO()
        return true
      })
      .filter((visitante) => matches(busca, visitante.nome, visitante.prontuario, visitante.setor, visitante.quarto_leito))
      .sort((a, b) => String(b.entrada).localeCompare(String(a.entrada)))
  }, [visitantes, filtro, busca])

  function abrirNovo() {
    setForm(EMPTY)
    setErrors({})
    setModal('novo')
  }

  function abrirEdicao(visitante) {
    setForm({ ...EMPTY, ...visitante })
    setErrors({})
    setModal(visitante.id)
  }

  async function salvar(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!form.nome.trim()) nextErrors.nome = 'Informe o nome do acompanhante.'
    if (!/^\d{3,12}$/.test(String(form.prontuario).trim())) nextErrors.prontuario = 'Informe o prontuário do paciente (somente dígitos).'
    if (!form.setor) nextErrors.setor = 'Selecione o setor.'
    if (!form.quarto_leito.trim()) nextErrors.quarto_leito = 'Informe o quarto/leito.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const payload = {
      nome: upper(form.nome.trim()),
      documento: form.documento.trim(),
      prontuario: String(form.prontuario).trim(),
      setor: form.setor,
      quarto_leito: upper(form.quarto_leito.trim()),
      parentesco: form.parentesco,
      observacao: form.observacao.trim(),
    }

    if (modal === 'novo') {
      const registro = await create({ ...payload, entrada: new Date().toISOString(), saida: '', reentradas: 0 })
      toast.success(`Entrada registrada para ${payload.nome}.`)
      setModal(null)
      imprimirCracha(registro)
      return
    }

    await update(modal, payload)
    toast.success('Registro atualizado.')
    setModal(null)
  }

  async function registrarSaida(visitante) {
    if (!window.confirm(`Registrar a saída de ${visitante.nome}?`)) return
    await update(visitante.id, { saida: new Date().toISOString() })
    toast.success('Saída registrada.')
  }

  async function reentrada(visitante) {
    if (!window.confirm(`Registrar nova entrada (reentrada) de ${visitante.nome}?`)) return
    await update(visitante.id, { entrada: new Date().toISOString(), saida: '', reentradas: (visitante.reentradas || 0) + 1 })
    toast.success('Reentrada registrada. Novo prazo de 1 hora iniciado.')
  }

  async function excluir(visitante) {
    if (!window.confirm(`Excluir o registro de ${visitante.nome}? Esta ação não pode ser desfeita.`)) return
    await remove(visitante.id)
    toast.success('Registro excluído.')
  }

  function imprimirCracha(visitante) {
    setCracha(visitante)
    window.setTimeout(() => {
      runPrint('badge')
      window.setTimeout(() => setCracha(null), 1500)
    }, 80)
  }

  function imprimirRelatorio() {
    setRelatorio(true)
    window.setTimeout(() => {
      runPrint('a4-landscape')
      window.setTimeout(() => setRelatorio(false), 1500)
    }, 80)
  }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-5">
      <KpiGrid>
        <KpiCard label="Dentro" value={kpis.dentro} hint="Acompanhantes na unidade" icon={Users} tone="primary" />
        <KpiCard label="Expirados" value={kpis.expirados} hint="Tempo de 1 hora excedido" icon={Clock} tone={kpis.expirados ? 'red' : 'emerald'} />
        <KpiCard label="Saíram hoje" value={kpis.sairamHoje} icon={LogOut} tone="accent" />
        <KpiCard label="Total de registros" value={kpis.total} icon={IdCard} tone="slate" />
      </KpiGrid>

      <Card>
        <CardHeader
          title="Visitantes e acompanhantes"
          description={`Controle de permanência com limite de ${VISIT_LIMIT_MINUTES} minutos`}
          icon={IdCard}
          actions={
            <>
              <button type="button" className="btn-ghost" onClick={imprimirRelatorio}>
                <Printer className="h-4 w-4" /> Relatório A4
              </button>              {podeCriar ? (
                <button type="button" className="btn-primary" onClick={abrirNovo}>
                <Plus className="h-4 w-4" /> Nova entrada
              </button>
              ) : null}
            </>
          }
        />

        <div className="space-y-3 border-b border-border px-5 py-4">
          <SearchInput value={busca} onChange={setBusca} placeholder="Nome, prontuário, setor ou leito..." />
          <div className="flex flex-wrap gap-2">
            <Pill active={filtro === 'dentro'} onClick={() => setFiltro('dentro')}>
              Dentro ({kpis.dentro})
            </Pill>
            <Pill active={filtro === 'expirados'} onClick={() => setFiltro('expirados')}>
              Expirados ({kpis.expirados})
            </Pill>
            <Pill active={filtro === 'sairam'} onClick={() => setFiltro('sairam')}>
              Saíram hoje ({kpis.sairamHoje})
            </Pill>
            <Pill active={filtro === 'todos'} onClick={() => setFiltro('todos')}>
              Todos ({kpis.total})
            </Pill>
          </div>
        </div>

        {lista.length === 0 ? (
          <EmptyState title="Nenhum registro encontrado" description="Registre a entrada de um acompanhante para iniciar o controle." />
        ) : (
          <TableWrapper>
            <thead>
              <tr>
                <Th>Acompanhante</Th>
                <Th>Prontuário</Th>
                <Th>Setor</Th>
                <Th>Quarto / Leito</Th>
                <Th>Entrada</Th>
                <Th>Tempo restante</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((visitante) => {
                const restante = secondsUntil(limiteDe(visitante.entrada))
                const expirado = !visitante.saida && restante <= 0
                const alerta = !visitante.saida && restante > 0 && restante <= 600
                return (
                  <tr key={visitante.id} className={`transition ${expirado ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                    <Td className="font-semibold uppercase">{visitante.nome}</Td>
                    <Td className="font-mono text-xs font-semibold text-primary">{visitante.prontuario}</Td>
                    <Td className="text-slate-500">{visitante.setor}</Td>
                    <Td>{visitante.quarto_leito}</Td>
                    <Td className="text-slate-500">{formatDateTime(visitante.entrada)}</Td>
                    <Td>
                      {visitante.saida ? (
                        <span className="text-xs font-semibold text-slate-400">Saiu {formatTime(visitante.saida)}</span>
                      ) : expirado ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                          <Clock className="h-3.5 w-3.5" /> EXCEDIDO {formatCountdown(restante)}
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs font-bold ${alerta ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          <Clock className="h-3.5 w-3.5" /> {formatCountdown(restante)}
                        </span>
                      )}
                    </Td>
                    <Td className="text-right">
                      <div className="inline-flex gap-1">
                        <button type="button" onClick={() => imprimirCracha(visitante)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-primary" aria-label="Imprimir crachá">
                          <Printer className="h-4 w-4" />
                        </button>
                        {podeEditar && visitante.saida ? (
                          <button type="button" onClick={() => reentrada(visitante)} className="rounded-lg p-2 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-600" aria-label="Reentrada">
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        ) : null}
                        {podeEditar && !visitante.saida ? (
                          <button type="button" onClick={() => registrarSaida(visitante)} className="rounded-lg p-2 text-slate-500 transition hover:bg-amber-50 hover:text-amber-600" aria-label="Registrar saída">
                            <LogOut className="h-4 w-4" />
                          </button>
                        ) : null}                        {podeEditar ? (
                          <button type="button" onClick={() => abrirEdicao(visitante)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-primary" aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </button>
                        ) : null}                        {podeExcluir ? (
                          <button type="button" onClick={() => excluir(visitante)} className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600" aria-label="Excluir">
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
        title={modal === 'novo' ? 'Nova entrada de acompanhante' : 'Editar acompanhante'}
        description="O nome do acompanhante é registrado em CAIXA ALTA. O paciente é identificado apenas pelo prontuário."
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setModal(null)}>
              Cancelar
            </button>
            <button type="submit" form="form-visitante" className="btn-primary">
              {modal === 'novo' ? 'Registrar entrada e imprimir crachá' : 'Salvar'}
            </button>
          </>
        }
      >
        <form id="form-visitante" onSubmit={salvar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome do acompanhante" error={errors.nome} className="sm:col-span-2">
            <Input className="uppercase" value={form.nome} onChange={(event) => setForm({ ...form, nome: upper(event.target.value) })} placeholder="MARIA DE JESUS SOUSA" />
          </Field>
          <Field label="Documento (RG/CPF)">
            <Input value={form.documento} onChange={(event) => setForm({ ...form, documento: event.target.value })} />
          </Field>
          <Field label="Prontuário do paciente" error={errors.prontuario}>
            <Input value={form.prontuario} inputMode="numeric" onChange={(event) => setForm({ ...form, prontuario: event.target.value })} placeholder="204871" />
          </Field>
          <Field label="Setor" error={errors.setor}>
            <Select value={form.setor} onChange={(event) => setForm({ ...form, setor: event.target.value })}>
              {SECTORS.map((setor) => (
                <option key={setor} value={setor}>
                  {setor}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Quarto / Leito" error={errors.quarto_leito}>
            <Input className="uppercase" value={form.quarto_leito} onChange={(event) => setForm({ ...form, quarto_leito: event.target.value })} placeholder="CM-12" />
          </Field>
          <Field label="Grau de parentesco">
            <Select value={form.parentesco} onChange={(event) => setForm({ ...form, parentesco: event.target.value })}>
              {VISIT_KINSHIP.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Observações" className="sm:col-span-2">
            <Textarea value={form.observacao} onChange={(event) => setForm({ ...form, observacao: event.target.value })} />
          </Field>
        </form>
      </Modal>

      {/* -------------------------------------------- Crachá térmico 10 x 6,5 cm */}
      <PrintArea active={Boolean(cracha)}>
        {cracha ? (
          <div style={{ width: '100mm', height: '65mm' }} className="relative overflow-hidden bg-white p-[4mm] font-sans text-black">
            <div className="flex items-center justify-between gap-[3mm] border-b-2 border-black pb-[2mm]">
              <Logo variant="hospital" className="h-[9mm]" />
              <div className="flex-1 text-center leading-tight">
                <p className="text-[3.2mm] font-extrabold uppercase">Crachá de acompanhante</p>
                <p className="text-[2.2mm] uppercase">Controle de permanência</p>
              </div>
              <Logo variant="isac" className="h-[11mm]" />
            </div>

            <div className="mt-[2mm] flex gap-[3mm]">
              <div className="flex-1">
                <p className="text-[2.4mm] font-bold uppercase text-black/60">Acompanhante</p>
                <p className="text-[4mm] font-extrabold uppercase leading-tight">{cracha.nome}</p>

                <div className="mt-[1.5mm] grid grid-cols-2 gap-[1.5mm] text-[2.8mm]">
                  <div>
                    <p className="font-bold uppercase text-black/60">Prontuário</p>
                    <p className="font-mono text-[3.4mm] font-extrabold">{cracha.prontuario}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase text-black/60">Quarto / Leito</p>
                    <p className="text-[3.4mm] font-extrabold">{cracha.quarto_leito}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase text-black/60">Setor</p>
                    <p className="text-[3mm] font-bold uppercase">{cracha.setor}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase text-black/60">Entrada</p>
                    <p className="text-[3mm] font-bold">{formatDateTime(cracha.entrada)}</p>
                  </div>
                </div>
              </div>

              <div className="flex w-[22mm] shrink-0 flex-col items-center justify-center gap-[1.5mm]">
                <div className="flex h-[20mm] w-[20mm] flex-col items-center justify-center rounded-full border-[0.6mm] border-black text-center leading-tight">
                  <span className="text-[2.2mm] font-extrabold uppercase">{cracha.setor.slice(0, 14)}</span>
                  <span className="text-[2mm]">{formatTime(cracha.entrada)}</span>
                  <span className="text-[1.8mm] uppercase">{HOSPITAL_SHORT} · visita</span>
                </div>
              </div>
            </div>

            <div className="absolute inset-x-[4mm] bottom-[3mm]">
              <div className="flex items-center justify-between border-t-2 border-black pt-[1.5mm]">
                <span className="rounded-[1mm] bg-black px-[2mm] py-[1mm] text-[3mm] font-extrabold uppercase text-white">Validade: 1 hora</span>
                <span className="text-[2.2mm] uppercase">Uso obrigatório · devolver na saída</span>
              </div>
            </div>
          </div>
        ) : null}
      </PrintArea>

      {/* ------------------------------------------------ Relatório A4 paisagem */}
      <PrintArea active={relatorio}>
        <div className="p-4 font-sans text-[11px] text-black">
          <PrintHeader
            titulo="Relatório de acompanhantes"
            subtitulo={`Dentro: ${kpis.dentro} · Expirados: ${kpis.expirados} · Saíram hoje: ${kpis.sairamHoje} · Total: ${kpis.total}`}
          />
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black px-2 py-1 text-left">Acompanhante</th>
                <th className="border border-black px-2 py-1 text-left">Prontuário</th>
                <th className="border border-black px-2 py-1 text-left">Setor</th>
                <th className="border border-black px-2 py-1 text-left">Quarto/Leito</th>
                <th className="border border-black px-2 py-1 text-left">Entrada</th>
                <th className="border border-black px-2 py-1 text-left">Saída</th>
                <th className="border border-black px-2 py-1 text-left">Situação</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((visitante) => {
                const restante = secondsUntil(limiteDe(visitante.entrada))
                return (
                  <tr key={visitante.id}>
                    <td className="border border-black px-2 py-1 uppercase">{visitante.nome}</td>
                    <td className="border border-black px-2 py-1">{visitante.prontuario}</td>
                    <td className="border border-black px-2 py-1">{visitante.setor}</td>
                    <td className="border border-black px-2 py-1">{visitante.quarto_leito}</td>
                    <td className="border border-black px-2 py-1">{formatDateTime(visitante.entrada)}</td>
                    <td className="border border-black px-2 py-1">{visitante.saida ? formatDateTime(visitante.saida) : '—'}</td>
                    <td className="border border-black px-2 py-1">{visitante.saida ? 'Saiu' : restante <= 0 ? 'EXCEDIDO' : `Restam ${formatCountdown(restante)}`}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="mt-3 text-[9px]">Documento em conformidade com a LGPD — o paciente é identificado exclusivamente pelo número de prontuário.</p>
        </div>
      </PrintArea>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Building2, LayoutGrid, Megaphone, Pencil, Plus, RefreshCw, Trash2, Volume2 } from 'lucide-react'
import { useCollection } from '@/data/store'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Card, CardHeader, EmptyState, Field, Input, KpiCard, KpiGrid, LoadingState, Modal, Pill, Select, StatusBadge, Textarea } from '@/components/ui'
import { ROOM_STATUS, ROOM_STATUS_KEYS } from '@/lib/constants'
import { buildCallText, speak, speechAvailable } from '@/lib/speech'
import { formatDateTime } from '@/lib/format'

const EMPTY_ROOM = { nome: '', tipo: '', setor: 'Centro Cirúrgico', andar: '', status: 'disponivel', prontuario_atual: '', observacao: '' }

export default function MapaCirurgico() {
  const { items: salas, loading, create, update, remove } = useCollection('salas')
  const toast = useToast()
  const { canDo } = useAuth()
  const podeCriar = canDo('mapa', 'criar')
  const podeEditar = canDo('mapa', 'editar')
  const podeExcluir = canDo('mapa', 'excluir')
  const [filtro, setFiltro] = useState('todos')
  const [callingId, setCallingId] = useState(null)
  const [callModal, setCallModal] = useState(null)
  const [prontuarioChamada, setProntuarioChamada] = useState('')
  const [erroChamada, setErroChamada] = useState('')
  const [roomModal, setRoomModal] = useState(null)
  const [form, setForm] = useState(EMPTY_ROOM)
  const [errors, setErrors] = useState({})

  const filtradas = useMemo(() => (filtro === 'todos' ? salas : salas.filter((sala) => sala.status === filtro)), [salas, filtro])

  const porSetor = useMemo(() => {
    const groups = new Map()
    filtradas.forEach((sala) => {
      const setor = sala.setor || 'Sem setor'
      if (!groups.has(setor)) groups.set(setor, [])
      groups.get(setor).push(sala)
    })
    return Array.from(groups.entries()).map(([setor, lista]) => [setor, lista.sort((a, b) => String(a.nome).localeCompare(String(b.nome)))])
  }, [filtradas])

  const contagem = useMemo(() => {
    const base = { disponivel: 0, em_uso: 0, limpeza: 0, manutencao: 0, reservada: 0 }
    salas.forEach((sala) => {
      if (base[sala.status] != null) base[sala.status] += 1
    })
    return base
  }, [salas])

  async function chamar(sala, prontuario) {
    const texto = buildCallText(prontuario, sala.nome)
    setCallingId(sala.id)
    if (!speechAvailable()) {
      toast.warning('Este navegador não possui síntese de voz. A chamada foi registrada mesmo assim.')
    }
    await update(sala.id, { prontuario_atual: prontuario, chamado_em: new Date().toISOString() })
    await speak(texto)
    setCallingId(null)
    toast.success(`Chamada realizada para o prontuário ${prontuario}.`)
  }

  function iniciarChamada(sala) {
    if (sala.prontuario_atual) {
      chamar(sala, sala.prontuario_atual)
      return
    }
    setProntuarioChamada('')
    setErroChamada('')
    setCallModal(sala)
  }

  function confirmarChamada(event) {
    event.preventDefault()
    if (!/^\d{3,12}$/.test(prontuarioChamada.trim())) {
      setErroChamada('Informe um número de prontuário válido (somente dígitos).')
      return
    }
    const sala = callModal
    setCallModal(null)
    chamar(sala, prontuarioChamada.trim())
  }

  function abrirNova() {
    setForm(EMPTY_ROOM)
    setErrors({})
    setRoomModal('nova')
  }

  function abrirEdicao(sala) {
    setForm({ ...EMPTY_ROOM, ...sala })
    setErrors({})
    setRoomModal(sala.id)
  }

  async function salvarSala(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!form.nome.trim()) nextErrors.nome = 'Informe o nome da sala.'
    if (!form.setor.trim()) nextErrors.setor = 'Informe o setor.'
    if (form.prontuario_atual && !/^\d{3,12}$/.test(form.prontuario_atual.trim())) nextErrors.prontuario_atual = 'Prontuário inválido.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const payload = {
      nome: form.nome.trim(),
      tipo: form.tipo.trim(),
      setor: form.setor.trim(),
      andar: form.andar.trim(),
      status: form.status,
      prontuario_atual: form.prontuario_atual.trim(),
      observacao: form.observacao.trim(),
    }

    if (roomModal === 'nova') {
      await create({ ...payload, equipamentos: [] })
      toast.success('Sala cadastrada com sucesso.')
    } else {
      await update(roomModal, payload)
      toast.success('Sala atualizada com sucesso.')
    }
    setRoomModal(null)
  }

  async function excluirSala(sala) {
    if (!window.confirm(`Excluir a sala "${sala.nome}"? Esta ação não pode ser desfeita.`)) return
    await remove(sala.id)
    toast.success('Sala excluída.')
  }

  async function mudarStatus(sala, status) {
    const patch = { status }
    if (status !== 'em_uso') patch.prontuario_atual = ''
    await update(sala.id, patch)
  }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-5">
      <KpiGrid className="xl:grid-cols-5">
        <KpiCard label="Disponíveis" value={contagem.disponivel} icon={LayoutGrid} tone="emerald" />
        <KpiCard label="Em uso" value={contagem.em_uso} icon={LayoutGrid} tone="red" />
        <KpiCard label="Limpeza" value={contagem.limpeza} icon={RefreshCw} tone="primary" />
        <KpiCard label="Manutenção" value={contagem.manutencao} icon={RefreshCw} tone="amber" />
        <KpiCard label="Reservadas" value={contagem.reservada} icon={LayoutGrid} tone="violet" />
      </KpiGrid>

      <Card>
        <CardHeader
          title="Mapa cirúrgico em tempo real"
          description="Salas agrupadas por setor · chamada de pacientes por voz (somente prontuário)"
          icon={LayoutGrid}
          actions={podeCriar ? (
              <button type="button" className="btn-primary" onClick={abrirNova}>
              <Plus className="h-4 w-4" /> Nova sala
            </button>
            ) : null}
        />
        <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3">
          <Pill active={filtro === 'todos'} onClick={() => setFiltro('todos')}>
            Todas ({salas.length})
          </Pill>
          {ROOM_STATUS_KEYS.map((key) => (
            <Pill key={key} active={filtro === key} onClick={() => setFiltro(key)}>
              {ROOM_STATUS[key].label} ({contagem[key]})
            </Pill>
          ))}
        </div>

        {porSetor.length === 0 ? (
          <EmptyState title="Nenhum registro encontrado" description="Nenhuma sala corresponde ao filtro selecionado." />
        ) : (
          <div className="space-y-6 p-5">
            {porSetor.map(([setor, lista]) => (
              <section key={setor}>
                <div className="mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">{setor}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{lista.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {lista.map((sala) => {
                    const config = ROOM_STATUS[sala.status] || ROOM_STATUS.disponivel
                    const chamando = callingId === sala.id
                    return (
                      <div key={sala.id} className={`rounded-xl border p-4 shadow-sm transition ${config.card}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-base font-bold text-slate-800">{sala.nome}</p>
                            <p className="truncate text-xs text-slate-500">
                              {sala.tipo || 'Uso geral'} · {sala.andar || 'Andar não informado'}
                            </p>
                          </div>
                          <StatusBadge map={ROOM_STATUS} value={sala.status} />
                        </div>

                        <div className="mt-3 rounded-lg bg-white/70 px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Prontuário em sala</p>
                          <p className="font-mono text-sm font-bold text-primary">{sala.prontuario_atual || '—'}</p>
                          {sala.chamado_em ? <p className="text-[11px] text-slate-400">Última chamada: {formatDateTime(sala.chamado_em)}</p> : null}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => iniciarChamada(sala)}
                            disabled={chamando || !podeEditar}
                            className={`btn ${chamando ? 'animate-pulse bg-accent text-white' : 'bg-primary text-white hover:bg-primary-hover'} flex-1`}
                          >
                            {chamando ? <Volume2 className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
                            {chamando ? 'Chamando...' : 'Chamar Paciente'}
                          </button>
                          {podeEditar ? (
                            <button type="button" onClick={() => abrirEdicao(sala)} className="btn-ghost px-2.5" aria-label="Editar sala">
                              <Pencil className="h-4 w-4" />
                            </button>
                          ) : null}                          {podeExcluir ? (
                            <button type="button" onClick={() => excluirSala(sala)} className="btn-ghost px-2.5 text-red-600 hover:bg-red-50" aria-label="Excluir sala">
                            <Trash2 className="h-4 w-4" />
                          </button>
                          ) : null}
                        </div>

                        <Select className="mt-2 text-xs" value={sala.status} disabled={!podeEditar} onChange={(event) => mudarStatus(sala, event.target.value)}>
                          {ROOM_STATUS_KEYS.map((key) => (
                            <option key={key} value={key}>
                              {ROOM_STATUS[key].label}
                            </option>
                          ))}
                        </Select>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(callModal)}
        onClose={() => setCallModal(null)}
        title="Chamar paciente"
        description={callModal ? `Chamada por voz para a ${callModal.nome}` : ''}
        size="sm"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setCallModal(null)}>
              Cancelar
            </button>
            <button type="submit" form="form-chamada" className="btn-primary">
              <Megaphone className="h-4 w-4" /> Chamar
            </button>
          </>
        }
      >
        <form id="form-chamada" onSubmit={confirmarChamada} className="space-y-3">
          <Field label="Número do prontuário" error={erroChamada} hint="Conforme a LGPD, nenhum nome de paciente é utilizado nas chamadas.">
            <Input value={prontuarioChamada} onChange={(event) => setProntuarioChamada(event.target.value)} inputMode="numeric" placeholder="Ex.: 204871" autoFocus />
          </Field>
        </form>
      </Modal>

      <Modal
        open={Boolean(roomModal)}
        onClose={() => setRoomModal(null)}
        title={roomModal === 'nova' ? 'Nova sala cirúrgica' : 'Editar sala cirúrgica'}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setRoomModal(null)}>
              Cancelar
            </button>
            <button type="submit" form="form-sala" className="btn-primary">
              Salvar
            </button>
          </>
        }
      >
        <form id="form-sala" onSubmit={salvarSala} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome da sala" error={errors.nome}>
            <Input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} placeholder="Sala 06" />
          </Field>
          <Field label="Tipo" >
            <Input value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value })} placeholder="Videolaparoscopia" />
          </Field>
          <Field label="Setor" error={errors.setor}>
            <Input value={form.setor} onChange={(event) => setForm({ ...form, setor: event.target.value })} placeholder="Centro Cirúrgico" />
          </Field>
          <Field label="Andar">
            <Input value={form.andar} onChange={(event) => setForm({ ...form, andar: event.target.value })} placeholder="2º andar" />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              {ROOM_STATUS_KEYS.map((key) => (
                <option key={key} value={key}>
                  {ROOM_STATUS[key].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Prontuário em sala" error={errors.prontuario_atual}>
            <Input value={form.prontuario_atual} onChange={(event) => setForm({ ...form, prontuario_atual: event.target.value })} inputMode="numeric" placeholder="Somente número" />
          </Field>
          <Field label="Observação" className="sm:col-span-2">
            <Textarea value={form.observacao} onChange={(event) => setForm({ ...form, observacao: event.target.value })} placeholder="Observações operacionais da sala" />
          </Field>
        </form>
      </Modal>
    </div>
  )
}

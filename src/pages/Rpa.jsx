import { useMemo, useState } from 'react'
import { AlertTriangle, HeartPulse, LogIn, LogOut, Plus, Trash2 } from 'lucide-react'
import { useCollection } from '@/data/store'
import { useToast } from '@/context/ToastContext'
import { Card, CardHeader, EmptyState, Field, Input, KpiCard, KpiGrid, LoadingState, Modal, Select, StatusBadge, Textarea } from '@/components/ui'
import { RPA_ALERT_MINUTES } from '@/lib/constants'
import { formatDateTime, formatDuration, minutesBetween } from '@/lib/format'
import { useNow } from '@/lib/useNow'

const RPA_STATUS = {
  disponivel: { label: 'Disponível', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', card: 'border-emerald-200 bg-emerald-50' },
  ocupado: { label: 'Ocupado', badge: 'bg-red-100 text-red-700 border-red-200', card: 'border-red-200 bg-red-50' },
  limpeza: { label: 'Limpeza', badge: 'bg-blue-100 text-blue-700 border-blue-200', card: 'border-blue-200 bg-blue-50' },
}

const EMPTY_ADMISSAO = { prontuario: '', procedimento: '', aldrete: 8, observacao: '' }

export default function Rpa() {
  const { items: leitos, loading, create, update, remove } = useCollection('rpa')
  const toast = useToast()
  useNow(30000)

  const [admissao, setAdmissao] = useState(null)
  const [form, setForm] = useState(EMPTY_ADMISSAO)
  const [errors, setErrors] = useState({})
  const [novoLeito, setNovoLeito] = useState(false)
  const [nomeLeito, setNomeLeito] = useState('')

  const ordenados = useMemo(() => [...leitos].sort((a, b) => String(a.nome).localeCompare(String(b.nome))), [leitos])

  const kpis = useMemo(() => {
    const ocupados = leitos.filter((leito) => leito.status === 'ocupado')
    const alerta = ocupados.filter((leito) => minutesBetween(leito.entrada) >= RPA_ALERT_MINUTES)
    const permanencias = ocupados.map((leito) => minutesBetween(leito.entrada))
    const media = permanencias.length ? Math.round(permanencias.reduce((total, value) => total + value, 0) / permanencias.length) : 0
    return {
      total: leitos.length,
      ocupados: ocupados.length,
      disponiveis: leitos.filter((leito) => leito.status === 'disponivel').length,
      alerta: alerta.length,
      media,
    }
  }, [leitos])

  function abrirAdmissao(leito) {
    setForm(EMPTY_ADMISSAO)
    setErrors({})
    setAdmissao(leito)
  }

  async function confirmarAdmissao(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!/^\d{3,12}$/.test(form.prontuario.trim())) nextErrors.prontuario = 'Informe um prontuário válido.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    await update(admissao.id, {
      status: 'ocupado',
      prontuario: form.prontuario.trim(),
      procedimento: form.procedimento.trim(),
      aldrete: Number(form.aldrete),
      observacao: form.observacao.trim(),
      entrada: new Date().toISOString(),
      saida: '',
    })
    toast.success(`Prontuário ${form.prontuario.trim()} admitido no ${admissao.nome}.`)
    setAdmissao(null)
  }

  async function darSaida(leito) {
    if (!window.confirm(`Registrar saída do prontuário ${leito.prontuario} do ${leito.nome}?`)) return
    await update(leito.id, { status: 'limpeza', saida: new Date().toISOString() })
    toast.success('Saída registrada. Leito liberado para higienização.')
  }

  async function liberar(leito) {
    await update(leito.id, { status: 'disponivel', prontuario: '', procedimento: '', entrada: '', saida: '', aldrete: null, observacao: '' })
    toast.success(`${leito.nome} disponível.`)
  }

  async function criarLeito(event) {
    event.preventDefault()
    if (!nomeLeito.trim()) return
    await create({ nome: nomeLeito.trim().toUpperCase(), status: 'disponivel', prontuario: '', procedimento: '', entrada: '', saida: '', aldrete: null, observacao: '' })
    toast.success('Leito de RPA criado.')
    setNomeLeito('')
    setNovoLeito(false)
  }

  async function excluirLeito(leito) {
    if (!window.confirm(`Excluir o leito ${leito.nome}?`)) return
    await remove(leito.id)
    toast.success('Leito excluído.')
  }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-5">
      <KpiGrid className="xl:grid-cols-5">
        <KpiCard label="Leitos de RPA" value={kpis.total} icon={HeartPulse} tone="primary" />
        <KpiCard label="Ocupados" value={kpis.ocupados} icon={HeartPulse} tone="red" />
        <KpiCard label="Disponíveis" value={kpis.disponiveis} icon={HeartPulse} tone="emerald" />
        <KpiCard label="Permanência média" value={formatDuration(kpis.media)} icon={HeartPulse} tone="accent" />
        <KpiCard label="Alertas de permanência" value={kpis.alerta} icon={AlertTriangle} tone={kpis.alerta ? 'red' : 'emerald'} hint={`Acima de ${formatDuration(RPA_ALERT_MINUTES)}`} />
      </KpiGrid>

      <Card>
        <CardHeader
          title="Recuperação Pós-Anestésica (RPA)"
          description="Entrada, saída e tempo de permanência por leito"
          icon={HeartPulse}
          actions={
            <button type="button" className="btn-primary" onClick={() => setNovoLeito(true)}>
              <Plus className="h-4 w-4" /> Novo leito
            </button>
          }
        />

        {ordenados.length === 0 ? (
          <EmptyState title="Nenhum registro encontrado" description="Cadastre os leitos da RPA." />
        ) : (
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
            {ordenados.map((leito) => {
              const permanencia = leito.entrada && !leito.saida ? minutesBetween(leito.entrada) : null
              const emAlerta = permanencia != null && permanencia >= RPA_ALERT_MINUTES
              const config = RPA_STATUS[leito.status] || RPA_STATUS.disponivel
              return (
                <div key={leito.id} className={`rounded-xl border p-4 ${emAlerta ? 'border-red-400 ring-2 ring-red-200' : config.card}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-base font-bold text-slate-800">{leito.nome}</p>
                    <StatusBadge map={RPA_STATUS} value={leito.status} />
                  </div>

                  {leito.status === 'ocupado' ? (
                    <div className="mt-3 space-y-1 rounded-lg bg-white/70 px-3 py-2 text-xs">
                      <p className="font-mono text-sm font-bold text-primary">{leito.prontuario}</p>
                      <p className="truncate text-slate-600">{leito.procedimento || 'Procedimento não informado'}</p>
                      <p className="text-slate-500">Entrada: {formatDateTime(leito.entrada)}</p>
                      <p className={emAlerta ? 'font-bold text-red-600' : 'font-semibold text-slate-700'}>
                        Permanência: {formatDuration(permanencia)}
                        {emAlerta ? ' · ALERTA' : ''}
                      </p>
                      <p className="text-slate-500">Aldrete: {leito.aldrete ?? '—'}</p>
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg bg-white/70 px-3 py-4 text-center text-xs text-slate-400">Leito sem paciente</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {leito.status === 'disponivel' ? (
                      <button type="button" className="btn-primary flex-1" onClick={() => abrirAdmissao(leito)}>
                        <LogIn className="h-4 w-4" /> Entrada
                      </button>
                    ) : null}
                    {leito.status === 'ocupado' ? (
                      <button type="button" className="btn-accent flex-1" onClick={() => darSaida(leito)}>
                        <LogOut className="h-4 w-4" /> Saída
                      </button>
                    ) : null}
                    {leito.status === 'limpeza' ? (
                      <button type="button" className="btn-ghost flex-1" onClick={() => liberar(leito)}>
                        Liberar leito
                      </button>
                    ) : null}
                    <button type="button" className="btn-ghost px-2.5 text-red-600 hover:bg-red-50" onClick={() => excluirLeito(leito)} aria-label="Excluir leito">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(admissao)}
        onClose={() => setAdmissao(null)}
        title={admissao ? `Entrada na RPA — ${admissao.nome}` : ''}
        description="Registre apenas o número do prontuário."
        size="sm"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setAdmissao(null)}>
              Cancelar
            </button>
            <button type="submit" form="form-rpa" className="btn-primary">
              Confirmar entrada
            </button>
          </>
        }
      >
        <form id="form-rpa" onSubmit={confirmarAdmissao} className="space-y-4">
          <Field label="Prontuário" error={errors.prontuario}>
            <Input value={form.prontuario} inputMode="numeric" onChange={(event) => setForm({ ...form, prontuario: event.target.value })} autoFocus />
          </Field>
          <Field label="Procedimento realizado">
            <Input value={form.procedimento} onChange={(event) => setForm({ ...form, procedimento: event.target.value })} />
          </Field>
          <Field label="Índice de Aldrete">
            <Select value={form.aldrete} onChange={(event) => setForm({ ...form, aldrete: event.target.value })}>
              {Array.from({ length: 11 }, (_, index) => index).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Observações">
            <Textarea value={form.observacao} onChange={(event) => setForm({ ...form, observacao: event.target.value })} />
          </Field>
        </form>
      </Modal>

      <Modal
        open={novoLeito}
        onClose={() => setNovoLeito(false)}
        title="Novo leito de RPA"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setNovoLeito(false)}>
              Cancelar
            </button>
            <button type="submit" form="form-novo-rpa" className="btn-primary">
              Criar
            </button>
          </>
        }
      >
        <form id="form-novo-rpa" onSubmit={criarLeito}>
          <Field label="Identificação do leito">
            <Input value={nomeLeito} onChange={(event) => setNomeLeito(event.target.value)} placeholder="RPA-09" autoFocus />
          </Field>
        </form>
      </Modal>
    </div>
  )
}

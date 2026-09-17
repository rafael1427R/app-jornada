import { useMemo, useState } from 'react'
import { CheckSquare, Printer, Square, Tags } from 'lucide-react'
import { useCollection } from '@/data/store'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useAudit } from '@/lib/audit'
import { Card, CardHeader, EmptyState, KpiCard, KpiGrid, LoadingState, Pill, SearchInput, Select } from '@/components/ui'
import { BED_SECTORS, MEALS } from '@/lib/constants'
import { formatDate, matches, todayISO } from '@/lib/format'
import { runPrint } from '@/lib/print'
import PrintArea from '@/components/PrintArea'
import { HOSPITAL_NAME, HOSPITAL_SHORT } from '@/lib/brand'

export default function EtiquetasDieta() {
  const { items: dietas, loading } = useCollection('dietas')
  const { canDo } = useAuth()
  const toast = useToast()
  const registrarLog = useAudit()

  const [refeicao, setRefeicao] = useState(MEALS[2].id)
  const [filtroSetor, setFiltroSetor] = useState('todos')
  const [busca, setBusca] = useState('')
  const [selecionadas, setSelecionadas] = useState([])
  const [etiquetas, setEtiquetas] = useState(null)

  const podeImprimir = canDo('etiquetas', 'criar') || canDo('etiquetas', 'editar')
  const refeicaoAtual = MEALS.find((item) => item.id === refeicao) || MEALS[0]

  const ativas = useMemo(
    () =>
      dietas
        .filter((dieta) => dieta.status === 'ativa')
        .filter((dieta) => (filtroSetor === 'todos' ? true : dieta.setor === filtroSetor))
        .filter((dieta) => matches(busca, dieta.prontuario, dieta.leito, dieta.setor, dieta.consistencia))
        .sort((a, b) => String(a.leito).localeCompare(String(b.leito))),
    [dietas, filtroSetor, busca],
  )

  const totalEtiquetas = useMemo(
    () => ativas.reduce((total, dieta) => total + 1 + (dieta.acompanhante_refeicao ? 1 : 0), 0),
    [ativas],
  )

  function alternar(id) {
    setSelecionadas((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  /** Cada dieta gera a etiqueta do paciente e, se marcado, a do acompanhante. */
  function montarEtiquetas(origem) {
    const resultado = []
    origem.forEach((dieta) => {
      resultado.push({ ...dieta, tipo: 'paciente', chave: `${dieta.id}-p` })
      if (dieta.acompanhante_refeicao) resultado.push({ ...dieta, tipo: 'acompanhante', chave: `${dieta.id}-a` })
    })
    return resultado
  }

  function imprimir(origem) {
    if (!podeImprimir) {
      toast.error('Seu perfil não tem permissão para imprimir etiquetas.')
      return
    }
    if (!origem.length) {
      toast.warning('Selecione ao menos uma dieta para imprimir.')
      return
    }
    const lista = montarEtiquetas(origem)
    setEtiquetas(lista)
    registrarLog({
      acao: 'criar',
      entidade: 'etiqueta',
      referencia: refeicaoAtual.label,
      detalhe: `${lista.length} etiqueta(s) de ${refeicaoAtual.label} impressas`,
    })
    window.setTimeout(() => {
      runPrint('a4')
      window.setTimeout(() => setEtiquetas(null), 1500)
    }, 80)
    toast.success(`${lista.length} etiqueta(s) enviadas para impressão.`)
  }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-5">
      <KpiGrid className="xl:grid-cols-3">
        <KpiCard label="Dietas ativas no filtro" value={ativas.length} icon={Tags} tone="primary" />
        <KpiCard label="Etiquetas a gerar" value={totalEtiquetas} hint="Inclui acompanhantes" icon={Tags} tone="accent" />
        <KpiCard label="Selecionadas" value={selecionadas.length} icon={CheckSquare} tone="emerald" />
      </KpiGrid>

      <Card>
        <CardHeader
          title="Etiquetas de dieta"
          description={`Impressão térmica 70mm × 40mm — ${refeicaoAtual.label} (${refeicaoAtual.hora})`}
          icon={Tags}
          actions={
            <>
              <button type="button" className="btn-ghost" onClick={() => imprimir(ativas)}>
                <Printer className="h-4 w-4" /> Imprimir todas
              </button>
              <button type="button" className="btn-primary" onClick={() => imprimir(ativas.filter((dieta) => selecionadas.includes(dieta.id)))}>
                <Printer className="h-4 w-4" /> Imprimir selecionadas
              </button>
            </>
          }
        />

        <div className="space-y-3 border-b border-border px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select value={refeicao} onChange={(event) => setRefeicao(event.target.value)}>
              {MEALS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} — {item.hora}
                </option>
              ))}
            </Select>
            <Select value={filtroSetor} onChange={(event) => setFiltroSetor(event.target.value)}>
              <option value="todos">Todos os setores</option>
              {BED_SECTORS.map((setor) => (
                <option key={setor.setor} value={setor.setor}>
                  {setor.setor}
                </option>
              ))}
            </Select>
            <SearchInput value={busca} onChange={setBusca} placeholder="Prontuário ou leito..." />
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill onClick={() => setSelecionadas(ativas.map((dieta) => dieta.id))}>Selecionar todas</Pill>
            <Pill onClick={() => setSelecionadas([])}>Limpar seleção</Pill>
          </div>
        </div>

        {ativas.length === 0 ? (
          <EmptyState title="Nenhum registro encontrado" description="Não há dietas ativas para os filtros selecionados." />
        ) : (
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {ativas.map((dieta) => {
              const marcada = selecionadas.includes(dieta.id)
              return (
                <button
                  type="button"
                  key={dieta.id}
                  onClick={() => alternar(dieta.id)}
                  className={`rounded-xl border p-4 text-left transition ${marcada ? 'border-primary bg-primary-light' : 'border-border bg-white hover:bg-slate-50'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800">{dieta.leito}</p>
                      <p className="font-mono text-xs font-semibold text-primary">{dieta.prontuario}</p>
                    </div>
                    {marcada ? <CheckSquare className="h-5 w-5 shrink-0 text-primary" /> : <Square className="h-5 w-5 shrink-0 text-slate-300" />}
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    {dieta.consistencia} · {dieta.modificacao}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {dieta.setor}
                    {dieta.via_enteral && dieta.via_enteral !== 'Não se aplica' ? ` · ${dieta.via_enteral}` : ''}
                    {dieta.acompanhante_refeicao ? ' · + acompanhante' : ''}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </Card>

      {/* ------------------------------------ Etiquetas 70mm x 40mm, 2 colunas */}
      <PrintArea active={Boolean(etiquetas)}>
        {etiquetas ? (
          <div className="font-sans text-black">
            <div className="grid grid-cols-2 gap-[2mm]">
              {etiquetas.map((etiqueta) => (
                <div key={etiqueta.chave} style={{ width: '70mm', height: '40mm' }} className="overflow-hidden border border-black p-[2mm]">
                  <div className="flex items-center justify-between border-b border-black pb-[1mm]">
                    <span className="text-[2.6mm] font-extrabold">{HOSPITAL_SHORT} · {HOSPITAL_NAME.slice(0, 26)}</span>
                    <span className="text-[2.6mm] font-bold uppercase">
                      {MEALS.find((item) => item.id === refeicao)?.label} {MEALS.find((item) => item.id === refeicao)?.hora}
                    </span>
                  </div>

                  <div className="mt-[1mm] flex items-baseline justify-between">
                    <span className="text-[2.4mm] font-bold uppercase">Prontuário</span>
                    <span className="font-mono text-[5mm] font-extrabold leading-none">{etiqueta.prontuario}</span>
                  </div>

                  <div className="mt-[1mm] grid grid-cols-2 gap-[1mm] text-[2.8mm]">
                    <div>
                      <p className="font-bold uppercase">Leito</p>
                      <p className="text-[3.4mm] font-extrabold">{etiqueta.leito}</p>
                    </div>
                    <div>
                      <p className="font-bold uppercase">Setor</p>
                      <p className="truncate font-bold">{etiqueta.setor}</p>
                    </div>
                  </div>

                  <div className="mt-[1mm] text-[2.8mm]">
                    <p className="font-bold uppercase">Dieta</p>
                    <p className="truncate font-bold">
                      {etiqueta.consistencia} · {etiqueta.modificacao}
                    </p>
                    {etiqueta.via_enteral && etiqueta.via_enteral !== 'Não se aplica' ? (
                      <p className="text-[2.6mm] font-extrabold uppercase">⚠ {etiqueta.via_enteral}</p>
                    ) : null}
                  </div>

                  <div className="mt-[1mm] flex items-center justify-between border-t border-black pt-[1mm] text-[2.4mm]">
                    <span className="font-extrabold uppercase">{etiqueta.tipo === 'acompanhante' ? 'Refeição do acompanhante' : 'Refeição do paciente'}</span>
                    <span>{formatDate(todayISO())}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </PrintArea>
    </div>
  )
}

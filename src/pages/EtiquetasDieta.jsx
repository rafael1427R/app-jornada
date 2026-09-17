import { useMemo, useState } from 'react'
import { CheckSquare, Palette, Printer, Square, Tags } from 'lucide-react'
import { useCollection } from '@/data/store'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useAudit } from '@/lib/audit'
import { Card, CardHeader, EmptyState, KpiCard, KpiGrid, LoadingState, Pill, SearchInput, Select } from '@/components/ui'
import { BED_SECTORS, DIET_COLORS, MEALS } from '@/lib/constants'
import { formatDate, matches, todayISO } from '@/lib/format'
import { runPrint } from '@/lib/print'
import PrintArea from '@/components/PrintArea'
import { Logo } from '@/components/Logo'

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
  const [colorida, setColorida] = useState(true)

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
                <Printer className="h-4 w-4" /> Imprimir todas ({totalEtiquetas})
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => imprimir(ativas.filter((dieta) => selecionadas.includes(dieta.id)))}
                disabled={selecionadas.length === 0}
              >
                <Printer className="h-4 w-4" /> Imprimir selecionadas ({selecionadas.length})
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
          <div className="flex flex-wrap items-center gap-2">
            <Pill onClick={() => setSelecionadas(ativas.map((dieta) => dieta.id))}>Selecionar todas</Pill>
            <Pill onClick={() => setSelecionadas([])}>Limpar seleção</Pill>
            <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
            <Pill active={colorida} onClick={() => setColorida(true)}>
              <span className="inline-flex items-center gap-1">
                <Palette className="h-3.5 w-3.5" /> Colorida
              </span>
            </Pill>
            <Pill active={!colorida} onClick={() => setColorida(false)}>
              Preto e branco
            </Pill>
            <span className="text-xs text-slate-400">
              {colorida ? 'Faixa colorida por consistência — exige impressora colorida' : 'Ideal para impressora térmica'}
            </span>
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
              {etiquetas.map((etiqueta) => {
                const cor = colorida ? DIET_COLORS[etiqueta.consistencia] || '#0f4c81' : '#000000'
                const enteral = etiqueta.via_enteral && etiqueta.via_enteral !== 'Não se aplica'
                const observacao = (etiqueta.regime || 'internacao') === 'observacao'
                return (
                  <div
                    key={etiqueta.chave}
                    style={{ width: '70mm', height: '40mm', borderColor: cor }}
                    className="relative overflow-hidden border-2 pl-[4mm] pr-[2mm] pt-[1.5mm]"
                  >
                    {/* Faixa lateral com a cor da consistência */}
                    <span className="absolute inset-y-0 left-0 w-[3mm]" style={{ background: cor }} aria-hidden="true" />

                    <div className="flex items-center justify-between gap-[2mm] border-b pb-[1mm]" style={{ borderColor: cor }}>
                      <Logo variant="hospital" className="h-[6mm]" />
                      <span className="rounded-[1mm] px-[1.5mm] py-[0.5mm] text-[2.6mm] font-bold uppercase text-white" style={{ background: cor }}>
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
                    </div>

                    <div className="absolute inset-x-[2mm] bottom-[1.5mm] flex items-center justify-between gap-[1mm] text-[2.4mm]">
                      <span className="font-extrabold uppercase">
                        {etiqueta.tipo === 'acompanhante' ? 'Acompanhante' : 'Paciente'}
                      </span>
                      <span className="flex items-center gap-[1mm]">
                        {observacao ? (
                          <span
                            className="rounded-[1mm] px-[1mm] py-[0.5mm] text-[2.2mm] font-extrabold uppercase"
                            style={colorida ? { background: '#f59e0b', color: '#fff' } : { border: '0.3mm solid #000' }}
                          >
                            Observação
                          </span>
                        ) : null}
                        {enteral ? (
                          <span
                            className="rounded-[1mm] px-[1mm] py-[0.5mm] text-[2.2mm] font-extrabold uppercase"
                            style={colorida ? { background: '#ef4444', color: '#fff' } : { border: '0.3mm solid #000' }}
                          >
                            ⚠ {etiqueta.via_enteral}
                          </span>
                        ) : null}
                        <span>{formatDate(todayISO())}</span>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </PrintArea>
    </div>
  )
}

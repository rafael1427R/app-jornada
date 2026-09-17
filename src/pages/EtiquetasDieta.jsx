import { useMemo, useState } from 'react'
import { CheckSquare, IdCard, Palette, Printer, Square, Tags, UserSquare } from 'lucide-react'
import { useCollection } from '@/data/store'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useAudit } from '@/lib/audit'
import { Badge, Card, CardHeader, EmptyState, KpiCard, KpiGrid, LoadingState, Pill, SearchInput, Select } from '@/components/ui'
import { DIET_COLORS, DIET_GROUPS, MEALS, grupoDaDieta } from '@/lib/constants'
import { resumoDaDieta, usaSonda, viaDaDieta } from '@/lib/nutricao'
import { formatDate, matches, todayISO, upper } from '@/lib/format'
import { runPrint } from '@/lib/print'
import PrintArea from '@/components/PrintArea'
import { Logo } from '@/components/Logo'

export default function EtiquetasDieta() {
  const { items: dietas, loading } = useCollection('dietas')
  const { canDo } = useAuth()
  const toast = useToast()
  const registrarLog = useAudit()

  const [refeicao, setRefeicao] = useState('almoco')
  const [filtroGrupo, setFiltroGrupo] = useState('todos')
  const [busca, setBusca] = useState('')
  const [selecionadas, setSelecionadas] = useState([])
  const [etiquetas, setEtiquetas] = useState(null)
  const [colorida, setColorida] = useState(true)
  const [identificacao, setIdentificacao] = useState('prontuario')

  const podeImprimir = canDo('etiquetas', 'criar') || canDo('etiquetas', 'editar')
  const refeicaoAtual = MEALS.find((item) => item.id === refeicao) || MEALS[0]

  const ativas = useMemo(
    () =>
      dietas
        .filter((dieta) => dieta.status === 'ativa')
        .filter((dieta) => (filtroGrupo === 'todos' ? true : grupoDaDieta(dieta).id === filtroGrupo))
        .filter((dieta) => matches(busca, dieta.prontuario, dieta.leito, dieta.setor, dieta.consistencia, dieta.nome_paciente))
        .sort((a, b) => String(a.leito).localeCompare(String(b.leito))),
    [dietas, filtroGrupo, busca],
  )

  /**
   * Acompanhantes recebem apenas 4 refeições (desjejum, almoço, lanche da
   * tarde e jantar) e cardápio padrão — nunca a dieta terapêutica do paciente.
   */
  const acompanhanteRecebe = refeicaoAtual.acompanhante

  const contagem = useMemo(() => {
    const pacientes = ativas.length
    const acompanhantes = acompanhanteRecebe ? ativas.filter((dieta) => dieta.acompanhante_refeicao).length : 0
    return { pacientes, acompanhantes, total: pacientes + acompanhantes }
  }, [ativas, acompanhanteRecebe])

  function alternar(id) {
    setSelecionadas((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  /** Monta a etiqueta do paciente e, quando cabe, a do acompanhante. */
  function montarEtiquetas(origem) {
    const resultado = []
    origem.forEach((dieta) => {
      resultado.push({ ...dieta, tipo: 'paciente', chave: `${dieta.id}-p` })
      if (dieta.acompanhante_refeicao && acompanhanteRecebe) {
        resultado.push({ ...dieta, tipo: 'acompanhante', chave: `${dieta.id}-a` })
      }
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
      detalhe: `${lista.length} etiqueta(s) de ${refeicaoAtual.label} impressas (identificação por ${identificacao === 'nome' ? 'nome' : 'prontuário'})`,
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
      <KpiGrid>
        <KpiCard label="Dietas no filtro" value={ativas.length} icon={Tags} tone="primary" />
        <KpiCard label="Etiquetas de paciente" value={contagem.pacientes} icon={Tags} tone="accent" />
        <KpiCard
          label="Etiquetas de acompanhante"
          value={contagem.acompanhantes}
          hint={acompanhanteRecebe ? 'Cardápio padrão' : 'Não recebem esta refeição'}
          icon={UserSquare}
          tone={acompanhanteRecebe ? 'emerald' : 'slate'}
        />
        <KpiCard label="Selecionadas" value={selecionadas.length} icon={CheckSquare} tone="violet" />
      </KpiGrid>

      <Card>
        <CardHeader
          title="Etiquetas de dieta"
          description={`Impressão 80mm × 40mm — ${refeicaoAtual.label}: ${refeicaoAtual.hora} (geral) · ${refeicaoAtual.horaUti} (UTI e sondas)`}
          icon={Tags}
          actions={
            <>
              <button type="button" className="btn-ghost" onClick={() => imprimir(ativas)}>
                <Printer className="h-4 w-4" /> Imprimir todas ({contagem.total})
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
                  {item.label} — {item.hora} / {item.horaUti} (UTI){item.acompanhante ? '' : ' · sem acompanhante'}
                </option>
              ))}
            </Select>
            <Select value={filtroGrupo} onChange={(event) => setFiltroGrupo(event.target.value)}>
              <option value="todos">Todas as listagens</option>
              {DIET_GROUPS.map((grupo) => (
                <option key={grupo.id} value={grupo.id}>
                  {grupo.label}
                </option>
              ))}
            </Select>
            <SearchInput value={busca} onChange={setBusca} placeholder="Prontuário, leito ou nome..." />
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
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <IdCard className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Identificação da etiqueta</span>
            <Pill active={identificacao === 'prontuario'} onClick={() => setIdentificacao('prontuario')}>
              Prontuário
            </Pill>
            <Pill active={identificacao === 'nome'} onClick={() => setIdentificacao('nome')}>
              Nome completo
            </Pill>
            <span className="text-xs text-slate-400">
              {identificacao === 'nome'
                ? 'A etiqueta leva nome, data de nascimento e nome da mãe — preencha esses campos na prescrição.'
                : 'Modo padrão: sem dado pessoal identificável na etiqueta.'}
            </span>
          </div>

          {!acompanhanteRecebe ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Acompanhantes não recebem {refeicaoAtual.label.toLowerCase()} — só desjejum, almoço, lanche da tarde e jantar.
              Nenhuma etiqueta de acompanhante será gerada para esta refeição.
            </p>
          ) : null}
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
                      {dieta.nome_paciente ? <p className="truncate text-xs text-slate-500">{dieta.nome_paciente}</p> : null}
                    </div>
                    {marcada ? <CheckSquare className="h-5 w-5 shrink-0 text-primary" /> : <Square className="h-5 w-5 shrink-0 text-slate-300" />}
                  </div>
                  <p className="mt-2 text-xs text-slate-600">{resumoDaDieta(dieta)}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-slate-400">
                    {grupoDaDieta(dieta).label}
                    {usaSonda(dieta) ? <Badge className="border-violet-200 bg-violet-100 text-violet-700">{viaDaDieta(dieta)}</Badge> : null}
                    {dieta.acompanhante_refeicao && acompanhanteRecebe ? (
                      <Badge className="border-accent/30 bg-accent-light text-accent-dark">+ acompanhante</Badge>
                    ) : null}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </Card>

      {/* ------------------------------------ Etiquetas 80mm x 40mm, 2 colunas */}
      <PrintArea active={Boolean(etiquetas)}>
        {etiquetas ? (
          <div className="font-sans text-black">
            <div className="grid grid-cols-2 gap-[2mm]">
              {etiquetas.map((etiqueta) => {
                const acompanhante = etiqueta.tipo === 'acompanhante'
                const cor = colorida ? (acompanhante ? '#00a99d' : DIET_COLORS[etiqueta.consistencia] || '#0f4c81') : '#000000'
                const sonda = usaSonda(etiqueta)
                const observacao = (etiqueta.regime || 'internacao') === 'observacao'
                const hora = sonda ? refeicaoAtual.horaUti : refeicaoAtual.hora
                const nominal = identificacao === 'nome' && etiqueta.nome_paciente

                return (
                  <div
                    key={etiqueta.chave}
                    style={{ width: '80mm', height: '40mm', borderColor: cor }}
                    className="relative overflow-hidden border-2 pb-[5.5mm] pl-[4mm] pr-[2mm] pt-[1.5mm]"
                  >
                    <span className="absolute inset-y-0 left-0 w-[3mm]" style={{ background: cor }} aria-hidden="true" />

                    <div className="flex items-center justify-between gap-[2mm] border-b pb-[1mm]" style={{ borderColor: cor }}>
                      <Logo variant="hospital" className="h-[6mm]" />
                      <span className="rounded-[1mm] px-[1.5mm] py-[0.5mm] text-[2.8mm] font-bold uppercase text-white" style={{ background: cor }}>
                        {refeicaoAtual.label} {hora}
                      </span>
                    </div>

                    {nominal ? (
                      <div className="mt-[1mm]">
                        <p className="truncate text-[4mm] font-extrabold uppercase leading-tight">{upper(etiqueta.nome_paciente)}</p>
                        <p className="text-[2.6mm]">
                          DN: {etiqueta.data_nascimento ? formatDate(etiqueta.data_nascimento) : '—'}
                          {etiqueta.nome_mae ? ` · Mãe: ${etiqueta.nome_mae}` : ''}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-[0.5mm] flex items-baseline justify-between">
                        <span className="text-[2.6mm] font-bold uppercase">Prontuário</span>
                        <span className="font-mono text-[4.6mm] font-extrabold leading-none">{etiqueta.prontuario}</span>
                      </div>
                    )}

                    <div className="mt-[0.5mm] flex items-start justify-between gap-[2mm] text-[2.6mm] leading-tight">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold uppercase">Enfermaria / leito</p>
                        <p className="text-[3.6mm] font-extrabold leading-tight">{etiqueta.leito}</p>
                        <p className="truncate text-[2.6mm]">{etiqueta.setor}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-bold uppercase">{nominal ? 'Prontuário' : 'Listagem'}</p>
                        <p className="text-[2.8mm] font-extrabold">{nominal ? etiqueta.prontuario : grupoDaDieta(etiqueta).curto}</p>
                      </div>
                    </div>

                    <div className="mt-[0.5mm] text-[2.6mm] leading-tight">
                      <p className="font-bold uppercase">Dieta</p>
                      {acompanhante ? (
                        <p className="font-bold">Refeição padrão do acompanhante</p>
                      ) : (
                        <>
                          <p className="line-clamp-2 font-bold">{resumoDaDieta(etiqueta)}</p>
                          {etiqueta.enteral_formula ? <p className="truncate text-[2.3mm]">{etiqueta.enteral_formula} · {etiqueta.enteral_volume}</p> : null}
                        </>
                      )}
                    </div>

                    <div className="absolute inset-x-[2mm] bottom-[1.5mm] flex items-center justify-between gap-[1mm] text-[2.4mm]">
                      <span
                        className="rounded-[1mm] px-[1mm] py-[0.5mm] font-extrabold uppercase"
                        style={colorida ? { background: cor, color: '#fff' } : { border: '0.3mm solid #000' }}
                      >
                        {acompanhante ? 'Acompanhante' : 'Paciente'}
                      </span>
                      <span className="flex items-center gap-[1mm]">
                        {!acompanhante && observacao ? (
                          <span
                            className="rounded-[1mm] px-[1mm] py-[0.5mm] text-[2.2mm] font-extrabold uppercase"
                            style={colorida ? { background: '#f59e0b', color: '#fff' } : { border: '0.3mm solid #000' }}
                          >
                            Observação
                          </span>
                        ) : null}
                        {!acompanhante && sonda ? (
                          <span
                            className="rounded-[1mm] px-[1mm] py-[0.5mm] text-[2.2mm] font-extrabold uppercase"
                            style={colorida ? { background: '#8b5cf6', color: '#fff' } : { border: '0.3mm solid #000' }}
                          >
                            ⚠ {viaDaDieta(etiqueta)}
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

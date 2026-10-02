import { useMemo } from 'react'
import {
  BarChart3,
  ClipboardCheck,
  Flame,
  Salad,
  Smile,
  Soup,
  Thermometer,
  Trash2,
  TrendingUp,
  Utensils,
  Wallet,
} from 'lucide-react'
import { Card, CardHeader, EmptyState, KpiCard, KpiGrid, Progress, TableWrapper, Td, Th } from '@/components/ui'
import {
  DIET_ADEQUACOES,
  DIET_CONSISTENCY,
  DIET_GROUPS,
  DIET_MODIFICATIONS,
  FEEDING_ROUTE_GROUPS,
  MEALS,
  MENU_TYPES,
  UAN_INDICATORS,
  grupoDaDieta,
  grupoDaVia,
  metaAtingida,
  tipoDeCardapio,
} from '@/lib/constants'
import { usaSonda } from '@/lib/nutricao'
import { percent } from '@/lib/format'

/** Uma linha de indicador com barra de proporção. */
function Linha({ rotulo, valor, total, sufixo }) {
  const taxa = percent(valor, total)
  return (
    <tr className="transition hover:bg-slate-50">
      <Td className="font-medium">{rotulo}</Td>
      <Td className="w-24 font-semibold">
        {valor}
        {sufixo ? <span className="ml-1 text-xs font-normal text-slate-400">{sufixo}</span> : null}
      </Td>
      <Td className="w-20 text-slate-500">{taxa}%</Td>
      <Td className="min-w-[140px]">
        <Progress value={taxa} />
      </Td>
    </tr>
  )
}

/** Formata o valor conforme a unidade declarada no indicador. */
function formatarValor(chave, valor) {
  if (valor == null || valor === '') return '—'
  const numero = Number(valor)
  if (Number.isNaN(numero)) return '—'
  const { unidade } = UAN_INDICATORS[chave]
  if (unidade === 'R$') return `R$ ${numero.toFixed(2).replace('.', ',')}`
  if (unidade === 'kg') return `${numero.toFixed(1).replace('.', ',')} kg`
  return `${Math.round(numero * 10) / 10}%`
}

/** Selo de meta atingida, lendo a direção do indicador. */
function SeloMeta({ chave, valor }) {
  const indicador = UAN_INDICATORS[chave]
  const ok = metaAtingida(chave, valor)
  if (ok === null) return <span className="text-xs text-slate-400">sem meta apurada</span>
  const alvo = indicador.unidade === 'R$' ? `R$ ${indicador.meta.toFixed(2).replace('.', ',')}` : `${indicador.meta}${indicador.unidade === 'kg' ? ' kg' : '%'}`
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'
      }`}
    >
      {ok ? 'Dentro da meta' : 'Fora da meta'}
      <span className="font-normal opacity-70">
        ({indicador.direcao === 'min' ? '≥' : '≤'} {alvo})
      </span>
    </span>
  )
}

/** Cartão de um indicador da UAN com valor, meta e comparação com o mês anterior. */
function CartaoUan({ chave, valor, anterior, icone: Icone }) {
  const indicador = UAN_INDICATORS[chave]
  const atual = Number(valor)
  const passado = Number(anterior)
  const temVariacao = !Number.isNaN(atual) && !Number.isNaN(passado) && anterior != null && anterior !== ''
  const variacao = temVariacao ? atual - passado : null
  // Melhora depende da direção: em desperdício, cair é bom.
  const melhorou = variacao === null ? null : indicador.direcao === 'min' ? variacao >= 0 : variacao <= 0

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        {Icone ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
            <Icone className="h-5 w-5" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-700">{indicador.label}</p>
          <p className="text-xs text-slate-500">{indicador.descricao}</p>
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-800">{formatarValor(chave, valor)}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <SeloMeta chave={chave} valor={valor} />
        {variacao !== null ? (
          <span className={`text-[11px] font-semibold ${melhorou ? 'text-emerald-600' : 'text-amber-600'}`}>
            {variacao > 0 ? '▲' : variacao < 0 ? '▼' : '='} {formatarValor(chave, Math.abs(variacao))} vs. mês anterior
          </span>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Indicadores da Nutrição, separados nos dois serviços que a coordenação
 * acompanha: a UAN (produção e distribuição) e a Nutrição Clínica
 * (assistência ao paciente).
 */
export default function IndicadoresNutricao({ dietas, avaliacoes, uanIndicadores = [] }) {
  const ativas = useMemo(() => dietas.filter((dieta) => dieta.status === 'ativa'), [dietas])
  const total = ativas.length

  /* ------------------------------------------------------------- UAN */

  // A competência mais recente é a que aparece nos cartões; a anterior
  // serve apenas para a seta de comparação.
  const historico = useMemo(
    () => [...uanIndicadores].sort((a, b) => String(b.competencia).localeCompare(String(a.competencia))),
    [uanIndicadores],
  )
  const atual = historico[0] || null
  const anterior = historico[1] || null

  const temperatura = useMemo(() => {
    if (!atual) return null
    const aferidas = Number(atual.temperatura_aferidas) || 0
    if (!aferidas) return null
    return percent(Number(atual.temperatura_conformes) || 0, aferidas)
  }, [atual])

  const temperaturaAnterior = useMemo(() => {
    if (!anterior) return null
    const aferidas = Number(anterior.temperatura_aferidas) || 0
    if (!aferidas) return null
    return percent(Number(anterior.temperatura_conformes) || 0, aferidas)
  }, [anterior])

  /* --------------------------------------------- Nutrição Clínica */

  const avaliadas24h = useMemo(() => {
    const comPrazo = avaliacoes.filter((item) => item.data_admissao && item.data_avaliacao)
    const dentro = comPrazo.filter((item) => {
      const dias = (new Date(`${item.data_avaliacao}T00:00:00`) - new Date(`${item.data_admissao}T00:00:00`)) / 86400000
      return dias >= 0 && dias <= 1
    })
    return { total: comPrazo.length, dentro: dentro.length, taxa: percent(dentro.length, comPrazo.length) }
  }, [avaliacoes])

  const aceitacao = useMemo(() => {
    const comRegistro = avaliacoes.filter((item) => item.aceitacao && item.aceitacao !== 'Sem informação')
    const boa = comRegistro.filter((item) => item.aceitacao === 'Boa').length
    return { total: comRegistro.length, boa, taxa: percent(boa, comRegistro.length) }
  }, [avaliacoes])

  /**
   * Quantitativo de refeições distribuídas. Dieta zero e parenteral não
   * geram refeição na UAN; acompanhantes recebem só as quatro do cardápio
   * padrão.
   */
  const refeicoes = useMemo(() => {
    const recebem = ativas.filter((dieta) => dieta.via_enteral !== 'Zero' && dieta.via_enteral !== 'NPT')
    const acompanhantes = ativas.filter((dieta) => dieta.acompanhante_refeicao).length
    const porTipo = MEALS.map((refeicao) => {
      const pacientes = recebem.length
      const acomp = refeicao.acompanhante ? acompanhantes : 0
      return { ...refeicao, pacientes, acompanhantes: acomp, total: pacientes + acomp }
    })
    return { porTipo, totalDia: porTipo.reduce((soma, item) => soma + item.total, 0), pacientes: recebem.length, acompanhantes }
  }, [ativas])

  const semNada = !total && !avaliacoes.length && !uanIndicadores.length
  if (semNada) {
    return (
      <Card>
        <EmptyState title="Nenhum registro encontrado" description="Os indicadores aparecem conforme as dietas, as avaliações e os dados da UAN são registrados." />
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {/* ================================================== UAN */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
          <h2 className="text-base font-bold text-slate-800">UAN — Indicadores</h2>
          <p className="text-xs text-slate-500">
            {atual ? `Competência ${atual.competencia}` : 'Nenhuma competência registrada'}
          </p>
        </div>

        {!atual ? (
          <Card>
            <EmptyState title="Sem dados da UAN" description="Registre a competência mensal para acompanhar temperatura, custo, desperdício e satisfação." />
          </Card>
        ) : (
          <>
            {/* 1 e 2 — temperatura e custo */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CartaoUan chave="temperatura" valor={temperatura} anterior={temperaturaAnterior} icone={Thermometer} />
              <CartaoUan chave="custo_refeicao" valor={atual.custo_refeicao} anterior={anterior?.custo_refeicao} icone={Wallet} />
            </div>

            {/* 3 — desperdício de alimentos */}
            <Card>
              <CardHeader title="Desperdício de alimentos" description="Resto-ingestão, índice de desperdício e sobras limpas" icon={Trash2} />
              <div className="grid grid-cols-1 gap-4 p-4 pt-0 sm:grid-cols-3">
                <CartaoUan chave="resto_ingestao" valor={atual.resto_ingestao} anterior={anterior?.resto_ingestao} icone={Soup} />
                <CartaoUan chave="indice_desperdicio" valor={atual.indice_desperdicio} anterior={anterior?.indice_desperdicio} icone={Trash2} />
                <CartaoUan chave="sobras_limpas" valor={atual.sobras_limpas} anterior={anterior?.sobras_limpas} icone={Flame} />
              </div>
            </Card>

            {/* 4 — satisfação */}
            <Card>
              <CardHeader title="Satisfação com o serviço de alimentação" description="Percentual de avaliações positivas por público" icon={Smile} />
              <div className="grid grid-cols-1 gap-4 p-4 pt-0 sm:grid-cols-3">
                <CartaoUan chave="satisfacao_pacientes" valor={atual.satisfacao_pacientes} anterior={anterior?.satisfacao_pacientes} icone={Smile} />
                <CartaoUan chave="satisfacao_acompanhantes" valor={atual.satisfacao_acompanhantes} anterior={anterior?.satisfacao_acompanhantes} icone={Smile} />
                <CartaoUan chave="satisfacao_funcionarios" valor={atual.satisfacao_funcionarios} anterior={anterior?.satisfacao_funcionarios} icone={Smile} />
              </div>
            </Card>

            {historico.length > 1 ? (
              <Card>
                <CardHeader title="Histórico por competência" description="Meses registrados, do mais recente para o mais antigo" icon={BarChart3} />
                <TableWrapper>
                  <thead>
                    <tr>
                      <Th>Competência</Th>
                      <Th>Temperatura</Th>
                      <Th>Custo/refeição</Th>
                      <Th>Resto-ingestão</Th>
                      <Th>Desperdício</Th>
                      <Th>Sobras limpas</Th>
                      <Th>Satisfação pacientes</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {historico.map((linha) => {
                      const aferidas = Number(linha.temperatura_aferidas) || 0
                      const conformidade = aferidas ? percent(Number(linha.temperatura_conformes) || 0, aferidas) : null
                      return (
                        <tr key={linha.id} className="transition hover:bg-slate-50">
                          <Td className="font-semibold">{linha.competencia}</Td>
                          <Td>{conformidade == null ? '—' : `${conformidade}%`}</Td>
                          <Td>{formatarValor('custo_refeicao', linha.custo_refeicao)}</Td>
                          <Td>{formatarValor('resto_ingestao', linha.resto_ingestao)}</Td>
                          <Td>{formatarValor('indice_desperdicio', linha.indice_desperdicio)}</Td>
                          <Td>{formatarValor('sobras_limpas', linha.sobras_limpas)}</Td>
                          <Td>{formatarValor('satisfacao_pacientes', linha.satisfacao_pacientes)}</Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </TableWrapper>
              </Card>
            ) : null}
          </>
        )}
      </section>

      {/* ====================================== Nutrição Clínica */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
          <h2 className="text-base font-bold text-slate-800">Nutrição Clínica — Indicadores</h2>
          <p className="text-xs text-slate-500">{total} dieta(s) ativa(s)</p>
        </div>

        <KpiGrid>
          <KpiCard label="Dietas ativas" value={total} icon={Salad} tone="primary" />
          <KpiCard
            label="Terapia enteral"
            value={ativas.filter((dieta) => usaSonda(dieta)).length}
            hint={`${percent(ativas.filter((dieta) => usaSonda(dieta)).length, total)}% do total`}
            icon={TrendingUp}
            tone="violet"
          />
          <KpiCard
            label="Avaliação em até 24h"
            value={`${avaliadas24h.taxa}%`}
            hint={`${avaliadas24h.dentro} de ${avaliadas24h.total}`}
            icon={ClipboardCheck}
            tone={avaliadas24h.taxa >= 80 ? 'emerald' : 'amber'}
          />
          <KpiCard label="Aceitação boa" value={`${aceitacao.taxa}%`} hint={`${aceitacao.boa} de ${aceitacao.total} avaliações`} icon={BarChart3} tone="accent" />
        </KpiGrid>

        {/* 1 — perfil de dietas hospitalares */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader title="Perfil de dietas — por consistência" description="Percentual sobre as dietas ativas" icon={BarChart3} />
            <TableWrapper className="min-w-0">
              <thead>
                <tr>
                  <Th>Consistência</Th>
                  <Th>Qtd.</Th>
                  <Th>%</Th>
                  <Th>Proporção</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {DIET_CONSISTENCY.map((item) => (
                  <Linha key={item} rotulo={item} valor={ativas.filter((dieta) => dieta.consistencia === item).length} total={total} />
                ))}
              </tbody>
            </TableWrapper>
          </Card>

          <Card>
            <CardHeader title="Perfil de dietas — por tipo de cardápio" description="Cardápios servidos pela UAN" icon={Utensils} />
            <TableWrapper className="min-w-0">
              <thead>
                <tr>
                  <Th>Tipo de cardápio</Th>
                  <Th>Qtd.</Th>
                  <Th>%</Th>
                  <Th>Proporção</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {MENU_TYPES.map((item) => (
                  <Linha key={item} rotulo={item} valor={ativas.filter((dieta) => tipoDeCardapio(dieta) === item).length} total={total} />
                ))}
                <Linha
                  rotulo="Outros / não classificado"
                  valor={ativas.filter((dieta) => !MENU_TYPES.includes(tipoDeCardapio(dieta))).length}
                  total={total}
                />
              </tbody>
            </TableWrapper>
          </Card>

          {/* 2 — perfil das vias de alimentação */}
          <Card>
            <CardHeader title="Perfil das vias de alimentação" description="Oral, enteral, parenteral e associação de vias" icon={TrendingUp} />
            <TableWrapper className="min-w-0">
              <thead>
                <tr>
                  <Th>Via</Th>
                  <Th>Qtd.</Th>
                  <Th>%</Th>
                  <Th>Proporção</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {FEEDING_ROUTE_GROUPS.map((grupo) => {
                  const valor = ativas.filter((dieta) => grupoDaVia(dieta.via_enteral)?.id === grupo.id).length
                  // "Associação de vias" só aparece quando existe de fato.
                  if (grupo.id === 'mista' && !valor) return null
                  return <Linha key={grupo.id} rotulo={grupo.label} valor={valor} total={total} />
                })}
              </tbody>
            </TableWrapper>
          </Card>

          {/* 3 — quantitativo de refeições distribuídas */}
          <Card>
            <CardHeader
              title="Quantitativo de refeições distribuídas"
              description={`${refeicoes.totalDia} refeições/dia · ${refeicoes.pacientes} paciente(s) e ${refeicoes.acompanhantes} acompanhante(s)`}
              icon={Utensils}
            />
            <TableWrapper className="min-w-0">
              <thead>
                <tr>
                  <Th>Refeição</Th>
                  <Th>Pacientes</Th>
                  <Th>Acomp.</Th>
                  <Th>Total</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {refeicoes.porTipo.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50">
                    <Td className="font-medium">
                      {item.label}
                      <span className="ml-2 text-xs font-normal text-slate-400">{item.hora}</span>
                    </Td>
                    <Td>{item.pacientes}</Td>
                    <Td>{item.acompanhantes || '—'}</Td>
                    <Td className="font-semibold">{item.total}</Td>
                  </tr>
                ))}
                <tr className="bg-slate-50">
                  <Td className="font-bold">Total no dia</Td>
                  <Td className="font-semibold">{refeicoes.pacientes * MEALS.length}</Td>
                  <Td className="font-semibold">{refeicoes.acompanhantes * MEALS.filter((item) => item.acompanhante).length}</Td>
                  <Td className="font-bold">{refeicoes.totalDia}</Td>
                </tr>
              </tbody>
            </TableWrapper>
          </Card>

          <Card>
            <CardHeader title="Dietas terapêuticas" description="Modificações prescritas" icon={BarChart3} />
            <TableWrapper className="min-w-0">
              <thead>
                <tr>
                  <Th>Modificação</Th>
                  <Th>Qtd.</Th>
                  <Th>%</Th>
                  <Th>Proporção</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {DIET_MODIFICATIONS.map((item) => (
                  <Linha key={item} rotulo={item} valor={ativas.filter((dieta) => dieta.modificacao === item).length} total={total} />
                ))}
              </tbody>
            </TableWrapper>
          </Card>

          <Card>
            <CardHeader title="Adequações dietéticas" description="Podem ocorrer várias na mesma dieta" icon={BarChart3} />
            <TableWrapper className="min-w-0">
              <thead>
                <tr>
                  <Th>Adequação</Th>
                  <Th>Qtd.</Th>
                  <Th>%</Th>
                  <Th>Proporção</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {DIET_ADEQUACOES.map((item) => (
                  <Linha key={item} rotulo={item} valor={ativas.filter((dieta) => (dieta.adequacoes || []).includes(item)).length} total={total} />
                ))}
              </tbody>
            </TableWrapper>
          </Card>

          <Card>
            <CardHeader title="Distribuição por listagem" description="Como as etiquetas chegam à UAN" icon={BarChart3} />
            <TableWrapper className="min-w-0">
              <thead>
                <tr>
                  <Th>Listagem</Th>
                  <Th>Qtd.</Th>
                  <Th>%</Th>
                  <Th>Proporção</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {DIET_GROUPS.map((grupo) => (
                  <Linha key={grupo.id} rotulo={grupo.label} valor={ativas.filter((dieta) => grupoDaDieta(dieta).id === grupo.id).length} total={total} />
                ))}
              </tbody>
            </TableWrapper>
          </Card>
        </div>
      </section>
    </div>
  )
}

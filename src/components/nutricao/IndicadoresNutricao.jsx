import { useMemo } from 'react'
import { BarChart3, ClipboardCheck, Salad, TrendingUp } from 'lucide-react'
import { Card, CardHeader, EmptyState, KpiCard, KpiGrid, Progress, TableWrapper, Td, Th } from '@/components/ui'
import { DIET_ADEQUACOES, DIET_CONSISTENCY, DIET_MODIFICATIONS, DIET_GROUPS, grupoDaDieta } from '@/lib/constants'
import { usaSonda } from '@/lib/nutricao'
import { percent } from '@/lib/format'

/** Uma linha de indicador com barra de proporção. */
function Linha({ rotulo, valor, total }) {
  const taxa = percent(valor, total)
  return (
    <tr className="transition hover:bg-slate-50">
      <Td className="font-medium">{rotulo}</Td>
      <Td className="w-20 font-semibold">{valor}</Td>
      <Td className="w-24 text-slate-500">{taxa}%</Td>
      <Td className="min-w-[160px]">
        <Progress value={taxa} />
      </Td>
    </tr>
  )
}

/** Indicadores da Nutrição Clínica descritos pela coordenação do setor. */
export default function IndicadoresNutricao({ dietas, avaliacoes }) {
  const ativas = useMemo(() => dietas.filter((dieta) => dieta.status === 'ativa'), [dietas])
  const total = ativas.length

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

  if (!total && !avaliacoes.length) {
    return (
      <Card>
        <EmptyState title="Nenhum registro encontrado" description="Os indicadores aparecem conforme as dietas e as avaliações são registradas." />
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <KpiGrid>
        <KpiCard label="Dietas ativas" value={total} icon={Salad} tone="primary" />
        <KpiCard label="Terapia enteral" value={ativas.filter((dieta) => usaSonda(dieta)).length} hint={`${percent(ativas.filter((d) => usaSonda(d)).length, total)}% do total`} icon={TrendingUp} tone="violet" />
        <KpiCard
          label="Avaliação em até 24h"
          value={`${avaliadas24h.taxa}%`}
          hint={`${avaliadas24h.dentro} de ${avaliadas24h.total}`}
          icon={ClipboardCheck}
          tone={avaliadas24h.taxa >= 80 ? 'emerald' : 'amber'}
        />
        <KpiCard label="Aceitação boa" value={`${aceitacao.taxa}%`} hint={`${aceitacao.boa} de ${aceitacao.total} avaliações`} icon={BarChart3} tone="accent" />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Perfil de consistência" description="Percentual sobre as dietas ativas" icon={BarChart3} />
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
    </div>
  )
}

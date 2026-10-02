import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, BedDouble, Salad, Users } from 'lucide-react'
import { Card, CardHeader, EmptyState, KpiCard, KpiGrid } from '@/components/ui'
import { CHART_INK, DIET_CONSISTENCY } from '@/lib/constants'
import { usaSonda } from '@/lib/nutricao'

const tooltipStyle = { borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }

/**
 * Painel do setor. Cada gráfico tem uma série só, então a cor é única e a
 * identidade vem do eixo — nada de paleta arco-íris. Os valores aparecem
 * rotulados na ponta da barra, o que também cobre o contraste do teal.
 */
export default function PainelNutricao({ dietas, leitos, visitantes }) {
  const ativas = useMemo(() => dietas.filter((dieta) => dieta.status === 'ativa'), [dietas])

  const kpis = useMemo(
    () => ({
      pacientes: ativas.length,
      leitosOcupados: leitos.filter((leito) => leito.status === 'ocupado').length,
      acompanhantes: ativas.filter((dieta) => dieta.acompanhante_refeicao).length,
      enteral: ativas.filter((dieta) => usaSonda(dieta)).length,
    }),
    [ativas, leitos],
  )

  const porConsistencia = useMemo(
    () =>
      DIET_CONSISTENCY.map((consistencia) => ({
        nome: consistencia,
        total: ativas.filter((dieta) => dieta.consistencia === consistencia).length,
      }))
        .filter((item) => item.total > 0)
        .sort((a, b) => b.total - a.total),
    [ativas],
  )

  const porSetor = useMemo(() => {
    const mapa = new Map()
    ativas.forEach((dieta) => {
      const chave = dieta.setor || 'Sem setor'
      mapa.set(chave, (mapa.get(chave) || 0) + 1)
    })
    return Array.from(mapa.entries())
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
  }, [ativas])

  const acompanhantesNaUnidade = visitantes.filter((visitante) => !visitante.saida).length

  return (
    <div className="space-y-5">
      <KpiGrid>
        <KpiCard label="Pacientes com dieta ativa" value={kpis.pacientes} icon={Salad} tone="primary" />
        <KpiCard label="Leitos ocupados" value={kpis.leitosOcupados} icon={BedDouble} tone="accent" />
        <KpiCard label="Refeições de acompanhante" value={kpis.acompanhantes} hint={`${acompanhantesNaUnidade} acompanhantes na unidade`} icon={Users} tone="emerald" />
        <KpiCard label="Terapia enteral" value={kpis.enteral} hint="Seguem os horários da UTI" icon={Activity} tone="violet" />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Dietas por consistência" description="Dietas ativas no momento" icon={Salad} />
          {porConsistencia.length === 0 ? (
            <EmptyState title="Nenhum registro encontrado" description="Nenhuma dieta ativa para somar." />
          ) : (
            <div className="h-72 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porConsistencia} layout="vertical" margin={{ left: 8, right: 32 }} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grade} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: CHART_INK.texto }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="nome" width={130} tick={{ fontSize: 11, fill: CHART_INK.texto }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(15,76,129,0.06)' }} formatter={(valor) => [`${valor} dieta(s)`, 'Total']} />
                  <Bar dataKey="total" fill={CHART_INK.primaria} radius={[0, 4, 4, 0]} maxBarSize={18}>
                    <LabelList dataKey="total" position="right" style={{ fill: CHART_INK.texto, fontSize: 12, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Pacientes por setor" description="Distribuição das dietas liberadas" icon={BedDouble} />
          {porSetor.length === 0 ? (
            <EmptyState title="Nenhum registro encontrado" description="Nenhuma dieta ativa para somar." />
          ) : (
            <div className="h-72 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porSetor} layout="vertical" margin={{ left: 8, right: 32 }} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grade} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: CHART_INK.texto }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="nome" width={130} tick={{ fontSize: 11, fill: CHART_INK.texto }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,169,157,0.08)' }} formatter={(valor) => [`${valor} paciente(s)`, 'Total']} />
                  <Bar dataKey="total" fill={CHART_INK.secundaria} radius={[0, 4, 4, 0]} maxBarSize={18}>
                    {porSetor.map((item) => (
                      <Cell key={item.nome} fill={CHART_INK.secundaria} />
                    ))}
                    <LabelList dataKey="total" position="right" style={{ fill: CHART_INK.texto, fontSize: 12, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

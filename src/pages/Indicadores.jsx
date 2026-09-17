import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, BarChart3, ClipboardCheck, ShieldAlert, TrendingDown } from 'lucide-react'
import { useCollections } from '@/data/store'
import { Card, CardHeader, EmptyState, KpiCard, KpiGrid, LoadingState, Pill } from '@/components/ui'
import { OMS_CHECKLIST, SURGERY_TYPES } from '@/lib/constants'
import { percent } from '@/lib/format'

const CHART_COLORS = ['#0f4c81', '#00a99d', '#f59e0b', '#8b5cf6', '#ef4444', '#10b981']

function ultimosDias(quantidade) {
  return Array.from({ length: quantidade }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (quantidade - 1 - index))
    const offset = date.getTimezoneOffset()
    const iso = new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10)
    return { iso, label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) }
  })
}

export default function Indicadores() {
  const data = useCollections(['cirurgias', 'salas', 'leitos', 'psLeitos'])
  const [aba, setAba] = useState('operacional')

  const cirurgias = data.cirurgias || []

  const metricas = useMemo(() => {
    const total = cirurgias.length
    const canceladas = cirurgias.filter((item) => ['cancelada', 'suspensa'].includes(item.status)).length
    const realizadas = cirurgias.filter((item) => item.status === 'finalizada').length
    const convertidas = cirurgias.filter((item) => item.convertida).length
    const reoperacoes = cirurgias.filter((item) => item.reoperacao).length
    const infeccoes = cirurgias.filter((item) => item.infeccao).length
    const eventos = cirurgias.filter((item) => item.evento_adverso).length
    const obitos = cirurgias.filter((item) => item.obito).length
    const checklistCompleto = cirurgias.filter((item) => (item.checklist_oms || []).length === OMS_CHECKLIST.length).length
    const salas = data.salas || []
    const leitos = data.leitos || []
    return {
      total,
      realizadas,
      canceladas,
      taxaCancelamento: percent(canceladas, total),
      taxaConversao: percent(convertidas, total),
      taxaChecklist: percent(checklistCompleto, total),
      reoperacoes,
      infeccoes,
      eventos,
      obitos,
      taxaInfeccao: percent(infeccoes, total),
      ocupacaoSalas: percent(salas.filter((sala) => sala.status === 'em_uso').length, salas.length),
      ocupacaoLeitos: percent(leitos.filter((leito) => leito.status === 'ocupado').length, leitos.length),
    }
  }, [cirurgias, data.salas, data.leitos])

  const serieDiaria = useMemo(() => {
    const dias = ultimosDias(7)
    return dias.map((dia) => ({
      dia: dia.label,
      agendadas: cirurgias.filter((item) => item.data_prevista === dia.iso).length,
      realizadas: cirurgias.filter((item) => item.data_prevista === dia.iso && item.status === 'finalizada').length,
      canceladas: cirurgias.filter((item) => item.data_prevista === dia.iso && ['cancelada', 'suspensa'].includes(item.status)).length,
    }))
  }, [cirurgias])

  const porTipo = useMemo(
    () =>
      Object.entries(SURGERY_TYPES)
        .map(([key, config]) => ({ name: config.label, value: cirurgias.filter((item) => item.tipo === key).length }))
        .filter((item) => item.value > 0),
    [cirurgias],
  )

  const porSala = useMemo(() => {
    const mapa = new Map()
    cirurgias.forEach((item) => {
      const sala = item.sala || 'Sem sala'
      mapa.set(sala, (mapa.get(sala) || 0) + 1)
    })
    return Array.from(mapa.entries()).map(([sala, quantidade]) => ({ sala, quantidade }))
  }, [cirurgias])

  const ocupacaoSetor = useMemo(() => {
    const mapa = new Map()
    ;(data.leitos || []).forEach((leito) => {
      if (!mapa.has(leito.setor)) mapa.set(leito.setor, { setor: leito.setor, total: 0, ocupados: 0 })
      const registro = mapa.get(leito.setor)
      registro.total += 1
      if (leito.status === 'ocupado') registro.ocupados += 1
    })
    return Array.from(mapa.values()).map((registro) => ({ ...registro, taxa: percent(registro.ocupados, registro.total) }))
  }, [data.leitos])

  const qualidadeChecklist = useMemo(
    () =>
      OMS_CHECKLIST.map((item) => ({
        item: item.label.length > 24 ? `${item.label.slice(0, 24)}…` : item.label,
        adesao: percent(cirurgias.filter((cirurgia) => (cirurgia.checklist_oms || []).includes(item.id)).length, cirurgias.length),
      })),
    [cirurgias],
  )

  if (data.loading) return <LoadingState />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Pill active={aba === 'operacional'} onClick={() => setAba('operacional')}>
          Operacional
        </Pill>
        <Pill active={aba === 'qualidade'} onClick={() => setAba('qualidade')}>
          Qualidade
        </Pill>
      </div>

      {cirurgias.length === 0 ? (
        <Card>
          <EmptyState title="Nenhum registro encontrado" description="Cadastre cirurgias para gerar os indicadores." />
        </Card>
      ) : aba === 'operacional' ? (
        <div className="space-y-5">
          <KpiGrid>
            <KpiCard label="Cirurgias registradas" value={metricas.total} icon={BarChart3} tone="primary" />
            <KpiCard label="Realizadas" value={metricas.realizadas} icon={Activity} tone="emerald" />
            <KpiCard label="Ocupação das salas" value={`${metricas.ocupacaoSalas}%`} icon={BarChart3} tone="accent" />
            <KpiCard label="Ocupação de leitos" value={`${metricas.ocupacaoLeitos}%`} icon={BarChart3} tone="violet" />
          </KpiGrid>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Movimento dos últimos 7 dias" description="Agendadas x realizadas x canceladas" icon={BarChart3} />
              <div className="h-72 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serieDiaria}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="agendadas" name="Agendadas" fill="#0f4c81" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="realizadas" name="Realizadas" fill="#00a99d" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="canceladas" name="Canceladas" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader title="Distribuição por tipo" description="Eletiva, urgência e emergência" icon={BarChart3} />
              <div className="h-72 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={porTipo} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                      {porTipo.map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader title="Produção por sala" description="Total de procedimentos por sala cirúrgica" icon={BarChart3} />
              <div className="h-72 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porSala} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="sala" width={130} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Bar dataKey="quantidade" name="Cirurgias" fill="#0f4c81" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader title="Taxa de ocupação por setor" description="Percentual de leitos ocupados" icon={BarChart3} />
              <div className="h-72 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ocupacaoSetor}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="setor" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-25} textAnchor="end" height={70} axisLine={false} tickLine={false} />
                    <YAxis unit="%" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(value) => `${value}%`} />
                    <Bar dataKey="taxa" name="Ocupação" fill="#00a99d" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <KpiGrid>
            <KpiCard label="Taxa de cancelamento" value={`${metricas.taxaCancelamento}%`} hint={`${metricas.canceladas} de ${metricas.total}`} icon={TrendingDown} tone={metricas.taxaCancelamento > 15 ? 'red' : 'emerald'} />
            <KpiCard label="Adesão ao checklist OMS" value={`${metricas.taxaChecklist}%`} hint="Checklists completos" icon={ClipboardCheck} tone={metricas.taxaChecklist < 80 ? 'amber' : 'emerald'} />
            <KpiCard label="Taxa de conversão" value={`${metricas.taxaConversao}%`} hint="Vídeo → aberta" icon={Activity} tone="primary" />
            <KpiCard label="Infecção de sítio cirúrgico" value={`${metricas.taxaInfeccao}%`} hint={`${metricas.infeccoes} casos`} icon={ShieldAlert} tone={metricas.infeccoes ? 'red' : 'emerald'} />
          </KpiGrid>

          <KpiGrid>
            <KpiCard label="Reoperações" value={metricas.reoperacoes} icon={ShieldAlert} tone="amber" />
            <KpiCard label="Eventos adversos" value={metricas.eventos} icon={ShieldAlert} tone="amber" />
            <KpiCard label="Óbitos" value={metricas.obitos} icon={ShieldAlert} tone={metricas.obitos ? 'red' : 'slate'} />
            <KpiCard label="Cirurgias realizadas" value={metricas.realizadas} icon={Activity} tone="emerald" />
          </KpiGrid>

          <Card>
            <CardHeader title="Adesão por item do checklist de Cirurgia Segura" description="Percentual de cirurgias com o item registrado" icon={ClipboardCheck} />
            <div className="h-96 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={qualidadeChecklist} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="item" width={170} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(value) => `${value}%`} />
                  <Bar dataKey="adesao" name="Adesão" fill="#0f4c81" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader title="Tendência de cancelamentos" description="Últimos 7 dias" icon={TrendingDown} />
            <div className="h-64 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serieDiaria}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Line type="monotone" dataKey="canceladas" name="Canceladas" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="realizadas" name="Realizadas" stroke="#00a99d" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

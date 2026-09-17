import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Download, Lock, Package, Pencil, Plus, Trash2 } from 'lucide-react'
import { useCollection } from '@/data/store'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  KpiCard,
  KpiGrid,
  LoadingState,
  Modal,
  Pill,
  SearchInput,
  Select,
  StatusBadge,
  TableWrapper,
  Td,
  Textarea,
  Th,
} from '@/components/ui'
import { STOCK_CATEGORIES, STOCK_MOVES, STOCK_UNITS } from '@/lib/constants'
import { formatDate, formatDateTime, matches, todayISO } from '@/lib/format'
import { baixarCsv, carimboArquivo } from '@/lib/csv'

const EMPTY_PRODUTO = {
  nome: '',
  categoria: 'Secos',
  unidade: 'kg',
  estoque_atual: 0,
  estoque_minimo: 0,
  custo_unitario: 0,
  fornecedor: '',
  validade: '',
  observacao: '',
}

const EMPTY_MOV = { produto_id: '', tipo: 'entrada', quantidade: '', motivo: '' }

const moeda = (valor) => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Almoxarifado() {
  const { items: produtos, loading, create, update, remove } = useCollection('produtos')
  const { items: movimentacoes, create: criarMovimentacao } = useCollection('movimentacoes')
  const { user, canDo } = useAuth()
  const toast = useToast()

  const podeCriar = canDo('almoxarifado', 'criar')
  const podeEditar = canDo('almoxarifado', 'editar')
  const podeExcluir = canDo('almoxarifado', 'excluir')

  const [aba, setAba] = useState('saldo')
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [modalProduto, setModalProduto] = useState(null)
  const [formProduto, setFormProduto] = useState(EMPTY_PRODUTO)
  const [formMov, setFormMov] = useState(EMPTY_MOV)
  const [errors, setErrors] = useState({})

  const critico = (produto) => Number(produto.estoque_atual) <= Number(produto.estoque_minimo)

  const lista = useMemo(
    () =>
      produtos
        .filter((produto) => (filtroCategoria === 'todas' ? true : produto.categoria === filtroCategoria))
        .filter((produto) => matches(busca, produto.nome, produto.categoria, produto.fornecedor))
        .sort((a, b) => String(a.nome).localeCompare(String(b.nome))),
    [produtos, filtroCategoria, busca],
  )

  const kpis = useMemo(() => {
    const vencendo = produtos.filter((produto) => produto.validade && produto.validade <= todayISO())
    return {
      itens: produtos.length,
      criticos: produtos.filter(critico).length,
      valor: produtos.reduce((total, produto) => total + Number(produto.estoque_atual || 0) * Number(produto.custo_unitario || 0), 0),
      vencidos: vencendo.length,
    }
  }, [produtos])

  const historico = useMemo(() => [...movimentacoes].sort((a, b) => String(b.data).localeCompare(String(a.data))).slice(0, 50), [movimentacoes])

  /* -------------------------------------------------------- Produtos */

  function abrirNovoProduto() {
    setFormProduto(EMPTY_PRODUTO)
    setErrors({})
    setModalProduto('novo')
  }

  function abrirEdicaoProduto(produto) {
    setFormProduto({ ...EMPTY_PRODUTO, ...produto })
    setErrors({})
    setModalProduto(produto.id)
  }

  async function salvarProduto(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!formProduto.nome.trim()) nextErrors.nome = 'Informe o nome do item.'
    if (produtos.some((produto) => produto.nome.toLowerCase() === formProduto.nome.trim().toLowerCase() && produto.id !== modalProduto)) {
      nextErrors.nome = 'Já existe um item com este nome.'
    }
    if (Number(formProduto.estoque_minimo) < 0) nextErrors.estoque_minimo = 'O estoque mínimo não pode ser negativo.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const payload = {
      ...formProduto,
      nome: formProduto.nome.trim(),
      estoque_atual: Number(formProduto.estoque_atual) || 0,
      estoque_minimo: Number(formProduto.estoque_minimo) || 0,
      custo_unitario: Number(formProduto.custo_unitario) || 0,
    }
    delete payload.id

    if (modalProduto === 'novo') {
      await create(payload)
      toast.success('Item cadastrado no almoxarifado.')
    } else {
      await update(modalProduto, payload)
      toast.success('Item atualizado.')
    }
    setModalProduto(null)
  }

  async function excluirProduto(produto) {
    if (!window.confirm(`Excluir o item "${produto.nome}" do almoxarifado?`)) return
    await remove(produto.id)
    toast.success('Item excluído.')
  }

  /* ---------------------------------------------------- Movimentação */

  async function registrarMovimentacao(event) {
    event.preventDefault()
    const nextErrors = {}
    const quantidade = Number(formMov.quantidade)
    const produto = produtos.find((item) => item.id === formMov.produto_id)

    if (!produto) nextErrors.produto_id = 'Selecione o item.'
    if (!quantidade || quantidade <= 0) nextErrors.quantidade = 'Informe uma quantidade maior que zero.'
    if (produto && formMov.tipo === 'saida' && quantidade > Number(produto.estoque_atual)) {
      nextErrors.quantidade = `Saldo insuficiente: disponível ${produto.estoque_atual} ${produto.unidade}.`
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const novoSaldo = formMov.tipo === 'entrada' ? Number(produto.estoque_atual) + quantidade : Number(produto.estoque_atual) - quantidade

    await update(produto.id, { estoque_atual: novoSaldo })
    await criarMovimentacao({
      produto_id: produto.id,
      produto_nome: produto.nome,
      unidade: produto.unidade,
      tipo: formMov.tipo,
      quantidade,
      saldo_apos: novoSaldo,
      motivo: formMov.motivo.trim(),
      usuario: user?.nome || 'Sistema',
      data: new Date().toISOString(),
    })

    toast.success(`${STOCK_MOVES[formMov.tipo].label} registrada. Novo saldo: ${novoSaldo} ${produto.unidade}.`)
    setFormMov(EMPTY_MOV)
    setErrors({})
  }

  function exportarSaldo() {
    baixarCsv(
      carimboArquivo('estoque'),
      [
        { label: 'Item', valor: (p) => p.nome },
        { label: 'Categoria', valor: (p) => p.categoria },
        { label: 'Unidade', valor: (p) => p.unidade },
        { label: 'Saldo', valor: (p) => p.estoque_atual },
        { label: 'Mínimo', valor: (p) => p.estoque_minimo },
        { label: 'Custo unitário', valor: (p) => Number(p.custo_unitario || 0).toFixed(2).replace('.', ',') },
        { label: 'Valor total', valor: (p) => (Number(p.estoque_atual || 0) * Number(p.custo_unitario || 0)).toFixed(2).replace('.', ',') },
        { label: 'Fornecedor', valor: (p) => p.fornecedor || '' },
        { label: 'Validade', valor: (p) => (p.validade ? formatDate(p.validade) : '') },
        { label: 'Situação', valor: (p) => (critico(p) ? 'Repor' : 'OK') },
      ],
      lista,
    )
    toast.success('Arquivo CSV gerado.')
  }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-5">
      <KpiGrid>
        <KpiCard label="Itens cadastrados" value={kpis.itens} icon={Package} tone="primary" />
        <KpiCard label="Abaixo do mínimo" value={kpis.criticos} icon={AlertTriangle} tone={kpis.criticos ? 'red' : 'emerald'} />
        <KpiCard label="Valor em estoque" value={moeda(kpis.valor)} icon={Package} tone="accent" />
        <KpiCard label="Validade vencida" value={kpis.vencidos} icon={AlertTriangle} tone={kpis.vencidos ? 'amber' : 'slate'} />
      </KpiGrid>

      <div className="flex flex-wrap gap-2">
        <Pill active={aba === 'saldo'} onClick={() => setAba('saldo')}>
          Saldo em estoque
        </Pill>
        <Pill active={aba === 'movimentar'} onClick={() => setAba('movimentar')}>
          Entrada / saída
        </Pill>
        <Pill active={aba === 'historico'} onClick={() => setAba('historico')}>
          Histórico ({movimentacoes.length})
        </Pill>
      </div>

      {aba === 'saldo' ? (
        <Card>
          <CardHeader
            title="Saldo em estoque"
            description="Controle de insumos da Unidade de Alimentação e Nutrição"
            icon={Package}
            actions={
              <>
                <button type="button" className="btn-ghost" onClick={exportarSaldo}>
                  <Download className="h-4 w-4" /> CSV
                </button>
                {podeCriar ? (
                  <button type="button" className="btn-primary" onClick={abrirNovoProduto}>
                    <Plus className="h-4 w-4" /> Novo item
                  </button>
                ) : (
                  <Badge className="border-slate-200 bg-slate-100 text-slate-500">
                    <Lock className="h-3 w-3" /> Somente leitura
                  </Badge>
                )}
              </>
            }
          />

          <div className="grid grid-cols-1 gap-3 border-b border-border px-5 py-4 sm:grid-cols-3">
            <SearchInput value={busca} onChange={setBusca} placeholder="Item ou fornecedor..." className="sm:col-span-2" />
            <Select value={filtroCategoria} onChange={(event) => setFiltroCategoria(event.target.value)}>
              <option value="todas">Todas as categorias</option>
              {STOCK_CATEGORIES.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </Select>
          </div>

          {lista.length === 0 ? (
            <EmptyState title="Nenhum registro encontrado" description="Cadastre os insumos do almoxarifado." />
          ) : (
            <TableWrapper>
              <thead>
                <tr>
                  <Th>Item</Th>
                  <Th>Categoria</Th>
                  <Th>Saldo</Th>
                  <Th>Mínimo</Th>
                  <Th>Custo unit.</Th>
                  <Th>Validade</Th>
                  <Th>Situação</Th>
                  <Th className="text-right">Ações</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map((produto) => (
                  <tr key={produto.id} className={`transition hover:bg-slate-50 ${critico(produto) ? 'bg-amber-50/60' : ''}`}>
                    <Td className="font-semibold">{produto.nome}</Td>
                    <Td className="text-slate-500">{produto.categoria}</Td>
                    <Td className="font-semibold">
                      {produto.estoque_atual} <span className="text-xs font-normal text-slate-400">{produto.unidade}</span>
                    </Td>
                    <Td className="text-slate-500">{produto.estoque_minimo}</Td>
                    <Td className="text-slate-500">{moeda(produto.custo_unitario)}</Td>
                    <Td className="text-slate-500">{produto.validade ? formatDate(produto.validade) : '—'}</Td>
                    <Td>
                      {critico(produto) ? (
                        <Badge className="border-amber-200 bg-amber-100 text-amber-700">Repor</Badge>
                      ) : (
                        <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">OK</Badge>
                      )}
                    </Td>
                    <Td className="text-right">
                      <div className="inline-flex gap-1">
                        {podeEditar ? (
                          <button type="button" onClick={() => abrirEdicaoProduto(produto)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-primary" aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </button>
                        ) : null}
                        {podeExcluir ? (
                          <button type="button" onClick={() => excluirProduto(produto)} className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600" aria-label="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                        {!podeEditar && !podeExcluir ? <span className="text-xs text-slate-300">—</span> : null}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrapper>
          )}
        </Card>
      ) : null}

      {aba === 'movimentar' ? (
        <Card>
          <CardHeader title="Dar entrada ou saída" description="A movimentação atualiza o saldo e fica registrada no histórico" icon={ArrowUpCircle} />
          {!podeEditar ? (
            <EmptyState icon={Lock} title="Sem permissão" description="Seu perfil não pode movimentar o estoque. Solicite a liberação ao administrador." />
          ) : (
            <form onSubmit={registrarMovimentacao} className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <Field label="Item" error={errors.produto_id} className="sm:col-span-2">
                <Select value={formMov.produto_id} onChange={(event) => setFormMov({ ...formMov, produto_id: event.target.value })}>
                  <option value="">Selecione...</option>
                  {produtos.map((produto) => (
                    <option key={produto.id} value={produto.id}>
                      {produto.nome} — saldo {produto.estoque_atual} {produto.unidade}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tipo">
                <Select value={formMov.tipo} onChange={(event) => setFormMov({ ...formMov, tipo: event.target.value })}>
                  {Object.entries(STOCK_MOVES).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Quantidade" error={errors.quantidade}>
                <Input type="number" min="0" step="0.01" value={formMov.quantidade} onChange={(event) => setFormMov({ ...formMov, quantidade: event.target.value })} />
              </Field>
              <Field label="Motivo" className="sm:col-span-2">
                <Input value={formMov.motivo} onChange={(event) => setFormMov({ ...formMov, motivo: event.target.value })} placeholder="Ex.: produção do almoço, compra mensal, perda" />
              </Field>
              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" className="btn-primary">
                  {formMov.tipo === 'entrada' ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                  Registrar {STOCK_MOVES[formMov.tipo].label.toLowerCase()}
                </button>
              </div>
            </form>
          )}
        </Card>
      ) : null}

      {aba === 'historico' ? (
        <Card>
          <CardHeader title="Histórico de movimentações" description="Últimas 50 entradas e saídas" icon={Package} />
          {historico.length === 0 ? (
            <EmptyState title="Nenhum registro encontrado" description="Nenhuma movimentação registrada até o momento." />
          ) : (
            <TableWrapper>
              <thead>
                <tr>
                  <Th>Data</Th>
                  <Th>Item</Th>
                  <Th>Tipo</Th>
                  <Th>Quantidade</Th>
                  <Th>Saldo após</Th>
                  <Th>Motivo</Th>
                  <Th>Responsável</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {historico.map((movimento) => (
                  <tr key={movimento.id} className="transition hover:bg-slate-50">
                    <Td className="text-slate-500">{formatDateTime(movimento.data)}</Td>
                    <Td className="font-semibold">{movimento.produto_nome}</Td>
                    <Td>
                      <StatusBadge map={STOCK_MOVES} value={movimento.tipo} />
                    </Td>
                    <Td>
                      {movimento.tipo === 'saida' ? '-' : '+'}
                      {movimento.quantidade} {movimento.unidade}
                    </Td>
                    <Td className="font-semibold">
                      {movimento.saldo_apos} {movimento.unidade}
                    </Td>
                    <Td className="max-w-[220px] truncate text-slate-500">{movimento.motivo || '—'}</Td>
                    <Td className="text-slate-500">{movimento.usuario}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrapper>
          )}
        </Card>
      ) : null}

      <Modal
        open={Boolean(modalProduto)}
        onClose={() => setModalProduto(null)}
        title={modalProduto === 'novo' ? 'Novo item do almoxarifado' : 'Editar item'}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setModalProduto(null)}>
              Cancelar
            </button>
            <button type="submit" form="form-produto" className="btn-primary">
              Salvar
            </button>
          </>
        }
      >
        <form id="form-produto" onSubmit={salvarProduto} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome do item" error={errors.nome} className="sm:col-span-2">
            <Input value={formProduto.nome} onChange={(event) => setFormProduto({ ...formProduto, nome: event.target.value })} placeholder="Arroz tipo 1" />
          </Field>
          <Field label="Categoria">
            <Select value={formProduto.categoria} onChange={(event) => setFormProduto({ ...formProduto, categoria: event.target.value })}>
              {STOCK_CATEGORIES.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Unidade de medida">
            <Select value={formProduto.unidade} onChange={(event) => setFormProduto({ ...formProduto, unidade: event.target.value })}>
              {STOCK_UNITS.map((unidade) => (
                <option key={unidade} value={unidade}>
                  {unidade}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estoque atual">
            <Input type="number" min="0" step="0.01" value={formProduto.estoque_atual} onChange={(event) => setFormProduto({ ...formProduto, estoque_atual: event.target.value })} />
          </Field>
          <Field label="Estoque mínimo" error={errors.estoque_minimo}>
            <Input type="number" min="0" step="0.01" value={formProduto.estoque_minimo} onChange={(event) => setFormProduto({ ...formProduto, estoque_minimo: event.target.value })} />
          </Field>
          <Field label="Custo unitário (R$)">
            <Input type="number" min="0" step="0.01" value={formProduto.custo_unitario} onChange={(event) => setFormProduto({ ...formProduto, custo_unitario: event.target.value })} />
          </Field>
          <Field label="Validade">
            <Input type="date" value={formProduto.validade} onChange={(event) => setFormProduto({ ...formProduto, validade: event.target.value })} />
          </Field>
          <Field label="Fornecedor" className="sm:col-span-2">
            <Input value={formProduto.fornecedor} onChange={(event) => setFormProduto({ ...formProduto, fornecedor: event.target.value })} />
          </Field>
          <Field label="Observações" className="sm:col-span-2">
            <Textarea value={formProduto.observacao} onChange={(event) => setFormProduto({ ...formProduto, observacao: event.target.value })} />
          </Field>
        </form>
      </Modal>
    </div>
  )
}

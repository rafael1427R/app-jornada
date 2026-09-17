import { useMemo, useState } from 'react'
import { KeyRound, Lock, Pencil, Plus, ShieldCheck, Trash2, UserCog } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Badge, Card, CardHeader, EmptyState, Field, Input, KpiCard, KpiGrid, LoadingState, Modal, Pill, SearchInput, Select, TableWrapper, Td, Th } from '@/components/ui'
import { MODULES, ROLES, SECTORS } from '@/lib/constants'
import { formatDateTime, matches, normalize } from '@/lib/format'

const EMPTY = { nome: '', usuario: '', senha: '', funcao: 'Enfermeiro', ativo: true, setores: [], modulos: ['dashboard'] }

export default function Usuarios() {
  const { usuarios, loadingUsers, createUser, updateUser, removeUser, user } = useAuth()
  const toast = useToast()
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [senhaModal, setSenhaModal] = useState(null)
  const [senhas, setSenhas] = useState({ atual: '', nova: '', confirmacao: '' })
  const [errosSenha, setErrosSenha] = useState({})

  const lista = useMemo(
    () => usuarios.filter((item) => matches(busca, item.nome, item.usuario, item.funcao)).sort((a, b) => String(a.nome).localeCompare(String(b.nome))),
    [usuarios, busca],
  )

  const kpis = useMemo(
    () => ({
      total: usuarios.length,
      ativos: usuarios.filter((item) => item.ativo !== false).length,
      inativos: usuarios.filter((item) => item.ativo === false).length,
      administradores: usuarios.filter((item) => item.funcao === 'Administrador').length,
    }),
    [usuarios],
  )

  const modulosDo = (item) => (item.modulos === 'all' || item.master ? MODULES.map((module) => module.id) : item.modulos || [])

  function abrirNovo() {
    setForm(EMPTY)
    setErrors({})
    setModal('novo')
  }

  function abrirEdicao(item) {
    setForm({ ...EMPTY, ...item, senha: item.senha || '', modulos: modulosDo(item), setores: item.setores || [] })
    setErrors({})
    setModal(item.id)
  }

  function toggleLista(campo, valor) {
    setForm((current) => ({
      ...current,
      [campo]: current[campo].includes(valor) ? current[campo].filter((item) => item !== valor) : [...current[campo], valor],
    }))
  }

  async function salvar(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!form.nome.trim()) nextErrors.nome = 'Informe o nome completo.'
    if (!form.usuario.trim()) nextErrors.usuario = 'Informe o nome de usuário.'
    if (form.usuario.trim() && usuarios.some((item) => normalize(item.usuario) === normalize(form.usuario) && item.id !== modal)) {
      nextErrors.usuario = 'Já existe um usuário com este login.'
    }
    if (!String(form.senha).trim() || String(form.senha).length < 4) nextErrors.senha = 'A senha deve ter ao menos 4 caracteres.'
    if (!form.modulos.length) nextErrors.modulos = 'Selecione ao menos um módulo.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const editando = modal !== 'novo' ? usuarios.find((item) => item.id === modal) : null
    const payload = {
      nome: form.nome.trim(),
      usuario: form.usuario.trim().toLowerCase(),
      senha: String(form.senha),
      funcao: form.funcao,
      ativo: form.ativo,
      setores: form.setores,
      modulos: editando?.master ? 'all' : form.modulos,
    }

    if (modal === 'novo') {
      await createUser({ ...payload, master: false })
      toast.success('Usuário criado com sucesso.')
    } else {
      await updateUser(modal, payload)
      toast.success('Usuário atualizado.')
    }
    setModal(null)
  }

  async function excluir(item) {
    if (item.master) {
      toast.error('O usuário Administrador Master não pode ser excluído.')
      return
    }
    if (item.id === user?.id) {
      toast.error('Não é possível excluir o próprio usuário conectado.')
      return
    }
    if (!window.confirm(`Excluir o usuário ${item.nome}?`)) return
    await removeUser(item.id)
    toast.success('Usuário excluído.')
  }

  async function alternarAtivo(item) {
    if (item.master) {
      toast.error('O Administrador Master não pode ser desativado.')
      return
    }
    await updateUser(item.id, { ativo: item.ativo === false })
    toast.success(item.ativo === false ? 'Usuário reativado.' : 'Usuário inativado — o acesso foi bloqueado.')
  }

  function abrirTrocaSenha(item) {
    setSenhas({ atual: '', nova: '', confirmacao: '' })
    setErrosSenha({})
    setSenhaModal(item)
  }

  async function trocarSenha(event) {
    event.preventDefault()
    const nextErrors = {}
    const exigeAtual = senhaModal.id === user?.id
    if (exigeAtual && String(senhas.atual) !== String(senhaModal.senha)) nextErrors.atual = 'Senha atual incorreta.'
    if (String(senhas.nova).length < 4) nextErrors.nova = 'A nova senha deve ter ao menos 4 caracteres.'
    if (senhas.nova !== senhas.confirmacao) nextErrors.confirmacao = 'A confirmação não confere.'
    setErrosSenha(nextErrors)
    if (Object.keys(nextErrors).length) return

    await updateUser(senhaModal.id, { senha: String(senhas.nova) })
    toast.success('Senha alterada com sucesso.')
    setSenhaModal(null)
  }

  if (loadingUsers) return <LoadingState />

  return (
    <div className="space-y-5">
      <KpiGrid>
        <KpiCard label="Usuários" value={kpis.total} icon={UserCog} tone="primary" />
        <KpiCard label="Ativos" value={kpis.ativos} icon={ShieldCheck} tone="emerald" />
        <KpiCard label="Inativos" value={kpis.inativos} icon={Lock} tone="amber" />
        <KpiCard label="Administradores" value={kpis.administradores} icon={ShieldCheck} tone="accent" />
      </KpiGrid>

      <Card>
        <CardHeader
          title="Usuários e acessos"
          description="Controle de perfis, setores e módulos liberados por usuário"
          icon={ShieldCheck}
          actions={
            <button type="button" className="btn-primary" onClick={abrirNovo}>
              <Plus className="h-4 w-4" /> Novo usuário
            </button>
          }
        />

        <div className="border-b border-border px-5 py-4">
          <SearchInput value={busca} onChange={setBusca} placeholder="Nome, usuário ou função..." />
        </div>

        {lista.length === 0 ? (
          <EmptyState title="Nenhum registro encontrado" />
        ) : (
          <TableWrapper>
            <thead>
              <tr>
                <Th>Nome</Th>
                <Th>Usuário</Th>
                <Th>Função</Th>
                <Th>Setores</Th>
                <Th>Módulos</Th>
                <Th>Situação</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((item) => (
                <tr key={item.id} className={`transition hover:bg-slate-50 ${item.ativo === false ? 'bg-slate-50/70 opacity-70' : ''}`}>
                  <Td className="font-semibold">
                    {item.nome}
                    {item.master ? <Badge className="ml-2 border-primary/20 bg-primary-light text-primary">Master</Badge> : null}
                  </Td>
                  <Td className="font-mono text-xs">{item.usuario}</Td>
                  <Td>{item.funcao}</Td>
                  <Td className="max-w-[220px] truncate text-slate-500">{(item.setores || []).join(', ') || '—'}</Td>
                  <Td>
                    <Badge className="border-slate-200 bg-slate-100 text-slate-600">{modulosDo(item).length} de {MODULES.length}</Badge>
                  </Td>
                  <Td>
                    <button type="button" onClick={() => alternarAtivo(item)}>
                      <Badge className={item.ativo === false ? 'border-red-200 bg-red-100 text-red-700' : 'border-emerald-200 bg-emerald-100 text-emerald-700'}>
                        {item.ativo === false ? 'Inativo' : 'Ativo'}
                      </Badge>
                    </button>
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex gap-1">
                      <button type="button" onClick={() => abrirTrocaSenha(item)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-primary" aria-label="Alterar senha">
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => abrirEdicao(item)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-primary" aria-label="Editar">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => excluir(item)}
                        disabled={item.master}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
        )}
      </Card>

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        size="lg"
        title={modal === 'novo' ? 'Novo usuário' : 'Editar usuário'}
        description="Defina função, setores e os módulos que aparecerão no menu deste usuário."
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setModal(null)}>
              Cancelar
            </button>
            <button type="submit" form="form-usuario" className="btn-primary">
              Salvar
            </button>
          </>
        }
      >
        <form id="form-usuario" onSubmit={salvar} className="space-y-5">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome completo" error={errors.nome}>
              <Input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} />
            </Field>
            <Field label="Usuário (login)" error={errors.usuario}>
              <Input value={form.usuario} onChange={(event) => setForm({ ...form, usuario: event.target.value })} placeholder="nome.sobrenome" />
            </Field>
            <Field label="Senha" error={errors.senha}>
              <Input type="text" value={form.senha} onChange={(event) => setForm({ ...form, senha: event.target.value })} />
            </Field>
            <Field label="Função">
              <Select value={form.funcao} onChange={(event) => setForm({ ...form, funcao: event.target.value })}>
                {ROLES.map((funcao) => (
                  <option key={funcao} value={funcao}>
                    {funcao}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Situação">
              <Select value={form.ativo ? 'ativo' : 'inativo'} onChange={(event) => setForm({ ...form, ativo: event.target.value === 'ativo' })}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo (bloqueado)</option>
              </Select>
            </Field>
          </section>

          <section>
            <p className="label">Setores permitidos</p>
            <div className="flex flex-wrap gap-2">
              {SECTORS.map((setor) => (
                <Pill key={setor} active={form.setores.includes(setor)} onClick={() => toggleLista('setores', setor)}>
                  {setor}
                </Pill>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-1 flex items-center justify-between">
              <p className="label mb-0">Módulos liberados</p>
              <div className="flex gap-2">
                <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setForm({ ...form, modulos: MODULES.map((module) => module.id) })}>
                  Selecionar todos
                </button>
                <button type="button" className="text-xs font-semibold text-slate-400 hover:underline" onClick={() => setForm({ ...form, modulos: [] })}>
                  Limpar
                </button>
              </div>
            </div>
            {errors.modulos ? <p className="mb-2 text-xs font-medium text-red-600">{errors.modulos}</p> : null}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {MODULES.map((module) => (
                <label key={module.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={form.modulos.includes(module.id)}
                    onChange={() => toggleLista('modulos', module.id)}
                  />
                  {module.label}
                </label>
              ))}
            </div>
          </section>
        </form>
      </Modal>

      <Modal
        open={Boolean(senhaModal)}
        onClose={() => setSenhaModal(null)}
        size="sm"
        title="Alterar senha"
        description={senhaModal ? `Usuário: ${senhaModal.nome}` : ''}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setSenhaModal(null)}>
              Cancelar
            </button>
            <button type="submit" form="form-senha" className="btn-primary">
              <Lock className="h-4 w-4" /> Salvar senha
            </button>
          </>
        }
      >
        <form id="form-senha" onSubmit={trocarSenha} className="space-y-4">
          {senhaModal?.id === user?.id ? (
            <Field label="Senha atual" error={errosSenha.atual}>
              <Input type="password" value={senhas.atual} onChange={(event) => setSenhas({ ...senhas, atual: event.target.value })} />
            </Field>
          ) : null}
          <Field label="Nova senha" error={errosSenha.nova}>
            <Input type="password" value={senhas.nova} onChange={(event) => setSenhas({ ...senhas, nova: event.target.value })} />
          </Field>
          <Field label="Confirmar nova senha" error={errosSenha.confirmacao}>
            <Input type="password" value={senhas.confirmacao} onChange={(event) => setSenhas({ ...senhas, confirmacao: event.target.value })} />
          </Field>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Última atualização do cadastro: {formatDateTime(senhaModal?.criado_em)}
          </p>
        </form>
      </Modal>
    </div>
  )
}

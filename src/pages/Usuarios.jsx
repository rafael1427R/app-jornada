import { useMemo, useState } from 'react'
import { KeyRound, Lock, Pencil, Plus, ShieldCheck, Trash2, UserCog } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Badge, Card, CardHeader, EmptyState, Field, Input, KpiCard, KpiGrid, LoadingState, Modal, Pill, SearchInput, Select, TableWrapper, Td, Th } from '@/components/ui'
import { MODULES, ROLES, SECTORS } from '@/lib/constants'
import { ACTION_KEYS, ACTIONS, PERMISSION_TEMPLATES, normalizePermissions } from '@/lib/permissions'
import { formatDateTime, matches, normalize } from '@/lib/format'
import { conferirSenhaRemota } from '@/data/authRemote'
import { supabaseEnabled } from '@/data/supabaseClient'

const EMPTY = { nome: '', usuario: '', senha: '', funcao: 'Enfermeiro', ativo: true, setores: [], permissoes: {} }

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

  const resumoPermissoes = (item) => {
    const permissoes = normalizePermissions(item)
    const modulos = Object.keys(permissoes).length
    const escrita = Object.values(permissoes).filter((acoes) => acoes.some((acao) => acao !== 'ver')).length
    return { modulos, escrita }
  }

  /* ------------------------------------------------------- Formulário */

  function abrirNovo() {
    setForm({ ...EMPTY, permissoes: { dashboard: ['ver'] } })
    setErrors({})
    setModal('novo')
  }

  function abrirEdicao(item) {
    setForm({ ...EMPTY, ...item, setores: item.setores || [], permissoes: normalizePermissions(item) })
    setErrors({})
    setModal(item.id)
  }

  function toggleSetor(setor) {
    setForm((current) => ({
      ...current,
      setores: current.setores.includes(setor) ? current.setores.filter((item) => item !== setor) : [...current.setores, setor],
    }))
  }

  /** Liga/desliga uma ação de um módulo. "ver" é pré-requisito das demais. */
  function toggleAcao(moduleId, acao) {
    setForm((current) => {
      const atuais = current.permissoes[moduleId] || []
      const tinha = atuais.includes(acao)
      let proximas = tinha ? atuais.filter((item) => item !== acao) : [...atuais, acao]

      if (!tinha && acao !== 'ver' && !proximas.includes('ver')) proximas.push('ver')
      if (tinha && acao === 'ver') proximas = []

      const permissoes = { ...current.permissoes }
      if (proximas.length) permissoes[moduleId] = ACTION_KEYS.filter((item) => proximas.includes(item))
      else delete permissoes[moduleId]
      return { ...current, permissoes }
    })
  }

  function alternarModuloCompleto(moduleId) {
    setForm((current) => {
      const atuais = current.permissoes[moduleId] || []
      const permissoes = { ...current.permissoes }
      if (atuais.length === ACTION_KEYS.length) delete permissoes[moduleId]
      else permissoes[moduleId] = [...ACTION_KEYS]
      return { ...current, permissoes }
    })
  }

  function aplicarTemplate(acoes) {
    setForm((current) => ({
      ...current,
      permissoes: Object.fromEntries(MODULES.map((module) => [module.id, [...acoes]])),
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
    if (!Object.keys(form.permissoes).length) nextErrors.permissoes = 'Libere ao menos um módulo para este usuário.'
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
      permissoes: editando?.master ? 'all' : form.permissoes,
      // Mantido em sincronia para compatibilidade com cadastros antigos.
      modulos: editando?.master ? 'all' : Object.keys(form.permissoes),
    }

    if (modal === 'novo') {
      await createUser({ ...payload, master: false })
      toast.success('Usuário criado com as permissões definidas.')
    } else {
      await updateUser(modal, payload)
      toast.success('Permissões atualizadas.')
    }
    setModal(null)
  }

  /* ----------------------------------------------------------- Ações */

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
    if (exigeAtual) {
      const remoto = await conferirSenhaRemota(senhaModal.id, senhas.atual)
      if (remoto.unavailable && supabaseEnabled) {
        // Sem o banco não há como conferir a senha atual: comparar com a cópia
        // local aceitaria uma senha que o Postgres nunca validou.
        nextErrors.atual = 'Sem conexão com o banco. Tente novamente em instantes.'
      } else {
        const valida = remoto.unavailable ? String(senhas.atual) === String(senhaModal.senha) : remoto.ok
        if (!valida) nextErrors.atual = 'Senha atual incorreta.'
      }
    }
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
          description="O Administrador Master define, por usuário, quais módulos aparecem no menu e o que ele pode fazer em cada um"
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
                <Th>Permissões</Th>
                <Th>Situação</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((item) => {
                const resumo = resumoPermissoes(item)
                return (
                  <tr key={item.id} className={`transition hover:bg-slate-50 ${item.ativo === false ? 'bg-slate-50/70 opacity-70' : ''}`}>
                    <Td className="font-semibold">
                      {item.nome}
                      {item.master ? <Badge className="ml-2 border-primary/20 bg-primary-light text-primary">Master</Badge> : null}
                    </Td>
                    <Td className="font-mono text-xs">{item.usuario}</Td>
                    <Td>{item.funcao}</Td>
                    <Td className="max-w-[200px] truncate text-slate-500">{(item.setores || []).join(', ') || '—'}</Td>
                    <Td>
                      <Badge className="border-slate-200 bg-slate-100 text-slate-600">
                        {resumo.modulos} de {MODULES.length} módulos
                      </Badge>
                      <span className="ml-2 text-xs text-slate-400">{resumo.escrita} com escrita</span>
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
                )
              })}
            </tbody>
          </TableWrapper>
        )}
      </Card>

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        size="lg"
        title={modal === 'novo' ? 'Novo usuário' : 'Editar usuário'}
        description="Marque, módulo a módulo, o que este usuário poderá visualizar, criar, editar e excluir."
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
                <Pill key={setor} active={form.setores.includes(setor)} onClick={() => toggleSetor(setor)}>
                  {setor}
                </Pill>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="label mb-0">Permissões por módulo</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PERMISSION_TEMPLATES).map(([nome, acoes]) => (
                  <Pill key={nome} onClick={() => aplicarTemplate(acoes)}>
                    {nome}
                  </Pill>
                ))}
                <Pill onClick={() => setForm({ ...form, permissoes: {} })}>Limpar</Pill>
              </div>
            </div>
            {errors.permissoes ? <p className="mb-2 text-xs font-medium text-red-600">{errors.permissoes}</p> : null}

            <div className="overflow-hidden rounded-xl border border-border">
              <div className="grid grid-cols-[1fr_repeat(4,56px)] gap-1 bg-muted/50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:grid-cols-[1fr_repeat(4,80px)]">
                <span>Módulo</span>
                {ACTION_KEYS.map((acao) => (
                  <span key={acao} className="text-center">
                    {ACTIONS[acao].short}
                  </span>
                ))}
              </div>
              <div className="max-h-72 divide-y divide-border overflow-y-auto scrollbar-thin">
                {MODULES.map((module) => {
                  const acoes = form.permissoes[module.id] || []
                  return (
                    <div key={module.id} className="grid grid-cols-[1fr_repeat(4,56px)] items-center gap-1 px-3 py-2 transition hover:bg-slate-50 sm:grid-cols-[1fr_repeat(4,80px)]">
                      <button type="button" onClick={() => alternarModuloCompleto(module.id)} className="truncate text-left text-sm font-medium text-slate-700 hover:text-primary" title="Marcar/desmarcar todas as ações">
                        {module.label}
                      </button>
                      {ACTION_KEYS.map((acao) => (
                        <label key={acao} className="flex cursor-pointer items-center justify-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                            checked={acoes.includes(acao)}
                            onChange={() => toggleAcao(module.id, acao)}
                            aria-label={`${ACTIONS[acao].label} em ${module.label}`}
                          />
                        </label>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Clique no nome do módulo para marcar tudo de uma vez. "Visualizar" é obrigatório — ao marcar criar, editar ou excluir, ele é ativado automaticamente.
            </p>
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
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Cadastro criado em {formatDateTime(senhaModal?.criado_em)}</p>
        </form>
      </Modal>
    </div>
  )
}

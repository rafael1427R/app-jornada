import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { SESSION_KEY } from '@/data/collections'
import { useCollection } from '@/data/store'
import { MODULES } from '@/lib/constants'
import { readStorage, writeStorage } from '@/lib/storage'
import { normalize } from '@/lib/format'
import { hasAction, normalizePermissions, visibleModules } from '@/lib/permissions'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { items: usuarios, loading, create, update, remove, refresh } = useCollection('usuarios')
  const [session, setSession] = useState(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setSession(readStorage(SESSION_KEY, null))
    setHydrated(true)
  }, [])

  const user = useMemo(() => {
    if (!session) return null
    return usuarios.find((item) => item.id === session.userId) || null
  }, [session, usuarios])

  const login = useCallback(
    (usuario, senha) => {
      const found = usuarios.find((item) => normalize(item.usuario) === normalize(usuario))
      if (!found) return { ok: false, error: 'Usuário não encontrado.' }
      if (String(found.senha) !== String(senha)) return { ok: false, error: 'Senha incorreta.' }
      if (found.ativo === false) return { ok: false, error: 'Usuário inativo. Procure o administrador.' }
      const nextSession = { userId: found.id, usuario: found.usuario, nome: found.nome, funcao: found.funcao, iniciado_em: new Date().toISOString() }
      writeStorage(SESSION_KEY, nextSession)
      setSession(nextSession)
      return { ok: true, user: found }
    },
    [usuarios],
  )

  const logout = useCallback(() => {
    writeStorage(SESSION_KEY, null)
    setSession(null)
  }, [])

  /** Mapa { moduloId: ['ver', 'criar', ...] } já normalizado. */
  const permissions = useMemo(() => normalizePermissions(user), [user])

  const allowedModules = useMemo(() => {
    if (!user) return []
    const visiveis = visibleModules(permissions)
    return MODULES.filter((module) => visiveis.includes(module.id))
  }, [user, permissions])

  /** Acesso ao módulo (entrar na tela). */
  const can = useCallback((moduleId) => hasAction(permissions, moduleId, 'ver'), [permissions])

  /** Acesso a uma ação dentro do módulo: criar, editar ou excluir. */
  const canDo = useCallback((moduleId, action) => hasAction(permissions, moduleId, action), [permissions])

  const value = useMemo(
    () => ({
      user,
      session,
      usuarios,
      loadingUsers: loading,
      hydrated,
      isAuthenticated: Boolean(user),
      login,
      logout,
      can,
      canDo,
      permissions,
      allowedModules,
      createUser: create,
      updateUser: update,
      removeUser: remove,
      refreshUsers: refresh,
    }),
    [user, session, usuarios, loading, hydrated, login, logout, can, canDo, permissions, allowedModules, create, update, remove, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return context
}

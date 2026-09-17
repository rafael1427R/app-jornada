import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { SESSION_KEY } from '@/data/collections'
import { useCollection } from '@/data/store'
import { MODULES } from '@/lib/constants'
import { readStorage, writeStorage } from '@/lib/storage'
import { normalize } from '@/lib/format'

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

  const allowedModules = useMemo(() => {
    if (!user) return []
    if (user.modulos === 'all' || user.master) return MODULES
    const allowed = Array.isArray(user.modulos) ? user.modulos : []
    return MODULES.filter((module) => allowed.includes(module.id))
  }, [user])

  const can = useCallback(
    (moduleId) => {
      if (!user) return false
      if (user.master || user.modulos === 'all') return true
      return Array.isArray(user.modulos) && user.modulos.includes(moduleId)
    },
    [user],
  )

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
      allowedModules,
      createUser: create,
      updateUser: update,
      removeUser: remove,
      refreshUsers: refresh,
    }),
    [user, session, usuarios, loading, hydrated, login, logout, can, allowedModules, create, update, remove, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return context
}

import { MODULE_IDS } from './constants'

/** Ações controláveis por módulo. */
export const ACTIONS = {
  ver: { label: 'Visualizar', short: 'Ver' },
  criar: { label: 'Criar', short: 'Criar' },
  editar: { label: 'Editar', short: 'Editar' },
  excluir: { label: 'Excluir', short: 'Excluir' },
}

export const ACTION_KEYS = Object.keys(ACTIONS)

/** Perfis prontos para acelerar o cadastro de usuários. */
export const PERMISSION_TEMPLATES = {
  'Somente leitura': ['ver'],
  'Operacional': ['ver', 'criar', 'editar'],
  'Total': ACTION_KEYS,
}

export function fullPermissions() {
  return Object.fromEntries(MODULE_IDS.map((id) => [id, [...ACTION_KEYS]]))
}

/**
 * Normaliza o formato armazenado no usuário.
 * Aceita o formato novo (`permissoes`) e o legado (`modulos`), para que
 * cadastros antigos continuem funcionando após a atualização.
 */
export function normalizePermissions(user) {
  if (!user) return {}
  if (user.master || user.permissoes === 'all' || user.modulos === 'all') return fullPermissions()

  if (user.permissoes && typeof user.permissoes === 'object' && !Array.isArray(user.permissoes)) {
    const result = {}
    Object.entries(user.permissoes).forEach(([moduleId, actions]) => {
      if (!MODULE_IDS.includes(moduleId)) return
      const list = Array.isArray(actions) ? actions.filter((action) => ACTION_KEYS.includes(action)) : []
      if (list.length) result[moduleId] = list
    })
    return result
  }

  // Legado: a simples presença do módulo dava acesso completo a ele.
  const modulos = Array.isArray(user.modulos) ? user.modulos : []
  return Object.fromEntries(modulos.filter((id) => MODULE_IDS.includes(id)).map((id) => [id, [...ACTION_KEYS]]))
}

/** Módulos visíveis no menu (os que têm ao menos a ação "ver"). */
export function visibleModules(permissions) {
  return Object.entries(permissions)
    .filter(([, actions]) => actions.includes('ver'))
    .map(([moduleId]) => moduleId)
}

export function hasAction(permissions, moduleId, action) {
  return Boolean(permissions?.[moduleId]?.includes(action))
}

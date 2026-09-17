import {
  seedCirurgias,
  seedEquipamentos,
  seedEquipe,
  seedEscala,
  seedLeitos,
  seedPsAltas,
  seedPsLeitos,
  seedRpa,
  seedSalas,
  seedUsuarios,
  seedVisitantes,
  seedAuditoria,
} from './seeds'

/**
 * Cada coleção conhece sua chave no localStorage (modo offline) e a tabela
 * correspondente no Supabase (modo conectado).
 */
export const COLLECTIONS = {
  salas: { key: 'salas-v1', table: 'salas_cirurgicas', seed: seedSalas, dateFields: ['chamado_em'] },
  cirurgias: { key: 'cirurgias-v1', table: 'cirurgias', seed: seedCirurgias, dateFields: ['data_prevista', 'inicio_real', 'fim_real'] },
  equipe: { key: 'equipe-v1', table: 'equipe_medica', seed: seedEquipe, dateFields: [] },
  equipamentos: { key: 'equipamentos-v1', table: 'equipamentos', seed: seedEquipamentos, dateFields: ['ultima_manutencao', 'proxima_manutencao'] },
  escala: { key: 'escala-v1', table: 'escala_plantao', seed: seedEscala, dateFields: ['data'] },
  rpa: { key: 'rpa-v1', table: 'rpa_leitos', seed: seedRpa, dateFields: ['entrada', 'saida'] },
  leitos: { key: 'leitos-v1', table: 'leitos', seed: seedLeitos, dateFields: ['ocupado_em', 'previsao_alta'] },
  visitantes: { key: 'visitors-v1', table: 'visitantes', seed: seedVisitantes, dateFields: ['entrada', 'saida'] },
  psLeitos: { key: 'ps-v1', table: 'ps_leitos', seed: seedPsLeitos, dateFields: ['admitido_em'] },
  psAltas: { key: 'ps-altas-v1', table: 'ps_altas', seed: seedPsAltas, dateFields: ['data', 'admitido_em'] },
  usuarios: { key: 'sys-users-v1', table: 'usuarios', seed: seedUsuarios, dateFields: [] },
  auditoria: { key: 'audit-v1', table: 'log_auditoria', seed: seedAuditoria, dateFields: ['data'] },
}

export const SESSION_KEY = 'sys-session-v1'

export function collectionConfig(name) {
  const config = COLLECTIONS[name]
  if (!config) throw new Error(`Coleção desconhecida: ${name}`)
  return config
}

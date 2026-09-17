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
} from './seeds'

/**
 * Cada coleção conhece sua chave no localStorage (modo offline) e a tabela
 * correspondente no Supabase (modo conectado).
 */
export const COLLECTIONS = {
  salas: { key: 'salas-v1', table: 'salas_cirurgicas', seed: seedSalas },
  cirurgias: { key: 'cirurgias-v1', table: 'cirurgias', seed: seedCirurgias },
  equipe: { key: 'equipe-v1', table: 'equipe_medica', seed: seedEquipe },
  equipamentos: { key: 'equipamentos-v1', table: 'equipamentos', seed: seedEquipamentos },
  escala: { key: 'escala-v1', table: 'escala_plantao', seed: seedEscala },
  rpa: { key: 'rpa-v1', table: 'rpa_leitos', seed: seedRpa },
  leitos: { key: 'leitos-v1', table: 'leitos', seed: seedLeitos },
  visitantes: { key: 'visitors-v1', table: 'visitantes', seed: seedVisitantes },
  psLeitos: { key: 'ps-v1', table: 'ps_leitos', seed: seedPsLeitos },
  psAltas: { key: 'ps-altas-v1', table: 'ps_altas', seed: seedPsAltas },
  usuarios: { key: 'sys-users-v1', table: 'usuarios', seed: seedUsuarios },
}

export const SESSION_KEY = 'sys-session-v1'

export function collectionConfig(name) {
  const config = COLLECTIONS[name]
  if (!config) throw new Error(`Coleção desconhecida: ${name}`)
  return config
}

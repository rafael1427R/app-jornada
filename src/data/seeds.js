import { BED_SECTORS, PS_BED_COUNT, PS_PREFIX, RPA_BED_COUNT } from '@/lib/constants'
import { todayISO, uid } from '@/lib/format'

const pad = (value, size = 2) => String(value).padStart(size, '0')

/* --------------------------------------------------------------- Salas */

export function seedSalas() {
  const base = [
    { nome: 'Sala 01', tipo: 'Geral', setor: 'Centro Cirúrgico', andar: '2º andar', status: 'disponivel' },
    { nome: 'Sala 02', tipo: 'Videolaparoscopia', setor: 'Centro Cirúrgico', andar: '2º andar', status: 'em_uso' },
    { nome: 'Sala 03', tipo: 'Ortopedia', setor: 'Centro Cirúrgico', andar: '2º andar', status: 'limpeza' },
    { nome: 'Sala 04', tipo: 'Geral', setor: 'Centro Cirúrgico', andar: '2º andar', status: 'disponivel' },
    { nome: 'Sala 05', tipo: 'Urgência', setor: 'Centro Cirúrgico', andar: '2º andar', status: 'manutencao' },
    { nome: 'Sala Obstétrica 01', tipo: 'Cesárea', setor: 'Centro Obstétrico', andar: '1º andar', status: 'em_uso' },
    { nome: 'Sala Obstétrica 02', tipo: 'Parto cirúrgico', setor: 'Centro Obstétrico', andar: '1º andar', status: 'disponivel' },
    { nome: 'Sala Ambulatorial 01', tipo: 'Pequenas cirurgias', setor: 'Cirurgia Ambulatorial', andar: 'Térreo', status: 'reservada' },
    { nome: 'Sala Ambulatorial 02', tipo: 'Endoscopia', setor: 'Cirurgia Ambulatorial', andar: 'Térreo', status: 'disponivel' },
  ]
  return base.map((sala) => ({
    id: uid(),
    ...sala,
    equipamentos: [],
    prontuario_atual: sala.status === 'em_uso' ? String(100000 + Math.floor(Math.random() * 899999)) : '',
    observacao: '',
    criado_em: new Date().toISOString(),
  }))
}

/* ------------------------------------------------------------ Cirurgias */

export function seedCirurgias() {
  const hoje = todayISO()
  const rows = [
    { prontuario: '204871', procedimento: 'Colecistectomia videolaparoscópica', tipo: 'eletiva', tecnica: 'Videolaparoscópica', sala: 'Sala 02', hora_prevista: '07:30', status: 'em_andamento', especialidade: 'Cirurgia Geral' },
    { prontuario: '198340', procedimento: 'Herniorrafia inguinal', tipo: 'eletiva', tecnica: 'Convencional', sala: 'Sala 01', hora_prevista: '09:00', status: 'agendada', especialidade: 'Cirurgia Geral' },
    { prontuario: '221095', procedimento: 'Osteossíntese de fêmur', tipo: 'urgencia', tecnica: 'Convencional', sala: 'Sala 03', hora_prevista: '10:30', status: 'em_preparo', especialidade: 'Ortopedia' },
    { prontuario: '187654', procedimento: 'Cesárea', tipo: 'emergencia', tecnica: 'Convencional', sala: 'Sala Obstétrica 01', hora_prevista: '11:15', status: 'em_andamento', especialidade: 'Obstetrícia' },
    { prontuario: '210338', procedimento: 'Apendicectomia', tipo: 'urgencia', tecnica: 'Videolaparoscópica', sala: 'Sala 04', hora_prevista: '13:00', status: 'agendada', especialidade: 'Cirurgia Geral' },
    { prontuario: '176520', procedimento: 'Colpoperineoplastia', tipo: 'eletiva', tecnica: 'Convencional', sala: 'Sala 01', hora_prevista: '15:00', status: 'em_rpa', especialidade: 'Ginecologia' },
    { prontuario: '233104', procedimento: 'Postectomia', tipo: 'eletiva', tecnica: 'Convencional', sala: 'Sala Ambulatorial 01', hora_prevista: '16:00', status: 'finalizada', especialidade: 'Urologia' },
  ]
  return rows.map((row) => ({
    id: uid(),
    prontuario: row.prontuario,
    procedimento: row.procedimento,
    especialidade: row.especialidade,
    tipo: row.tipo,
    tecnica: row.tecnica,
    lateralidade: 'Não se aplica',
    sala: row.sala,
    data_prevista: hoje,
    hora_prevista: row.hora_prevista,
    inicio_real: ['em_andamento', 'em_rpa', 'finalizada'].includes(row.status) ? `${hoje}T${row.hora_prevista}:00` : '',
    fim_real: row.status === 'finalizada' ? `${hoje}T${row.hora_prevista}:00` : '',
    status: row.status,
    cirurgiao: '',
    anestesista: '',
    equipe: [],
    anestesia: 'Geral',
    checklist_oms: [],
    leito_rpa: row.status === 'em_rpa' ? 'RPA-01' : '',
    convertida: false,
    reoperacao: false,
    infeccao: false,
    evento_adverso: false,
    obito: false,
    motivo_cancelamento: '',
    observacao: '',
    criado_em: new Date().toISOString(),
  }))
}

/* --------------------------------------------------------- Equipe médica */

export function seedEquipe() {
  const rows = [
    { nome: 'Dr. Antônio Marques', registro: 'CRM-PI 4821', funcao: 'Cirurgião', especialidade: 'Cirurgia Geral', turno: 'Manhã', disponibilidade: 'em_procedimento' },
    { nome: 'Dra. Helena Cabral', registro: 'CRM-PI 5514', funcao: 'Anestesista', especialidade: 'Anestesiologia', turno: 'Manhã', disponibilidade: 'em_procedimento' },
    { nome: 'Dr. Paulo Ribeiro', registro: 'CRM-PI 6109', funcao: 'Cirurgião', especialidade: 'Ortopedia', turno: 'Tarde', disponibilidade: 'disponivel' },
    { nome: 'Dra. Mariana Teles', registro: 'CRM-PI 7002', funcao: 'Cirurgião', especialidade: 'Obstetrícia', turno: 'Plantão 12h', disponibilidade: 'em_procedimento' },
    { nome: 'Enf. Cláudia Nunes', registro: 'COREN-PI 118220', funcao: 'Enfermeiro', especialidade: 'Centro Cirúrgico', turno: 'Manhã', disponibilidade: 'disponivel' },
    { nome: 'Enf. Rodrigo Alves', registro: 'COREN-PI 129045', funcao: 'Circulante', especialidade: 'Centro Cirúrgico', turno: 'Tarde', disponibilidade: 'disponivel' },
    { nome: 'Téc. Sandra Lopes', registro: 'COREN-PI 301882', funcao: 'Instrumentador', especialidade: 'Instrumentação', turno: 'Manhã', disponibilidade: 'em_procedimento' },
    { nome: 'Téc. Jonas Ferreira', registro: 'COREN-PI 318904', funcao: 'Técnico de Enfermagem', especialidade: 'RPA', turno: 'Noite', disponibilidade: 'folga' },
  ]
  return rows.map((row) => ({
    id: uid(),
    ...row,
    telefone_ramal: '',
    observacao: '',
    criado_em: new Date().toISOString(),
  }))
}

/* ------------------------------------------------------- Equipamentos */

export function seedEquipamentos() {
  const rows = [
    { nome: 'Aparelho de anestesia Fabius', codigo: 'EQ-0001', tipo: 'Anestesia', sala: 'Sala 01', status: 'operacional', ultima_manutencao: '2026-06-10', proxima_manutencao: '2026-12-10' },
    { nome: 'Monitor multiparâmetro', codigo: 'EQ-0002', tipo: 'Monitorização', sala: 'Sala 01', status: 'operacional', ultima_manutencao: '2026-07-02', proxima_manutencao: '2027-01-02' },
    { nome: 'Torre de videolaparoscopia', codigo: 'EQ-0003', tipo: 'Vídeo', sala: 'Sala 02', status: 'em_uso', ultima_manutencao: '2026-05-20', proxima_manutencao: '2026-11-20' },
    { nome: 'Bisturi eletrônico', codigo: 'EQ-0004', tipo: 'Eletrocirurgia', sala: 'Sala 03', status: 'manutencao', ultima_manutencao: '2026-01-15', proxima_manutencao: '2026-07-15' },
    { nome: 'Ventilador pulmonar', codigo: 'EQ-0005', tipo: 'Ventilação', sala: 'Sala 05', status: 'inativo', ultima_manutencao: '2025-12-01', proxima_manutencao: '2026-06-01' },
    { nome: 'Arco cirúrgico', codigo: 'EQ-0006', tipo: 'Imagem', sala: 'Sala 03', status: 'operacional', ultima_manutencao: '2026-08-11', proxima_manutencao: '2027-02-11' },
  ]
  return rows.map((row) => ({
    id: uid(),
    ...row,
    patrimonio: '',
    fornecedor: '',
    observacao: '',
    criado_em: new Date().toISOString(),
  }))
}

/* ---------------------------------------------------- Escala de plantão */

export function seedEscala() {
  const hoje = todayISO()
  const rows = [
    { profissional: 'Dr. Antônio Marques', funcao: 'Cirurgião', turno: 'Manhã', sala: 'Sala 01', status: 'confirmado' },
    { profissional: 'Dra. Helena Cabral', funcao: 'Anestesista', turno: 'Manhã', sala: 'Sala 02', status: 'confirmado' },
    { profissional: 'Enf. Cláudia Nunes', funcao: 'Enfermeiro', turno: 'Tarde', sala: 'Centro Cirúrgico', status: 'previsto' },
    { profissional: 'Téc. Jonas Ferreira', funcao: 'Técnico de Enfermagem', turno: 'Noite', sala: 'RPA', status: 'substituido', substituto: 'Téc. Sandra Lopes' },
  ]
  return rows.map((row) => ({
    id: uid(),
    data: hoje,
    substituto: '',
    observacao: '',
    ...row,
    criado_em: new Date().toISOString(),
  }))
}

/* ------------------------------------------------------------- RPA */

export function seedRpa() {
  return Array.from({ length: RPA_BED_COUNT }, (_, index) => ({
    id: uid(),
    nome: `RPA-${pad(index + 1)}`,
    status: index === 0 ? 'ocupado' : 'disponivel',
    prontuario: index === 0 ? '176520' : '',
    procedimento: index === 0 ? 'Colpoperineoplastia' : '',
    entrada: index === 0 ? new Date(Date.now() - 45 * 60000).toISOString() : '',
    saida: '',
    aldrete: index === 0 ? 8 : null,
    observacao: '',
    criado_em: new Date().toISOString(),
  }))
}

/* ----------------------------------------------------------- Leitos */

export function seedLeitos() {
  const leitos = []
  BED_SECTORS.forEach(({ setor, prefixo, total }) => {
    for (let index = 1; index <= total; index += 1) {
      leitos.push({
        id: uid(),
        nome: `${prefixo}-${pad(index)}`,
        setor,
        prefixo,
        numero: index,
        status: 'disponivel',
        prontuario: '',
        ocupado_em: '',
        previsao_alta: '',
        observacao: '',
        criado_em: new Date().toISOString(),
      })
    }
  })
  return leitos
}

/* -------------------------------------------------- Pronto Socorro */

export function seedPsLeitos() {
  return Array.from({ length: PS_BED_COUNT }, (_, index) => ({
    id: uid(),
    nome: `${PS_PREFIX}-${pad(index + 1)}`,
    status: 'disponivel',
    prontuario: '',
    classificacao: '',
    queixa: '',
    admitido_em: '',
    admitido_por: '',
    evolucoes: [],
    criado_em: new Date().toISOString(),
  }))
}

export function seedPsAltas() {
  return []
}

/* -------------------------------------------------------- Visitantes */

export function seedVisitantes() {
  return []
}

/* --------------------------------------------------------- Auditoria */

export function seedAuditoria() {
  return []
}

/* ---------------------------------------------------------- Usuários */

export function seedUsuarios() {
  return [
    {
      id: uid(),
      nome: 'Administrador Master',
      usuario: 'admin',
      senha: '1123',
      funcao: 'Administrador',
      master: true,
      ativo: true,
      setores: ['Centro Cirúrgico'],
      modulos: 'all',
      criado_em: new Date().toISOString(),
    },
  ]
}

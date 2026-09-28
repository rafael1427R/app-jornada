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

/* ---------------------------------------------------------- Nutrição */

/**
 * Prescrições fictícias para conferência das telas. Cobrem de propósito
 * todas as vias (inclusive JTT), os tipos de cardápio, nome social e o
 * sexo "Outros", para que os indicadores não apareçam zerados.
 */
export function seedDietas() {
  const hoje = todayISO()
  const rows = [
    { prontuario: '204871', leito: 'CM-03', setor: 'Clínica Médica', consistencia: 'Branda', modificacao: 'Hipossódica', tipo_cardapio: 'Branda hipossódica', via_enteral: 'VO', nome_paciente: 'Maria Aparecida Souza', nome_social: '', sexo: 'F', nome_mae: 'Terezinha Souza', data_nascimento: '1958-04-12', acompanhante_refeicao: true },
    { prontuario: '198340', leito: 'CM-07', setor: 'Clínica Médica', consistencia: 'Branda', modificacao: 'Para diabetes', tipo_cardapio: 'Branda para diabetes', via_enteral: 'VO', nome_paciente: 'João Batista Ferreira', sexo: 'M', nome_mae: 'Rosa Ferreira', data_nascimento: '1946-11-30' },
    { prontuario: '221095', leito: 'CC-04', setor: 'Clínica Cirúrgica', consistencia: 'Líquida', modificacao: 'Sem modificação', via_enteral: 'VO', nome_paciente: 'Antônio Carlos Lima', sexo: 'M', nome_mae: 'Judite Lima', data_nascimento: '1972-02-08' },
    { prontuario: '187654', leito: 'CC-11', setor: 'Clínica Cirúrgica', consistencia: 'Zero', modificacao: 'Sem modificação', via_enteral: 'Zero', nome_paciente: 'Sebastiana Rocha', sexo: 'F', nome_mae: 'Maria Rocha', data_nascimento: '1965-07-19' },
    { prontuario: '210338', leito: 'UTIA-02', setor: 'UTI Adulto', consistencia: 'Zero', modificacao: 'Sem modificação', via_enteral: 'SNE', enteral_tipo: 'Industrializada', enteral_formula: 'Padrão 1.0 kcal/mL', enteral_volume: '6 x 200 mL', nome_paciente: 'Raimundo Nonato Silva', sexo: 'M', nome_mae: 'Francisca Silva', data_nascimento: '1951-09-03' },
    { prontuario: '176520', leito: 'UTIA-05', setor: 'UTI Adulto', consistencia: 'Zero', modificacao: 'Sem modificação', via_enteral: 'GTT', enteral_tipo: 'Industrializada', enteral_formula: 'Hipercalórica 1.5 kcal/mL', enteral_volume: '5 x 250 mL', nome_paciente: 'Alex Pereira Martins', nome_social: 'Alexia Martins', sexo: 'O', nome_mae: 'Cleide Martins', data_nascimento: '1989-12-27' },
    { prontuario: '233104', leito: 'UTI2-03', setor: 'UTI2', consistencia: 'Zero', modificacao: 'Para renal', via_enteral: 'JTT', enteral_tipo: 'Industrializada', enteral_formula: 'Específica para nefropatia', enteral_volume: '6 x 180 mL', nome_paciente: 'Francisco das Chagas Alves', sexo: 'M', nome_mae: 'Antônia Alves', data_nascimento: '1960-05-14' },
    { prontuario: '241876', leito: 'UCI-02', setor: 'UCInco', consistencia: 'Zero', modificacao: 'Sem modificação', via_enteral: 'NPT', nome_paciente: 'Luzia Barbosa Neves', sexo: 'F', nome_mae: 'Ana Neves', data_nascimento: '1977-01-22' },
    { prontuario: '229487', leito: 'CM-15', setor: 'Clínica Médica', consistencia: 'Branda', modificacao: 'Para renal', tipo_cardapio: 'Branda hipossódica para renal', via_enteral: 'Mista', enteral_tipo: 'Industrializada', enteral_formula: 'Complemento 1.5 kcal/mL', enteral_volume: '2 x 200 mL', nome_paciente: 'Benedito Oliveira Costa', sexo: 'M', nome_mae: 'Maria Costa', data_nascimento: '1954-08-09' },
    { prontuario: '215663', leito: 'PED-04', setor: 'Pediatria', consistencia: 'Pastosa', modificacao: 'Sem modificação', via_enteral: 'VO', nome_paciente: 'Miguel Santos Araújo', sexo: 'M', nome_mae: 'Jéssica Araújo', data_nascimento: '2019-03-05', acompanhante_refeicao: true },
    { prontuario: '238190', leito: 'OBS-06', setor: 'Obstetrícia', consistencia: 'Livre', modificacao: 'Sem modificação', tipo_cardapio: 'Livre', via_enteral: 'VO', nome_paciente: 'Camila Rodrigues Pinto', sexo: 'F', nome_mae: 'Sônia Pinto', data_nascimento: '1998-06-17', acompanhante_refeicao: true },
    { prontuario: '244012', leito: 'CM-22', setor: 'Clínica Médica', consistencia: 'Branda', modificacao: 'Hipossódica', tipo_cardapio: 'Branda hipossódica para diabetes e renal', via_enteral: 'VO', adequacoes: ['Zero lactose'], nome_paciente: 'Terezinha de Jesus Moura', sexo: 'F', nome_mae: 'Alzira Moura', data_nascimento: '1943-10-02' },
    { prontuario: '246558', leito: 'ISO-03', setor: 'Isolamento', consistencia: 'Líquida pastosa', modificacao: 'Sem modificação', via_enteral: 'SNG', enteral_tipo: 'Artesanal', enteral_formula: 'Liquidificada padrão', enteral_volume: '6 x 200 mL', nome_paciente: 'Geraldo Vieira Nunes', sexo: 'M', nome_mae: 'Lourdes Nunes', data_nascimento: '1968-12-11' },
  ]

  return rows.map((row) => ({
    id: uid(),
    regime: 'internacao',
    consistencia: 'Livre',
    modificacao: 'Sem modificação',
    tipo_cardapio: '',
    adequacoes: [],
    via_enteral: 'VO',
    enteral_tipo: '',
    enteral_formula: '',
    enteral_volume: '',
    dieta_prescrita: '',
    preparacao_diferenciada: '',
    acompanhante_refeicao: false,
    observacoes: '',
    status: 'ativa',
    data_prescricao: hoje,
    inicio_em: '',
    nome_paciente: '',
    nome_social: '',
    sexo: '',
    nome_mae: '',
    data_nascimento: '',
    ...row,
    criado_em: new Date().toISOString(),
  }))
}

/**
 * Indicadores mensais da UAN. Valores fictícios, coerentes entre si, só
 * para a conferência visual da aba de indicadores.
 */
export function seedUanIndicadores() {
  const agora = new Date()
  const rows = [
    { temperatura_aferidas: 120, temperatura_conformes: 112, custo_refeicao: 8.74, resto_ingestao: 11.2, indice_desperdicio: 13.5, sobras_limpas: 31.4, satisfacao_pacientes: 78, satisfacao_acompanhantes: 74, satisfacao_funcionarios: 81, refeicoes_distribuidas: 9120 },
    { temperatura_aferidas: 124, temperatura_conformes: 116, custo_refeicao: 9.12, resto_ingestao: 10.4, indice_desperdicio: 12.8, sobras_limpas: 28.9, satisfacao_pacientes: 81, satisfacao_acompanhantes: 77, satisfacao_funcionarios: 83, refeicoes_distribuidas: 9480 },
    { temperatura_aferidas: 128, temperatura_conformes: 121, custo_refeicao: 9.38, resto_ingestao: 9.6, indice_desperdicio: 11.9, sobras_limpas: 24.7, satisfacao_pacientes: 84, satisfacao_acompanhantes: 80, satisfacao_funcionarios: 85, refeicoes_distribuidas: 9735 },
  ]

  return rows.map((row, indice) => {
    const data = new Date(agora.getFullYear(), agora.getMonth() - (rows.length - 1 - indice), 1)
    return {
      id: uid(),
      competencia: `${data.getFullYear()}-${pad(data.getMonth() + 1)}`,
      ...row,
      observacao: '',
      criado_em: new Date().toISOString(),
    }
  })
}

export function seedProdutos() {
  const rows = [
    { nome: 'Arroz tipo 1', categoria: 'Secos', unidade: 'kg', estoque_atual: 120, estoque_minimo: 40, custo_unitario: 5.4, fornecedor: 'Distribuidora Central' },
    { nome: 'Feijão carioca', categoria: 'Secos', unidade: 'kg', estoque_atual: 60, estoque_minimo: 30, custo_unitario: 7.9, fornecedor: 'Distribuidora Central' },
    { nome: 'Peito de frango congelado', categoria: 'Carnes e frios', unidade: 'kg', estoque_atual: 45, estoque_minimo: 50, custo_unitario: 18.5, fornecedor: 'Frigorífico Piauí' },
    { nome: 'Dieta enteral padrão 1.0', categoria: 'Dietas e enteral', unidade: 'fr', estoque_atual: 28, estoque_minimo: 20, custo_unitario: 32.0, fornecedor: 'Nutrimed' },
    { nome: 'Espessante alimentar', categoria: 'Dietas e enteral', unidade: 'un', estoque_atual: 8, estoque_minimo: 12, custo_unitario: 46.9, fornecedor: 'Nutrimed' },
    { nome: 'Marmitex descartável', categoria: 'Descartáveis', unidade: 'un', estoque_atual: 900, estoque_minimo: 300, custo_unitario: 1.2, fornecedor: 'EmbalaMais' },
    { nome: 'Detergente neutro 5L', categoria: 'Limpeza', unidade: 'un', estoque_atual: 14, estoque_minimo: 6, custo_unitario: 21.0, fornecedor: 'CleanPro' },
  ]
  return rows.map((row) => ({
    id: uid(),
    ...row,
    validade: '',
    observacao: '',
    criado_em: new Date().toISOString(),
  }))
}

export function seedMovimentacoes() {
  return []
}

export function seedAvaliacoes() {
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

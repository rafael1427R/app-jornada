/* -------------------------------------------------------------- Módulos */

export const MODULES = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
  { id: 'mapa', label: 'Mapa Cirúrgico', path: '/mapa', icon: 'LayoutGrid' },
  { id: 'agendamento', label: 'Agendamento', path: '/agendamento', icon: 'CalendarDays' },
  { id: 'equipe', label: 'Equipe Médica', path: '/equipe', icon: 'Stethoscope' },
  { id: 'prontuarios', label: 'Prontuários', path: '/prontuarios', icon: 'FileText' },
  { id: 'equipamentos', label: 'Equipamentos', path: '/equipamentos', icon: 'Wrench' },
  { id: 'indicadores', label: 'Indicadores', path: '/indicadores', icon: 'BarChart3' },
  { id: 'rpa', label: 'RPA', path: '/rpa', icon: 'HeartPulse' },
  { id: 'escala', label: 'Escala de Plantão', path: '/escala', icon: 'CalendarClock' },
  { id: 'visitantes', label: 'Visitantes / Acompanhantes', path: '/visitantes', icon: 'IdCard' },
  { id: 'leitos', label: 'Leitos', path: '/leitos', icon: 'BedDouble' },
  { id: 'pronto-socorro', label: 'Pronto Socorro Digital', path: '/pronto-socorro', icon: 'Ambulance' },
  { id: 'auditoria', label: 'Log de Auditoria', path: '/auditoria', icon: 'ScrollText' },
  { id: 'usuarios', label: 'Usuários e Acessos', path: '/usuarios', icon: 'ShieldCheck' },
]

export const MODULE_IDS = MODULES.map((module) => module.id)

/* ---------------------------------------------------------- Perfis/Setores */

export const ROLES = ['Administrador', 'Médico', 'Enfermeiro', 'Técnico de Enfermagem']

export const SECTORS = [
  'Centro Cirúrgico',
  'Clínica Médica',
  'Clínica Cirúrgica',
  'Pediatria',
  'UTI Adulto',
  'UCInco',
  'UTI2',
  'Obstetrícia',
  'Emergência',
  'Isolamento',
  'Pronto Socorro',
  'RPA',
]

export const SHIFTS = ['Manhã', 'Tarde', 'Noite', 'Plantão 12h', 'Plantão 24h']

/* ------------------------------------------------------------- Salas */

export const ROOM_STATUS = {
  disponivel: { label: 'Disponível', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', card: 'border-emerald-200 bg-emerald-50' },
  em_uso: { label: 'Em uso', badge: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500', card: 'border-red-200 bg-red-50' },
  limpeza: { label: 'Limpeza', badge: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500', card: 'border-blue-200 bg-blue-50' },
  manutencao: { label: 'Manutenção', badge: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500', card: 'border-amber-200 bg-amber-50' },
  reservada: { label: 'Reservada', badge: 'bg-violet-100 text-violet-700 border-violet-200', dot: 'bg-violet-500', card: 'border-violet-200 bg-violet-50' },
}

export const ROOM_STATUS_KEYS = Object.keys(ROOM_STATUS)

/* ---------------------------------------------------------- Cirurgias */

export const SURGERY_STATUS = {
  agendada: { label: 'Agendada', badge: 'bg-slate-100 text-slate-700 border-slate-200', public: 'Agendada' },
  em_preparo: { label: 'Em preparo', badge: 'bg-amber-100 text-amber-700 border-amber-200', public: 'Em preparo' },
  em_andamento: { label: 'Em andamento', badge: 'bg-blue-100 text-blue-700 border-blue-200', public: 'Em cirurgia' },
  em_rpa: { label: 'Em RPA', badge: 'bg-violet-100 text-violet-700 border-violet-200', public: 'Em recuperação' },
  finalizada: { label: 'Finalizada', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', public: 'Procedimento concluído' },
  cancelada: { label: 'Cancelada', badge: 'bg-red-100 text-red-700 border-red-200', public: 'Cancelada' },
  suspensa: { label: 'Suspensa', badge: 'bg-orange-100 text-orange-700 border-orange-200', public: 'Suspensa' },
}

export const SURGERY_STATUS_KEYS = Object.keys(SURGERY_STATUS)

export const SURGERY_TYPES = {
  eletiva: { label: 'Eletiva', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  urgencia: { label: 'Urgência', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  emergencia: { label: 'Emergência', badge: 'bg-red-100 text-red-700 border-red-200' },
}

export const SURGERY_TECHNIQUES = ['Convencional', 'Videolaparoscópica', 'Robótica', 'Endoscópica', 'Microcirurgia', 'Artroscópica']

export const ANESTHESIA_TYPES = ['Geral', 'Raquianestesia', 'Peridural', 'Bloqueio regional', 'Local', 'Sedação']

export const LATERALITY = ['Não se aplica', 'Direita', 'Esquerda', 'Bilateral']

export const OMS_CHECKLIST = [
  { id: 'identificacao', label: 'Identificação do prontuário conferida' },
  { id: 'sitio', label: 'Sítio cirúrgico demarcado' },
  { id: 'consentimento', label: 'Termo de consentimento assinado' },
  { id: 'alergias', label: 'Alergias verificadas' },
  { id: 'via_aerea', label: 'Via aérea avaliada' },
  { id: 'antibiotico', label: 'Antibiótico profilático administrado' },
  { id: 'materiais', label: 'Materiais e instrumentais conferidos' },
  { id: 'contagem', label: 'Contagem de compressas e instrumentais' },
  { id: 'amostras', label: 'Amostras identificadas por prontuário' },
  { id: 'saida', label: 'Registro de saída da sala concluído' },
]

/* ------------------------------------------------------- Equipe / Escala */

export const TEAM_ROLES = ['Cirurgião', 'Anestesista', 'Instrumentador', 'Enfermeiro', 'Técnico de Enfermagem', 'Circulante', 'Residente']

export const TEAM_AVAILABILITY = {
  disponivel: { label: 'Disponível', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  em_procedimento: { label: 'Em procedimento', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  folga: { label: 'Folga', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  ferias: { label: 'Férias', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
}

export const SCHEDULE_STATUS = {
  confirmado: { label: 'Confirmado', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  previsto: { label: 'Previsto', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  substituido: { label: 'Substituído', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  ausente: { label: 'Ausente', badge: 'bg-red-100 text-red-700 border-red-200' },
}

/* ------------------------------------------------------- Equipamentos */

export const EQUIPMENT_STATUS = {
  operacional: { label: 'Operacional', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  em_uso: { label: 'Em uso', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  manutencao: { label: 'Em manutenção', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  inativo: { label: 'Inativo', badge: 'bg-red-100 text-red-700 border-red-200' },
}

export const EQUIPMENT_TYPES = ['Anestesia', 'Monitorização', 'Vídeo', 'Eletrocirurgia', 'Ventilação', 'Imagem', 'Mobiliário', 'Outros']

/* ------------------------------------------------------------- Leitos */

export const BED_STATUS = {
  disponivel: { label: 'Disponível', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', card: 'border-emerald-200 bg-emerald-50', dot: 'bg-emerald-500' },
  ocupado: { label: 'Ocupado', badge: 'bg-red-100 text-red-700 border-red-200', card: 'border-red-200 bg-red-50', dot: 'bg-red-500' },
  manutencao: { label: 'Manutenção', badge: 'bg-amber-100 text-amber-700 border-amber-200', card: 'border-amber-200 bg-amber-50', dot: 'bg-amber-500' },
  limpeza: { label: 'Limpeza', badge: 'bg-blue-100 text-blue-700 border-blue-200', card: 'border-blue-200 bg-blue-50', dot: 'bg-blue-500' },
}

/** 150 leitos distribuídos em 9 setores. */
export const BED_SECTORS = [
  { setor: 'Clínica Médica', prefixo: 'CM', total: 30 },
  { setor: 'Clínica Cirúrgica', prefixo: 'CC', total: 25 },
  { setor: 'Pediatria', prefixo: 'PED', total: 20 },
  { setor: 'UTI Adulto', prefixo: 'UTIA', total: 15 },
  { setor: 'UCInco', prefixo: 'UCI', total: 10 },
  { setor: 'UTI2', prefixo: 'UTI2', total: 10 },
  { setor: 'Obstetrícia', prefixo: 'OBS', total: 15 },
  { setor: 'Emergência', prefixo: 'EMG', total: 15 },
  { setor: 'Isolamento', prefixo: 'ISO', total: 10 },
]

/* -------------------------------------------------------- Auditoria */

/** Funções autorizadas a alterar leitos (as demais têm acesso somente leitura). */
export const BED_WRITE_ROLES = ['Administrador', 'Enfermeiro', 'Técnico de Enfermagem']

export const AUDIT_ACTIONS = {
  criar: { label: 'Criação', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  editar: { label: 'Edição', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  excluir: { label: 'Exclusão', badge: 'bg-red-100 text-red-700 border-red-200' },
  ocupar: { label: 'Ocupação', badge: 'bg-violet-100 text-violet-700 border-violet-200' },
  alta: { label: 'Alta', badge: 'bg-accent-light text-accent-dark border-accent/30' },
  status: { label: 'Mudança de status', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
}

/** Motivos de saída do leito. */
export const DISCHARGE_REASONS = {
  alta: { label: 'Alta hospitalar', icon: '🏠', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  transferido: { label: 'Transferência', icon: '🚑', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  obito: { label: 'Óbito', icon: '⚫', badge: 'bg-slate-200 text-slate-700 border-slate-300' },
}

/* --------------------------------------------------- Pronto Socorro */

export const PS_BED_COUNT = 30
export const PS_PREFIX = 'PS'

export const PS_STATUS = {
  disponivel: { label: 'Disponível', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', card: 'border-emerald-200 bg-emerald-50' },
  em_atendimento: { label: 'Em atendimento', badge: 'bg-blue-100 text-blue-700 border-blue-200', card: 'border-blue-200 bg-blue-50' },
  higienizacao: { label: 'Higienização', badge: 'bg-amber-100 text-amber-700 border-amber-200', card: 'border-amber-200 bg-amber-50' },
}

export const PS_CLASSIFICATION = {
  vermelho: { label: 'Vermelho — Emergência', badge: 'bg-red-100 text-red-700 border-red-200' },
  laranja: { label: 'Laranja — Muito urgente', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
  amarelo: { label: 'Amarelo — Urgente', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  verde: { label: 'Verde — Pouco urgente', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  azul: { label: 'Azul — Não urgente', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
}

/* ---------------------------------------------------------- Visitantes */

export const VISIT_LIMIT_MINUTES = 60

export const VISIT_KINSHIP = ['Mãe', 'Pai', 'Filho(a)', 'Cônjuge', 'Irmão(ã)', 'Avô/Avó', 'Responsável legal', 'Outro']

/* ----------------------------------------------------------------- RPA */

export const RPA_BED_COUNT = 8
export const RPA_ALERT_MINUTES = 120

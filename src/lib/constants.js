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
  { id: 'nutricao', label: 'Nutrição / Dietas', path: '/nutricao', icon: 'Salad' },
  { id: 'avaliacao-nutricional', label: 'Avaliação Nutricional', path: '/avaliacao-nutricional', icon: 'ClipboardCheck' },
  { id: 'etiquetas', label: 'Etiquetas de Dieta', path: '/etiquetas', icon: 'Tags' },
  { id: 'almoxarifado', label: 'Almoxarifado', path: '/almoxarifado', icon: 'Package' },
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

/* --------------------------------------------------------- Nutrição */

/** Consistências conforme a rotina do setor. */
export const DIET_CONSISTENCY = ['Livre', 'Branda', 'Pastosa', 'Líquida pastosa', 'Líquida', 'Líquida de prova', 'Zero']

/** Modificações terapêuticas. */
export const DIET_MODIFICATIONS = ['Sem modificação', 'Hipossódica', 'Para diabetes', 'Para renal', 'Hipolipídica']

/** Adequações complementares (podem ocorrer várias ao mesmo tempo). */
export const DIET_ADEQUACOES = [
  'Zero lactose',
  'Sem irritantes gástricos',
  'Laxante',
  'Constipante',
  'Exclusão de alimentos específicos',
  'Preferências individualizadas',
]

/** Cores das etiquetas por consistência (impressão colorida). */
export const DIET_COLORS = {
  Livre: '#10b981',
  Branda: '#0ea5e9',
  Pastosa: '#8b5cf6',
  'Líquida pastosa': '#6366f1',
  Líquida: '#06b6d4',
  'Líquida de prova': '#0891b2',
  Zero: '#ef4444',
}

/** Vias de alimentação da ficha de avaliação. */
export const FEEDING_ROUTES = ['VO', 'SNG', 'SOG', 'SNE', 'GTT', 'NPT', 'Mista', 'Zero']

/** Vias que caracterizam terapia nutricional enteral. */
export const ENTERAL_ROUTES = ['SNG', 'SOG', 'SNE', 'GTT']

export const ENTERAL_TYPES = ['Industrializada', 'Artesanal']

/**
 * Horários das refeições. Pacientes do fluxo geral recebem seis refeições;
 * UTI e pacientes em uso de sonda seguem horários próprios; acompanhantes
 * recebem quatro refeições e cardápio padrão, sem dieta terapêutica.
 */
export const MEALS = [
  { id: 'desjejum', label: 'Desjejum', hora: '05:45', horaUti: '06:45', acompanhante: true },
  { id: 'lanche_manha', label: 'Lanche da manhã', hora: '09:00', horaUti: '10:00', acompanhante: false },
  { id: 'almoco', label: 'Almoço', hora: '12:00', horaUti: '13:00', acompanhante: true },
  { id: 'lanche_tarde', label: 'Lanche da tarde', hora: '15:00', horaUti: '16:00', acompanhante: true },
  { id: 'jantar', label: 'Jantar', hora: '18:00', horaUti: '19:00', acompanhante: true },
  { id: 'ceia', label: 'Ceia', hora: '21:30', horaUti: '22:00', acompanhante: false },
]

export const COMPANION_MEALS = MEALS.filter((refeicao) => refeicao.acompanhante).map((refeicao) => refeicao.id)

/**
 * Listagens de organização das etiquetas entregues à UAN.
 * `sonda: true` capta pacientes em uso de sonda de qualquer setor.
 */
export const DIET_GROUPS = [
  { id: 'uti_sonda', label: 'UTI 1 + UTI 2 + sondas', curto: 'UTI / SONDA', setores: ['UTI Adulto', 'UTI2', 'UCInco'], sonda: true, horarioUti: true },
  { id: 'clinica_medica', label: 'Clínica Médica', curto: 'CL. MÉDICA', setores: ['Clínica Médica'], sonda: false, horarioUti: false },
  { id: 'clinica_cirurgica', label: 'Clínica Ortopédica / Cirúrgica', curto: 'CL. CIRÚRGICA', setores: ['Clínica Cirúrgica'], sonda: false, horarioUti: false },
  { id: 'pediatria', label: 'Pediatria + UCINCo', curto: 'PEDIATRIA', setores: ['Pediatria'], sonda: false, horarioUti: false },
  { id: 'pronto_socorro', label: 'Pronto-Socorro', curto: 'PS', setores: ['Emergência', 'Pronto Socorro'], sonda: false, horarioUti: false },
  { id: 'maternidade', label: 'Maternidade', curto: 'MATERNIDADE', setores: ['Obstetrícia'], sonda: false, horarioUti: false },
  { id: 'outros', label: 'Demais setores', curto: 'OUTROS', setores: [], sonda: false, horarioUti: false },
]

/** Descobre a listagem de uma dieta pelo setor e pela via de alimentação. */
export function grupoDaDieta(dieta) {
  const usaSonda = ENTERAL_ROUTES.includes(dieta?.via_enteral)
  if (usaSonda) return DIET_GROUPS[0]
  const porSetor = DIET_GROUPS.find((grupo) => grupo.setores.includes(dieta?.setor))
  return porSetor || DIET_GROUPS[DIET_GROUPS.length - 1]
}

/** Regime de permanência do paciente que recebe a dieta. */
export const DIET_REGIMES = {
  internacao: { label: 'Internação', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  observacao: { label: 'Em observação', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
}

/** Faixas de alerta do tempo de permanência, em horas. */
export const OBSERVATION_HOURS = { atencao: 6, critico: 12, limite: 24 }

export const DIET_STATUS = {
  ativa: { label: 'Ativa', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  suspensa: { label: 'Suspensa', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  encerrada: { label: 'Encerrada', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
}

/** Etapas do atendimento nutricional, da prescrição médica à entrega à UAN. */
export const NUTRITION_STAGES = [
  { id: 1, titulo: 'Prescrição médica', detalhe: 'Toda dieta parte de prescrição médica, por via oral ou por sonda', icone: 'FileText' },
  { id: 2, titulo: 'Avaliação nutricional', detalhe: 'Triagem, antropometria, estado nutricional, aceitação e alergias', icone: 'ClipboardCheck' },
  { id: 3, titulo: 'Conduta nutricional', detalhe: 'Consistência, modificação terapêutica, adequações, fórmula e volume', icone: 'Salad' },
  { id: 4, titulo: 'Visita à beira-leito', detalhe: 'Confirmação de aceitação, diurese, evacuação e mudanças do quadro', icone: 'Stethoscope' },
  { id: 5, titulo: 'Atualização da etiqueta', detalhe: 'Geração com leito, setor, dieta e identificação definida pelo serviço', icone: 'Tags' },
  { id: 6, titulo: 'Entrega à UAN', detalhe: 'Envio dentro do horário para a produção e a distribuição', icone: 'Send' },
]

/** Limite de permanência em observação no Pronto-Socorro. */
export const PS_OBSERVATION_LIMIT_HOURS = 20

/** Cores validadas para os gráficos do painel (checagem de CVD e contraste). */
export const CHART_INK = { primaria: '#1a6bb5', secundaria: '#00a99d', grade: '#e2e8f0', texto: '#64748b' }

/** Prazos do plantão da nutrição (07h às 19h). */
export const NUTRITION_FLOW = [
  { hora: '07:00', titulo: 'Início do plantão', detalhe: 'Conferência de pacientes, prescrições, alterações e cardápio do dia' },
  { hora: '09:00', titulo: 'Etiquetas do lanche da manhã', detalhe: 'Atualizar e entregar à UAN', prazo: true },
  { hora: '10:00', titulo: 'Preparações diferenciadas do almoço', detalhe: 'Comunicar à UAN com antecedência para o preparo', prazo: true },
  { hora: '12:00', titulo: 'Etiquetas do almoço', detalhe: 'Entregar antes da distribuição', prazo: true },
  { hora: '15:00', titulo: 'Etiquetas do lanche da tarde', detalhe: 'Entregar antes da distribuição', prazo: true },
  { hora: '18:00', titulo: 'Etiquetas do jantar', detalhe: 'Com comunicação prévia das preparações diferenciadas', prazo: true },
  { hora: '19:00', titulo: 'Encerramento do plantão', detalhe: 'Organizar as etiquetas da ceia (21h30) e do desjejum do dia seguinte (05h45)', prazo: true },
]

/* ------------------------------------------- Avaliação nutricional */

/** Triagem NRS-2002 (pré-triagem). Qualquer "sim" indica risco nutricional. */
export const NRS_ITEMS = [
  { id: 'imc', label: 'IMC menor que 20,5' },
  { id: 'perda_peso', label: 'Perda de peso não intencional nos últimos 3 meses' },
  { id: 'ingestao', label: 'Redução da ingestão alimentar recente' },
  { id: 'doenca_grave', label: 'Doença grave, mau estado geral ou UTI' },
]

export const ASG_CLASSES = {
  A: { label: 'A — bem nutrido', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  B: { label: 'B — risco ou desnutrição moderada', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  C: { label: 'C — desnutrição grave', badge: 'bg-red-100 text-red-700 border-red-200' },
}

export const APPETITE = ['Preservado', 'Reduzido', 'Ausente', 'Sem informação']
export const ACCEPTANCE = ['Boa', 'Regular', 'Ruim', 'Sem informação']
export const MOBILITY = ['Deambula', 'Restrito ao leito', 'Cadeira']
export const DYSPHAGIA = ['Não', 'Líquidos', 'Sólidos', 'Ambos', 'Sem informação']

/** Exames com as faixas de referência da ficha do setor. */
export const LAB_TESTS = [
  { id: 'albumina', label: 'Albumina', referencia: '3,5 a 5,5 g/dL' },
  { id: 'hemoglobina', label: 'Hemoglobina', referencia: '13,5 a 17,5 g/dL' },
  { id: 'hematocrito', label: 'Hematócrito', referencia: '41 a 53%' },
  { id: 'glicemia', label: 'Glicemia', referencia: '—' },
  { id: 'ureia', label: 'Ureia', referencia: '15,0 a 45,0 mg/dL' },
  { id: 'creatinina', label: 'Creatinina', referencia: '0,4 a 1,4 mg/dL' },
  { id: 'sodio', label: 'Sódio', referencia: '135 a 145 mEq/L' },
  { id: 'potassio', label: 'Potássio', referencia: '3,6 a 5,1 mEq/L' },
  { id: 'calcio', label: 'Cálcio iônico', referencia: '1,11 a 1,40 mmol/L' },
]

/* ----------------------------------------------------- Almoxarifado */

export const STOCK_CATEGORIES = ['Secos', 'Hortifrúti', 'Carnes e frios', 'Descartáveis', 'Limpeza', 'Dietas e enteral']

export const STOCK_UNITS = ['kg', 'g', 'L', 'mL', 'un', 'cx', 'pct', 'fr']

export const STOCK_MOVES = {
  entrada: { label: 'Entrada', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  saida: { label: 'Saída', badge: 'bg-red-100 text-red-700 border-red-200' },
}

/* -------------------------------------------------------- Auditoria */

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

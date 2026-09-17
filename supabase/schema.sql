-- =====================================================================
-- Vitalis — Sistema de Gestão Hospitalar
-- Hospital Regional Chagas Rodrigues · ISAC — Instituto de Saúde e Cidadania
--
-- Esquema do banco de dados (PostgreSQL / Supabase).
-- Execute este arquivo no SQL Editor do painel do Supabase.
--
-- CONFORMIDADE LGPD: nenhuma tabela armazena nome de paciente.
-- O paciente é identificado exclusivamente pelo número de prontuário.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Função utilitária: mantém `atualizado_em` sincronizado
-- ---------------------------------------------------------------------
create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. Usuários e acessos
-- ---------------------------------------------------------------------
create table if not exists public.usuarios (
  id            uuid primary key default gen_random_uuid(),
  nome          text        not null,
  usuario       text        not null unique,
  senha         text        not null,
  funcao        text        not null default 'Enfermeiro'
                check (funcao in ('Administrador', 'Médico', 'Enfermeiro', 'Técnico de Enfermagem')),
  master        boolean     not null default false,
  ativo         boolean     not null default true,
  setores       text[]      not null default '{}',
  modulos       jsonb       not null default '[]'::jsonb, -- legado: lista de ids ou a string "all"
  permissoes    jsonb       not null default '{}'::jsonb, -- { moduloId: ["ver","criar","editar","excluir"] } ou "all"
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Instalações anteriores ganham a coluna de permissões sem perder dados:
alter table public.usuarios add column if not exists permissoes jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------
-- 2. Salas cirúrgicas
-- ---------------------------------------------------------------------
create table if not exists public.salas_cirurgicas (
  id               uuid primary key default gen_random_uuid(),
  nome             text        not null,
  tipo             text        default '',
  setor            text        not null default 'Centro Cirúrgico',
  andar            text        default '',
  status           text        not null default 'disponivel'
                   check (status in ('disponivel', 'em_uso', 'limpeza', 'manutencao', 'reservada')),
  equipamentos     text[]      not null default '{}',
  prontuario_atual text        default '',
  chamado_em       timestamptz,
  observacao       text        default '',
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

create index if not exists salas_cirurgicas_setor_idx on public.salas_cirurgicas (setor);
create index if not exists salas_cirurgicas_status_idx on public.salas_cirurgicas (status);

-- ---------------------------------------------------------------------
-- 3. Equipe médica e assistencial
-- ---------------------------------------------------------------------
create table if not exists public.equipe_medica (
  id              uuid primary key default gen_random_uuid(),
  nome            text        not null,
  registro        text        not null,             -- CRM ou COREN
  funcao          text        not null default 'Cirurgião',
  especialidade   text        default '',
  turno           text        not null default 'Manhã',
  disponibilidade text        not null default 'disponivel'
                  check (disponibilidade in ('disponivel', 'em_procedimento', 'folga', 'ferias')),
  telefone_ramal  text        default '',
  observacao      text        default '',
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

create index if not exists equipe_medica_funcao_idx on public.equipe_medica (funcao);

-- ---------------------------------------------------------------------
-- 4. Cirurgias
-- ---------------------------------------------------------------------
create table if not exists public.cirurgias (
  id                  uuid primary key default gen_random_uuid(),
  prontuario          text        not null,
  procedimento        text        not null,
  especialidade       text        default '',
  tipo                text        not null default 'eletiva'
                      check (tipo in ('eletiva', 'urgencia', 'emergencia')),
  tecnica             text        default 'Convencional',
  lateralidade        text        default 'Não se aplica',
  sala                text        default '',
  data_prevista       date        not null default current_date,
  hora_prevista       text        default '',
  inicio_real         timestamptz,
  fim_real            timestamptz,
  status              text        not null default 'agendada'
                      check (status in ('agendada', 'em_preparo', 'em_andamento', 'em_rpa', 'finalizada', 'cancelada', 'suspensa')),
  cirurgiao           text        default '',
  anestesista         text        default '',
  equipe              text[]      not null default '{}',
  anestesia           text        default 'Geral',
  checklist_oms       text[]      not null default '{}',
  leito_rpa           text        default '',
  convertida          boolean     not null default false,
  reoperacao          boolean     not null default false,
  infeccao            boolean     not null default false,
  evento_adverso      boolean     not null default false,
  obito               boolean     not null default false,
  motivo_cancelamento text        default '',
  observacao          text        default '',
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);

create index if not exists cirurgias_prontuario_idx on public.cirurgias (prontuario);
create index if not exists cirurgias_data_idx on public.cirurgias (data_prevista);
create index if not exists cirurgias_status_idx on public.cirurgias (status);

-- ---------------------------------------------------------------------
-- 5. Equipamentos
-- ---------------------------------------------------------------------
create table if not exists public.equipamentos (
  id                 uuid primary key default gen_random_uuid(),
  nome               text        not null,
  codigo             text        not null unique,
  tipo               text        default 'Outros',
  sala               text        default '',
  status             text        not null default 'operacional'
                     check (status in ('operacional', 'em_uso', 'manutencao', 'inativo')),
  patrimonio         text        default '',
  fornecedor         text        default '',
  ultima_manutencao  date,
  proxima_manutencao date,
  observacao         text        default '',
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now()
);

create index if not exists equipamentos_proxima_manutencao_idx on public.equipamentos (proxima_manutencao);

-- ---------------------------------------------------------------------
-- 6. Escala de plantão
-- ---------------------------------------------------------------------
create table if not exists public.escala_plantao (
  id            uuid primary key default gen_random_uuid(),
  data          date        not null default current_date,
  turno         text        not null default 'Manhã',
  profissional  text        not null,
  funcao        text        not null default 'Cirurgião',
  sala          text        default '',
  status        text        not null default 'previsto'
                check (status in ('confirmado', 'previsto', 'substituido', 'ausente')),
  substituto    text        default '',
  observacao    text        default '',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists escala_plantao_data_idx on public.escala_plantao (data);

-- ---------------------------------------------------------------------
-- 7. Leitos de RPA (recuperação pós-anestésica)
-- ---------------------------------------------------------------------
create table if not exists public.rpa_leitos (
  id            uuid primary key default gen_random_uuid(),
  nome          text        not null unique,
  status        text        not null default 'disponivel'
                check (status in ('disponivel', 'ocupado', 'limpeza')),
  prontuario    text        default '',
  procedimento  text        default '',
  entrada       timestamptz,
  saida         timestamptz,
  aldrete       integer     check (aldrete is null or (aldrete between 0 and 10)),
  observacao    text        default '',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 8. Leitos de internação (150 leitos / 9 setores)
-- ---------------------------------------------------------------------
create table if not exists public.leitos (
  id            uuid primary key default gen_random_uuid(),
  nome          text        not null unique,
  setor         text        not null,
  prefixo       text        not null,
  numero        integer     not null,
  status        text        not null default 'disponivel'
                check (status in ('disponivel', 'ocupado', 'manutencao', 'limpeza')),
  prontuario    text        default '',
  ocupado_em    timestamptz,
  previsao_alta date,
  observacao    text        default '',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists leitos_setor_idx on public.leitos (setor);
create index if not exists leitos_status_idx on public.leitos (status);

-- ---------------------------------------------------------------------
-- 9. Visitantes / acompanhantes (permanência de 1 hora)
-- ---------------------------------------------------------------------
create table if not exists public.visitantes (
  id            uuid primary key default gen_random_uuid(),
  nome          text        not null,      -- sempre em CAIXA ALTA
  documento     text        default '',
  prontuario    text        not null,      -- paciente visitado
  setor         text        not null,
  quarto_leito  text        not null,
  parentesco    text        default 'Outro',
  entrada       timestamptz not null default now(),
  saida         timestamptz,
  reentradas    integer     not null default 0,
  observacao    text        default '',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists visitantes_saida_idx on public.visitantes (saida);
create index if not exists visitantes_prontuario_idx on public.visitantes (prontuario);

-- ---------------------------------------------------------------------
-- 10. Pronto Socorro Digital — quartos digitais PS-01..PS-30
-- ---------------------------------------------------------------------
create table if not exists public.ps_leitos (
  id            uuid primary key default gen_random_uuid(),
  nome          text        not null unique,
  status        text        not null default 'disponivel'
                check (status in ('disponivel', 'em_atendimento', 'higienizacao')),
  prontuario    text        default '',
  classificacao text        default '',
  queixa        text        default '',
  admitido_em   timestamptz,
  admitido_por  text        default '',
  evolucoes     jsonb       not null default '[]'::jsonb,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists ps_leitos_status_idx on public.ps_leitos (status);

-- ---------------------------------------------------------------------
-- 11. Log de altas do Pronto Socorro
-- ---------------------------------------------------------------------
create table if not exists public.ps_altas (
  id                  uuid primary key default gen_random_uuid(),
  leito               text        not null,
  prontuario          text        not null,
  classificacao       text        default '',
  queixa              text        default '',
  motivo              text        not null default 'Alta médica',
  admitido_em         timestamptz,
  data                timestamptz not null default now(),
  responsavel         text        default '',
  funcao_responsavel  text        default '',
  evolucoes           jsonb       not null default '[]'::jsonb,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);

create index if not exists ps_altas_data_idx on public.ps_altas (data);
create index if not exists ps_altas_prontuario_idx on public.ps_altas (prontuario);

-- ---------------------------------------------------------------------
-- 12. Log de auditoria (rastreabilidade das ações)
-- ---------------------------------------------------------------------
create table if not exists public.log_auditoria (
  id            uuid primary key default gen_random_uuid(),
  data          timestamptz not null default now(),
  usuario       text        not null default 'Sistema',
  funcao        text        default '',
  acao          text        not null
                check (acao in ('criar', 'editar', 'excluir', 'ocupar', 'alta', 'status')),
  entidade      text        not null default 'leito',
  entidade_id   text        default '',
  referencia    text        default '',
  prontuario    text        default '',
  setor         text        default '',
  detalhe       text        default '',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists log_auditoria_data_idx on public.log_auditoria (data desc);
create index if not exists log_auditoria_acao_idx on public.log_auditoria (acao);
create index if not exists log_auditoria_usuario_idx on public.log_auditoria (usuario);

-- ---------------------------------------------------------------------
-- 13. Nutrição — prescrição de dietas
-- ---------------------------------------------------------------------
create table if not exists public.dietas (
  id                    uuid primary key default gen_random_uuid(),
  prontuario            text        not null,
  leito                 text        not null,
  setor                 text        default '',
  consistencia          text        not null default 'Geral',
  modificacao           text        default 'Sem modificação',
  via_enteral           text        default 'Não se aplica',
  regime                text        not null default 'internacao'
                        check (regime in ('internacao', 'observacao')),
  inicio_em             timestamptz default now(),
  dieta_prescrita       text        default '',
  acompanhante_refeicao boolean     not null default false,
  observacoes           text        default '',
  status                text        not null default 'ativa'
                        check (status in ('ativa', 'suspensa', 'encerrada')),
  prescrito_por         text        default '',
  data_prescricao       date        default current_date,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now()
);

-- Instalações anteriores ganham as colunas de regime sem perder dados:
alter table public.dietas add column if not exists regime text not null default 'internacao';
alter table public.dietas add column if not exists inicio_em timestamptz default now();

create index if not exists dietas_prontuario_idx on public.dietas (prontuario);
create index if not exists dietas_regime_idx on public.dietas (regime);
create index if not exists dietas_status_idx on public.dietas (status);
create index if not exists dietas_setor_idx on public.dietas (setor);

-- ---------------------------------------------------------------------
-- 14. Almoxarifado — produtos
-- ---------------------------------------------------------------------
create table if not exists public.produtos_estoque (
  id             uuid primary key default gen_random_uuid(),
  nome           text        not null,
  categoria      text        not null default 'Secos',
  unidade        text        not null default 'un',
  estoque_atual  numeric     not null default 0,
  estoque_minimo numeric     not null default 0,
  custo_unitario numeric     not null default 0,
  fornecedor     text        default '',
  validade       date,
  observacao     text        default '',
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

create index if not exists produtos_estoque_categoria_idx on public.produtos_estoque (categoria);

-- ---------------------------------------------------------------------
-- 15. Almoxarifado — movimentações de estoque
-- ---------------------------------------------------------------------
create table if not exists public.movimentacoes_estoque (
  id            uuid primary key default gen_random_uuid(),
  produto_id    uuid references public.produtos_estoque(id) on delete cascade,
  produto_nome  text        not null,
  unidade       text        default '',
  tipo          text        not null check (tipo in ('entrada', 'saida')),
  quantidade    numeric     not null check (quantidade > 0),
  saldo_apos    numeric     not null default 0,
  motivo        text        default '',
  usuario       text        default '',
  data          timestamptz not null default now(),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists movimentacoes_estoque_data_idx on public.movimentacoes_estoque (data desc);
create index if not exists movimentacoes_estoque_produto_idx on public.movimentacoes_estoque (produto_id);

-- ---------------------------------------------------------------------
-- Triggers de atualização
-- ---------------------------------------------------------------------
do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'usuarios', 'salas_cirurgicas', 'equipe_medica', 'cirurgias', 'equipamentos',
    'escala_plantao', 'rpa_leitos', 'leitos', 'visitantes', 'ps_leitos', 'ps_altas', 'log_auditoria',
    'dietas', 'produtos_estoque', 'movimentacoes_estoque'
  ] loop
    execute format('drop trigger if exists set_atualizado_em on public.%I', tabela);
    execute format(
      'create trigger set_atualizado_em before update on public.%I
       for each row execute function public.set_atualizado_em()', tabela);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
--
-- O sistema roda em rede interna e possui autenticação própria
-- (tabela `usuarios`), portanto as políticas abaixo liberam o acesso
-- para a chave anônima. Para exposição na internet, migre para o
-- Supabase Auth e troque `anon` por `authenticated` nas políticas.
-- ---------------------------------------------------------------------
do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'usuarios', 'salas_cirurgicas', 'equipe_medica', 'cirurgias', 'equipamentos',
    'escala_plantao', 'rpa_leitos', 'leitos', 'visitantes', 'ps_leitos', 'ps_altas', 'log_auditoria',
    'dietas', 'produtos_estoque', 'movimentacoes_estoque'
  ] loop
    execute format('alter table public.%I enable row level security', tabela);
    execute format('drop policy if exists "acesso_interno" on public.%I', tabela);
    execute format(
      'create policy "acesso_interno" on public.%I
       for all to anon, authenticated using (true) with check (true)', tabela);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Painel público de acompanhantes (/status)
-- Exposição mínima: apenas prontuário, horário e status do dia.
-- ---------------------------------------------------------------------
create or replace view public.painel_acompanhantes as
select
  id,
  prontuario,
  hora_prevista,
  inicio_real,
  status,
  data_prevista
from public.cirurgias
where data_prevista = current_date;

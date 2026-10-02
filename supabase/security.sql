-- =====================================================================
-- Vitalis — ENDURECIMENTO DE SEGURANÇA (executar depois de schema.sql)
--
-- O que este arquivo faz, de imediato:
--   1. Passa a guardar as senhas com hash bcrypt (nunca em texto puro)
--   2. Cria a função de login no banco — a senha é conferida no servidor,
--      o navegador nunca lê o hash
--   3. Revoga a leitura da coluna `senha` pelas chaves do front-end
--   4. Registra no log de auditoria toda tentativa de login recusada
--   5. Restringe o painel público à view de acompanhantes
--
-- No fim do arquivo há a ETAPA 2 (comentada): as políticas definitivas
-- para quando o login migrar para o Supabase Auth.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. Hash automático de senhas
-- ---------------------------------------------------------------------
create or replace function public.hash_senha_usuario()
returns trigger
language plpgsql
as $$
begin
  -- Só aplica hash em senha nova e ainda não criptografada.
  if new.senha is not null and new.senha <> '' and new.senha not like '$2%' then
    new.senha := crypt(new.senha, gen_salt('bf', 10));
  end if;
  return new;
end;
$$;

drop trigger if exists hash_senha on public.usuarios;
create trigger hash_senha
  before insert or update of senha on public.usuarios
  for each row execute function public.hash_senha_usuario();

-- Converte as senhas já existentes (idempotente).
update public.usuarios
   set senha = crypt(senha, gen_salt('bf', 10))
 where senha is not null and senha <> '' and senha not like '$2%';

-- ---------------------------------------------------------------------
-- 2. Login conferido dentro do banco
--    SECURITY DEFINER: roda com os privilégios do dono da função, então
--    o cliente nunca precisa de permissão de leitura na coluna `senha`.
-- ---------------------------------------------------------------------
create or replace function public.autenticar_usuario(p_usuario text, p_senha text)
returns table (
  id uuid,
  nome text,
  usuario text,
  funcao text,
  master boolean,
  ativo boolean,
  setores text[],
  modulos jsonb,
  permissoes jsonb,
  criado_em timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  encontrado public.usuarios%rowtype;
begin
  select * into encontrado
    from public.usuarios u
   where lower(u.usuario) = lower(trim(p_usuario))
   limit 1;

  if not found then
    insert into public.log_auditoria (usuario, funcao, acao, entidade, referencia, detalhe)
    values (trim(p_usuario), '—', 'status', 'login', 'login', 'Tentativa de acesso com usuário inexistente');
    raise exception 'USUARIO_NAO_ENCONTRADO';
  end if;

  if encontrado.senha is null or encontrado.senha = '' or crypt(p_senha, encontrado.senha) <> encontrado.senha then
    insert into public.log_auditoria (usuario, funcao, acao, entidade, referencia, detalhe)
    values (encontrado.nome, encontrado.funcao, 'status', 'login', 'login', 'Tentativa de acesso com senha incorreta');
    raise exception 'SENHA_INCORRETA';
  end if;

  if encontrado.ativo is false then
    insert into public.log_auditoria (usuario, funcao, acao, entidade, referencia, detalhe)
    values (encontrado.nome, encontrado.funcao, 'status', 'login', 'login', 'Tentativa de acesso de usuário inativo');
    raise exception 'USUARIO_INATIVO';
  end if;

  insert into public.log_auditoria (usuario, funcao, acao, entidade, referencia, detalhe)
  values (encontrado.nome, encontrado.funcao, 'status', 'login', 'login', 'Acesso autorizado');

  return query
    select encontrado.id, encontrado.nome, encontrado.usuario, encontrado.funcao,
           encontrado.master, encontrado.ativo, encontrado.setores,
           encontrado.modulos, encontrado.permissoes, encontrado.criado_em;
end;
$$;

-- Confere a senha atual sem expor o hash (usado na troca de senha).
create or replace function public.conferir_senha(p_id uuid, p_senha text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  atual text;
begin
  select senha into atual from public.usuarios where id = p_id;
  if atual is null or atual = '' then
    return false;
  end if;
  return crypt(p_senha, atual) = atual;
end;
$$;

grant execute on function public.autenticar_usuario(text, text) to anon, authenticated;
grant execute on function public.conferir_senha(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. A coluna `senha` deixa de ser legível pelo front-end
-- ---------------------------------------------------------------------
revoke select on public.usuarios from anon, authenticated;

grant select (id, nome, usuario, funcao, master, ativo, setores, modulos, permissoes, criado_em, atualizado_em)
  on public.usuarios to anon, authenticated;

-- Gravação continua permitida (o trigger acima aplica o hash).
grant insert, update, delete on public.usuarios to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Painel público: apenas a view, apenas o dia corrente
-- ---------------------------------------------------------------------
grant select on public.painel_acompanhantes to anon;

-- ---------------------------------------------------------------------
-- 5. Proteção do Administrador Master
-- ---------------------------------------------------------------------
create or replace function public.proteger_master()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and old.master then
    raise exception 'O Administrador Master não pode ser excluído';
  end if;
  if tg_op = 'UPDATE' and old.master and new.ativo is false then
    raise exception 'O Administrador Master não pode ser desativado';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists proteger_master on public.usuarios;
create trigger proteger_master
  before update or delete on public.usuarios
  for each row execute function public.proteger_master();

-- =====================================================================
-- ETAPA 2 — políticas definitivas (aplicar ao migrar para Supabase Auth)
--
-- Enquanto o login for o da tabela `usuarios`, o navegador usa a chave
-- anônima e qualquer política aberta a `anon` vale para quem tiver a
-- chave. A proteção real vem do Supabase Auth: cada profissional passa a
-- ter uma conta, o app recebe um JWT e as políticas abaixo passam a
-- distinguir quem é quem.
--
-- Passos da migração:
--   1. Authentication → Providers → Email: ativar e criar as contas
--   2. Criar a tabela de perfis ligada a auth.users:
--
--        create table public.perfis (
--          id uuid primary key references auth.users(id) on delete cascade,
--          nome text not null,
--          funcao text not null default 'Enfermeiro',
--          ativo boolean not null default true,
--          permissoes jsonb not null default '{}'::jsonb
--        );
--        alter table public.perfis enable row level security;
--        create policy "perfil_proprio" on public.perfis
--          for select to authenticated using (id = auth.uid());
--
--   3. Trocar as políticas de todas as tabelas por:
--
--        drop policy if exists "acesso_interno" on public.<tabela>;
--        create policy "somente_autenticado" on public.<tabela>
--          for all to authenticated using (true) with check (true);
--
--   4. Remover a coluna `senha` de `usuarios`, que deixa de ser usada.
-- =====================================================================

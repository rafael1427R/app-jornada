-- =====================================================================
-- Vitalis — RESET COMPLETO DO BANCO
--
-- ⚠️  ATENÇÃO: este arquivo APAGA TODAS AS TABELAS E TODOS OS DADOS.
--     Não há como desfazer. Use apenas quando quiser recomeçar do zero.
--
-- Depois de executar este arquivo, rode novamente, nesta ordem:
--   1) schema.sql
--   2) seed.sql
--   3) security.sql   (opcional, recomendado para produção)
-- =====================================================================

drop view if exists public.painel_acompanhantes;

drop table if exists public.movimentacoes_estoque cascade;
drop table if exists public.produtos_estoque cascade;
drop table if exists public.dietas cascade;
drop table if exists public.log_auditoria cascade;
drop table if exists public.ps_altas cascade;
drop table if exists public.ps_leitos cascade;
drop table if exists public.visitantes cascade;
drop table if exists public.leitos cascade;
drop table if exists public.rpa_leitos cascade;
drop table if exists public.escala_plantao cascade;
drop table if exists public.equipamentos cascade;
drop table if exists public.cirurgias cascade;
drop table if exists public.equipe_medica cascade;
drop table if exists public.salas_cirurgicas cascade;
drop table if exists public.usuarios cascade;

drop function if exists public.set_atualizado_em() cascade;
drop function if exists public.autenticar_usuario(text, text) cascade;
drop function if exists public.definir_senha(uuid, text) cascade;
drop function if exists public.hash_senha_usuario() cascade;

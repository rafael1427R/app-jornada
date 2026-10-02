-- =====================================================================
-- Vitalis — carga inicial (idempotente)
-- Execute depois de `schema.sql`.
-- =====================================================================

-- ------------------------------------------------- Administrador Master
insert into public.usuarios (nome, usuario, senha, funcao, master, ativo, setores, modulos)
values ('Administrador Master', 'admin', '1123', 'Administrador', true, true,
        array['Centro Cirúrgico'], '"all"'::jsonb)
on conflict (usuario) do nothing;

-- ------------------------------------------------------- Salas cirúrgicas
insert into public.salas_cirurgicas (nome, tipo, setor, andar, status)
values
  ('Sala 01', 'Geral', 'Centro Cirúrgico', '2º andar', 'disponivel'),
  ('Sala 02', 'Videolaparoscopia', 'Centro Cirúrgico', '2º andar', 'disponivel'),
  ('Sala 03', 'Ortopedia', 'Centro Cirúrgico', '2º andar', 'disponivel'),
  ('Sala 04', 'Geral', 'Centro Cirúrgico', '2º andar', 'disponivel'),
  ('Sala 05', 'Urgência', 'Centro Cirúrgico', '2º andar', 'disponivel'),
  ('Sala Obstétrica 01', 'Cesárea', 'Centro Obstétrico', '1º andar', 'disponivel'),
  ('Sala Obstétrica 02', 'Parto cirúrgico', 'Centro Obstétrico', '1º andar', 'disponivel'),
  ('Sala Ambulatorial 01', 'Pequenas cirurgias', 'Cirurgia Ambulatorial', 'Térreo', 'disponivel'),
  ('Sala Ambulatorial 02', 'Endoscopia', 'Cirurgia Ambulatorial', 'Térreo', 'disponivel')
on conflict do nothing;

-- ---------------------------------------------------------- Equipe médica
insert into public.equipe_medica (nome, registro, funcao, especialidade, turno, disponibilidade)
values
  ('Dr. Antônio Marques', 'CRM-PI 4821', 'Cirurgião', 'Cirurgia Geral', 'Manhã', 'disponivel'),
  ('Dra. Helena Cabral', 'CRM-PI 5514', 'Anestesista', 'Anestesiologia', 'Manhã', 'disponivel'),
  ('Dr. Paulo Ribeiro', 'CRM-PI 6109', 'Cirurgião', 'Ortopedia', 'Tarde', 'disponivel'),
  ('Dra. Mariana Teles', 'CRM-PI 7002', 'Cirurgião', 'Obstetrícia', 'Plantão 12h', 'disponivel'),
  ('Enf. Cláudia Nunes', 'COREN-PI 118220', 'Enfermeiro', 'Centro Cirúrgico', 'Manhã', 'disponivel'),
  ('Enf. Rodrigo Alves', 'COREN-PI 129045', 'Circulante', 'Centro Cirúrgico', 'Tarde', 'disponivel'),
  ('Téc. Sandra Lopes', 'COREN-PI 301882', 'Instrumentador', 'Instrumentação', 'Manhã', 'disponivel'),
  ('Téc. Jonas Ferreira', 'COREN-PI 318904', 'Técnico de Enfermagem', 'RPA', 'Noite', 'folga')
on conflict do nothing;

-- ----------------------------------------------------------- Equipamentos
insert into public.equipamentos (nome, codigo, tipo, sala, status, ultima_manutencao, proxima_manutencao)
values
  ('Aparelho de anestesia Fabius', 'EQ-0001', 'Anestesia', 'Sala 01', 'operacional', current_date - 90, current_date + 90),
  ('Monitor multiparâmetro', 'EQ-0002', 'Monitorização', 'Sala 01', 'operacional', current_date - 60, current_date + 120),
  ('Torre de videolaparoscopia', 'EQ-0003', 'Vídeo', 'Sala 02', 'operacional', current_date - 120, current_date + 60),
  ('Bisturi eletrônico', 'EQ-0004', 'Eletrocirurgia', 'Sala 03', 'manutencao', current_date - 240, current_date - 60),
  ('Ventilador pulmonar', 'EQ-0005', 'Ventilação', 'Sala 05', 'inativo', current_date - 300, current_date - 120),
  ('Arco cirúrgico', 'EQ-0006', 'Imagem', 'Sala 03', 'operacional', current_date - 30, current_date + 150)
on conflict (codigo) do nothing;

-- ------------------------------------------------------------ Leitos RPA
insert into public.rpa_leitos (nome, status)
select 'RPA-' || lpad(numero::text, 2, '0'), 'disponivel'
from generate_series(1, 8) as numero
on conflict (nome) do nothing;

-- ------------------------------------------ Leitos de internação (150)
insert into public.leitos (nome, setor, prefixo, numero, status)
select
  setores.prefixo || '-' || lpad(numero::text, 2, '0'),
  setores.setor,
  setores.prefixo,
  numero,
  'disponivel'
from (
  values
    ('Clínica Médica',    'CM',   30),
    ('Clínica Cirúrgica', 'CC',   25),
    ('Pediatria',         'PED',  20),
    ('UTI Adulto',        'UTIA', 15),
    ('UCInco',            'UCI',  10),
    ('UTI2',              'UTI2', 10),
    ('Obstetrícia',       'OBS',  15),
    ('Emergência',        'EMG',  15),
    ('Isolamento',        'ISO',  10)
) as setores (setor, prefixo, total)
cross join lateral generate_series(1, setores.total) as numero
on conflict (nome) do nothing;

-- -------------------------------- Pronto Socorro Digital (PS-01..PS-30)
insert into public.ps_leitos (nome, status)
select 'PS-' || lpad(numero::text, 2, '0'), 'disponivel'
from generate_series(1, 30) as numero
on conflict (nome) do nothing;

-- ------------------------------------------- Almoxarifado (Nutrição/UAN)
insert into public.produtos_estoque (nome, categoria, unidade, estoque_atual, estoque_minimo, custo_unitario, fornecedor)
values
  ('Arroz tipo 1', 'Secos', 'kg', 120, 40, 5.40, 'Distribuidora Central'),
  ('Feijão carioca', 'Secos', 'kg', 60, 30, 7.90, 'Distribuidora Central'),
  ('Peito de frango congelado', 'Carnes e frios', 'kg', 45, 50, 18.50, 'Frigorífico Piauí'),
  ('Dieta enteral padrão 1.0', 'Dietas e enteral', 'fr', 28, 20, 32.00, 'Nutrimed'),
  ('Espessante alimentar', 'Dietas e enteral', 'un', 8, 12, 46.90, 'Nutrimed'),
  ('Marmitex descartável', 'Descartáveis', 'un', 900, 300, 1.20, 'EmbalaMais'),
  ('Detergente neutro 5L', 'Limpeza', 'un', 14, 6, 21.00, 'CleanPro')
on conflict do nothing;

-- ------------------------------------------------------------ Conferência
-- select 'leitos' as tabela, count(*) from public.leitos
-- union all select 'ps_leitos', count(*) from public.ps_leitos
-- union all select 'rpa_leitos', count(*) from public.rpa_leitos;

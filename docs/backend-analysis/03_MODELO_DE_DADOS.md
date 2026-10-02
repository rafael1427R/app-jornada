# 03 — MODELO DE DADOS

> **Base desta especificação:** `supabase/schema.sql` (542 linhas) é **evidência
> direta** — é DDL real, não inferência. Os tipos abaixo marcados como
> *identificado* vêm desse arquivo. Marcados como *inferido* vêm do uso em tela,
> porque o projeto não tem TypeScript.

---

## 1. SITUAÇÃO ATUAL

**EVIDÊNCIA**

| Item | Quantidade |
|---|---|
| Tabelas | 17 |
| Views | 1 (`painel_acompanhantes`) |
| Funções | 5 (`set_atualizado_em`, `autenticar_usuario`, `conferir_senha`, `hash_senha_usuario`, `proteger_master`) |
| Triggers | 19 (17× `set_atualizado_em`, `hash_senha`, `proteger_master`) |
| Extensões | `pgcrypto` |
| Chaves primárias | `uuid` com `default gen_random_uuid()` em todas as tabelas |
| Chaves estrangeiras | **1 apenas** — `movimentacoes_estoque.produto_id → produtos_estoque.id` |

### Achado estrutural central

⚠️ **O modelo é quase sem integridade referencial.** De 17 tabelas, apenas uma
declara FK. Todas as outras relações são **associações textuais soltas**:

| Relação real | Como está implementada |
|---|---|
| Dieta → Leito | `dietas.leito text` ↔ `leitos.nome text` |
| Dieta → Paciente | `dietas.prontuario text` (sem tabela de paciente) |
| Cirurgia → Sala | `cirurgias.sala text` ↔ `salas_cirurgicas.nome text` |
| Cirurgia → Equipe | `cirurgias.equipe text[]` ↔ `equipe_medica.nome text` |
| Cirurgia → Leito RPA | `cirurgias.leito_rpa text` ↔ `rpa_leitos.nome text` |
| Escala → Profissional | `escala_plantao.profissional text` ↔ `equipe_medica.nome text` |
| Equipamento → Sala | `equipamentos.sala text` ↔ `salas_cirurgicas.nome text` |
| Visitante → Paciente | `visitantes.prontuario text` |
| Auditoria → Registro | `log_auditoria.entidade_id text` (polimórfico, sem FK) |

**Consequência:** renomear um leito ou um profissional **não propaga**, e órfãos
não são detectados pelo banco.

**RECOMENDAÇÃO (não existe hoje):** no backend Java, introduzir FKs para
`leito_id`, `sala_id`, `produto_id`, `profissional_id`, mantendo as colunas
textuais como *desnormalização de leitura* durante a transição.

---

## 2. ENTIDADES

Legenda de origem do tipo: **[D]** DDL identificado · **[I]** inferido do uso ·
**[S]** sugerido pela análise.

---

### ENT-001 — `usuarios`
**Descrição:** operadores do sistema. É a entidade de autenticação.
**Evidência:** `schema.sql:30-47`; `src/pages/Usuarios.jsx`; `src/lib/permissions.js`

| Campo | Tipo | Obrig. | PK | Único | Observação |
|---|---|---|---|---|---|
| `id` | uuid **[D]** | sim | ✔ | ✔ | `gen_random_uuid()` |
| `nome` | text **[D]** | sim | | | |
| `usuario` | text **[D]** | sim | | ✔ | login |
| `senha` | text **[D]** | sim | | | hash bcrypt via trigger |
| `funcao` | text **[D]** | sim | | | `CHECK` em 4 valores |
| `master` | boolean **[D]** | sim | | | default `false` |
| `ativo` | boolean **[D]** | sim | | | default `true` |
| `setores` | text[] **[D]** | sim | | | default `{}` |
| `modulos` | jsonb **[D]** | sim | | | **legado**: lista de ids ou `"all"` |
| `permissoes` | jsonb **[D]** | sim | | | `{ moduloId: ["ver",...] }` ou `"all"` |
| `criado_em` | timestamptz **[D]** | sim | | | |
| `atualizado_em` | timestamptz **[D]** | sim | | | trigger |

**Constraint:** `funcao in ('Administrador','Médico','Enfermeiro','Técnico de Enfermagem')`
**Índices:** PK + unique em `usuario`
**Auditoria necessária:** criação, alteração de permissão, troca de senha,
ativação/desativação, login bem-sucedido e recusado.

⚠️ **INCONSISTENTE — duplicidade de permissões.** `modulos` e `permissoes`
coexistem e são gravados juntos (`Usuarios.jsx:123,125`). `normalizePermissions()`
dá precedência a `permissoes`, mas cai para `modulos` se o primeiro não for objeto
(`permissions.js:43-45`). Dois registros podem discordar entre si.
**Decisão necessária:** migrar para `permissoes` e descartar `modulos`.

🔴 **LGPD:** a coluna `senha` tem `grant insert, update` para `anon`
(`security.sql:132`). Ver `SEC-001`.

---

### ENT-002 — `salas_cirurgicas`
**Evidência:** `schema.sql:52-69`

| Campo | Tipo | Obrig. | Observação |
|---|---|---|---|
| `id` | uuid **[D]** | sim | PK |
| `nome` | text **[D]** | sim | **não é único no DDL** |
| `tipo`, `andar`, `observacao` | text **[D]** | não | default `''` |
| `setor` | text **[D]** | sim | default `'Centro Cirúrgico'` |
| `status` | text **[D]** | sim | `CHECK` 5 valores |
| `equipamentos` | text[] **[D]** | sim | default `{}` |
| `prontuario_atual` | text **[D]** | não | paciente em sala |
| `chamado_em` | timestamptz **[D]** | não | |
| `criado_em`, `atualizado_em` | timestamptz **[D]** | sim | |

**Índices:** `setor`, `status`
⚠️ `nome` é usado como chave de junção por `cirurgias.sala` e `equipamentos.sala`,
mas **não tem `UNIQUE`**. → **RECOMENDAÇÃO:** adicionar.

---

### ENT-003 — `equipe_medica`
**Evidência:** `schema.sql:74-87`

Campos **[D]**: `id` uuid PK, `nome` text NOT NULL, `registro` text NOT NULL
(CRM/COREN), `funcao` text default `'Cirurgião'`, `especialidade` text,
`turno` text default `'Manhã'`, `disponibilidade` text `CHECK` 4 valores,
`telefone_ramal` text, `observacao` text, timestamps.

**Índice:** `funcao`
⚠️ `registro` não é único no DDL, embora seja identificador profissional.
→ **RECOMENDAÇÃO:** `UNIQUE (registro)`.
**LGPD:** `nome`, `registro` e `telefone_ramal` são dados pessoais de
profissional. Ver `LGPD-005`.

---

### ENT-004 — `cirurgias`
**Descrição:** entidade central do centro cirúrgico.
**Evidência:** `schema.sql:94-129`

| Campo | Tipo | Obrig. | Observação |
|---|---|---|---|
| `id` | uuid **[D]** | sim | PK |
| `prontuario` | text **[D]** | sim | **RN-001** não é validado no banco |
| `procedimento` | text **[D]** | sim | |
| `especialidade` | text **[D]** | não | |
| `tipo` | text **[D]** | sim | `CHECK` eletiva/urgencia/emergencia |
| `tecnica` | text **[D]** | não | default `'Convencional'` |
| `lateralidade` | text **[D]** | não | default `'Não se aplica'` |
| `sala` | text **[D]** | não | junção textual |
| `data_prevista` | date **[D]** | sim | default `current_date` |
| `hora_prevista` | text **[D]** | não | ⚠️ texto, não `time` |
| `inicio_real`, `fim_real` | timestamptz **[D]** | não | |
| `status` | text **[D]** | sim | `CHECK` 7 valores |
| `cirurgiao`, `anestesista` | text **[D]** | não | nome livre, sem FK |
| `equipe` | text[] **[D]** | sim | default `{}` |
| `anestesia` | text **[D]** | não | default `'Geral'` |
| `checklist_oms` | text[] **[D]** | sim | ids dos 10 itens marcados |
| `leito_rpa` | text **[D]** | não | |
| `convertida`, `reoperacao`, `infeccao`, `evento_adverso`, `obito` | boolean **[D]** | sim | default `false` |
| `motivo_cancelamento`, `observacao` | text **[D]** | não | |
| `criado_em`, `atualizado_em` | timestamptz **[D]** | sim | |

**Índices:** `prontuario`, `data_prevista`, `status`
⚠️ `hora_prevista` é `text`; ordenação usa `localeCompare` no cliente
(`PainelStatus.jsx:36`). → **RECOMENDAÇÃO:** `time` no backend.
🔴 **Dados clínicos sensíveis:** `infeccao`, `evento_adverso`, `obito`,
`procedimento` — hoje expostos na rota pública. Ver `SEC-002`, `LGPD-003`.

---

### ENT-005 — `equipamentos`
**Evidência:** `schema.sql:134-149`
Campos **[D]**: `id`, `nome` NOT NULL, `codigo` text **NOT NULL UNIQUE**,
`tipo`, `sala`, `status` `CHECK` 4 valores, `patrimonio`, `fornecedor`,
`ultima_manutencao` date, `proxima_manutencao` date, `observacao`, timestamps.
**Índice:** `proxima_manutencao`

---

### ENT-006 — `escala_plantao`
**Evidência:** `schema.sql:156-169`
Campos **[D]**: `id`, `data` date default `current_date`, `turno` default
`'Manhã'`, `profissional` NOT NULL, `funcao`, `sala`, `status` `CHECK` 4 valores,
`substituto`, `observacao`, timestamps.
**Índice:** `data`

---

### ENT-007 — `rpa_leitos`
**Evidência:** `schema.sql:176-189`
Campos **[D]**: `id`, `nome` text **UNIQUE**, `status` `CHECK`
disponivel/ocupado/limpeza, `prontuario`, `procedimento`, `entrada` timestamptz,
`saida` timestamptz, `aldrete` integer `CHECK between 0 and 10`, `observacao`,
timestamps.
**Regra no banco:** `RN-012` é a única regra de negócio numérica com `CHECK`.

---

### ENT-008 — `leitos`
**Evidência:** `schema.sql:194-211`
Campos **[D]**: `id`, `nome` text **UNIQUE**, `setor` NOT NULL, `prefixo`
NOT NULL, `numero` integer NOT NULL, `status` `CHECK` 4 valores, `prontuario`,
`ocupado_em` timestamptz, `previsao_alta` date, `observacao`, timestamps.
**Índices:** `setor`, `status`
⚠️ O **motivo de alta** (`DISCHARGE_REASONS`, `constants.js:460`) é usado na
interface mas **não existe coluna** para ele em `leitos`. Ao dar alta, o leito
volta a `disponivel` e o motivo é registrado apenas em `log_auditoria.detalhe`
como texto livre.
→ **RECOMENDAÇÃO:** tabela `leito_ocupacoes` (histórico) com `motivo_saida`.
Sem ela, **não há como calcular taxa de giro ou de óbito por setor** de forma
confiável. Ver `ENT-019`.

---

### ENT-009 — `visitantes`
**Evidência:** `schema.sql:216-233`

| Campo | Tipo | Obrig. | Sensibilidade |
|---|---|---|---|
| `id` | uuid **[D]** | sim | — |
| `nome` | text **[D]** | sim | 🔴 **dado pessoal** (comentário no DDL: "sempre em CAIXA ALTA") |
| `documento` | text **[D]** | não | 🔴 **documento de identificação** |
| `prontuario` | text **[D]** | sim | paciente visitado |
| `setor`, `quarto_leito` | text **[D]** | sim | 🟡 revela internação |
| `parentesco` | text **[D]** | não | 🟡 vínculo familiar |
| `entrada` | timestamptz **[D]** | sim | default `now()` |
| `saida` | timestamptz **[D]** | não | NULL = dentro do hospital |
| `reentradas` | integer **[D]** | sim | default 0 |
| `observacao` | text **[D]** | não | ⚠️ texto livre |
| timestamps | timestamptz **[D]** | sim | — |

**Índices:** `saida`, `prontuario`
🔴 **Tabela com maior concentração de dados pessoais de terceiros do sistema.**
Ver `LGPD-002`, `LGPD-004`.

---

### ENT-010 — `ps_leitos`
**Evidência:** `schema.sql:238-253`
Campos **[D]**: `id`, `nome` **UNIQUE**, `status` `CHECK` 3 valores,
`prontuario`, `classificacao`, `queixa` text, `admitido_em` timestamptz,
`admitido_por` text, `evolucoes` **jsonb** default `'[]'`, timestamps.
**Índice:** `status`

⚠️ **`evolucoes jsonb`** — array de evoluções clínicas dentro da linha do leito.
Problemas: (a) a evolução **é apagada quando o leito é liberado**; (b) não há
índice nem FK; (c) não há autoria nem data garantidas por esquema.
🔴 `queixa` é **dado de saúde em texto livre**.
→ **RECOMENDAÇÃO:** tabela `ps_evolucoes` com FK. Ver `ENT-020`.

---

### ENT-011 — `ps_altas`
**Evidência:** `schema.sql:258-275`
Campos **[D]**: `id`, `leito` NOT NULL, `prontuario` NOT NULL, `classificacao`,
`queixa`, `motivo` default `'Alta médica'`, `admitido_em`, `data` timestamptz
default `now()`, `responsavel`, `funcao_responsavel`, `evolucoes` jsonb,
timestamps.
**Índices:** `data`, `prontuario`
**Observação:** é a cópia histórica do atendimento do PS — mitiga parcialmente o
problema (a) de `ENT-010`, desde que a alta seja registrada por essa via.

---

### ENT-012 — `log_auditoria`
**Evidência:** `schema.sql:280-299`
Campos **[D]**: `id`, `data` timestamptz default `now()`, `usuario` NOT NULL
default `'Sistema'`, `funcao`, `acao` NOT NULL `CHECK` 6 valores
(criar/editar/excluir/ocupar/alta/status), `entidade` NOT NULL default `'leito'`,
`entidade_id` text, `referencia` text, `prontuario` text, `setor` text,
`detalhe` text, timestamps.
**Índices:** `data desc`, `acao`, `usuario`

⚠️ **Três limitações estruturais:**
1. `usuario` é **texto com o nome**, não FK para `usuarios.id`. Renomear um
   usuário desvincula o histórico.
2. O `CHECK` em `acao` tem 6 valores, mas `security.sql:75-93` insere
   `acao = 'status'` para eventos de **login**. Login é registrado como "mudança
   de status" da entidade `'login'`. Funciona, mas é semanticamente impreciso.
3. `anon` tem `delete` na tabela (política `acesso_interno`). **A trilha é
   apagável pelo cliente.** Ver `SEC-005`.

---

### ENT-013 — `dietas`
**Evidência:** `schema.sql:304-346`

| Campo | Tipo | Obrig. | Sensibilidade |
|---|---|---|---|
| `id` | uuid **[D]** | sim | — |
| `prontuario` | text **[D]** | sim | — |
| `leito` | text **[D]** | sim | junção textual |
| `setor` | text **[D]** | não | — |
| `consistencia` | text **[D]** | sim | default `'Geral'` ⚠️ valor fora de `DIET_CONSISTENCY` |
| `modificacao` | text **[D]** | não | — |
| `via_enteral` | text **[D]** | não | default `'Não se aplica'` ⚠️ valor legado |
| `regime` | text **[D]** | sim | `CHECK` internacao/observacao |
| `inicio_em` | timestamptz **[D]** | não | cronômetro (RN-021) |
| `adequacoes` | text[] **[D]** | sim | via `ALTER` |
| `enteral_tipo`, `enteral_formula`, `enteral_volume` | text **[D]** | não | via `ALTER` |
| `dieta_prescrita`, `preparacao_diferenciada`, `observacoes` | text **[D]** | não | 🟡 texto livre clínico |
| `tipo_cardapio` | text **[D]** | não | via `ALTER`; RN-026 |
| `acompanhante_refeicao` | boolean **[D]** | sim | default `false` |
| `status` | text **[D]** | sim | `CHECK` ativa/suspensa/encerrada |
| `prescrito_por` | text **[D]** | não | nome livre |
| `data_prescricao` | date **[D]** | não | default `current_date` |
| `nome_paciente` | text **[D]** | não | 🔴 **dado pessoal** |
| `nome_social` | text **[D]** | não | 🔴 **dado pessoal** |
| `sexo` | text **[D]** | não | 🔴 **dado pessoal** |
| `nome_mae` | text **[D]** | não | 🔴 **dado pessoal de terceiro** |
| `data_nascimento` | date **[D]** | não | 🔴 **dado pessoal** |
| timestamps | timestamptz **[D]** | sim | — |

**Índices:** `prontuario`, `regime`, `status`, `setor`
🔴 **Esta tabela contradiz `RN-002`** (sistema identifica por prontuário).
O comentário em `schema.sql:334` declara a finalidade: *"usada apenas quando o
setor emite etiquetas com nome"*. Ver `LGPD-001`.
⚠️ **Falta índice único parcial para `RN-020`**:
`CREATE UNIQUE INDEX ON dietas (prontuario) WHERE status = 'ativa'`.
⚠️ Defaults legados: `consistencia = 'Geral'` e `via_enteral = 'Não se aplica'`
não constam nas listas de `constants.js`. `viaDaDieta()`
(`src/lib/nutricao.js:7-11`) existe só para contornar isso.

---

### ENT-014 — `produtos_estoque`
**Evidência:** `schema.sql:351-364`
Campos **[D]**: `id`, `nome` NOT NULL, `categoria` NOT NULL default `'Secos'`,
`unidade` NOT NULL default `'un'`, `estoque_atual` numeric default 0,
`estoque_minimo` numeric default 0, `custo_unitario` numeric default 0,
`fornecedor`, `validade` date, `observacao`, timestamps.
**Índice:** `categoria`
⚠️ `nome` não é único no banco, mas `RN-030` exige. `numeric` sem precisão
declarada — para dinheiro, → **RECOMENDAÇÃO:** `numeric(12,2)`.

---

### ENT-015 — `movimentacoes_estoque`
**Evidência:** `schema.sql:371-387`
Campos **[D]**: `id`, `produto_id` uuid **FK → produtos_estoque(id) ON DELETE CASCADE**,
`produto_nome` NOT NULL (desnormalizado), `unidade`, `tipo` NOT NULL
`CHECK (tipo in ('entrada','saida'))`, `quantidade` numeric `CHECK > 0`,
`saldo_apos` numeric default 0, `motivo`, `usuario`, `data` timestamptz,
timestamps.
**Índices:** `data desc`, `produto_id`

⚠️ **`ON DELETE CASCADE` apaga o histórico de movimentação** quando o produto é
excluído. Para um livro-razão de estoque isso é perda de rastreabilidade.
→ **RECOMENDAÇÃO:** `ON DELETE RESTRICT` e inativação lógica do produto.
⚠️ `saldo_apos` é calculado e gravado **pelo cliente** (`Almoxarifado.jsx`), sem
transação. Ver `RN-031` e `SEC-008`.

---

### ENT-016 — `avaliacoes_nutricionais`
**Evidência:** `schema.sql:392-455` — **57 colunas**, a maior tabela do sistema.

Agrupamento (todas **[D]**):

| Grupo | Campos |
|---|---|
| Identificação | `id`, `prontuario` NOT NULL, `nome_paciente` 🔴, `nome_social` 🔴, `data_nascimento` 🔴, `sexo` 🔴, `setor`, `leito`, `data_admissao`, `data_avaliacao` NOT NULL, `diagnostico_medico` 🔴 |
| Triagem | `nrs` jsonb, `nrs_total` integer, `nrs_risco` boolean |
| Antropometria | `peso_atual`, `altura`, `altura_joelho`, `peso_usual`, `imc`, `perda_peso_percent`, `cb`, `cmb`, `panturrilha`, `antropometria_obs`, `asg` — **todos `text`** ⚠️ |
| Clínica | `condicao_clinica`, `apetite`, `nausea`, `diarreia`, `constipacao`, `disfagia`, `edema`, `edema_local`, `lesoes`, `mobilidade` 🔴 |
| Dietética | `via`, `tipo_dieta`, `aceitacao`, `consumo_habitual`, `alergias` 🔴, `jejum`, `jejum_motivo` |
| Exames | `exames` jsonb 🔴 |
| Conduta | `diagnostico_nutricional` 🔴, `kcal_dia`, `proteina_g_dia`, `proteina_g_kg`, `via_tipo_dieta`, `suplementacao`, `suplemento_qual` |
| Registro | `observacoes`, `nutricionista`, `crn`, `evolucoes` jsonb 🔴, timestamps |

**Índices:** `prontuario`, `data_avaliacao desc`, `nrs_risco`

🔴 **Classificação:** esta tabela contém **dados pessoais sensíveis de saúde**
(art. 5º, II da LGPD): diagnóstico médico, diagnóstico nutricional, alergias,
exames laboratoriais, condição clínica, evoluções. Ver `LGPD-001`.

⚠️ **Medidas numéricas armazenadas como `text`.** `peso_atual`, `altura`, `imc`,
`kcal_dia` etc. são `text` no DDL porque o frontend aceita vírgula decimal e
converte com `numero()` (`AvaliacaoNutricional.jsx:97-100`).
**Consequência:** impossível agregar (média de IMC, distribuição de peso) em SQL
sem `CAST`, e nada impede gravar `"abc"` como peso.
→ **RECOMENDAÇÃO:** `numeric` no backend Java, com a conversão de vírgula feita
no DTO.

⚠️ `nrs`, `exames` e `evolucoes` em `jsonb` — mesmo problema de `ENT-010`.

---

### ENT-017 — `uan_indicadores`
**Evidência:** `schema.sql:461-479`
Campos **[D]**: `id`, `competencia` text NOT NULL (**unique index**),
`temperatura_aferidas` integer, `temperatura_conformes` integer,
`custo_refeicao` numeric(10,2), `resto_ingestao` numeric(6,2),
`indice_desperdicio` numeric(6,2), `sobras_limpas` numeric(10,2),
`satisfacao_pacientes` numeric(6,2), `satisfacao_acompanhantes` numeric(6,2),
`satisfacao_funcionarios` numeric(6,2), `refeicoes_distribuidas` integer,
`observacao` text, timestamps.
**Índice:** `uan_indicadores_competencia_idx` UNIQUE em `competencia`

✅ **Única tabela com tipos numéricos corretos e precisão declarada.**
⚠️ `competencia` é `text` no formato `AAAA-MM`; não há `CHECK` de formato.
→ **RECOMENDAÇÃO:** `CHECK (competencia ~ '^\d{4}-(0[1-9]|1[0-2])$')`.
⚠️ `refeicoes_distribuidas` é **gravado e nunca lido** — nenhuma tela o exibe
(`IndicadoresNutricao.jsx` calcula o quantitativo das dietas).
🔴 **Sem tela de escrita.** Ver `FUNC-048`.
**Não contém dado pessoal** — tabela agregada mensal.

---

### VIEW — `painel_acompanhantes`
**Evidência:** `schema.sql:533-542`
```sql
select id, prontuario, hora_prevista, inicio_real, status, data_prevista
from public.cirurgias where data_prevista = current_date;
```
**Status:** 🔴 **código morto** — criada, liberada para `anon`
(`security.sql:137`) e **não consumida pelo frontend**. Ver `FUNC-021`.

---

## 3. ENTIDADES NECESSÁRIAS OU RECOMENDADAS

Estas **não existem** no projeto. Estão aqui como *modelo necessário* ou
*recomendação*, nunca como evidência.

### ENT-018 — `pacientes` — 🔴 AUSENTE
**Classificação:** RECOMENDAÇÃO com ressalva.
**Situação atual:** não há entidade de paciente. O prontuário é uma string
repetida em 9 tabelas. Nome, nascimento e nome da mãe estão duplicados em
`dietas` e `avaliacoes_nutricionais`.
**Argumento a favor:** elimina duplicação, dá integridade e cria um único ponto
para aplicar controle de acesso e expurgo de dado pessoal.
**Argumento contra:** a decisão de projeto declarada (`schema.sql:8-9`) é
justamente *não* armazenar identificação de paciente. Criar a tabela centraliza
o que hoje está disperso — pode **aumentar** o risco se o controle de acesso não
acompanhar.
→ **DECISÃO HUMANA NECESSÁRIA.** Ver `README.md`.

### ENT-019 — `leito_ocupacoes` — 🔴 AUSENTE
**Classificação:** NECESSÁRIO para indicadores.
Histórico de ocupação: `leito_id`, `prontuario`, `entrada`, `saida`,
`motivo_saida` (`CHECK` alta/transferido/obito), `setor`.
**Justificativa:** `ENT-008` só guarda o estado atual. Sem histórico não há taxa
de giro, tempo médio de permanência nem taxa de óbito. A interface já coleta o
motivo (`DISCHARGE_REASONS`) e o joga em texto livre na auditoria.

### ENT-020 — `ps_evolucoes` e `avaliacao_evolucoes` — 🔴 AUSENTE
**Classificação:** RECOMENDAÇÃO.
Normalizar os arrays `jsonb` de `ENT-010`, `ENT-011` e `ENT-016` em tabelas com
FK, autor (FK `usuarios`), `data` e texto. Dá índice, integridade e auditoria por
evolução.

### ENT-021 — `sessoes` — 🔴 AUSENTE
**Classificação:** NECESSÁRIO para o backend Java.
`id`, `usuario_id` FK, `token_hash`, `emitido_em`, `expira_em`,
`revogado_em`, `ip`, `user_agent`.
**Justificativa:** `FUNC-003` não tem token, expiração nem revogação.
Ver `05_AUTENTICACAO_AUTORIZACAO.md`.

### ENT-022 — `metas_indicador` — 🔴 AUSENTE
**Classificação:** RECOMENDAÇÃO.
Hoje as metas estão no bundle (`constants.js:320-359`); mudar uma exige rebuild
(`RN-027`). Tabela com `indicador`, `meta`, `direcao`, `vigencia_inicio`,
`vigencia_fim` permite histórico de meta — necessário para auditoria de
qualidade.

---

## 4. DIAGRAMA DE RELACIONAMENTOS

### Como está (evidência)

```text
produtos_estoque 1 ──── N movimentacoes_estoque     ← única FK real

usuarios        (isolada; referenciada por NOME em log_auditoria)
salas_cirurgicas (referenciada por NOME em cirurgias, equipamentos)
leitos           (referenciado por NOME em dietas)
equipe_medica    (referenciada por NOME em cirurgias.equipe, escala_plantao)
rpa_leitos       (referenciado por NOME em cirurgias.leito_rpa)

cirurgias ─┐
dietas     ├── associadas por PRONTUARIO (text), sem entidade de paciente
visitantes ├
ps_leitos  ├
ps_altas   ├
leitos     ├
avaliacoes_nutricionais ┘

log_auditoria   (polimórfico: entidade + entidade_id text, sem FK)
uan_indicadores (agregado mensal, isolado)
```

### Como deveria ficar (recomendação)

```text
                        ┌──────────────┐
                        │  usuarios    │
                        └──────┬───────┘
                               │ 1
                     ┌─────────┼─────────┐
                     │ N       │ N       │ N
              ┌──────▼───┐ ┌───▼──────┐ ┌▼──────────────┐
              │ sessoes  │ │log_audit.│ │ evolucoes     │
              └──────────┘ └──────────┘ └───────────────┘

   ┌─────────────┐        ┌──────────────┐
   │  pacientes  │  ?     │   leitos     │
   │ (DECISÃO)   │ 1    1 └──────┬───────┘
   └──────┬──────┘               │ 1
          │ 1                    │ N
          │ N            ┌───────▼──────────┐
   ┌──────▼─────────┐    │ leito_ocupacoes  │
   │ cirurgias      │    └──────────────────┘
   │ dietas         │
   │ avaliacoes     │    ┌──────────────────┐
   │ visitantes     │    │ salas_cirurgicas │ 1 ── N cirurgias
   │ ps_leitos      │    └──────────────────┘      N equipamentos
   └────────────────┘
                         ┌──────────────────┐
                         │ equipe_medica    │ 1 ── N escala_plantao
                         └──────────────────┘
```

---

## 5. ESPECIFICAÇÃO DE TABELA — MODELO DE PREENCHIMENTO

Exemplo completo no formato pedido pelo prompt mestre, aplicado a
`uan_indicadores` (a tabela mais bem-formada do projeto, usada como referência
de qualidade para as demais).

### Tabela: `uan_indicadores`

**Descrição:** indicadores mensais de produção da UAN. Uma linha por competência.

**Campos**

| Campo | Tipo sugerido (Java/JPA) | Obrigatório | PK | FK | Único | Observação |
|---|---|---|---|---|---|---|
| `id` | `UUID` | sim | ✔ | | ✔ | gerado no servidor |
| `competencia` | `String` (`char(7)`) | sim | | | ✔ | `AAAA-MM`; validar formato |
| `temperatura_aferidas` | `Integer` | sim | | | | ≥ 0 |
| `temperatura_conformes` | `Integer` | sim | | | | ≥ 0 e ≤ `temperatura_aferidas` |
| `custo_refeicao` | `BigDecimal(10,2)` | sim | | | | ≥ 0 |
| `resto_ingestao` | `BigDecimal(6,2)` | sim | | | | 0–100 |
| `indice_desperdicio` | `BigDecimal(6,2)` | sim | | | | 0–100 |
| `sobras_limpas` | `BigDecimal(10,2)` | sim | | | | ≥ 0 |
| `satisfacao_pacientes` | `BigDecimal(6,2)` | sim | | | | 0–100 |
| `satisfacao_acompanhantes` | `BigDecimal(6,2)` | sim | | | | 0–100 |
| `satisfacao_funcionarios` | `BigDecimal(6,2)` | sim | | | | 0–100 |
| `refeicoes_distribuidas` | `Integer` | sim | | | | ≥ 0; **hoje não é exibido** |
| `observacao` | `String` | não | | | | |
| `criado_em` | `OffsetDateTime` | sim | | | | servidor |
| `atualizado_em` | `OffsetDateTime` | sim | | | | servidor |

**Relacionamentos:** nenhum.
**Índices:** PK; `UNIQUE (competencia)` — **já existe** (`schema.sql:479`).
**Constraints a adicionar (RECOMENDAÇÃO):**
`CHECK (temperatura_conformes <= temperatura_aferidas)`,
`CHECK (competencia ~ '^\d{4}-(0[1-9]|1[0-2])$')`,
percentuais `CHECK (col BETWEEN 0 AND 100)`.
**Auditoria:** criação e alteração de competência — é indicador de qualidade;
alteração retroativa precisa de trilha com valor anterior.
**LGPD:** nenhum dado pessoal. Dado agregado institucional.

---

## 6. DADOS DERIVADOS — ONDE CALCULAR

**EVIDÊNCIA:** hoje **100% dos indicadores são calculados no cliente**, em
`useMemo`, sobre a coleção inteira baixada com `select('*')`.

| Indicador | Hoje | Recomendado | Justificativa |
|---|---|---|---|
| IMC, % perda de peso, proteína/kg | Cliente (`AvaliacaoNutricional.jsx:103-116`) | **Backend**, persistido | Já é persistido (`imc`, `perda_peso_percent`); recalcular no servidor evita divergência entre o valor gravado e o exibido |
| Pontuação NRS-2002 | Cliente (`:119`) | **Backend**, persistido | Idem; `nrs_total` e `nrs_risco` já são colunas |
| Adesão ao checklist OMS | Cliente (`Indicadores.jsx:36,96`) | **Banco** (SQL agregado) | `cardinality(checklist_oms)`; evita baixar todas as cirurgias |
| Taxas de cancelamento, conversão, infecção | Cliente (`:29-52`) | **Banco** | `COUNT(*) FILTER (WHERE ...)` |
| Ocupação de salas e leitos | Cliente (`:51-52`) | **Banco** | Agregação trivial em SQL |
| Perfil de dietas, vias, cardápio | Cliente (`IndicadoresNutricao.jsx`) | **Banco** | `GROUP BY` |
| Quantitativo de refeições | Cliente (`:174-183`) | **Backend** | A regra (excluir Zero/NPT, 4 refeições do acompanhante) é de negócio, não de dados |
| Saldo de estoque | Cliente (`Almoxarifado.jsx`) | **Backend, em transação** | 🔴 Crítico: `RN-031` sem transação permite saldo negativo |
| Valor imobilizado | Cliente (`:80`) | **Banco** | `SUM(estoque_atual * custo_unitario)` |
| Contadores de tempo (visitante, RPA, observação) | Cliente (`useNow`) | **Cliente** | Correto onde está: é relógio de tela, não dado |

**Regra geral recomendada:** agregação e contagem no banco, exposta por endpoint
de indicador; regra de negócio no serviço Java; relógio de contagem regressiva
no cliente.

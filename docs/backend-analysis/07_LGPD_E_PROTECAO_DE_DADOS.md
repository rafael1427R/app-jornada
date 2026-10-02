# 07 — LGPD E PROTEÇÃO DE DADOS

> ⚠️ **Este documento não é parecer jurídico.** É análise técnica de proteção de
> dados feita sobre o código. Identifica dados pessoais, onde estão, quem acessa
> e quais controles técnicos faltam. Toda conclusão que dependa de decisão
> jurídica, de base legal ou de política institucional está marcada como
> **"Necessita validação jurídica/compliance."**

---

## 1. PREMISSA DE PROJETO E SEU CUMPRIMENTO REAL

**EVIDÊNCIA — a premissa declarada**

`supabase/schema.sql:8-9`:
> *"CONFORMIDADE LGPD: nenhuma tabela armazena nome de paciente.
> O paciente é identificado exclusivamente pelo número de prontuário."*

`src/lib/brand.js:11`:
> `LGPD_NOTICE = 'Conformidade LGPD — Sem dados pessoais identificáveis'`

**EVIDÊNCIA — o cumprimento efetivo**

| Módulo | Cumpre? | Evidência |
|---|---|---|
| Cirurgias | ✅ sim | `schema.sql:94-129` — só `prontuario` |
| Leitos | ✅ sim | `schema.sql:194-211` — só `prontuario` |
| RPA | ✅ sim | `schema.sql:176-189` |
| PS | ✅ sim | `schema.sql:238-275` — `prontuario`, sem nome |
| Chamada por voz | ✅ sim | `src/lib/speech.js:3,38-40` — só o número, soletrado |
| Auditoria | ✅ sim | `src/lib/audit.js:7` — grava `prontuario`, não o nome |
| **Dietas** | 🔴 **não** | `schema.sql:335-339` — `nome_paciente`, `nome_social`, `nome_mae`, `data_nascimento`, `sexo` |
| **Avaliação nutricional** | 🔴 **não** | `schema.sql:395-397,451` — idem, mais diagnóstico, alergias e exames |
| **Visitantes** | 🔴 **não** (por necessidade) | `schema.sql:218-219` — `nome`, `documento` |

⚠️ **Conclusão técnica:** a afirmação *"nenhuma tabela armazena nome de
paciente"* **não é verdadeira** no estado atual do esquema. Três tabelas
armazenam dado pessoal identificável, e uma delas armazena dado sensível de
saúde.

O comentário em `schema.sql:334` reconhece parcialmente a exceção:
> *"Identificação nominal: usada apenas quando o setor emite etiquetas com nome."*

**Impacto:** o texto `LGPD_NOTICE` é exibido na interface ao usuário
(`src/lib/brand.js:11`). Afirmar ao operador que o sistema não guarda dado
pessoal identificável, quando guarda, é inexatidão que pode induzir a equipe a
tratar o sistema com menos cuidado do que ele exige.

**Medida recomendada:** corrigir o aviso para refletir o desenho real — por
exemplo, *"Identificação por prontuário; dados nominais restritos aos módulos de
nutrição e portaria"* — ou remover os campos nominais (ver `LGPD-001`).
→ **Necessita validação jurídica/compliance.**

---

## 2. INVENTÁRIO DE DADOS PESSOAIS

Formato conforme a seção 21 do prompt mestre.
Categorias: **P** = dado pessoal · **S** = dado pessoal sensível ·
**A** = dado de autenticação · **I** = dado institucional (não pessoal).

---

### LGPD-001 — Dados nominais de paciente (nutrição)

| Atributo | Conteúdo |
|---|---|
| **Campos** | `dietas.nome_paciente`, `nome_social`, `nome_mae`, `data_nascimento`, `sexo`<br>`avaliacoes_nutricionais.nome_paciente`, `nome_social`, `data_nascimento`, `sexo` |
| **Categoria** | **P** — dado pessoal identificável |
| **Finalidade identificada** | Emissão de etiqueta de dieta com identificação nominal, quando o setor opta por esse modo (`schema.sql:334`; `EtiquetasDieta.jsx:170-175` alterna entre prontuário e nome) |
| **Origem** | Digitação manual pela nutricionista (`Nutricao.jsx:826-849`; `AvaliacaoNutricional.jsx:474-519`) — campos **opcionais** |
| **Uso** | Etiqueta impressa (`EtiquetasDieta.jsx:257-264`), busca na lista (`EtiquetasDieta.jsx:37`), prévia na tela, ficha impressa |
| **Quem acessa** | Perfis com `nutricao:ver` ou `avaliacao-nutricional:ver` — **e qualquer portador da chave anônima** (`SEC-001`) |
| **Onde é armazenado** | PostgreSQL, em claro |
| **Proteção adicional necessária** | Controle de acesso efetivo no servidor; minimização |
| **Exposição na API** | Hoje: total, via PostgREST com chave anônima |
| **Exposição em log** | Não identificada. `audit.js` grava `prontuario`, não o nome |
| **Retenção** | 🔴 **Indefinida.** Nada apaga ou anonimiza |
| **Exclusão / anonimização** | 🔴 Ausente |

**Observações técnicas**
- `nome_mae` é **dado pessoal de terceiro** (a mãe), coletado sem que ela seja
  usuária do sistema.
- `nomeDeChamada()` (`src/lib/nutricao.js:18-22`) dá precedência ao nome social —
  tratamento correto e respeitoso de identidade de gênero.
- `sexo` com opção "Outros" (`constants.js:222-226`) — adequado.
- **Questão de minimização:** a etiqueta precisa de nome **completo**, data de
  nascimento **e** nome da mãe? São três identificadores para conferência à
  beira-leito. → **Necessita validação jurídica/compliance.**

**Medida recomendada:** manter os campos (há finalidade legítima de segurança
assistencial na conferência de identidade), mas: (a) tornar o modo nominal uma
configuração institucional explícita, não uma escolha de tela; (b) aplicar
controle de acesso no servidor; (c) definir retenção; (d) auditar emissão de
etiqueta nominal.

---

### LGPD-002 — Dados de visitantes e acompanhantes

| Atributo | Conteúdo |
|---|---|
| **Campos** | `visitantes.nome` (obrigatório), `documento`, `parentesco`, `prontuario`, `setor`, `quarto_leito`, `entrada`, `saida`, `reentradas`, `observacao` |
| **Categoria** | **P** — nome e documento de identificação de terceiro |
| **Finalidade identificada** | Controle de acesso físico ao hospital, limite de permanência de 60 min (`RN-018`) e rastreabilidade de quem esteve em qual leito |
| **Origem** | Digitação na recepção (`Visitantes.jsx:68-99`) |
| **Uso** | Crachá impresso (`Visitantes.jsx:119`), lista de quem está dentro, contador de prazo, exportação CSV |
| **Quem acessa** | `visitantes:ver` — **e qualquer portador da chave anônima** |
| **Onde é armazenado** | PostgreSQL, em claro. Crachá em papel fora do sistema |
| **Proteção adicional** | Controle de acesso; avaliar mascarar `documento` |
| **Exposição na API** | Hoje total |
| **Exposição em log** | 🔴 **Sim.** `Visitantes.jsx` registra nome em auditoria (ver `LGPD-004`) |
| **Retenção** | 🔴 Indefinida |
| **Exclusão** | 🔴 Ausente |

**Observação de sensibilidade indireta:** a combinação
`nome` + `parentesco` + `prontuario` + `setor` revela que determinada pessoa tem
familiar internado em setor específico. `setor = 'Isolamento'` ou
`'UTI Adulto'` permite **inferir condição de saúde de terceiro**.

**Medidas recomendadas**
- Armazenar apenas os dígitos finais do documento, ou só o tipo, se a finalidade
  for conferência presencial.
- Retenção curta e expurgo automático — a finalidade se esgota com a saída.
- Não exportar nome em CSV sem necessidade declarada.
→ Prazo de retenção: **Necessita validação jurídica/compliance.**

---

### LGPD-003 — Dados clínicos expostos em rota pública

| Atributo | Conteúdo |
|---|---|
| **Campos** | Todas as colunas de `cirurgias`, incluindo `procedimento`, `especialidade`, `cirurgiao`, `anestesista`, `infeccao`, `evento_adverso`, `obito`, `motivo_cancelamento`, `observacao`, `checklist_oms` |
| **Categoria** | **S** — dado de saúde (desfecho clínico associado a prontuário) + **P** (nome de profissional) |
| **Finalidade identificada** | O painel `/status` deveria mostrar **apenas** prontuário, horário e status, para a família acompanhar na sala de espera |
| **Exposição real** | 🔴 Toda a tabela, todo o histórico, **sem autenticação** |

**Evidência**
- `src/App.jsx:94` — rota fora do `PrivateArea`
- `src/pages/PainelStatus.jsx:24` — `useCollections(['cirurgias'])`
- `src/data/supabaseAdapter.js:36` — `select('*')`
- `src/pages/PainelStatus.jsx:31` — filtro de data **no cliente**
- `supabase/schema.sql:533-542` — a view de exposição mínima existe
- `supabase/security.sql:137` — e está liberada para `anon`
- **A view não é usada** (`grep` sem resultado em `src/`)

**Impacto:** associar um número de prontuário a `obito = true` ou
`infeccao = true` é tratamento de dado de saúde. A URL do painel é feita para
circular (TV na sala de espera).

**Medida recomendada — prioridade máxima**
1. Correção imediata: consultar a view `painel_acompanhantes`.
2. Definitiva: `API-050`, com projeção de 5 campos e filtro no servidor.
3. Revogar `select` de `anon` em `cirurgias`.

Ver `SEC-002`.

---

### LGPD-004 — Dado pessoal na trilha de auditoria

| Atributo | Conteúdo |
|---|---|
| **Campos** | `log_auditoria.usuario` (nome do operador), `funcao`, `prontuario`, `setor`, `referencia`, `detalhe` |
| **Categoria** | **P** |
| **Finalidade** | Rastreabilidade de ações — finalidade legítima e necessária |
| **Risco identificado** | `detalhe` é **texto livre montado no cliente** |

**Evidência**
- `src/lib/audit.js:15-26` — o cliente monta o registro
- `src/pages/Visitantes.jsx` — registra o nome do visitante em `referencia`/`detalhe`
- `src/pages/Nutricao.jsx:252` — `detalhe` com consistência, modificação e regime
- `src/pages/EtiquetasDieta.jsx:85` — registra se a impressão foi por nome ou prontuário

**Observação:** o campo `detalhe` pode acumular informação clínica em texto
livre. Para auditoria isso é desejável (contexto), mas significa que
`log_auditoria` **também é repositório de dado clínico** e precisa do mesmo
controle de acesso das tabelas assistenciais — hoje tem a política mais aberta
possível, incluindo `DELETE` para `anon` (`SEC-005`).

**Medidas recomendadas**
- Auditoria escrita pelo servidor; `usuario_id` como FK, não nome.
- Revisar o conteúdo de `detalhe`: registrar **o que mudou**, não transcrever
  dado clínico.
- Sem `UPDATE`/`DELETE` para perfil de aplicação.
- Retenção explícita (auditoria normalmente exige prazo **maior** que o do dado
  operacional). → **Necessita validação jurídica/compliance.**

---

### LGPD-005 — Dados de profissionais

| Atributo | Conteúdo |
|---|---|
| **Campos** | `equipe_medica.nome`, `registro` (CRM/COREN), `telefone_ramal`, `especialidade`, `turno`, `disponibilidade`<br>`escala_plantao.profissional`, `substituto`<br>`cirurgias.cirurgiao`, `anestesista`, `equipe[]`<br>`usuarios.nome`, `usuario`, `funcao`, `setores`<br>`avaliacoes_nutricionais.nutricionista`, `crn` |
| **Categoria** | **P** — dado pessoal de profissional, inclusive registro de conselho |
| **Finalidade** | Escala, responsabilidade técnica e rastreabilidade assistencial — legítima |
| **Exposição** | `cirurgiao` e `anestesista` hoje expostos na rota pública (`LGPD-003`) |
| **Retenção** | 🔴 Indefinida. Profissional desligado permanece no sistema |

**Observação:** `disponibilidade` inclui `'ferias'` e `'folga'`
(`constants.js:105-106`) — informação sobre a vida do trabalhador.

**Medidas recomendadas:** inativação lógica em vez de exclusão (preserva
histórico assistencial, que deve ser mantido); remover nome de profissional da
rota pública; restringir `telefone_ramal` a quem precisa.

---

### LGPD-006 — Dados de saúde na avaliação nutricional

| Atributo | Conteúdo |
|---|---|
| **Campos** | `diagnostico_medico`, `diagnostico_nutricional`, `alergias`, `exames` (jsonb), `condicao_clinica`, `apetite`, `nausea`, `diarreia`, `constipacao`, `disfagia`, `edema`, `edema_local`, `lesoes`, `mobilidade`, `nrs` (jsonb), `nrs_risco`, `asg`, `peso_atual`, `altura`, `imc`, `perda_peso_percent`, `evolucoes` (jsonb), `observacoes`, `consumo_habitual`, `jejum_motivo` |
| **Categoria** | 🔴 **S** — dado pessoal **sensível** de saúde (art. 5º, II, LGPD) |
| **Finalidade** | Assistência nutricional — legítima e necessária ao cuidado |
| **Origem** | Nutricionista, à beira-leito (`AvaliacaoNutricional.jsx`) |
| **Uso** | Ficha impressa, indicadores agregados, evolução |
| **Quem acessa** | `avaliacao-nutricional:ver` — **e qualquer portador da chave anônima** |
| **Proteção adicional necessária** | 🔴 Controle de acesso no servidor; auditoria de **leitura**, não só de escrita |
| **Exposição na API** | Hoje total, 57 colunas |
| **Retenção** | 🔴 Indefinida |

**É a tabela com maior sensibilidade do sistema.** Combina identificação nominal
(`LGPD-001`) com diagnóstico, exames e evolução clínica.

**Observação de minimização:** `exames` guarda nove resultados laboratoriais com
data. É dado clínico de terceiros sistemas (laboratório) replicado aqui. Avaliar
se a finalidade nutricional exige **armazenar** o resultado ou apenas
**consultá-lo** na origem.
→ **Necessita validação jurídica/compliance.**

**Medida recomendada específica:** este é o único conjunto do sistema em que
**auditoria de leitura** se justifica — registrar quem consultou a ficha de qual
prontuário, e quando.

---

### LGPD-007 — Dados de autenticação

| Atributo | Conteúdo |
|---|---|
| **Campos** | `usuarios.senha` (hash bcrypt), `usuario` (login) |
| **Categoria** | **A** — dado de autenticação |
| **Tratamento atual** | ✅ Hash bcrypt com sal (`security.sql:28`); leitura revogada para `anon` (`:126`) |
| **Problema** | 🔴 `grant insert, update` da coluna para `anon` (`:132`); 🔴 credencial padrão `admin`/`1123` no código (`SEC-012`); 🔴 sessão sem token (`SEC-003`) |
| **Exposição em log** | ✅ Nenhuma senha registrada. `security.sql` grava o login tentado, não a senha |
| **Retenção** | Vinculada ao vínculo do profissional |

**Medidas:** ver `SEC-006`, `SEC-012`, `05_AUTENTICACAO_AUTORIZACAO.md`.
**Nunca** registrar senha em log, nem em `log_auditoria.detalhe`, nem em
mensagem de erro.

---

### LGPD-008 — Exportação CSV sem rastreabilidade

| Atributo | Conteúdo |
|---|---|
| **Operação** | Geração de CSV no navegador |
| **Dados envolvidos** | Conforme a tela: prontuário, nome de visitante, dados de avaliação nutricional, movimentação de estoque, trilha de auditoria |
| **Evidência** | `src/lib/csv.js:11-28`; usada em 10 telas |
| **Problema** | 🔴 **Nenhuma exportação é registrada em auditoria.** O arquivo sai do sistema sem rastro |

**Impacto:** não é possível responder "quem extraiu a lista de pacientes e
quando" — pergunta central em qualquer investigação de incidente de dados.
A exportação é o principal vetor de vazamento autorizado.

**Medidas recomendadas**
- Exportação pelo servidor, em endpoint próprio, **sempre auditada**: usuário,
  data, filtro aplicado, quantidade de registros.
- Avaliar restringir exportação de dados nominais a perfis específicos.
- Marcar o arquivo com data, usuário e aviso de confidencialidade.

---

### LGPD-009 — Impressos com dado nominal

| Atributo | Conteúdo |
|---|---|
| **Impressos** | Crachá de visitante (nome, documento, parentesco, prontuário, leito); etiqueta de dieta em modo nominal (nome, nascimento, nome da mãe); ficha de avaliação nutricional completa |
| **Evidência** | `src/lib/print.js`; `Visitantes.jsx:119`; `EtiquetasDieta.jsx:257-264`; `AvaliacaoNutricional.jsx:789-891` |
| **Problema** | O dado sai do controle do sistema em papel. Etiqueta de dieta circula pela cozinha e pelos corredores |

**Observação:** o modo padrão da etiqueta é por **prontuário**
(`EtiquetasDieta.jsx:27` — `useState('prontuario')`), o que é a escolha correta.
O modo nominal é opt-in por sessão de impressão.

**Medidas recomendadas**
- Registrar em auditoria a emissão de impresso nominal (hoje o módulo de
  etiquetas já registra o modo — `EtiquetasDieta.jsx:85` — preservar isso).
- Política de descarte de impressos (fragmentação).
- Avaliar se a etiqueta nominal precisa de nome da mãe.
→ **Necessita validação jurídica/compliance.**

---

### LGPD-010 — Dados fictícios em base real

| Atributo | Conteúdo |
|---|---|
| **Problema** | `seedDietas()` insere 13 prescrições com nomes de pessoas fictícias e prontuários numéricos no banco real |
| **Evidência** | `src/data/seeds.js:212-256`; `src/data/supabaseAdapter.js:39-42` |
| **Risco de proteção de dados** | Os prontuários fictícios (`204871`, `229487`, ...) podem **coincidir com prontuários reais**. Nesse caso, uma prescrição de dieta falsa fica associada a um paciente real |

**Impacto:** registro clínico incorreto é risco assistencial, não apenas de
dados. Também contamina os indicadores de qualidade.

**Medida recomendada:** ver `SEC-007`. Remover dados clínicos fictícios da
semeadura; manter apenas estrutura (leitos, salas, boxes de PS).

---

## 3. REQUISITOS TÉCNICOS DE PROTEÇÃO DE DADOS

Mapeados contra os princípios da LGPD, com a ressalva de que a adequação formal
depende de avaliação jurídica.

### 3.1 Minimização

| # | Requisito | Situação |
|---|---|---|
| MIN-01 | Identificação por prontuário como padrão | ✅ Cumprido na maior parte do sistema |
| MIN-02 | Campos nominais de nutrição como exceção configurável, não livre por tela | 🔴 Hoje é escolha de tela |
| MIN-03 | `visitantes.documento` reduzido ou mascarado | 🔴 Armazenado integralmente |
| MIN-04 | Rota pública com projeção mínima | 🔴 `LGPD-003` |
| MIN-05 | Avaliar não replicar resultado de exame laboratorial | 🔴 `LGPD-006` |
| MIN-06 | `SELECT` por colunas necessárias, não `select('*')` | 🔴 Todas as 17 coleções usam `*` |

### 3.2 Controle de acesso

| # | Requisito | Situação |
|---|---|---|
| ACC-01 | Autorização aplicada no servidor | 🔴 `SEC-001` — só interface |
| ACC-02 | Permissão por módulo e ação, já modelada | 🟡 Modelo existe (`permissions.js`), aplicação não |
| ACC-03 | Segregação entre admin de sistema e acesso a dado clínico | 🔴 Ausente |
| ACC-04 | Sessão com expiração e revogação | 🔴 `SEC-003` |
| ACC-05 | Acesso ao banco só pela aplicação | 🔴 `SEC-001` |

### 3.3 Rastreabilidade e auditoria

| # | Requisito | Situação |
|---|---|---|
| AUD-01 | Auditoria de escrita | 🟡 Existe, mas escrita pelo cliente (`SEC-005`) |
| AUD-02 | Auditoria de **leitura** de dado sensível | 🔴 Ausente — necessária para `LGPD-006` |
| AUD-03 | Auditoria de exportação | 🔴 Ausente — `LGPD-008` |
| AUD-04 | Auditoria de emissão de impresso nominal | 🟡 Parcial (etiquetas sim, crachá não) |
| AUD-05 | Trilha imutável para a aplicação | 🔴 `DELETE` liberado |
| AUD-06 | Auditoria de login e de acesso negado | 🟡 Login sim (`security.sql`); 403 não existe |
| AUD-07 | Registro de IP e user agent | 🔴 Ausente |

### 3.4 Retenção, exclusão e anonimização

| # | Requisito | Situação |
|---|---|---|
| RET-01 | Prazo de retenção por categoria de dado | 🔴 **Nenhum prazo definido em lugar algum** |
| RET-02 | Expurgo automático de dados de visitante | 🔴 Ausente — finalidade se esgota na saída |
| RET-03 | Anonimização de dado clínico após prazo legal | 🔴 Ausente |
| RET-04 | Exclusão a pedido do titular, quando aplicável | 🔴 Ausente; `DELETE` é físico, sem registro do que foi apagado |
| RET-05 | Retenção de auditoria maior que a do dado operacional | 🔴 Não definida |
| RET-06 | Inativação lógica de profissional em vez de exclusão | 🔴 `DELETE` físico em `equipe_medica` |

🔴 **Esta é a lacuna mais completa do sistema em proteção de dados: não existe
nenhum mecanismo de retenção, expurgo ou anonimização.** Todo dado inserido
permanece indefinidamente.

**Prazos aplicáveis:** prontuário e registro assistencial têm prazo de guarda
definido por norma do conselho profissional e por legislação de saúde, que pode
ser **maior** que o desejável sob a ótica de minimização.
→ **Necessita validação jurídica/compliance.** Não é decisão técnica.

### 3.5 Segurança em trânsito e em repouso

| # | Requisito | Situação |
|---|---|---|
| TRA-01 | HTTPS em todo tráfego | ✅ Supabase e provedores de hosting |
| TRA-02 | TLS na conexão aplicação ↔ banco | ❓ Indeterminado; exigir no backend Java |
| REP-01 | Cifra em repouso no banco | ❓ Indeterminado — configuração da instância |
| REP-02 | Cifra de backup | ❓ Indeterminado |
| REP-03 | Hash de senha | ✅ bcrypt custo 10 |

### 3.6 Prevenção de exposição indevida

| # | Requisito | Situação |
|---|---|---|
| EXP-01 | Nenhum dado pessoal em rota pública | 🔴 `LGPD-003` |
| EXP-02 | Mensagem de erro sem detalhe interno | 🔴 `SEC-010` |
| EXP-03 | Nenhum dado pessoal em log de aplicação | ✅ Não identificado |
| EXP-04 | Chave de API sem privilégio de dados | 🔴 `SEC-001` |
| EXP-05 | Voz anuncia só prontuário | ✅ `src/lib/speech.js:3` |
| EXP-06 | CSP para conter injeção | 🔴 Ausente |

---

## 4. MATRIZ RESUMO

| ID | Dado | Categoria | Onde | Exposição hoje | Retenção | Prioridade |
|---|---|---|---|---|---|---|
| LGPD-001 | Nome, nascimento, nome da mãe, sexo de paciente | P | `dietas`, `avaliacoes_nutricionais` | Chave anônima | Indefinida | ALTO |
| LGPD-002 | Nome e documento de visitante | P | `visitantes` | Chave anônima | Indefinida | ALTO |
| LGPD-003 | Desfecho clínico e nome de profissional | S + P | `cirurgias` | 🔴 **Rota pública** | Indefinida | **CRÍTICO** |
| LGPD-004 | Dado pessoal na trilha | P | `log_auditoria` | Chave anônima, apagável | Indefinida | ALTO |
| LGPD-005 | Dados de profissional | P | `equipe_medica`, `usuarios`, `escala_plantao` | Chave anônima | Indefinida | MÉDIO |
| LGPD-006 | Diagnóstico, exames, evolução | **S** | `avaliacoes_nutricionais` | Chave anônima | Indefinida | **CRÍTICO** |
| LGPD-007 | Credenciais | A | `usuarios` | Hash protegido na leitura, gravável | — | ALTO |
| LGPD-008 | Exportação CSV | P + S | Fora do sistema | Sem rastro | — | ALTO |
| LGPD-009 | Impressos nominais | P + S | Papel | Fora de controle | — | MÉDIO |
| LGPD-010 | Dados fictícios em base real | P | `dietas`, `cirurgias` | — | — | ALTO |

---

## 5. PENDÊNCIAS QUE EXIGEM DECISÃO JURÍDICA OU INSTITUCIONAL

Não são decisões técnicas e **não foram resolvidas nesta análise**.

1. **Base legal** para o tratamento de cada categoria — em especial dado sensível
   de saúde e dado de visitante.
2. **Prazo de retenção** por categoria, conciliando guarda obrigatória de
   registro assistencial com minimização.
3. **Política de anonimização** após o prazo de guarda.
4. **Manter ou remover** os campos nominais de paciente na nutrição
   (`LGPD-001`) — há finalidade de segurança assistencial na conferência de
   identidade à beira-leito, que pode prevalecer sobre a minimização.
5. **Armazenar ou apenas consultar** resultados de exame laboratorial
   (`LGPD-006`).
6. **Guardar documento de visitante** integralmente, parcialmente ou não guardar.
7. **Necessidade de cifra em coluna** para dado sensível, além da cifra em
   repouso do banco.
8. **Auditoria de leitura** de dado sensível: escopo e prazo de guarda da própria
   trilha.
9. **Texto do aviso de LGPD** exibido na interface (`src/lib/brand.js:11`), hoje
   impreciso em relação ao esquema real.
10. **Encarregado de dados (DPO)** e procedimento de atendimento a titular —
    nenhum recurso técnico de suporte existe no sistema.
11. **Política de descarte** de etiquetas e crachás impressos.
12. **Transferência internacional**: a instância Supabase fica em qual região? Se
    fora do Brasil, há requisito adicional. ❓ Indeterminado neste código.

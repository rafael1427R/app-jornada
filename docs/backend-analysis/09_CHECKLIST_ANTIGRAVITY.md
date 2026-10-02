# 09 — CHECKLIST OPERACIONAL PARA O ANTIGRAVITY

> Guia de execução para o agente responsável por implementar o backend Java.
> Cada item traz **ID · Descrição · Dependência · Prioridade · Status ·
> Critério de conclusão**.
>
> `Status` inicial de todos os itens: **PENDENTE**. Nada deste checklist foi
> implementado.

**Antes de começar, leia nesta ordem:** `01` → `02` → `03` → `04` → `05` → `06`
→ `07` → `08`.

**Três avisos que mudam decisões de implementação:**

1. **O backend não parte do zero.** Existe um PostgreSQL com 17 tabelas, hash
   bcrypt funcional e regras em `CHECK`. O trabalho é **colocar uma API na
   frente**, não recriar o modelo. Ver `03`.
2. **A senha existente não deve ser invalidada.** O hash é bcrypt `$2a$` e é
   compatível com `BCryptPasswordEncoder`. Ver `AUT-02`.
3. **Há decisões humanas pendentes** que alteram o contrato da API. Não as
   resolva por conta própria. Ver seção final do `README.md`.

---

## FASE 1 — FUNDAÇÃO

### F1-01 · Projeto Java
**Descrição:** criar projeto Maven ou Gradle — Java 21, Spring Boot 3.x — com as
dependências listadas em `04`, seção 1.
**Dependência:** decisão D-01 (framework) confirmada.
**Prioridade:** CRÍTICO
**Critério de conclusão:** `mvn verify` executa; `/actuator/health` responde 200.

### F1-02 · Arquitetura em camadas
**Descrição:** estrutura de pacotes de `04`, seção 8 — `config`, `security`,
`audit`, `common`, `modulo/*`. Separar Controller / Service / Repository /
Entity / DTO.
**Dependência:** F1-01
**Prioridade:** CRÍTICO
**Critério de conclusão:** um módulo (sugerido: `nutricao`) implementado de ponta
a ponta como referência para os demais.

### F1-03 · Configuração por ambiente
**Descrição:** `application.yml` com perfis `dev`, `hml`, `prod`. Nenhum segredo
no repositório; tudo por variável de ambiente.
**Dependência:** F1-01
**Prioridade:** CRÍTICO
**Critério de conclusão:** a aplicação **falha ao iniciar** se faltar credencial
do banco ou chave de assinatura de token — nunca sobe em modo degradado.
*(Lição de `SEC-004`: hoje o frontend sobe silenciosamente em modo local quando
falta variável de ambiente.)*

### F1-04 · Tratamento global de erro
**Descrição:** `@ControllerAdvice` devolvendo `application/problem+json`
(RFC 7807) conforme `API-000`.
**Dependência:** F1-02
**Prioridade:** ALTO
**Critério de conclusão:** nenhuma resposta de erro contém nome de tabela, SQL,
stack trace ou mensagem de driver. Resolve `SEC-010`.

### F1-05 · OpenAPI
**Descrição:** `springdoc-openapi`, com exemplos de request e response.
**Dependência:** F1-02
**Prioridade:** MÉDIO
**Critério de conclusão:** `/swagger-ui.html` lista todos os endpoints com
esquema e códigos de resposta.

### F1-06 · Observabilidade
**Descrição:** log estruturado JSON com id de correlação; Actuator; Micrometer.
**Dependência:** F1-01
**Prioridade:** MÉDIO
**Critério de conclusão:** toda requisição gera log com id de correlação,
usuário (quando autenticado), rota, status e duração. Nenhum dado pessoal no
log. Resolve `SEC-015`.

### F1-07 · CORS
**Descrição:** origem explícita do frontend, sem `*`.
**Dependência:** F1-01
**Prioridade:** ALTO
**Critério de conclusão:** requisição de origem não listada é rejeitada.
Resolve parte de `SEC-011`.

---

## FASE 2 — BANCO DE DADOS

### F2-01 · Baseline Flyway
**Descrição:** `V1__baseline.sql` a partir do `supabase/schema.sql` atual, de
modo que um banco já existente seja adotado sem recriação
(`flyway.baselineOnMigrate=true`).
**Dependência:** F1-01
**Prioridade:** CRÍTICO
**Critério de conclusão:** migração aplicada contra (a) banco vazio e (b) cópia
de um banco já em uso, sem perda de dado. Resolve `FUNC-070`.

### F2-02 · Entidades JPA
**Descrição:** 17 entidades conforme `03`. Atenção a `text[]`
(`@JdbcTypeCode(SqlTypes.ARRAY)`) e `jsonb`
(`@JdbcTypeCode(SqlTypes.JSON)`).
**Dependência:** F2-01
**Prioridade:** CRÍTICO
**Critério de conclusão:** teste de integração com Testcontainers lê e grava em
todas as 17 tabelas, incluindo arrays e `jsonb`.

### F2-03 · Índice único parcial de dieta ativa
**Descrição:**
`CREATE UNIQUE INDEX dietas_prontuario_ativa_idx ON dietas (prontuario) WHERE status = 'ativa';`
**Dependência:** F2-01
**Prioridade:** CRÍTICO
**Critério de conclusão:** teste concorrente com duas transações simultâneas
criando dieta ativa para o mesmo prontuário — uma passa, a outra recebe 409.
Resolve `RN-020`, que hoje só é validado no cliente.
⚠️ **Verificar duplicatas pré-existentes antes de criar o índice.**

### F2-04 · Conversão de medidas para numérico
**Descrição:** migração convertendo as colunas `text` numéricas de
`avaliacoes_nutricionais` (`peso_atual`, `altura`, `imc`, `perda_peso_percent`,
`cb`, `cmb`, `panturrilha`, `kcal_dia`, `proteina_g_dia`, `proteina_g_kg`,
`altura_joelho`, `peso_usual`) para `numeric`, tratando vírgula decimal e
valores não numéricos.
**Dependência:** F2-01
**Prioridade:** ALTO
**Critério de conclusão:** nenhum dado perdido; valores inválidos registrados em
tabela de quarentena para conferência manual; agregação SQL (média de IMC)
funciona. Resolve a limitação de `ENT-016`.
⚠️ **Migração destrutiva — exige backup verificado antes.**

### F2-05 · Constraints faltantes
**Descrição:** adicionar
`UNIQUE (salas_cirurgicas.nome)`, `UNIQUE (equipe_medica.registro)`,
`UNIQUE (produtos_estoque.nome)`,
`CHECK (produtos_estoque.estoque_atual >= 0)`,
`CHECK (uan_indicadores.temperatura_conformes <= temperatura_aferidas)`,
`CHECK` de formato em `uan_indicadores.competencia`,
`CHECK (dietas.via_enteral IN (...))` e `CHECK (dietas.consistencia IN (...))`.
**Dependência:** F2-01
**Prioridade:** ALTO
**Critério de conclusão:** cada constraint aplicada após verificação de dados
existentes. Resolve `RN-030`, `ENT-002`, `ENT-003`, `ENT-013`, `ENT-014`,
`ENT-017`.
⚠️ **Atenção:** `dietas` tem defaults legados (`consistencia = 'Geral'`,
`via_enteral = 'Não se aplica'`) fora das listas de `constants.js`. Migrar os
dados **antes** do `CHECK`.

### F2-06 · Tabela `sessoes`
**Descrição:** `ENT-021` — `id`, `usuario_id` FK, `token_hash`, `emitido_em`,
`expira_em`, `revogado_em`, `ip`, `user_agent`.
**Dependência:** F2-01
**Prioridade:** CRÍTICO
**Critério de conclusão:** índice em `token_hash`; rotina de expurgo de sessões
expiradas. Resolve `SEC-003`.

### F2-07 · Endurecimento da auditoria
**Descrição:** adicionar `usuario_id` FK em `log_auditoria`; revogar `UPDATE` e
`DELETE` do usuário de aplicação; manter `usuario` texto para histórico.
**Dependência:** F2-01
**Prioridade:** ALTO
**Critério de conclusão:** tentativa de `DELETE` em `log_auditoria` pelo usuário
da aplicação falha no banco. Resolve `SEC-005`, `ENT-012`.

### F2-08 · Dados estruturais por migração
**Descrição:** `V2__dados_estruturais.sql` com 150 leitos (9 setores,
`constants.js:137-147`), 30 boxes de PS, 8 leitos de RPA e as 9 salas
cirúrgicas. **Sem nenhum dado clínico fictício.**
**Dependência:** F2-01
**Prioridade:** ALTO
**Critério de conclusão:** banco novo fica operacional sem precisar da semeadura
pelo cliente. Resolve `SEC-007`, `FUNC-049`, `LGPD-010`.

### F2-09 · Bootstrap do administrador
**Descrição:** criar o administrador master com **senha aleatória**, impressa uma
única vez no log de inicialização, com `senha_provisoria = true`.
**Dependência:** F2-08
**Prioridade:** CRÍTICO
**Critério de conclusão:** nenhuma senha literal no código ou em migração; o
primeiro login exige troca. Resolve `SEC-012`.

### F2-10 · Revogar acesso de `anon` *(etapa final)*
**Descrição:** criar usuário de banco exclusivo da aplicação com privilégio
mínimo; revogar todo acesso de `anon` e `authenticated`; remover a política
`acesso_interno`; rotacionar a chave anônima.
**Dependência:** **Fase 5 concluída** — o frontend já migrado
**Prioridade:** CRÍTICO
**Critério de conclusão:** consulta com a chave anônima antiga é recusada em
todas as 17 tabelas. Resolve `SEC-001`.
⚠️ **Executar somente após o frontend parar de acessar o banco direto.**
Antecipar este item derruba o sistema.

---

## FASE 3 — SEGURANÇA

### F3-01 · Autenticação
**Descrição:** `API-001` — `POST /auth/login` com `BCryptPasswordEncoder`,
emissão de token, registro em `sessoes`.
**Dependência:** F2-06
**Prioridade:** CRÍTICO
**Critério de conclusão:** `CA-AUT-01`, `CA-AUT-03`, `CA-AUT-04` (ver `05`).
Senhas já existentes continuam válidas.

### F3-02 · Sessão, logout e expiração
**Descrição:** `API-002`, `API-003`; `AUT-04`, `AUT-05`.
**Dependência:** F3-01
**Prioridade:** CRÍTICO
**Critério de conclusão:** `CA-AUT-05` — desativar usuário invalida a sessão na
requisição seguinte.

### F3-03 · Autorização por módulo e ação
**Descrição:** `PermissionEvaluator` lendo `{modulo: [acoes]}`;
`@PreAuthorize` em todos os endpoints, conforme a matriz de `05`, seção 2.4.
**Dependência:** F3-01
**Prioridade:** CRÍTICO
**Critério de conclusão:** `CA-AUT-02` — usuário com apenas `ver` recebe 403 no
`POST`, e **nenhuma linha é inserida**. Resolve `GAP-01`.

### F3-04 · Projeção sem senha
**Descrição:** `senha` fora de todo DTO de resposta.
**Dependência:** F2-02
**Prioridade:** CRÍTICO
**Critério de conclusão:** `CA-AUT-06`.

### F3-05 · Troca e redefinição de senha
**Descrição:** `API-004` (própria, exige atual) e `API-005` (administrativa,
auditada).
**Dependência:** F3-01
**Prioridade:** ALTO
**Critério de conclusão:** `FUNC-056` coberto; auditoria sem nenhuma senha.

### F3-06 · Política de senha e rate limit
**Descrição:** `SEC-006` — mínimo 8 caracteres (12 para master), bloqueio
progressivo após 5 tentativas por login e por IP, rejeição de senhas comuns.
**Dependência:** F3-01
**Prioridade:** ALTO
**Critério de conclusão:** 6ª tentativa em sequência responde 429.
Resolve `FUNC-062`.

### F3-07 · Mensagem genérica de credencial
**Descrição:** `AUT-07` — mesma resposta para usuário inexistente e senha
incorreta; distinção apenas na auditoria.
**Dependência:** F3-01
**Prioridade:** MÉDIO
**Critério de conclusão:** resposta e tempo de resposta indistinguíveis entre os
dois casos. Resolve `SEC-009`.

### F3-08 · Auditoria no servidor
**Descrição:** `AuditService` + interceptor; gravação na mesma transação;
`usuario_id` da sessão, nunca do corpo.
**Dependência:** F2-07, F3-01
**Prioridade:** ALTO
**Critério de conclusão:** `CA-AUT-07`; toda escrita gera registro; rollback da
operação faz rollback do log. Resolve `FUNC-005`, `SEC-005`.

### F3-09 · Auditoria de leitura de dado sensível
**Descrição:** `AUD-02` — registrar consulta a `avaliacoes_nutricionais` por
prontuário.
**Dependência:** F3-08
**Prioridade:** MÉDIO
**Critério de conclusão:** `GET /avaliacoes-nutricionais/{id}` gera registro com
usuário, prontuário e momento. Resolve parte de `LGPD-006`.

### F3-10 · Gestão de segredos
**Descrição:** `CRY-01` a `CRY-05`.
**Dependência:** F1-03
**Prioridade:** CRÍTICO
**Critério de conclusão:** nenhum segredo no repositório; TLS obrigatório na
conexão com o banco; usuário de banco sem superusuário.

---

## FASE 4 — APIs

### F4-01 · Endpoint público do painel
**Descrição:** `API-050` — projeção de 5 campos, filtro de data no servidor,
rate limit por IP.
**Dependência:** F1-04
**Prioridade:** **CRÍTICO — primeiro endpoint a entregar**
**Critério de conclusão:** `CA-AUT-09`. Resolve `SEC-002`, `LGPD-003`.
> **Por que primeiro:** é a única correção que fecha uma exposição pública de
> dado clínico e **não depende** do restante da migração. Pode ir a produção
> isoladamente.

### F4-02 · CRUD das 17 coleções
**Descrição:** `API-010` a `API-026`, com as exceções de `04`, seção 4.
**Dependência:** F2-02, F3-03
**Prioridade:** CRÍTICO
**Critério de conclusão:** cada recurso com GET/POST/PUT/DELETE conforme a
matriz, permissão aplicada e auditoria gravada. `/auditoria` apenas GET.

### F4-03 · Paginação, ordenação e busca
**Descrição:** `Pageable` em todos os `GET` de coleção; `?q=` com `unaccent`
equivalente a `matches()` do cliente.
**Dependência:** F4-02, **F4-05**
**Prioridade:** ALTO
**Critério de conclusão:** limite máximo de página aplicado no servidor; busca
com e sem acento retorna o mesmo resultado que o cliente retornava.
Resolve `SEC-014`, `GAP-08`.
⚠️ **Não entregar antes de F4-05** — ver `08`, seção 4.1: paginar sem endpoint
de indicador quebra as telas de indicador.

### F4-04 · Regras de negócio com concorrência
**Descrição:** `API-027` (`RN-020`) e `API-029` (`RN-031`), ambas
`@Transactional` com bloqueio.
**Dependência:** F2-03, F4-02
**Prioridade:** CRÍTICO
**Critério de conclusão:** teste concorrente de dieta ativa duplicada → 409;
teste concorrente de saída de estoque → saldo nunca negativo.
Resolve `SEC-008`.

### F4-05 · Endpoints de indicador
**Descrição:** `API-040` a `API-044`, com agregação em SQL.
**Dependência:** F4-02
**Prioridade:** ALTO
**Critério de conclusão:** cada indicador produz **exatamente** o mesmo número
que o cálculo atual do cliente, para a mesma massa de dados. Ver F6-05.

### F4-06 · Lançamento dos indicadores da UAN
**Descrição:** `API-030` — upsert por competência, com validações.
**Dependência:** F4-02
**Prioridade:** ALTO
**Critério de conclusão:** `FUNC-048` deixa de ser 🔴.
**Observação:** depende de **tela nova no frontend**, fora do escopo do backend.

### F4-07 · Metas de indicador em banco
**Descrição:** `ENT-022` — tabela `metas_indicador` com vigência; `API-042`
devolve meta e direção.
**Dependência:** F4-05
**Prioridade:** MÉDIO
**Critério de conclusão:** alterar uma meta não exige build do frontend.
Resolve `RN-027`, `GAP-15`.

### F4-08 · Histórico de ocupação de leito
**Descrição:** `ENT-019` — tabela `leito_ocupacoes` com `motivo_saida`;
popular na ocupação e na alta.
**Dependência:** F2-01, F4-02
**Prioridade:** MÉDIO
**Critério de conclusão:** taxa de giro e tempo médio de permanência calculáveis
em SQL. Resolve a limitação de `ENT-008`.

### F4-09 · Agregado de prontuário
**Descrição:** `GET /prontuarios/{prontuario}` consolidando cirurgias, leitos,
dietas, avaliações e PS.
**Dependência:** F4-02
**Prioridade:** MÉDIO
**Critério de conclusão:** `Prontuarios.jsx` deixa de precisar de múltiplas
coleções. Atende `FUNC-030`.

### F4-10 · Exportação auditada
**Descrição:** `LGPD-008` — exportação CSV no servidor, sempre auditada
(usuário, filtro, quantidade).
**Dependência:** F3-08
**Prioridade:** MÉDIO
**Critério de conclusão:** nenhuma exportação possível sem registro.

---

## FASE 5 — INTEGRAÇÕES

### F5-01 · Cliente HTTP no frontend
**Descrição:** Etapa 1 de `08`, seção 5.
**Dependência:** F4-02
**Prioridade:** CRÍTICO
**Critério de conclusão:** timeout de 12 s preservado; 401 dispara logout; 403
mostra mensagem de permissão.

### F5-02 · Novo adaptador de dados
**Descrição:** Etapa 2 — `apiAdapter.js` com a mesma interface do
`supabaseAdapter`; trocar `store.js:18`.
**Dependência:** F5-01
**Prioridade:** CRÍTICO
**Critério de conclusão:** as 20 telas funcionam **sem alteração de código de
tela**.

### F5-03 · Autenticação no frontend
**Descrição:** Etapa 3 — reescrever `authRemote.js` preservando o contrato de
três estados; remover `useCollection('usuarios')` do `AuthProvider`; remover o
login local.
**Dependência:** F3-01, F5-01
**Prioridade:** CRÍTICO
**Critério de conclusão:** nenhuma sessão baixa a tabela de usuários; o caminho
de senha em texto puro não existe mais. Resolve `SEC-004`.

### F5-04 · Painel público no frontend
**Descrição:** Etapa 4 — `PainelStatus.jsx` consome `API-050`.
**Dependência:** F4-01
**Prioridade:** **CRÍTICO — pode ser antecipado**
**Critério de conclusão:** a aba de rede da rota `/status` não mostra nenhuma
requisição à tabela `cirurgias`.

### F5-05 · Indicadores no frontend
**Descrição:** Etapa 5.
**Dependência:** F4-05, F5-02
**Prioridade:** ALTO
**Critério de conclusão:** números idênticos aos atuais; nenhuma coleção
completa baixada pelas telas de indicador.

### F5-06 · Paginação no frontend
**Descrição:** Etapa 6.
**Dependência:** F4-03, F5-05
**Prioridade:** ALTO
**Critério de conclusão:** listas paginadas; busca no servidor.

### F5-07 · Remoção do acesso direto
**Descrição:** Etapa 7 — remover `@supabase/supabase-js`, `supabaseClient.js`,
`supabaseAdapter.js`, `localAdapter.js`.
**Dependência:** F5-02 a F5-06
**Prioridade:** CRÍTICO
**Critério de conclusão:** `grep -rn "supabase" src/` sem resultado; build
limpo. Habilita F2-10.

### F5-08 · Remoção do código morto
**Descrição:** remover `legacy/` (81 arquivos).
**Dependência:** nenhuma
**Prioridade:** BAIXO
**Critério de conclusão:** diretório ausente; build inalterado.
Resolve `SEC-013`, `GAP-12`.

### F5-09 · Consolidação de hospedagem
**Descrição:** escolher um provedor; remover as configurações dos outros;
igualar cabeçalhos de segurança e adicionar CSP.
**Dependência:** nenhuma
**Prioridade:** MÉDIO
**Critério de conclusão:** uma única configuração de deploy.
Resolve `GAP-14`, parte de `SEC-011`.

### F5-10 · Integrações externas
**Descrição:** nenhuma identificada no projeto. **Não implementar** e-mail, push,
upload, HL7/FHIR ou pagamento sem requisito explícito.
**Prioridade:** —
**Critério de conclusão:** item encerrado como não aplicável
(`FUNC-063`, `FUNC-064`).

---

## FASE 6 — TESTES

> **Linha de base: zero.** Não existe nenhum teste no projeto
> (`FUNC-067`). Toda cobertura é nova.

### F6-01 · Testes unitários de regra
**Descrição:** cobrir as regras de `02`, Parte B. Mínimo obrigatório:
`RN-001` (prontuário), `RN-020` (dieta ativa única), `RN-031` (saldo),
`RN-026` (dedução de cardápio), `RN-027` (meta com direção),
`RN-028` (prazo de 24h), `RN-029` (risco NRS), `RN-036`/`RN-038` (permissões),
`RN-021` (reinício de cronômetro).
**Dependência:** F4-02
**Prioridade:** ALTO
**Critério de conclusão:** cada regra com teste de caso válido, inválido e de
borda.

### F6-02 · Testes de integração com Postgres real
**Descrição:** Testcontainers. Cobrir `text[]`, `jsonb`, triggers de
`atualizado_em`, trigger de hash de senha, `proteger_master`.
**Dependência:** F2-02
**Prioridade:** ALTO
**Critério de conclusão:** suíte verde contra PostgreSQL com o esquema real
migrado por Flyway.

### F6-03 · Testes de API
**Descrição:** contrato de todos os endpoints — status, formato, envelope de erro.
**Dependência:** F4-02
**Prioridade:** ALTO
**Critério de conclusão:** cada endpoint com teste de caminho feliz, 401, 403,
404, 422 e 409 quando aplicável.

### F6-04 · Testes de segurança e autorização
**Descrição:** executar todos os critérios de aceite `CA-AUT-01` a `CA-AUT-09`
de `05`, seção 3.
**Dependência:** F3-03
**Prioridade:** **CRÍTICO**
**Critério de conclusão:** os nove critérios passam. Em especial: `CA-AUT-02`
(403 sem efeito no banco), `CA-AUT-06` (senha nunca retornada), `CA-AUT-09`
(painel público minimizado).

### F6-05 · Testes de paridade de indicador
**Descrição:** para uma massa fixa, comparar cada indicador do servidor com o
valor que o cálculo atual do cliente produz.
**Dependência:** F4-05
**Prioridade:** ALTO
**Critério de conclusão:** divergência zero em todos os indicadores de
`API-040` a `API-043`.
> **Por que importa:** a direção do hospital vai comparar os números antes e
> depois. Divergência silenciosa destrói a confiança no sistema.

### F6-06 · Testes de concorrência
**Descrição:** dieta ativa duplicada e saída simultânea de estoque.
**Dependência:** F4-04
**Prioridade:** CRÍTICO
**Critério de conclusão:** sob 50 requisições paralelas, nenhuma dieta ativa
duplicada e nenhum saldo negativo.

### F6-07 · Teste de migração
**Descrição:** aplicar Flyway sobre cópia de banco em uso, incluindo F2-04
(conversão de medidas) e F2-05 (constraints).
**Dependência:** F2-04, F2-05
**Prioridade:** CRÍTICO
**Critério de conclusão:** nenhuma perda de dado; contagem de linhas preservada
em todas as tabelas; valores inválidos isolados em quarentena.

---

## FASE 7 — VALIDAÇÃO

### F7-01 · Validação funcional
**Descrição:** percorrer as 59 funcionalidades de `02`, Parte A, confirmando
paridade com o comportamento atual.
**Dependência:** Fase 5
**Prioridade:** CRÍTICO
**Critério de conclusão:** nenhuma funcionalidade 🟢 regride; `FUNC-048`
(lançamento UAN) passa a 🟢 quando a tela existir.

### F7-02 · Validação de regras
**Descrição:** `RN-001` a `RN-042` conferidas em ambiente de homologação.
**Dependência:** F6-01
**Prioridade:** CRÍTICO
**Critério de conclusão:** cada regra verificada e registrada.

### F7-03 · Validação de segurança
**Descrição:** reexecutar a avaliação de `06` contra o sistema novo.
**Dependência:** Fase 3, F2-10
**Prioridade:** CRÍTICO
**Critério de conclusão:** `SEC-001` a `SEC-003` fechados; nenhum risco CRÍTICO
ou ALTO em aberto sem aceite formal registrado.

### F7-04 · Validação de proteção de dados
**Descrição:** conferir os controles técnicos de `07`, seção 3.
**Dependência:** Fase 3
**Prioridade:** ALTO
**Critério de conclusão:** `MIN-*`, `ACC-*`, `AUD-*` e `EXP-*` atendidos.
**`RET-*` permanece pendente** até decisão jurídica sobre prazos — registrar
como pendência aberta, não como item concluído.

### F7-05 · Validação de desempenho
**Descrição:** carga nos endpoints de lista e de indicador, com volume projetado
de 12 meses de operação.
**Dependência:** F4-03, F4-05
**Prioridade:** MÉDIO
**Critério de conclusão:** nenhum endpoint acima de 1 s no percentil 95; nenhuma
resposta sem paginação.

### F7-06 · Validação de observabilidade
**Descrição:** confirmar log, métrica e alerta.
**Dependência:** F1-06
**Prioridade:** MÉDIO
**Critério de conclusão:** incidente simulado (rajada de 403) gera alerta;
nenhum dado pessoal aparece em log.

---

## ORDEM DE EXECUÇÃO RECOMENDADA

Entregas que reduzem risco antes de entregas que adicionam função.

| Onda | Itens | Resultado |
|---|---|---|
| **0 — correção imediata** | F4-01, F5-04, F5-08 | Fecha a exposição pública de dado clínico (`SEC-002`). Independe do resto |
| **1 — fundação** | F1-01 a F1-07, F2-01, F2-02, F2-06 | Projeto de pé, banco adotado, sessão modelada |
| **2 — segurança** | F3-01 a F3-04, F3-10, F2-09 | Autenticação e autorização reais (`SEC-001`, `SEC-003`) |
| **3 — dados** | F2-03 a F2-05, F2-07, F2-08, F4-04 | Integridade e concorrência (`SEC-007`, `SEC-008`) |
| **4 — API** | F4-02, F4-05, F4-06, F6-01 a F6-06 | Superfície completa, com testes |
| **5 — migração do frontend** | F5-01 a F5-03, F5-05 | Frontend sobre a API |
| **6 — encerramento** | F4-03, F5-06, F5-07, **F2-10** | Paginação e corte do acesso direto |
| **7 — complementos** | F3-05 a F3-09, F4-07 a F4-10, F5-09 | Endurecimento e melhorias |
| **8 — validação** | F7-01 a F7-06 | Aceite |

⚠️ **F2-10 é o último item técnico.** Revogar `anon` antes de F5-07 interrompe o
sistema em produção.

---

## RESUMO POR PRIORIDADE

| Prioridade | Itens | Total |
|---|---|---|
| **CRÍTICO** | F1-01, F1-02, F1-03, F2-01, F2-02, F2-03, F2-06, F2-09, F2-10, F3-01, F3-02, F3-03, F3-04, F3-10, F4-01, F4-02, F4-04, F5-01, F5-02, F5-03, F5-04, F5-07, F6-04, F6-06, F6-07, F7-01, F7-02, F7-03 | 28 |
| **ALTO** | F1-04, F1-07, F2-04, F2-05, F2-07, F2-08, F3-05, F3-06, F3-08, F4-03, F4-05, F4-06, F5-05, F5-06, F6-01, F6-02, F6-03, F6-05, F7-04 | 19 |
| **MÉDIO** | F1-05, F1-06, F3-07, F3-09, F4-07, F4-08, F4-09, F4-10, F5-09, F7-05, F7-06 | 11 |
| **BAIXO** | F5-08 | 1 |
| **Não aplicável** | F5-10 | 1 |
| **Total** | | **60** |

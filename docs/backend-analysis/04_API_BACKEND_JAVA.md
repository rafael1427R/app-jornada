# 04 — API DO BACKEND JAVA

> **Status de tudo neste documento: NECESSÁRIO ou RECOMENDAÇÃO.**
> Nenhum endpoint REST existe hoje. O frontend fala direto com o PostgreSQL via
> `@supabase/supabase-js`. A única "API" atual são duas funções RPC do Postgres
> (`autenticar_usuario`, `conferir_senha`) e as rotas REST geradas pelo Supabase
> para cada tabela — que não são código deste projeto.

---

## 1. FRAMEWORK

### Verificação prévia (exigida pela seção 30 do prompt mestre)

**EVIDÊNCIA:** busca por qualquer artefato Java no repositório:

| Procurado | Resultado |
|---|---|
| `pom.xml`, `build.gradle`, `settings.gradle` | **não existe** |
| `*.java`, `src/main/java` | **não existe** |
| `application.properties`, `application.yml` | **não existe** |
| `Dockerfile`, `docker-compose.yml` | **não existe** |
| Menção a Spring, Quarkus, Micronaut, Jakarta EE | **nenhuma** |

**Conclusão:** o projeto **não determina** framework de backend. Spring Boot não
é requisito existente.

### RECOMENDAÇÃO — Spring Boot

**Marcado explicitamente como recomendação, não como requisito do projeto.**

Justificativa ligada a necessidades identificadas nesta análise:

| Necessidade identificada | Como o Spring Boot atende |
|---|---|
| `SEC-001` — autorização por módulo e ação | Spring Security com `@PreAuthorize("hasPermission('nutricao','criar')")` e `PermissionEvaluator` próprio, mapeando a estrutura `{modulo: [acoes]}` que já existe em `permissions.js` |
| `SEC-003` — sessão com token e expiração | `spring-boot-starter-oauth2-resource-server` (JWT) ou sessão server-side com Spring Session |
| `ENT-001` — senha bcrypt já no banco | `BCryptPasswordEncoder` é compatível com o hash `$2a$` gerado por `crypt(senha, gen_salt('bf',10))` — **a migração não invalida as senhas existentes** |
| `RN-020`, `RN-031` — regras com concorrência | `@Transactional` + `@Version` (lock otimista) ou `SELECT ... FOR UPDATE` |
| 17 tabelas com CRUD uniforme | Spring Data JPA reduz boilerplate de repositório |
| `GAP-08` — falta paginação | `Pageable` nativo, com contrato `Page<T>` |
| `FUNC-005` — auditoria pelo servidor | Spring AOP ou Hibernate Envers |
| `GAP-09` — observabilidade ausente | Actuator + Micrometer |
| Documentação da API | `springdoc-openapi` gera OpenAPI 3 a partir dos controllers |

**Alternativa considerada:** Quarkus, se houver requisito de baixo consumo de
memória ou inicialização nativa. Nenhum requisito desse tipo foi identificado no
projeto → Spring Boot é a escolha de menor risco.

**Stack recomendada (a confirmar pelo responsável técnico):**

```text
Java 21 (LTS)
Spring Boot 3.x
  spring-boot-starter-web
  spring-boot-starter-validation      → Bean Validation nos DTOs
  spring-boot-starter-data-jpa
  spring-boot-starter-security
  spring-boot-starter-actuator
org.postgresql:postgresql
org.flywaydb:flyway-core              → migrações versionadas (GAP: não existem)
org.springdoc:springdoc-openapi-starter-webmvc-ui
MapStruct                             → Entity ↔ DTO
Testcontainers + JUnit 5 + AssertJ    → testes de integração com Postgres real
```

---

## 2. CONVENÇÕES GERAIS DA API

### API-000 — Regras aplicáveis a todos os endpoints

**NECESSÁRIO**

| Regra | Especificação | Motivo (rastreável) |
|---|---|---|
| Prefixo | `/api/v1` | — |
| Formato | JSON, `UTF-8` | — |
| Autenticação | `Authorization: Bearer <token>` em tudo, exceto `POST /auth/login` e `GET /public/painel-cirurgico` | `SEC-003` |
| Geração de `id` | **Sempre no servidor.** O `id` enviado pelo cliente deve ser ignorado | `RN-042` — o fallback de `uid()` não gera UUID válido |
| `criado_em` / `atualizado_em` | Sempre no servidor; somente leitura no contrato | `RN-041` |
| Datas vazias | A API aceita `null` **e** `""` na entrada e normaliza para `null`; na saída devolve `null` | `RN-040` — hoje o frontend envia `""` e o adaptador converte |
| Paginação | `?page=0&size=50&sort=campo,desc`; resposta `{content, page, size, totalElements, totalPages}` | `GAP-08` — hoje não existe |
| Erros | RFC 7807 `application/problem+json` | `SEC-010` — não vazar mensagem interna |
| Idempotência | `PUT` idempotente; `POST` não | — |
| Auditoria | Toda escrita gera registro **no servidor, na mesma transação** | `FUNC-005`, `SEC-005` |

### Envelope de erro (NECESSÁRIO)

```json
{
  "type": "https://vitalis.isac/errors/validacao",
  "title": "Dados inválidos",
  "status": 422,
  "detail": "O prontuário deve ter de 3 a 12 dígitos.",
  "instance": "/api/v1/dietas",
  "errors": [
    { "field": "prontuario", "message": "deve corresponder a ^\\d{3,12}$" }
  ]
}
```

**Regra de segurança:** `detail` nunca contém SQL, stack trace, nome de tabela
nem mensagem crua do driver. Hoje o frontend exibe a mensagem do banco em toast
(`store.js:120-123` apenas remove o prefixo `"Error: "`). Ver `SEC-010`.

### Códigos HTTP

| Código | Uso |
|---|---|
| 200 | GET, PUT bem-sucedidos |
| 201 | POST com `Location` |
| 204 | DELETE |
| 400 | JSON malformado |
| 401 | Sem token ou token inválido/expirado |
| 403 | Autenticado sem permissão no módulo/ação |
| 404 | Recurso inexistente |
| 409 | Conflito de regra (login duplicado, dieta ativa duplicada, código de leito repetido) |
| 422 | Falha de validação de campo |
| 429 | Rate limit (login) |
| 500 | Erro interno, sem detalhe ao cliente |

---

## 3. AUTENTICAÇÃO

### API-001 — `POST /api/v1/auth/login`

**Objetivo:** autenticar e emitir token.
**Origem:** `src/pages/Login.jsx` → `AuthContext.login()` (`:50`) →
`autenticarRemoto()` (`authRemote.js:26`).
**Substitui:** RPC `autenticar_usuario` (`security.sql:49-100`).

**Request**
```json
{ "usuario": "admin", "senha": "..." }
```

**Response 200**
```json
{
  "token": "eyJ...",
  "expiraEm": "2026-10-02T18:30:00Z",
  "usuario": {
    "id": "uuid",
    "nome": "Administrador Master",
    "usuario": "admin",
    "funcao": "Administrador",
    "master": true,
    "ativo": true,
    "setores": ["Centro Cirúrgico"],
    "permissoes": { "nutricao": ["ver","criar","editar","excluir"] }
  }
}
```

**Validações:** `usuario` e `senha` obrigatórios (`Login.jsx:21-22`).

**Regras de negócio**
- `RN-039` — usuário com `ativo = false` recebe 401 com motivo próprio
- Comparação com `BCryptPasswordEncoder.matches()` — compatível com o hash atual
- Busca case-insensitive por `lower(trim(usuario))` (`security.sql:71`)
- `permissoes` resolvidas no servidor por `RN-036` e `RN-038`

**Erros esperados**

| Situação | Código | Observação de segurança |
|---|---|---|
| Usuário inexistente | 401 | **Mensagem genérica.** Hoje o sistema diferencia "Usuário não encontrado" de "Senha incorreta" (`authRemote.js:13-14`), o que permite enumerar logins. Ver `SEC-009` |
| Senha incorreta | 401 | idem |
| Usuário inativo | 401 | mensagem específica é aceitável |
| Excesso de tentativas | 429 | `FUNC-062` — não existe hoje |

**Persistência:** cria registro em `sessoes` (`ENT-021`).
**Auditoria:** sucesso e falha, com `ip` e `user_agent`. Hoje a função SQL já
grava as quatro situações em `log_auditoria` (`security.sql:75,81,87,92`) — o
comportamento deve ser **preservado**.

---

### API-002 — `POST /api/v1/auth/logout`
**Objetivo:** revogar o token atual.
**Origem:** `AuthContext.logout()` (`:75`) — hoje apenas apaga o `localStorage`.
**Necessário:** marcar `sessoes.revogado_em`. Auditar.

### API-003 — `GET /api/v1/auth/me`
**Objetivo:** devolver usuário e permissões da sessão corrente.
**Origem:** hoje o frontend resolve o usuário buscando na lista completa de
usuários carregada em memória (`AuthContext.jsx:24-27`) — ou seja, **baixa todos
os usuários para descobrir quem está logado**. Este endpoint elimina isso.

### API-004 — `POST /api/v1/auth/senha`
**Objetivo:** trocar a própria senha.
**Origem:** `Usuarios.jsx:172-189`; RPC `conferir_senha` (`security.sql:103-118`).
**Request:** `{ "senhaAtual": "...", "senhaNova": "..." }`
**Validações:** `RN-033` (mínimo 4 — ver `SEC-006` para endurecer);
confirmação conferida no cliente (`Usuarios.jsx:185`), **reconferir no servidor**.
**Regra:** exige `senhaAtual` **sempre** para a própria senha.
**Auditoria:** sim, sem registrar qualquer senha.

### API-005 — `PUT /api/v1/usuarios/{id}/senha`
**Objetivo:** administrador redefinir senha de terceiro.
**Origem:** `Usuarios.jsx:172` — `exigeAtual = senhaModal.id === user?.id`;
quando é outro usuário, a senha atual **não** é pedida.
**Permissão:** `usuarios:editar`.
**Regra:** não exige senha anterior; **exige auditoria obrigatória** com o id do
administrador e o id do alvo.
**RECOMENDAÇÃO:** forçar troca no próximo login (`senha_provisoria boolean`).

---

## 4. CRUD DAS COLEÇÕES

As 17 coleções de `src/data/collections.js` exigem CRUD. O contrato é uniforme;
as diferenças estão em permissão, validação e regra.

### Padrão (NECESSÁRIO)

| Método | Rota | Permissão | Código |
|---|---|---|---|
| GET | `/api/v1/{recurso}` | `{modulo}:ver` | 200 |
| GET | `/api/v1/{recurso}/{id}` | `{modulo}:ver` | 200 / 404 |
| POST | `/api/v1/{recurso}` | `{modulo}:criar` | 201 |
| PUT | `/api/v1/{recurso}/{id}` | `{modulo}:editar` | 200 |
| DELETE | `/api/v1/{recurso}/{id}` | `{modulo}:excluir` | 204 |

### Mapa coleção → recurso → tabela → módulo

**EVIDÊNCIA das três primeiras colunas:** `src/data/collections.js:25-48`.
Coluna "Módulo" derivada de `canDo(...)` em cada página.

| ID | Coleção (frontend) | Recurso REST | Tabela | Módulo de permissão |
|---|---|---|---|---|
| API-010 | `salas` | `/salas-cirurgicas` | `salas_cirurgicas` | `mapa` |
| API-011 | `cirurgias` | `/cirurgias` | `cirurgias` | `agendamento` |
| API-012 | `equipe` | `/equipe-medica` | `equipe_medica` | `equipe` |
| API-013 | `equipamentos` | `/equipamentos` | `equipamentos` | `equipamentos` |
| API-014 | `escala` | `/escala-plantao` | `escala_plantao` | `escala` |
| API-015 | `rpa` | `/rpa-leitos` | `rpa_leitos` | `rpa` |
| API-016 | `leitos` | `/leitos` | `leitos` | `leitos` |
| API-017 | `visitantes` | `/visitantes` | `visitantes` | `visitantes` |
| API-018 | `psLeitos` | `/ps-leitos` | `ps_leitos` | `pronto-socorro` |
| API-019 | `psAltas` | `/ps-altas` | `ps_altas` | `pronto-socorro` |
| API-020 | `usuarios` | `/usuarios` | `usuarios` | `usuarios` |
| API-021 | `auditoria` | `/auditoria` | `log_auditoria` | `auditoria` |
| API-022 | `dietas` | `/dietas` | `dietas` | `nutricao` |
| API-023 | `produtos` | `/produtos-estoque` | `produtos_estoque` | `almoxarifado` |
| API-024 | `movimentacoes` | `/movimentacoes-estoque` | `movimentacoes_estoque` | `almoxarifado` |
| API-025 | `avaliacoes` | `/avaliacoes-nutricionais` | `avaliacoes_nutricionais` | `avaliacao-nutricional` |
| API-026 | `uanIndicadores` | `/uan-indicadores` | `uan_indicadores` | `nutricao` |

### Exceções ao padrão (NECESSÁRIO)

| Recurso | Exceção | Justificativa |
|---|---|---|
| `/auditoria` | **Sem POST, PUT, DELETE pelo cliente.** Apenas GET | `SEC-005` — hoje `anon` pode apagar a trilha. O log é escrito pelo próprio servidor |
| `/usuarios` | GET **nunca** retorna `senha`, em nenhuma projeção | `SEC-001` — hoje a coluna tem `grant update` para `anon` |
| `/usuarios/{id}` DELETE | 409 se `master = true` | `RN-037` |
| `/movimentacoes-estoque` | Sem PUT nem DELETE | Livro-razão é imutável. Correção por lançamento de estorno |
| `/uan-indicadores` | `PUT` por `competencia`, não por `id` | `RN` da unique index; ver `API-030` |

---

## 5. ENDPOINTS COM REGRA DE NEGÓCIO RELEVANTE

### API-027 — `POST /api/v1/dietas`

**Objetivo:** prescrever dieta.
**Origem:** `Nutricao.jsx:221-270` — função `salvar()`.

**Request (campos conforme `EMPTY` em `Nutricao.jsx:59-85`)**
```json
{
  "prontuario": "229487",
  "leito": "CM-15",
  "setor": "Clínica Médica",
  "regime": "internacao",
  "consistencia": "Branda",
  "modificacao": "Para renal",
  "tipoCardapio": "",
  "adequacoes": ["Zero lactose"],
  "viaEnteral": "JTT",
  "enteralTipo": "Industrializada",
  "enteralFormula": "Específica para nefropatia",
  "enteralVolume": "6 x 180 mL",
  "dietaPrescrita": "",
  "preparacaoDiferenciada": "",
  "acompanhanteRefeicao": false,
  "observacoes": "",
  "status": "ativa",
  "dataPrescricao": "2026-10-02",
  "nomePaciente": "",
  "nomeSocial": "",
  "sexo": "",
  "nomeMae": "",
  "dataNascimento": null
}
```

**Validações**
| Campo | Regra | Evidência |
|---|---|---|
| `prontuario` | `^\d{3,12}$` | `Nutricao.jsx:225` |
| `leito` | não vazio | `:226` |
| `regime` | ∈ `{internacao, observacao}` | `schema.sql:313` |
| `status` | ∈ `{ativa, suspensa, encerrada}` | `schema.sql:319` |
| `viaEnteral` | ∈ `FEEDING_ROUTES` (9 valores) | `constants.js:179` — **sem CHECK no banco hoje** |
| `consistencia` | ∈ `DIET_CONSISTENCY` (7 valores) | `constants.js:152` — **sem CHECK no banco hoje** |
| `tipoCardapio` | vazio ou ∈ `MENU_TYPES` | `constants.js:236` |

**Regras de negócio**
- **`RN-020` (crítica):** rejeitar com **409** se já existir dieta `ativa` para o
  prontuário. **Hoje só o cliente valida** (`Nutricao.jsx:227-228`) — duas
  sessões simultâneas criam duas dietas ativas. O backend deve garantir com
  índice único parcial + `@Transactional`.
- **`RN-021`:** `inicioEm = now()` na criação.
- `prescritoPor` = nome do usuário da sessão (**não aceitar do cliente**).
  Hoje vem do cliente (`Nutricao.jsx:237`).
- **Efeito colateral existente:** `Nutricao.jsx:255` chama `sugerirOcupacao()`,
  que pergunta ao operador se deve marcar o leito como ocupado e, em caso
  afirmativo, faz um `update` em `leitos`. O backend **não deve** embutir esse
  efeito: são duas operações distintas, iniciadas pelo usuário.

**Auditoria:** `acao='criar'`, `entidade='dieta'`, `prontuario`, `setor`,
`referencia = leito`, `detalhe` conforme `Nutricao.jsx:252`.

---

### API-028 — `PUT /api/v1/dietas/{id}`

**Regra adicional (`RN-021`):** se `regime` mudou, `inicioEm = now()`.
**Evidência:** `Nutricao.jsx:233,239`.
**Auditoria:** `acao='editar'`, com indicação de reinício de cronômetro.

---

### API-029 — `POST /api/v1/movimentacoes-estoque`

**Objetivo:** lançar entrada ou saída de estoque.
**Origem:** `Almoxarifado.jsx:145-148` e seguintes.

**Request**
```json
{ "produtoId": "uuid", "tipo": "saida", "quantidade": 12.5, "motivo": "Consumo UAN" }
```

**Validações**
| Campo | Regra | Evidência |
|---|---|---|
| `produtoId` | existe | `Almoxarifado.jsx:145` |
| `quantidade` | `> 0` | `:146`; `CHECK` em `schema.sql:377` |
| `tipo` | ∈ `{entrada, saida}` | `schema.sql:376` |

**Regra de negócio crítica — `RN-031`**
> Saída não pode exceder o saldo (`Almoxarifado.jsx:147-148`).

🔴 **Esta é a regra com maior risco de concorrência do sistema.** Hoje o cliente
lê `produto.estoque_atual` da memória, valida, grava a movimentação e grava o
novo saldo em `produtos_estoque` — **em operações separadas, sem transação**.
Duas saídas simultâneas do mesmo item produzem saldo incorreto ou negativo.

**Implementação obrigatória no backend:**
```text
@Transactional
1. SELECT ... FROM produtos_estoque WHERE id = ? FOR UPDATE
2. se tipo = 'saida' e quantidade > estoque_atual  → 409
3. novoSaldo = estoque_atual ± quantidade
4. INSERT movimentacoes_estoque (..., saldo_apos = novoSaldo)
5. UPDATE produtos_estoque SET estoque_atual = novoSaldo
6. INSERT log_auditoria
commit
```

**Auditoria:** sim; `usuario` da sessão, não do cliente.
**Observação de modelo:** considerar `estoque_atual` como **derivado**
(`SUM` das movimentações) em vez de coluna mantida à mão — elimina a
possibilidade de divergência. Ver `ENT-015`.

---

### API-030 — `PUT /api/v1/uan-indicadores/{competencia}`

**Objetivo:** lançar ou atualizar a competência mensal da UAN.
**Origem:** 🔴 **nenhuma tela chama isso hoje.** `FUNC-048` — a coleção é só
lida (`Nutricao.jsx:103`). Este endpoint atende a uma tela **a construir**.

**Path param:** `competencia` no formato `AAAA-MM`.

**Request**
```json
{
  "temperaturaAferidas": 128,
  "temperaturaConformes": 121,
  "custoRefeicao": 9.38,
  "restoIngestao": 9.6,
  "indiceDesperdicio": 11.9,
  "sobrasLimpas": 24.7,
  "satisfacaoPacientes": 84,
  "satisfacaoAcompanhantes": 80,
  "satisfacaoFuncionarios": 85,
  "refeicoesDistribuidas": 9735,
  "observacao": ""
}
```

**Validações (RECOMENDAÇÃO — não existem hoje)**
- `competencia` casa `^\d{4}-(0[1-9]|1[0-2])$`
- `temperaturaConformes <= temperaturaAferidas`
- percentuais entre 0 e 100
- valores monetários e de peso `>= 0`

**Regra:** *upsert* por `competencia` (há unique index, `schema.sql:479`).
**Permissão:** `nutricao:criar` para novo, `nutricao:editar` para alteração.
**Auditoria:** obrigatória, **com valor anterior**. É indicador de qualidade;
alteração retroativa precisa ser rastreável.

---

### API-031 — `POST /api/v1/visitantes`

**Origem:** `Visitantes.jsx:68-99`.
**Validações:** `nome` obrigatório (`:71`), `prontuario` `^\d{3,12}$` (`:72`),
`setor` (`:73`), `quartoLeito` (`:74`).
**Regras**
- **`RN-003`:** servidor aplica `UPPER` em `nome` e `quartoLeito`
  (hoje em `Visitantes.jsx:79,83`) — **não confiar no cliente**
- `entrada = now()`, `saida = null`, `reentradas = 0`
- **`RN-018`:** limite de 60 min é **informativo**; o servidor não bloqueia

**Response 201:** inclui `saidaPrevista` calculada (`entrada + 60min`) para o
crachá — hoje calculada no cliente (`Visitantes.jsx:18`).
**Auditoria:** sim. 🔴 Registra dado pessoal de terceiro; ver `LGPD-004`.

### API-032 — `POST /api/v1/visitantes/{id}/saida`
**Origem:** `Visitantes.jsx:101-105`. Define `saida = now()`.
**Regra:** 409 se `saida` já preenchida.

### API-033 — `POST /api/v1/visitantes/{id}/reentrada`
**Origem:** `Visitantes.jsx:107-111`.
**Regra `RN-019`:** `entrada = now()`, `saida = null`,
`reentradas = reentradas + 1`.
**Observação de modelo:** sobrescrever `entrada` **apaga o histórico da visita
anterior**. → **RECOMENDAÇÃO:** tabela `visitas` com uma linha por entrada.

---

### API-034 — `PUT /api/v1/cirurgias/{id}`

**Origem:** `Agendamento.jsx`.
**Validações:** `prontuario` (`:115`), `procedimento` (`:116`), `sala` (`:117`),
`dataPrevista` (`:118`), `horaPrevista` (`:119`).
**Regra `RN-005`:** `status = 'cancelada'` exige `motivoCancelamento`
não vazio → 422 (`:120`).
**Regra `RN-009` / `RN-026`:** ⚠️ **não há matriz de transição de status.**
Hoje qualquer status vai para qualquer outro. → **DECISÃO HUMANA NECESSÁRIA**:
definir as transições válidas antes de implementar.
**Auditoria:** sim, registrando status anterior e novo.

### API-035 — `PUT /api/v1/cirurgias/{id}/checklist`
**Objetivo:** marcar ou desmarcar itens do checklist da OMS.
**Origem:** `Agendamento.jsx:101` — `toggleChecklist`.
**Request:** `{ "itens": ["identificacao","sitio","consentimento"] }`
**Validação:** todo item ∈ ids de `OMS_CHECKLIST` (`constants.js:85-96`).
**Auditoria:** 🔴 **obrigatória e individual.** É registro de segurança do
paciente. Hoje a alteração do checklist é auditada apenas como "editar cirurgia",
sem detalhar qual item mudou.

---

## 6. ENDPOINTS DE INDICADOR

**Justificativa:** hoje o cliente baixa a coleção inteira (`select('*')`) e
calcula em `useMemo`. Com volume real de dados isso não sustenta.
Ver seção 6 de `03_MODELO_DE_DADOS.md`.

### API-040 — `GET /api/v1/indicadores/cirurgicos?inicio=&fim=`
**Origem:** `src/pages/Indicadores.jsx:27-101`.
**Permissão:** `indicadores:ver`.
**Response**
```json
{
  "periodo": { "inicio": "2026-07-01", "fim": "2026-09-30" },
  "operacional": {
    "total": 142, "realizadas": 128,
    "ocupacaoSalas": 44.4, "ocupacaoLeitos": 71.3,
    "porTipo": [{ "tipo": "eletiva", "quantidade": 89 }],
    "porSala": [{ "sala": "Sala 01", "quantidade": 37 }],
    "serieDiaria": [{ "dia": "2026-09-30", "agendadas": 8, "realizadas": 7, "canceladas": 1 }]
  },
  "qualidade": {
    "taxaCancelamento": 9.9, "taxaChecklist": 86.0,
    "taxaConversao": 4.2, "taxaInfeccao": 1.4,
    "reoperacoes": 3, "eventosAdversos": 5, "obitos": 1,
    "adesaoPorItem": [{ "item": "identificacao", "adesao": 98.0 }]
  }
}
```
**Cálculo:** SQL agregado. `taxaChecklist` usa
`cardinality(checklist_oms) = 10` (`Indicadores.jsx:36`).
**Observação:** hoje o período é **todo o histórico** para as taxas e
**7 dias fixos** para a série (`Indicadores.jsx:11-19,57`). O filtro de período
é uma melhoria; preservar o comportamento atual como padrão.

### API-041 — `GET /api/v1/indicadores/nutricao-clinica`
**Origem:** `src/components/nutricao/IndicadoresNutricao.jsx:277-465`.
**Response:** perfil por consistência, por tipo de cardápio, por via (5 grupos de
`FEEDING_ROUTE_GROUPS`), quantitativo de refeições, taxa de avaliação em 24h,
aceitação boa.
**Regras que o servidor deve aplicar:** `RN-025` (excluir Zero e NPT),
`RN-024` (acompanhante em 4 refeições), `RN-026` (dedução de cardápio),
`RN-028` (prazo de 24h).

### API-042 — `GET /api/v1/indicadores/uan?competencias=6`
**Origem:** `IndicadoresNutricao.jsx:131-150`.
**Response:** série das últimas N competências, com `meta`, `direcao` e
`metaAtingida` resolvidos **no servidor**.
**Justificativa:** `RN-027` — as metas estão hardcoded em `constants.js:320-359`.
Movê-las para `ENT-022` e devolvê-las pela API acaba com a necessidade de
rebuild para mudar uma meta.

### API-043 — `GET /api/v1/indicadores/almoxarifado`
**Origem:** `Almoxarifado.jsx:75-83`.
**Response:** `itens`, `criticos` (`RN-052`), `valorEmEstoque`, `vencidos`.

### API-044 — `GET /api/v1/dashboard`
**Origem:** `src/pages/Dashboard.jsx` — hoje usa
`useCollections([...])` e baixa várias coleções inteiras.
**Response:** um único objeto com os KPIs da tela.

---

## 7. ENDPOINT PÚBLICO

### API-050 — `GET /api/v1/public/painel-cirurgico`

**Objetivo:** alimentar o painel de acompanhantes.
**Origem:** `src/pages/PainelStatus.jsx:24` — rota `/status`, sem autenticação
(`App.jsx:94`).

🔴 **Este endpoint corrige `SEC-002`.** Situação atual: a tela chama
`useCollections(['cirurgias'])` e recebe **todas as colunas de todas as
cirurgias**, incluindo `cirurgiao`, `anestesista`, `infeccao`,
`evento_adverso`, `obito`, `motivo_cancelamento`, filtrando por data **no
navegador**. A view `painel_acompanhantes`, criada exatamente para isso
(`schema.sql:533-542`), **não é usada**.

**Response — exposição mínima, somente estas 5 colunas**
```json
{
  "data": "2026-10-02",
  "itens": [
    { "prontuario": "204871", "horaPrevista": "07:30",
      "status": "em_andamento", "statusPublico": "Em cirurgia",
      "inicioReal": "2026-10-02T07:34:00Z" }
  ]
}
```

**Regras obrigatórias**
- Filtro `data_prevista = current_date` **no servidor**
- `statusPublico` vem de `SURGERY_STATUS[x].public` (`constants.js:62-68`),
  que já existe no frontend para esse fim
- **Nunca** retornar nome de profissional, desfecho clínico ou observação
- Sem autenticação, **com** rate limit por IP
- Sem paginação (volume diário baixo)

**Auditoria:** não registrar acesso individual (rota pública de alto volume);
registrar apenas métrica agregada.

---

## 8. REQUISITOS DE IMPLEMENTAÇÃO JAVA

### Camadas (RECOMENDAÇÃO)

```text
Controller          → HTTP, validação de DTO (@Valid), códigos de status
   ↓ DTO
Service             → regra de negócio, @Transactional, auditoria
   ↓ Domain/Entity
Repository (JPA)    → persistência
   ↓
PostgreSQL          → constraints como última linha de defesa
```

### Pacotes sugeridos

```text
br.org.isac.vitalis
├── config          SecurityConfig, CorsConfig, OpenApiConfig, JacksonConfig
├── security        JwtFilter, PermissionEvaluator, AuthService
├── audit           AuditService, @Auditable, AuditAspect
├── common          ProblemDetail handler, PageResponse, validadores
└── modulo/
    ├── cirurgico   (salas, cirurgias, equipe, equipamentos, escala, rpa)
    ├── internacao  (leitos, visitantes)
    ├── urgencia    (psLeitos, psAltas)
    ├── nutricao    (dietas, avaliacoes, uanIndicadores)
    ├── almoxarifado(produtos, movimentacoes)
    ├── acesso      (usuarios, permissoes)
    └── indicadores (consultas agregadas, somente leitura)
```

### Pontos de atenção específicos deste projeto

| # | Ponto | Origem |
|---|---|---|
| 1 | **Não reimplementar hash de senha.** `BCryptPasswordEncoder` lê o hash `$2a$` existente. Rehash só na próxima troca | `security.sql:28` |
| 2 | **Preservar os `CHECK` do banco.** São a especificação de enum mais confiável do projeto | `schema.sql` |
| 3 | **Converter `text` numérico de `avaliacoes_nutricionais` para `numeric`** via migração Flyway, tratando vírgula decimal e valores inválidos | `ENT-016` |
| 4 | **`jsonb` de evoluções:** decidir entre manter (`@JdbcTypeCode(SqlTypes.JSON)`) ou normalizar | `ENT-020` |
| 5 | **Semeadura nunca em GET.** Mover `seeds.js` para migração Flyway ou endpoint administrativo | `FUNC-049` |
| 6 | **`text[]` do Postgres** (`setores`, `equipe`, `checklist_oms`, `adequacoes`, `equipamentos`) → `List<String>` com `@JdbcTypeCode(SqlTypes.ARRAY)` | `schema.sql` |
| 7 | **Fuso horário.** O frontend calcula `todayISO()` compensando `getTimezoneOffset()` (`format.js:33-37`). Fixar o fuso da aplicação (`America/Sao_Paulo`) e documentar o contrato: `date` sem fuso, `timestamptz` em UTC | `format.js` |
| 8 | **CORS** restrito à origem do frontend | `SEC-011` |
| 9 | **Migrações Flyway** a partir do `schema.sql` atual como `V1__baseline.sql`, preservando o estado de bancos já existentes | `FUNC-070` |

### Contrato de nomenclatura

⚠️ **Decisão necessária.** O banco usa `snake_case` (`nome_paciente`,
`via_enteral`) e o frontend consome exatamente esses nomes, pois fala direto com
o Postgres. Duas opções:

| Opção | Impacto |
|---|---|
| **A** — API em `snake_case` | Frontend praticamente não muda. Foge da convenção Java/JSON |
| **B** — API em `camelCase` | Convencional; **exige alterar todas as 20 telas** |

Os exemplos deste documento usam `camelCase` (opção B). Se for escolhida a opção
A, os DTOs levam `@JsonProperty`. → **DECISÃO HUMANA NECESSÁRIA.**

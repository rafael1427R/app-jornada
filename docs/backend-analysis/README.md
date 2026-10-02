# Análise de Backend — Vitalis

Documentação de engenharia reversa do sistema **Vitalis** (Hospital Regional
Chagas Rodrigues · ISAC), produzida para servir de especificação na
implementação do backend Java por outro agente.

---

## 1. OBJETIVO DESTES DOCUMENTOS

Permitir que um desenvolvedor ou agente de IA implemente o backend **sem
adivinhar** funcionalidades, regras, entidades, dados, APIs, permissões,
requisitos de segurança ou de proteção de dados.

O conjunto responde, com rastreabilidade até o arquivo e a linha:

- o que o sistema faz e o que ele **não** faz;
- quais regras de negócio já existem em código;
- quais dados existem e qual a sua sensibilidade;
- o que funciona de verdade, o que é parcial e o que é apenas interface;
- quais endpoints, entidades e controles o backend precisa implementar;
- quais riscos de segurança e de proteção de dados estão abertos hoje.

**O backend não foi implementado.** Nada de Java, migração, API ou banco novo
foi criado. Apenas estes dez arquivos de documentação.

---

## 2. COMO FORAM PRODUZIDOS

### Método

1. Enumeração completa do repositório — 156 arquivos, 24 diretórios.
2. Leitura integral de `src/` (54 arquivos) e `supabase/` (4 arquivos SQL).
3. Rastreamento `Tela → Hook → Store → Adaptador → Banco` e
   `Ação → Validação → Regra → Persistência → Interface`.
4. Busca direcionada por validações, regras, mocks, `localStorage`, valores
   fixos, chamadas de rede, `grant`/`revoke` e políticas de RLS.
5. Verificação de isolamento do diretório `legacy/`.
6. Classificação de cada funcionalidade com evidência de arquivo e linha.
7. Revisão cruzada entre os documentos e auditoria de consistência de IDs.

### Ferramentas

Leitura de arquivo, busca por padrão (`grep`), enumeração (`find`) e contagem
(`wc`). **A aplicação não foi executada** e **não houve acesso a instância de
banco**.

---

## 3. ORDEM DE LEITURA RECOMENDADA

```text
ORDEM DE LEITURA RECOMENDADA

1. 01_ANALISE_COMPLETA_SISTEMA.md
2. 02_FUNCIONALIDADES_E_REGRAS.md
3. 03_MODELO_DE_DADOS.md
4. 04_API_BACKEND_JAVA.md
5. 05_AUTENTICACAO_AUTORIZACAO.md
6. 06_SEGURANCA_E_CRIPTOGRAFIA.md
7. 07_LGPD_E_PROTECAO_DE_DADOS.md
8. 08_INTEGRACAO_FRONTEND_BACKEND.md
9. 09_CHECKLIST_ANTIGRAVITY.md
```

| Arquivo | Conteúdo |
|---|---|
| `01` | Visão geral, arquitetura, stack, módulos, estrutura, limitações |
| `02` | 70 funcionalidades classificadas, 42 regras de negócio, 15 gaps |
| `03` | 17 tabelas existentes, 5 entidades recomendadas, onde calcular cada derivado |
| `04` | 38 endpoints, convenções, framework (recomendação), requisitos Java |
| `05` | Autenticação e autorização atuais, o que o backend precisa, 9 critérios de aceite |
| `06` | 15 riscos com evidência, impacto e prioridade; criptografia e segredos |
| `07` | 10 itens de dado pessoal, controles técnicos, 12 pendências jurídicas |
| `08` | Contrato atual, 9 incompatibilidades, plano de migração em 7 etapas |
| `09` | 60 itens de execução em 7 fases, com dependência e critério de conclusão |

---

## 4. DIFERENÇA ENTRE EVIDÊNCIA E RECOMENDAÇÃO

Os quatro rótulos são usados de forma separada e **nunca** intercambiável.

| Rótulo | Significado | Como verificar |
|---|---|---|
| **EVIDÊNCIA** | Encontrado no código. Vem com arquivo e linha | Abrir o arquivo citado |
| **ATUAL** | O que o sistema faz hoje, derivado da evidência | Rastreável até a evidência |
| **NECESSÁRIO** | O backend precisa implementar para o sistema funcionar | Justificado por uma evidência |
| **RECOMENDAÇÃO** | Proposta de arquitetura, segurança ou qualidade. **Não existe** | Marcado explicitamente |

Regras seguidas na redação:

- Nenhuma funcionalidade foi declarada existente sem evidência.
- Nada foi declarado implementado quando é apenas mock ou dado semeado.
- Nenhum endpoint foi descrito como existente — **nenhum existe**.
- Nenhuma tabela foi descrita como existente sem estar em `schema.sql`.
- Tipos de campo sem DDL estão marcados como **inferido**, não como fato.
- Contradições estão marcadas `⚠️ INCONSISTENTE`, com os dois lados descritos e
  a decisão apontada como necessária — nenhuma foi resolvida em silêncio.
- O que não foi possível determinar está `❓ INDETERMINADO`.

---

## 5. STATUS DAS FUNCIONALIDADES

| Símbolo | Status | Significado |
|---|---|---|
| 🟢 | IMPLEMENTADA | Implementação funcional identificável |
| 🟡 | PARCIALMENTE IMPLEMENTADA | Existe, com fluxo incompleto ou limitação |
| 🔵 | FRONTEND / MOCK | Usa `localStorage`, dado semeado ou valor fixo |
| 🔴 | AUSENTE | Necessária ou referenciada, sem implementação |
| ⚠️ | INCONSISTENTE | Comportamentos ou implementações em conflito |
| ❓ | INDETERMINADA | Não foi possível confirmar com segurança |

**Nota de classificação.** Com `VITE_SUPABASE_URL` definida, o CRUD grava em
PostgreSQL — portanto é 🟢, não 🔵. O rótulo 🔵 ficou reservado ao que depende de
`localStorage`, dado semeado ou constante no código. Ver a nota no topo de `02`.

---

## 6. COMO USAR NO ANTIGRAVITY

1. Leia `01` antes de qualquer coisa. **A premissa mais importante:** o projeto
   **já tem backend** — PostgreSQL com 17 tabelas, bcrypt funcional e regras em
   `CHECK`. O trabalho é colocar uma API entre o navegador e o banco, não
   recriar o modelo.
2. Use `09` como plano de execução. Os itens têm dependência explícita e ordem
   de onda recomendada.
3. **Comece pela Onda 0** (F4-01, F5-04, F5-08). Ela fecha uma exposição pública
   de dado clínico e não depende do resto.
4. Para cada endpoint, consulte `04`; para cada regra, `02` Parte B; para cada
   tabela, `03`.
5. **Não implemente o que `04` marca como RECOMENDAÇÃO** sem confirmação —
   em especial a escolha de framework.
6. **Não resolva as decisões da seção 9** deste README. Elas alteram o contrato
   da API e pertencem ao responsável pelo sistema.
7. Antes de dar um item por concluído, verifique o **critério de conclusão** —
   todos são objetivos e verificáveis.
8. Ao terminar, execute a Fase 7 e registre o que ficou em aberto.

**Dois cuidados que evitam retrabalho:**

- **F2-10 é o último item técnico.** Revogar o acesso de `anon` antes de o
  frontend migrar (F5-07) interrompe o sistema em produção.
- **F4-05 vem antes de F4-03.** Paginar sem endpoint de indicador quebra as
  telas de indicador, que hoje calculam sobre a coleção inteira.

---

## 7. COBERTURA DA ANÁLISE

```md
# COBERTURA DA ANÁLISE

Arquivos analisados:
156  (75 do sistema ativo + 81 de código morto em legacy/)

Diretórios analisados:
24

Telas identificadas:
20  (18 de módulo + Login + Painel público)

Módulos identificados:
18

Funcionalidades identificadas:
70

🟢 Implementadas:
50

🟡 Parcialmente implementadas:
5    (FUNC-004 autorização, FUNC-005 auditoria, FUNC-030 prontuários,
      FUNC-056 troca de senha, FUNC-070 migrações)

🔵 Frontend/Mock:
2    (FUNC-002 modo offline, FUNC-003 sessão em localStorage)

🔴 Ausentes:
11   (FUNC-048 lançamento UAN, FUNC-060 recuperação de senha,
      FUNC-061 expiração, FUNC-062 bloqueio por tentativas,
      FUNC-063 upload, FUNC-064 notificação, FUNC-065 tempo real,
      FUNC-066 paginação, FUNC-067 testes, FUNC-068 retenção,
      FUNC-069 entidade Paciente)

⚠️ Inconsistentes:
2    (FUNC-021 painel público x view não usada,
      FUNC-049 semeadura automática em banco real)

❓ Indeterminadas:
0    funcionalidades.
     3 pontos de infraestrutura indeterminados: ambiente de produção efetivo,
     cifra em repouso do banco, política de backup. Ver limitações em 01.

Entidades identificadas:
22   (17 existentes com DDL + 5 recomendadas/necessárias)

Tabelas existentes:
17   + 1 view + 5 funções + 19 triggers

Chaves estrangeiras existentes:
1    (movimentacoes_estoque.produto_id)

Endpoints necessários:
38

Regras de negócio:
42

Riscos de segurança:
15   (3 CRÍTICO, 6 ALTO, 5 MÉDIO, 1 BAIXO)

Itens relacionados à LGPD:
10   itens de dado + 29 requisitos técnicos de controle

Gaps do sistema:
15

Itens de checklist para o backend:
60   (28 CRÍTICO, 19 ALTO, 11 MÉDIO, 1 BAIXO, 1 não aplicável)

Pendências para decisão humana:
13
```

### Auditoria de consistência

| Verificação | Resultado |
|---|---|
| Todas as 20 telas analisadas | ✅ |
| Todos os 18 módulos analisados | ✅ |
| Todas as 20 rotas verificadas (`App.jsx`) | ✅ |
| Todos os "services" verificados | ✅ Não há camada de serviço; os 2 arquivos de integração foram lidos integralmente |
| Todas as chamadas de rede rastreadas | ✅ Única origem: `supabaseClient.js` |
| Todos os mocks identificados | ✅ `localAdapter`, `seeds.js`, semeadura em `supabaseAdapter`, login local, sessão em `localStorage` |
| IDs únicos | ✅ FUNC, RN, API, ENT, SEC, LGPD, GAP e F não se repetem |
| Toda funcionalidade com status | ✅ 70 de 70 |
| APIs correspondem a funcionalidades | ✅ Cada endpoint declara sua origem |
| Entidades correspondem a funcionalidades | ✅ Cada entidade cita onde é usada |
| Requisitos de segurança ligados a funcionalidades | ✅ Cada SEC cita arquivo e linha |
| Requisitos LGPD ligados a dados identificados | ✅ Cada LGPD cita colunas reais |
| Cada recomendação marcada como recomendação | ✅ |
| Cada endpoint com origem declarada | ✅ |

---

## 8. LIMITAÇÕES

Repetidas aqui por serem a fronteira de confiança de todo o conjunto.
Detalhamento em `01`, seção 10.

| # | Limitação |
|---|---|
| L1 | **A aplicação não foi executada.** Nenhuma afirmação sobre comportamento em tempo de execução foi verificada em navegador |
| L2 | **Nenhum acesso a instância Supabase real.** Não foi possível confirmar se os scripts SQL foram aplicados em algum ambiente, nem se houve alteração manual fora do versionamento |
| L3 | **Sem TypeScript.** Todo tipo de campo sem DDL é inferido, e está marcado como tal |
| L4 | **Sem testes.** A cobertura funcional real é desconhecida |
| L5 | Decisões de projeto foram inferidas de comentários no código |
| L6 | Ambiente de produção efetivo não determinado — três provedores configurados |
| L7 | Histórico de git não auditado |

---

## 9. PENDÊNCIAS PARA DECISÃO HUMANA

```text
PENDÊNCIAS PARA DECISÃO HUMANA
```

Itens que **não** são decisão técnica e **não foram resolvidos** nesta análise.
Cada um altera o contrato da API, o modelo de dados ou a postura de conformidade.

### Arquitetura e tecnologia

**D-01 · Framework Java** — o projeto não determina nenhum.
`04` seção 1 recomenda **Spring Boot 3.x / Java 21**, com justificativa item a
item. **Confirmar antes de F1-01.**

**D-02 · Estratégia de sessão** — JWT stateless ou token opaco com tabela
`sessoes`. `05` seção 2.2 recomenda a segunda, para permitir revogação imediata
de profissional desligado. **Confirmar antes de F3-01.**

**D-03 · Nomenclatura da API** — `snake_case` (frontend quase não muda) ou
`camelCase` (convencional, exige alterar ~20 telas).
`08` seção 3.2 recomenda `snake_case` na primeira versão.
**Esta é a decisão de maior impacto no custo da migração.**

**D-04 · Contrato de data vazia** — a API devolve `null` (recomendado) ou `""`.
Ver `RN-040` e `08` seção 3.1.

**D-05 · Provedor de hospedagem** — Netlify, Vercel e Firebase estão
configurados em paralelo. Escolher um e remover os outros (F5-09).

**D-06 · Banco de dados** — manter Supabase/PostgreSQL gerenciado, ou migrar para
PostgreSQL próprio quando a API Java existir. A escolha afeta backup, cifra em
repouso e região de armazenamento.

### Modelo de dados

**D-07 · Entidade `pacientes`** — `ENT-018`. Criar centraliza o dado e dá
integridade, mas **concentra** o que hoje está disperso, aumentando o risco se o
controle de acesso não acompanhar. Contraria a premissa declarada de não
armazenar identificação de paciente. **Decisão de produto e de conformidade.**

**D-08 · Campos nominais na nutrição** — `LGPD-001`. Manter `nome_paciente`,
`nome_social`, `nome_mae`, `data_nascimento` e `sexo`, ou remover?
Há finalidade legítima de segurança assistencial (conferência de identidade à
beira-leito) que pode prevalecer sobre a minimização.
**Decisão conjunta de nutrição, qualidade e jurídico.**

**D-09 · Matriz de transição de status cirúrgico** — `RN-009`. Hoje qualquer
status vai para qualquer outro, sem restrição. Definir as transições válidas
antes de implementar `API-034`. **Decisão do centro cirúrgico.**

**D-10 · Evoluções clínicas em `jsonb`** — `ENT-020`. Normalizar em tabelas com
FK, autor e data, ou manter como array na linha? Normalizar dá índice,
integridade e auditoria por evolução; manter evita migração de dado clínico.

### Proteção de dados

**D-11 · Prazos de retenção** — `RET-01` a `RET-06`. **Não existe nenhum prazo
definido no sistema.** É a lacuna mais completa em proteção de dados: todo dado
inserido permanece indefinidamente. Conciliar guarda obrigatória de registro
assistencial com minimização. **Necessita validação jurídica/compliance.**

**D-12 · Documento de visitante** — `LGPD-002`. Guardar integralmente,
parcialmente (últimos dígitos) ou não guardar? A finalidade declarada é
conferência presencial na portaria.

**D-13 · Texto do aviso de LGPD na interface** — `src/lib/brand.js:11` afirma
*"Sem dados pessoais identificáveis"*, o que **não corresponde** ao esquema
real: três tabelas armazenam dado pessoal e uma armazena dado sensível de saúde.
Corrigir o texto ou remover os campos (D-08). Ver `07` seção 1.

### Pendências de conformidade listadas, não enumeradas aqui

`07` seção 5 lista 12 pontos que dependem de avaliação jurídica — base legal por
categoria de dado, política de anonimização, necessidade de cifra em coluna,
escopo da auditoria de leitura, encarregado de dados, política de descarte de
impressos e região de armazenamento da instância.

---

## 10. ACHADOS QUE MERECEM ATENÇÃO IMEDIATA

Fora do fluxo de implementação, três itens são corrigíveis **hoje**, sem esperar
o backend:

1. **Rota `/status` expõe a tabela de cirurgias inteira, sem autenticação**
   (`SEC-002`, `LGPD-003`). A view `painel_acompanhantes` foi criada exatamente
   para evitar isso e **não é usada**. Trocar a consulta da tela pela view é uma
   alteração de poucas linhas.

2. **Credencial padrão `admin` / `1123` no código-fonte** (`SEC-012`), recriada
   automaticamente sempre que a tabela `usuarios` fica vazia. Trocar a senha no
   ambiente em uso.

3. **Semeadura automática grava prescrições fictícias em banco real**
   (`SEC-007`, `LGPD-010`). Os prontuários dos dados de demonstração podem
   coincidir com prontuários reais, associando prescrição falsa a paciente real.

---

*Análise produzida por engenharia reversa do código-fonte. Nenhuma linha da
aplicação foi modificada; apenas estes dez arquivos de documentação foram
criados.*

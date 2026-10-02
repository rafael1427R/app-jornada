# 08 — INTEGRAÇÃO FRONTEND ↔ BACKEND

> Este documento mapeia o que o frontend **faz hoje** e o que ele **passará a
> esperar** da API Java, apontando cada incompatibilidade.

---

## 1. O CONTRATO ATUAL NÃO É REST — É ACESSO DIRETO AO BANCO

**EVIDÊNCIA**

O frontend **não consome endpoints REST próprios**. Ele usa
`@supabase/supabase-js`, que constrói chamadas PostgREST contra as tabelas.

```text
Tela
  ↓
useCollection('dietas')                     src/data/store.js:212
  ↓
loadCollection / createRecord / updateRecord / removeRecord
  ↓
execute(operation, ...args)                 src/data/store.js:125
  ↓
primary = supabaseAdapter | localAdapter    src/data/store.js:18
  ↓
supabase.from('dietas').select('*')         src/data/supabaseAdapter.js:36
  ↓
PostgREST → PostgreSQL
```

### Camada de serviço: o que existe e o que não existe

| Elemento esperado em arquitetura REST | Situação neste projeto |
|---|---|
| `services/` por domínio | 🔴 **Não existe.** Há um adaptador genérico para 17 tabelas |
| Cliente HTTP (axios/fetch wrapper) | 🟡 Apenas o `fetch` com timeout de `supabaseClient.js:16-27` |
| Tipos de request/response | 🔴 Não existe (sem TypeScript) |
| Tratamento de erro por endpoint | 🟡 Centralizado em `store.js:125-134` |
| Interceptor de autenticação | 🔴 Não existe — a chave anônima é estática |
| Camada de mapeamento | 🟡 `normalize`/`denormalize` para datas (`supabaseAdapter.js:14-31`) |

**Consequência para a migração:** não há uma camada de serviço para reapontar.
A integração está concentrada em **dois arquivos**:
`src/data/supabaseAdapter.js` (70 linhas) e `src/data/authRemote.js` (50 linhas).

✅ **Isso é uma boa notícia.** Substituir o backend exige reescrever esses dois
arquivos e ajustar `AuthContext.jsx`. As 20 telas chamam `useCollection(...)` e
não sabem de onde vêm os dados.

---

## 2. OPERAÇÕES ATUAIS — CONTRATO REAL

### 2.1 `supabaseAdapter.list(name)`

**EVIDÊNCIA** — `src/data/supabaseAdapter.js:34-43`
```js
const { table, seed } = collectionConfig(name)
const rows = await run(supabase.from(table).select('*').order('criado_em', { ascending: true }))
if (rows && rows.length) return rows.map((row) => denormalize(name, row))
const initial = seed ? seed() : []
if (!initial.length) return []
const inserted = await run(supabase.from(table).insert(initial.map((r) => normalize(name, r))).select())
return (inserted || initial).map((row) => denormalize(name, row))
```

| Característica | Valor atual |
|---|---|
| Resposta | **Array cru**, sem envelope |
| Paginação | 🔴 Nenhuma |
| Ordenação | Fixa: `criado_em` ascendente |
| Filtro | 🔴 Nenhum no servidor — tudo filtrado no cliente |
| Projeção | `*` — todas as colunas |
| Efeito colateral | 🔴 **Escreve seeds se a tabela estiver vazia** |

**Endpoint equivalente necessário:** `GET /api/v1/{recurso}`
→ **Incompatibilidade 1:** envelope de paginação.
→ **Incompatibilidade 2:** o `GET` não pode semear.

### 2.2 `insert`, `update`, `remove`, `replaceAll`

**EVIDÊNCIA** — `src/data/supabaseAdapter.js:44-69` (inferido do padrão de `list`
e do uso em `store.js:184-209`)

| Operação | Chamada atual | Endpoint necessário |
|---|---|---|
| `insert(name, record)` | `supabase.from(t).insert(record).select()` | `POST /api/v1/{recurso}` |
| `update(name, id, patch)` | `supabase.from(t).update(patch).eq('id', id).select()` | `PUT /api/v1/{recurso}/{id}` |
| `remove(name, id)` | `supabase.from(t).delete().eq('id', id)` | `DELETE /api/v1/{recurso}/{id}` |
| `replaceAll(name, records)` | delete + insert em massa | 🔴 **Sem equivalente REST** — ver 4.6 |

**EVIDÊNCIA de `store.js:184-189`** — o `id` e o `criado_em` são gerados **no
cliente**:
```js
const record = { id: values.id || uid(), criado_em: values.criado_em || new Date().toISOString(), ...values }
```
→ **Incompatibilidade 3:** o servidor passa a gerar ambos (`RN-042`, `API-000`).

### 2.3 Autenticação

**EVIDÊNCIA** — `src/data/authRemote.js`

| Função | Chamada atual | Endpoint necessário |
|---|---|---|
| `autenticarRemoto(usuario, senha)` | `supabase.rpc('autenticar_usuario', { p_usuario, p_senha })` | `POST /api/v1/auth/login` |
| `conferirSenhaRemota(id, senha)` | `supabase.rpc('conferir_senha', { p_id, p_senha })` | Absorvido por `POST /api/v1/auth/senha` |

**Contrato de resposta atual de `autenticarRemoto`:**
```js
{ ok: true, user: {...} }        // sucesso
{ ok: false, error: "mensagem" } // credencial inválida (erro traduzível)
{ unavailable: true }            // banco inacessível ou RPC ausente
```

**O estado `unavailable` é central no desenho atual.** Ele distingue
"credencial errada" de "não consegui falar com o banco", e `AuthContext.jsx:58-64`
usa essa distinção para **recusar o login** quando o Supabase está configurado
mas inacessível — em vez de cair para a verificação local.

→ **Recomendação de contrato:** preservar os três estados na nova camada,
mapeando `401` → `{ok:false}`, e falha de rede/5xx → `{unavailable:true}`.

---

## 3. O QUE O FRONTEND ESPERA DO RETORNO

### 3.1 Formato de data — `RN-040`

**EVIDÊNCIA** — `src/data/supabaseAdapter.js:14-31`
```js
function normalize(name, record) {   // enviando ao banco
  dateFields.forEach((f) => { if (clean[f] === '' || clean[f] === undefined) clean[f] = null })
}
function denormalize(name, row) {    // recebendo do banco
  dateFields.forEach((f) => { if (clean[f] == null) clean[f] = '' })
}
```

`dateFields` por coleção está em `src/data/collections.js:26-47`.

**Contrato atual:** o frontend trabalha com `""` para "sem data", porque os
`<input type="date">` exigem string. O adaptador converte nas duas direções.

→ **Decisão de contrato necessária:**

| Opção | Impacto |
|---|---|
| **A** — API devolve `null`; o novo adaptador converte para `""` | Mantém `denormalize`. **Recomendada** |
| **B** — API devolve `""` | Contrato JSON não idiomático; `null` é o correto para ausência |

**Recomendação:** opção A. A API aceita `null` **e** `""` na entrada
(tolerante) e sempre devolve `null` (estrita). O adaptador do frontend mantém a
conversão para `""`, que já existe e funciona.

### 3.2 Nomenclatura de campo

**EVIDÊNCIA:** o frontend consome exatamente os nomes do Postgres, em
`snake_case`, porque fala direto com o banco:
`nome_paciente`, `via_enteral`, `acompanhante_refeicao`, `data_prescricao`,
`checklist_oms`, `prontuario_atual`, `perda_peso_percent`...

→ **Incompatibilidade 4 — a de maior custo.** Ver `04`, seção 8.

| Opção | Custo | Avaliação |
|---|---|---|
| **A** — API em `snake_case` | ~zero no frontend; `@JsonNaming(SnakeCaseStrategy)` no Java | Menor risco de regressão |
| **B** — API em `camelCase` | Alterar ~20 telas e todos os `EMPTY`/formulários | Convencional, mas é a mudança com maior chance de quebrar tela em produção |

**Recomendação:** **opção A** para a primeira versão da API, com
`@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)` global.
Migrar para `camelCase` depois, se desejado, com o frontend já estabilizado.
→ **DECISÃO HUMANA NECESSÁRIA.**

### 3.3 Arrays nativos do Postgres

**EVIDÊNCIA:** o frontend recebe e envia arrays JavaScript diretamente para
colunas `text[]`:

| Campo | Tabela | Uso no frontend |
|---|---|---|
| `setores` | `usuarios` | `Usuarios.jsx` |
| `equipamentos` | `salas_cirurgicas` | `MapaCirurgico.jsx` |
| `equipe` | `cirurgias` | `Agendamento.jsx` |
| `checklist_oms` | `cirurgias` | `Agendamento.jsx:101` |
| `adequacoes` | `dietas` | `Nutricao.jsx:784-800` |

→ **Compatível.** `List<String>` em Java serializa como array JSON. Nenhuma
mudança no frontend.

### 3.4 Campos `jsonb`

**EVIDÊNCIA:** `nrs`, `exames`, `evolucoes`, `permissoes`, `modulos`.

| Campo | Forma esperada pelo frontend |
|---|---|
| `nrs` | objeto `{ imc: true, perda_peso: false, ... }` (`AvaliacaoNutricional.jsx:205`) |
| `exames` | array de `{ id, label, referencia, data, resultado }` (`:196`) |
| `evolucoes` | array de `{ id, data, resumo, conduta, autor, crn }` (`:222-232`) |
| `permissoes` | objeto `{ modulo: [acoes] }` **ou** a string `"all"` (`permissions.js:31`) |
| `modulos` | array de ids **ou** a string `"all"` (legado) |

⚠️ **`permissoes` e `modulos` são polimórficos** — objeto/array **ou** string.
Em Java isso exige desserializador customizado ou normalização na API.
**Recomendação:** a API **sempre** devolve `permissoes` como objeto já
resolvido (`master` → mapa completo, conforme `RN-036`), nunca a string `"all"`.
O frontend continua funcionando, pois `normalizePermissions()` aceita objeto.
Isso elimina o polimorfismo do contrato.

---

## 4. INCOMPATIBILIDADES E LACUNAS

### 4.1 Paginação — `GAP-08`
**Atual:** array cru, sem limite. **Necessário:** envelope.
**Impacto no frontend:** `store.js:149-151` espera array em
`setState(name, { items: items || [] })`.
**Ajuste:** o novo adaptador extrai `content` e guarda os metadados de página.
As telas não mudam enquanto não houver controle de paginação na interface.
**Risco:** telas que calculam indicador sobre a coleção inteira
(`Indicadores.jsx`, `IndicadoresNutricao.jsx`) passam a ver só a primeira
página. **Por isso os endpoints de indicador (`API-040`..`API-044`) são
pré-requisito da paginação**, não melhoria posterior.

### 4.2 Semeadura no `GET` — `SEC-007`
**Atual:** `list()` insere seeds em tabela vazia.
**Necessário:** remover. O adaptador novo não implementa esse caminho.
**Impacto:** a primeira carga passa a mostrar estado vazio — correto. As telas
já têm `EmptyState` (`src/components/ui/index.jsx:210`).

### 4.3 Geração de `id` e `criado_em` — `RN-042`
**Atual:** cliente gera (`store.js:185`).
**Necessário:** servidor gera; a resposta do `POST` traz o registro completo.
**Impacto:** `createRecord` já usa o retorno
(`const saved = (await execute('insert', ...)) || record`) — basta remover o
fallback `|| record` e a geração local.

### 4.4 Autorização passa a ser aplicada
**Atual:** o cliente consegue qualquer operação; a interface esconde botões.
**Necessário:** 403 real.
**Impacto:** telas que não tratam erro de permissão passarão a mostrar toast de
falha. O relator global (`store.js:55-60` + `ToastContext`) já cobre isso, mas a
mensagem será genérica. **Recomendação:** tratar 403 no adaptador com mensagem
própria: *"Seu perfil não tem permissão para esta ação."*

### 4.5 Sessão com token
**Atual:** `localStorage` com objeto em claro; nenhum cabeçalho de autenticação.
**Necessário:** `Authorization: Bearer <token>` em toda requisição; tratar 401
com logout automático.
**Impacto:** mudança em `AuthContext.jsx` e no novo cliente HTTP.
**Ponto de atenção:** `AuthContext.jsx:24-27` resolve o usuário buscando na
lista completa de usuários. Com `GET /auth/me` (`API-003`), o
`useCollection('usuarios')` do provider deve ser **removido** — hoje toda sessão
baixa a tabela de usuários.

### 4.6 `replaceAll` sem equivalente REST
**EVIDÊNCIA:** `store.js:205-209` e `localAdapter.js:38-42`.
**Uso identificado:** não localizei chamada a `replaceAll` nas 20 telas; parece
ser capacidade do store não utilizada.
→ **❓ INDETERMINADO.** Confirmar antes de implementar. Se não há uso, **não
criar endpoint**.

### 4.7 Erro: contrato de mensagem
**Atual:** `store.js:120-123` extrai `error.message` e apresenta ao usuário.
**Necessário:** RFC 7807. O adaptador lê `detail` para o toast e registra `type`
e `instance` no console.
**Impacto:** `textoDoErro()` passa a ler `problem.detail`.

### 4.8 Revalidação ao focar a aba
**EVIDÊNCIA:** `store.js:171-182`.
**Impacto:** com paginação e muitos usuários, revalidar **todas** as coleções
carregadas a cada foco de janela multiplica requisições.
**Recomendação:** manter o comportamento, mas (a) com *debounce*, (b) revalidando
só a coleção da tela ativa, ou (c) usando `ETag`/`If-None-Match` para resposta
304. A terceira é a mais econômica e não muda a experiência.

### 4.9 Filtro e busca no cliente
**EVIDÊNCIA:** todas as telas filtram em `useMemo` com `matches()`
(`src/lib/format.js:97-101`), sobre a coleção completa.
**Impacto com paginação:** a busca passa a encontrar só o que está na página.
**Necessário:** parâmetro `?q=` nos `GET` de coleção, com busca no servidor
(`ILIKE`/`unaccent`). `matches()` normaliza acento no cliente
(`format.js:88-94`) — o servidor precisa fazer o equivalente para não divergir.
→ **Recomendação:** extensão `unaccent` do Postgres.

---

## 5. PLANO DE MIGRAÇÃO DO FRONTEND

Ordem que mantém o sistema funcionando em cada etapa.

### Etapa 1 — Cliente HTTP (sem mudar tela)
Criar `src/data/apiClient.js`: `fetch` com `baseURL`, `Authorization`, timeout
de 12 s (preservando `supabaseClient.js:14`), tratamento 401/403 e RFC 7807.

### Etapa 2 — Novo adaptador
Criar `src/data/apiAdapter.js` com a **mesma interface** de
`supabaseAdapter`: `list`, `insert`, `update`, `remove`.
Trocar `src/data/store.js:18` para `const primary = apiAdapter`.
✅ As 20 telas não mudam.

### Etapa 3 — Autenticação
Reescrever `src/data/authRemote.js` para `POST /auth/login`, preservando o
contrato `{ok}` / `{ok:false,error}` / `{unavailable}`.
Em `AuthContext.jsx`: guardar o token, usar `GET /auth/me`, **remover**
`useCollection('usuarios')` do provider e **remover** o login local
(`:66-70`, `SEC-004`).

### Etapa 4 — Painel público
`PainelStatus.jsx` passa a chamar `API-050` em vez de `useCollections(['cirurgias'])`.
🔴 **Esta etapa pode ser antecipada e feita isoladamente** — corrige `SEC-002`
sem depender do resto.

### Etapa 5 — Indicadores
Telas de indicador passam a consumir `API-040`..`API-044`.
Pré-requisito da Etapa 6.

### Etapa 6 — Paginação
Envelope no adaptador; `?q=` para busca; controles de página nas telas de lista.

### Etapa 7 — Encerramento do acesso direto
Remover `@supabase/supabase-js`, `supabaseClient.js`, `supabaseAdapter.js` e
`localAdapter.js`. Revogar `anon` no banco. Rotacionar a chave (`CRY-03`).

---

## 6. MAPA DE RASTREABILIDADE — TELA → DADOS → ENDPOINT

| Tela | Rota | Coleções usadas (evidência) | Endpoints necessários |
|---|---|---|---|
| `Login` | — | `usuarios` (via AuthContext) | API-001 |
| `Dashboard` | `/` | `useCollections([...])` | API-044 |
| `MapaCirurgico` | `/mapa` | `salas`, `cirurgias` | API-010, API-011 |
| `Agendamento` | `/agendamento` | `cirurgias`, `salas`, `equipe` | API-011, API-034, API-035 |
| `EquipeMedica` | `/equipe` | `equipe` | API-012 |
| `Prontuarios` | `/prontuarios` | agregação de várias | `GET /prontuarios/{n}` (novo) |
| `Equipamentos` | `/equipamentos` | `equipamentos` | API-013 |
| `Indicadores` | `/indicadores` | `cirurgias`, `salas`, `leitos`, `psLeitos` | API-040 |
| `Rpa` | `/rpa` | `rpa` | API-015 |
| `EscalaPlantao` | `/escala` | `escala`, `equipe` | API-014 |
| `Visitantes` | `/visitantes` | `visitantes` | API-031, API-032, API-033 |
| `Leitos` | `/leitos` | `leitos` | API-016 |
| `ProntoSocorro` | `/pronto-socorro` | `psLeitos`, `psAltas` | API-018, API-019 |
| `Nutricao` | `/nutricao` | `dietas`, `leitos`, `psLeitos`, `visitantes`, `avaliacoes`, `uanIndicadores` | API-022, API-027, API-028, API-041, API-042 |
| `AvaliacaoNutricional` | `/avaliacao-nutricional` | `avaliacoes` | API-025 |
| `EtiquetasDieta` | `/etiquetas` | `dietas` | API-022 + registro de impressão |
| `Almoxarifado` | `/almoxarifado` | `produtos`, `movimentacoes` | API-023, API-029, API-043 |
| `Auditoria` | `/auditoria` | `auditoria` | API-021 (somente GET) |
| `Usuarios` | `/usuarios` | `usuarios` | API-020, API-004, API-005 |
| `PainelStatus` | `/status` 🔓 | `cirurgias` 🔴 | **API-050** |

🔓 = rota pública · 🔴 = exposição indevida hoje

**Observação sobre `Nutricao.jsx`:** é a tela com mais dependências — seis
coleções (`:98-103`). Com o modelo atual, abrir essa tela baixa seis tabelas
inteiras. É o melhor caso de uso para um endpoint agregado por tela.

---

## 7. O QUE NÃO MUDA

Para evitar retrabalho desnecessário, o que **não** depende do backend:

| Item | Arquivo | Motivo |
|---|---|---|
| Impressão | `src/lib/print.js`, `PrintArea.jsx` | `window.print()` + `@page`, nativo |
| Chamada por voz | `src/lib/speech.js` | Web Speech API do navegador |
| Contadores de tempo | `src/lib/useNow.js`, `format.js:70-85` | Relógio de tela |
| Geração de CSV | `src/lib/csv.js` | 🟡 Funciona, mas ver `LGPD-008` — exportação deveria ser auditada no servidor |
| Formatação pt-BR | `src/lib/format.js` | Apresentação |
| Enums e rótulos | `src/lib/constants.js` | 🟡 Exceto as metas de indicador (`RN-027`, `ENT-022`) |
| Componentes de UI | `src/components/ui/index.jsx` | Apresentação |
| Cálculos de etiqueta | `src/lib/nutricao.js` | Regra de apresentação |

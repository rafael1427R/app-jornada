# 01 — ANÁLISE COMPLETA DO SISTEMA

> **Natureza deste documento:** engenharia reversa do projeto existente.
> Tudo o que aparece como **EVIDÊNCIA** foi lido no código. Tudo o que aparece
> como **RECOMENDAÇÃO** é proposta e não existe no projeto.

---

## 1. VISÃO GERAL

**EVIDÊNCIA** — `src/lib/brand.js:4-11`

| Item | Valor |
|---|---|
| Nome do produto | Vitalis |
| Subtítulo | Gestão Hospitalar |
| Unidade | Hospital Regional Chagas Rodrigues |
| Instituição | ISAC — Instituto de Saúde e Cidadania |
| Aviso embutido | `LGPD_NOTICE = 'Conformidade LGPD — Sem dados pessoais identificáveis'` |

**EVIDÊNCIA** — `index.html:7`
Descrição declarada: *"Sistema de Gestão Hospitalar do Hospital Regional Chagas
Rodrigues (ISAC): centro cirúrgico, leitos e pronto socorro digital."*

### Objetivo identificado

Sistema web único para gestão operacional hospitalar, cobrindo centro cirúrgico,
leitos de internação, pronto-socorro, nutrição/dietas, almoxarifado, visitantes
e controle de acesso. A identificação do paciente é feita por **número de
prontuário**, não por nome.

---

## 2. ARQUITETURA ATUAL

**EVIDÊNCIA** — leitura de `src/data/*`, `src/context/*`, `supabase/*.sql`

```text
Navegador (SPA React)
        │
        ├── AuthContext ──► authRemote.js ──► RPC autenticar_usuario (Postgres)
        │
        └── store.js (cache em memória + assinaturas)
                 │
                 └── adaptador único, escolhido em tempo de carga:
                       ├── supabaseAdapter  (quando VITE_SUPABASE_URL existe)
                       └── localAdapter     (quando não existe)
                                 │
                                 ▼
                        Supabase / PostgreSQL
                        (17 tabelas + 1 view + 2 funções RPC)
```

### Ponto arquitetural central

**EVIDÊNCIA** — `src/data/store.js:18`

```js
const primary = supabaseEnabled ? supabaseAdapter : localAdapter
```

O projeto **não é um frontend com mocks aguardando backend**. Ele tem um backend
funcional: PostgreSQL gerenciado pelo Supabase, acessado diretamente do navegador
via `@supabase/supabase-js`. A camada de persistência, as regras de integridade,
o hash de senha e a autenticação já existem — em SQL, não em Java.

Isso muda a natureza da tarefa do backend Java: não é "construir o que falta",
é **substituir o acesso direto ao banco por uma API REST intermediária**.
Ver `08_INTEGRACAO_FRONTEND_BACKEND.md`.

### Arquitetura em camadas (atual)

| Camada | Arquivo | Responsabilidade |
|---|---|---|
| Rotas e guarda de acesso | `src/App.jsx` | 20 rotas; componente `Guard` por módulo |
| Sessão e permissões | `src/context/AuthContext.jsx` | login, logout, `can`, `canDo` |
| Notificação ao usuário | `src/context/ToastContext.jsx` | toasts; recebe falhas do store |
| Estado de dados | `src/data/store.js` | cache, assinaturas, revalidação |
| Adaptadores | `src/data/supabaseAdapter.js`, `localAdapter.js` | CRUD |
| Mapa de coleções | `src/data/collections.js` | coleção → tabela → seed |
| Autenticação | `src/data/authRemote.js` | RPC de login e conferência de senha |
| Domínio | `src/lib/constants.js` | enums e regras de negócio declarativas |
| Utilitários | `src/lib/{format,csv,print,speech,storage,audit,permissions,nutricao}.js` | — |

---

## 3. STACK IDENTIFICADA

**EVIDÊNCIA** — `package.json`

### Dependências de produção

| Biblioteca | Versão declarada | Uso identificado |
|---|---|---|
| `react` | `^18.3.1` | Base da interface |
| `react-dom` | `^18.3.1` | Renderização |
| `react-router-dom` | `^6.26.2` | Roteamento (`src/App.jsx`) |
| `@supabase/supabase-js` | `^2.45.4` | Cliente do banco (`src/data/supabaseClient.js`) |
| `lucide-react` | `^0.454.0` | Ícones |
| `recharts` | `^2.13.0` | Gráficos (`src/pages/Indicadores.jsx`) |

### Dependências de desenvolvimento

| Biblioteca | Versão declarada |
|---|---|
| `vite` | `^5.4.9` |
| `@vitejs/plugin-react` | `^4.3.2` |
| `tailwindcss` | `^3.4.14` |
| `postcss` | `^8.4.47` |
| `autoprefixer` | `^10.4.20` |
| `@types/react` | `^18.3.11` |
| `@types/react-dom` | `^18.3.0` |

### Scripts

**EVIDÊNCIA** — `package.json:6-10`

```json
"dev": "vite", "build": "vite build", "preview": "vite preview"
```

### Categorias solicitadas no prompt mestre

| Categoria | Situação |
|---|---|
| Linguagem | JavaScript (ES modules). **Não há TypeScript** — `@types/*` estão instalados mas nenhum arquivo `.ts`/`.tsx` existe em `src/` |
| Gerenciador de pacotes | npm (`package-lock.json` presente) |
| Banco de dados | PostgreSQL via Supabase (`supabase/schema.sql`) |
| Autenticação | Própria, tabela `usuarios` + função RPC. **Não usa Supabase Auth** |
| Validação | Manual, inline em cada página (regex e `if`). Nenhuma biblioteca de validação |
| Comunicação HTTP | `@supabase/supabase-js` com `fetch` customizado. Nenhum axios |
| Criptografia | `pgcrypto` no banco (`crypt`/`gen_salt('bf',10)`). Nenhuma no frontend |
| Armazenamento | `localStorage` apenas para sessão e modo offline (`src/lib/storage.js`) |
| Upload de arquivos | **Não identificado no código analisado** |
| Gráficos | `recharts` (apenas em `Indicadores.jsx`); demais gráficos são CSS/SVG manuais |
| Formulários | Nenhuma biblioteca. `useState` + validação manual |
| Gerenciamento de estado | Implementação própria em `src/data/store.js` + Context API |
| Testes | **Nenhum arquivo de teste e nenhum runner configurado** |
| Lint | Nenhuma configuração ESLint em `src/` (há uma em `legacy/root/eslint.config.js`, código morto) |

---

## 4. ESTRUTURA DO PROJETO

**EVIDÊNCIA** — enumeração completa do repositório

| Área | Arquivos | Observação |
|---|---|---|
| `src/` | 54 | Aplicação ativa |
| `src/pages/` | 20 | Telas |
| `supabase/` | 4 | `schema.sql`, `seed.sql`, `security.sql`, `reset.sql` |
| `public/` | 4 | `_redirects`, logos de exemplo |
| `legacy/` | 81 | **CÓDIGO MORTO** — ver seção 7 |
| Configuração/raiz | 13 | build, deploy, CI, env |
| **Total** | **156** | em 24 diretórios |

### Configurações de deploy

**EVIDÊNCIA**

| Arquivo | Alvo | Conteúdo relevante |
|---|---|---|
| `netlify.toml` | Netlify | build + redirect SPA |
| `vercel.json` | Vercel | — |
| `firebase.json` | Firebase Hosting | `rewrites` para `/index.html`, headers de segurança, cache de `/assets/**` |
| `public/_redirects` | Netlify | fallback SPA |
| `.github/workflows/build.yml` | GitHub Actions | `npm ci` + `npm run build` |

**Observação:** três provedores de hospedagem estão configurados em paralelo.
Não há evidência de qual é o ambiente de produção efetivo.
→ `❓ INDETERMINADO`

---

## 5. MÓDULOS

**EVIDÊNCIA** — `src/lib/constants.js:3-22` (`MODULES`) e `src/App.jsx:64-81`

18 módulos declarados, todos com rota e tela correspondentes:

| # | id | Label | Rota | Tela |
|---|---|---|---|---|
| 1 | `dashboard` | Dashboard | `/` | `Dashboard.jsx` |
| 2 | `mapa` | Mapa Cirúrgico | `/mapa` | `MapaCirurgico.jsx` |
| 3 | `agendamento` | Agendamento | `/agendamento` | `Agendamento.jsx` |
| 4 | `equipe` | Equipe Médica | `/equipe` | `EquipeMedica.jsx` |
| 5 | `prontuarios` | Prontuários | `/prontuarios` | `Prontuarios.jsx` |
| 6 | `equipamentos` | Equipamentos | `/equipamentos` | `Equipamentos.jsx` |
| 7 | `indicadores` | Indicadores | `/indicadores` | `Indicadores.jsx` |
| 8 | `rpa` | RPA | `/rpa` | `Rpa.jsx` |
| 9 | `escala` | Escala de Plantão | `/escala` | `EscalaPlantao.jsx` |
| 10 | `visitantes` | Visitantes / Acompanhantes | `/visitantes` | `Visitantes.jsx` |
| 11 | `leitos` | Leitos | `/leitos` | `Leitos.jsx` |
| 12 | `pronto-socorro` | Pronto Socorro Digital | `/pronto-socorro` | `ProntoSocorro.jsx` |
| 13 | `nutricao` | Nutrição / Dietas | `/nutricao` | `Nutricao.jsx` |
| 14 | `avaliacao-nutricional` | Avaliação Nutricional | `/avaliacao-nutricional` | `AvaliacaoNutricional.jsx` |
| 15 | `etiquetas` | Etiquetas de Dieta | `/etiquetas` | `EtiquetasDieta.jsx` |
| 16 | `almoxarifado` | Almoxarifado | `/almoxarifado` | `Almoxarifado.jsx` |
| 17 | `auditoria` | Log de Auditoria | `/auditoria` | `Auditoria.jsx` |
| 18 | `usuarios` | Usuários e Acessos | `/usuarios` | `Usuarios.jsx` |

### Telas fora da lista de módulos

| Tela | Rota | Proteção |
|---|---|---|
| `Login.jsx` | — (renderizada quando não autenticado) | — |
| `PainelStatus.jsx` | `/status` | **Nenhuma — rota pública, fora do `PrivateArea`** (`src/App.jsx:94`) |

⚠️ **Inconsistência relevante:** o módulo `etiquetas` tem rota e verificação de
permissão (`canDo('etiquetas', ...)` em `EtiquetasDieta.jsx:29`), e consta em
`MODULES`. Confirmado consistente. Já o módulo `prontuarios` existe em `MODULES`
e tem rota, mas é uma tela de **leitura agregada** sem coleção própria — não há
tabela `prontuarios`. Ver `03_MODELO_DE_DADOS.md`.

---

## 6. INTEGRAÇÕES E DEPENDÊNCIAS EXTERNAS

**EVIDÊNCIA**

| Integração | Arquivo | Natureza |
|---|---|---|
| Supabase REST/RPC | `src/data/supabaseClient.js` | Única integração de rede do sistema |
| Web Speech API | `src/lib/speech.js` | API do navegador; chamada de paciente por voz |
| Google Fonts | `index.html:11` | CDN de fonte (Inter) |
| `window.print()` | `src/lib/print.js` | Impressão nativa; **sem jsPDF ou equivalente** |

**Não identificado no código analisado:**
WebSockets, upload de arquivos, envio de e-mail, push notification, gateway de
pagamento, integração HL7/FHIR, integração com laboratório, PACS, ERP.

### Timeout de rede

**EVIDÊNCIA** — `src/data/supabaseClient.js:14-27`
`TIMEOUT_MS = 12000`, implementado com `AbortController` e injetado via
`createClient(..., { global: { fetch: fetchComTimeout } })`.

---

## 7. CÓDIGO MORTO — `legacy/`

⚠️ **INCONSISTENTE / RISCO**

**EVIDÊNCIA**

- 81 arquivos em `legacy/`.
- Conteúdo: aplicação de **gamificação/pontuação** (`Grupo.js`, `Participante.js`,
  `Pontuação.js`, `Módulo.js`, `páginas/Grupos.jsx`, `ScoreModal.jsx`) — sem
  relação com gestão hospitalar.
- `legacy/src/API/base44Client.js` importa `@base44/sdk`, **que não consta em
  `package.json`**.
- `legacy/src/API/base44Client.js` contém **erro de sintaxe**:
  ```js
  appBaseUrldoaplicativo   // identificador inválido, linha final do objeto
  ```
- Nomes de arquivos e pastas com acentuação e espaços
  (`componentes/interface do usuário/botão.jsx`), compatíveis com tradução
  automática de um projeto de terceiros.

**Verificação de isolamento (EVIDÊNCIA):**
```text
grep -rn "legacy" src/ vite.config.js package.json index.html  →  nenhum resultado
```
`vite.config.js` resolve o alias `@` apenas para `src/`. `legacy/` **não entra
no build**.

**RECOMENDAÇÃO:** remover `legacy/` do repositório antes de entregar a base ao
Antigravity. O diretório representa 52% dos arquivos do projeto, contém código
quebrado e pode induzir um agente de IA a analisar entidades inexistentes
(`Participante`, `Pontuação`) como se fossem do domínio hospitalar.

---

## 8. FLUXOS PRINCIPAIS (resumo)

Detalhamento em `02_FUNCIONALIDADES_E_REGRAS.md`.

```text
LOGIN
Usuário informa credenciais
  ↓
AuthContext.login()                               (AuthContext.jsx:50)
  ↓
autenticarRemoto() → RPC autenticar_usuario       (authRemote.js:26)
  ↓
Banco compara crypt(senha, hash)                  (security.sql:80)
  ↓
Banco grava tentativa no log_auditoria            (security.sql:75,81,87,92)
  ↓
Sessão gravada em localStorage                    (AuthContext.jsx:37)
  ↓
normalizePermissions() monta { modulo: [acoes] }  (permissions.js:29)
  ↓
Sidebar e Guard filtram por permissão             (App.jsx:29, Sidebar.jsx)
```

```text
CRUD GENÉRICO
Ação na tela
  ↓
useCollection(nome).create/update/remove          (store.js:212)
  ↓
execute() → adaptador                             (store.js:125)
  ↓
Erro? marcarErro() + toast "Não foi salvo"        (store.js:33, ToastContext.jsx)
  ↓
Sucesso? cache em memória atualizado + emit()     (store.js:184-203)
  ↓
useAudit() grava log_auditoria                    (audit.js:12)
```

---

## 9. RESUMO EXECUTIVO

1. **Existe backend.** PostgreSQL com 17 tabelas, 1 view, 2 funções
   `SECURITY DEFINER`, triggers de `atualizado_em`, hash bcrypt e RLS. Está em
   `supabase/*.sql` e é a especificação de dados mais confiável do projeto.
2. **Não existe camada de API.** O navegador fala direto com o banco usando a
   chave anônima. Esse é o problema central que o backend Java resolve.
3. **A autorização é somente de interface.** `Guard`, `can` e `canDo` escondem
   telas e botões, mas a política RLS libera `anon` e `authenticated` para
   `all` em todas as tabelas (`schema.sql:522-524`). Qualquer portador da chave
   anônima lê e escreve tudo. Ver `SEC-001` em `06_SEGURANCA_E_CRIPTOGRAFIA.md`.
4. **A rota `/status` é pública e lê a tabela inteira.** Ver `SEC-002`.
5. **Não há testes, nem lint, nem TypeScript.** Os tipos de campo precisam ser
   inferidos do uso em tela cruzado com o DDL.
6. **52% do repositório é código morto** (`legacy/`), com erro de sintaxe.
7. **Um indicador declarado não tem tela de lançamento:** os 8 indicadores da
   tabela `uan_indicadores` são lidos e exibidos, mas nenhuma tela grava neles.
   Ver `FUNC-048`.

---

## 10. LIMITAÇÕES DESTA ANÁLISE

Declaradas para que nenhuma afirmação seja tomada além do que foi verificado.

| # | Limitação |
|---|---|
| L1 | A aplicação **não foi executada**. Nenhuma afirmação sobre comportamento em tempo de execução foi verificada em navegador. Toda conclusão vem de leitura de código. |
| L2 | Não houve acesso a uma instância Supabase real. Não foi possível confirmar se `schema.sql`, `seed.sql` e `security.sql` foram efetivamente aplicados em algum ambiente, nem se há migrações manuais fora do versionamento. |
| L3 | Não existe TypeScript. Todo tipo de campo neste conjunto de documentos é **inferido** do uso em tela e do DDL, e está marcado como tal. |
| L4 | Não há testes. A cobertura funcional real é desconhecida. |
| L5 | Não há `README` técnico de arquitetura além do `README.md` da raiz; decisões de projeto foram inferidas de comentários no código. |
| L6 | Não foi possível determinar o ambiente de produção efetivo (três provedores configurados). |
| L7 | O histórico de git não foi auditado para identificar código introduzido e revertido. |

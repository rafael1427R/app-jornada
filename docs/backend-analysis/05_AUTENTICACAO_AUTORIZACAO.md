# 05 — AUTENTICAÇÃO E AUTORIZAÇÃO

---

## 1. SITUAÇÃO ATUAL — EVIDÊNCIA

### 1.1 Mecanismo de autenticação

**Não é JWT. Não é OAuth. Não é sessão de servidor. Não é Supabase Auth.**

É autenticação própria contra a tabela `usuarios`, conferida por uma função
PL/pgSQL `SECURITY DEFINER`.

**Evidências**

| Arquivo | Linha | Conteúdo |
|---|---|---|
| `src/pages/Login.jsx` | 21-22 | valida campos vazios |
| `src/context/AuthContext.jsx` | 50-73 | `login()` |
| `src/data/authRemote.js` | 23-38 | `autenticarRemoto()` → `supabase.rpc('autenticar_usuario', ...)` |
| `supabase/security.sql` | 49-100 | função `autenticar_usuario(p_usuario text, p_senha text)` |
| `supabase/security.sql` | 120 | `grant execute ... to anon, authenticated` |

**Comportamento confirmado em código:**

```text
Login.jsx (form)
  → AuthContext.login(usuario, senha)
    → autenticarRemoto() → RPC autenticar_usuario
      → security.sql: select * from usuarios where lower(usuario) = lower(trim(p_usuario))
      → crypt(p_senha, encontrado.senha) <> encontrado.senha  → raise 'SENHA_INCORRETA'
      → encontrado.ativo is false                             → raise 'USUARIO_INATIVO'
      → insert into log_auditoria (...'Acesso autorizado')
      → return row sem a coluna `senha`
  → abrirSessao(encontrado)  → writeStorage('sys-session-v1', {...})
```

**Pontos corretos do desenho atual:**
- A senha é comparada **no servidor de banco**; o hash nunca vai ao navegador.
- `SECURITY DEFINER` + `revoke select on usuarios` (`security.sql:126`) impedem o
  cliente de ler a coluna `senha` por consulta direta.
- Toda tentativa — inexistente, senha errada, inativo, autorizada — é gravada em
  `log_auditoria` (`security.sql:75, 81, 87, 92`).

---

### 1.2 Sessão

**Status: 🔵 FRONTEND / MOCK — não há sessão de servidor.**

**Evidências**
- `src/data/collections.js:50` — `export const SESSION_KEY = 'sys-session-v1'`
- `src/context/AuthContext.jsx:29-40` — `abrirSessao()`
- `src/lib/storage.js:18-26` — `writeStorage()` grava JSON em `localStorage`

**Conteúdo real da sessão** (`AuthContext.jsx:30-36`):
```json
{ "userId": "uuid", "usuario": "admin", "nome": "...", "funcao": "...", "iniciado_em": "ISO" }
```

**O que não existe:**

| Recurso | Situação |
|---|---|
| Token | 🔴 ausente — a sessão é um objeto JSON em claro |
| Assinatura / integridade | 🔴 ausente |
| Expiração | 🔴 ausente — `iniciado_em` é gravado e **nunca lido** |
| Refresh | 🔴 ausente |
| Revogação | 🔴 ausente — `logout()` (`AuthContext.jsx:75`) só apaga o `localStorage` |
| Registro de sessão no servidor | 🔴 ausente |

⚠️ **Consequência direta e verificável:** o usuário é resolvido por
`usuarios.find((item) => item.id === session.userId)` (`AuthContext.jsx:24-27`).
Editar `userId` no `localStorage` do navegador para o id do administrador master
**concede acesso de administrador sem senha**, porque nada revalida a sessão.
Ver `SEC-003`.

⚠️ **Efeito colateral de arquitetura:** para resolver quem está logado, o
`AuthProvider` chama `useCollection('usuarios')` (`AuthContext.jsx:14`) — ou
seja, **a lista completa de usuários é baixada para toda sessão autenticada**.

---

### 1.3 Autorização

**Status: 🟡 PARCIALMENTE IMPLEMENTADA — existe só na interface.**

**Modelo de permissão (EVIDÊNCIA — `src/lib/permissions.js`)**

```text
permissoes = { <moduloId>: ['ver', 'criar', 'editar', 'excluir'] }
```

| Elemento | Linha | Conteúdo |
|---|---|---|
| `ACTIONS` | 4-9 | `ver`, `criar`, `editar`, `excluir` |
| `PERMISSION_TEMPLATES` | 14-18 | `Somente leitura` → `['ver']`; `Operacional` → `['ver','criar','editar']`; `Total` → todas |
| `fullPermissions()` | 20-22 | todas as ações em todos os 18 módulos |
| `normalizePermissions()` | 29-46 | aceita formato novo e legado |
| `visibleModules()` | 49-53 | módulos com ação `ver` |
| `hasAction()` | 55-57 | consulta pontual |

**Pontos de aplicação (EVIDÊNCIA)**

| Camada | Arquivo | Efeito |
|---|---|---|
| Menu lateral | `components/layout/Sidebar.jsx` via `allowedModules` (`AuthContext.jsx:83-87`) | esconde item |
| Entrada na rota | `App.jsx:29-43` — `Guard` | mostra "Acesso não autorizado" |
| Botões de ação | `canDo('nutricao','criar')` etc. em cada página | esconde ou desabilita |

**Perfis existentes (EVIDÊNCIA — `constants.js:28`)**
`ROLES = ['Administrador', 'Médico', 'Enfermeiro', 'Técnico de Enfermagem']`,
com `CHECK` correspondente em `schema.sql:36`.

⚠️ **`funcao` é rótulo, não autorização.** Nenhuma verificação de permissão usa
`funcao`. O acesso é decidido exclusivamente pelo mapa `permissoes` de cada
usuário, atribuído individualmente em `Usuarios.jsx`. Não há perfil que carregue
permissões por si.

---

### 1.4 O ponto central: a autorização não é aplicada no banco

🔴 **EVIDÊNCIA — `supabase/schema.sql:510-527`**

```sql
foreach tabela in array array[ ... todas as 17 tabelas ... ] loop
  execute format('alter table public.%I enable row level security', tabela);
  execute format('drop policy if exists "acesso_interno" on public.%I', tabela);
  execute format(
    'create policy "acesso_interno" on public.%I
     for all to anon, authenticated using (true) with check (true)', tabela);
end loop;
```

RLS está **habilitado**, mas a política concede `for all` (SELECT, INSERT,
UPDATE, DELETE) a `anon` **sem condição alguma** (`using (true)`).

A única exceção aplicada é a coluna `senha` (`security.sql:126-132`):
```sql
revoke select on public.usuarios from anon, authenticated;
grant select (id, nome, usuario, funcao, master, ativo, setores, modulos, permissoes, criado_em, atualizado_em) ...;
grant insert, update, delete on public.usuarios to anon, authenticated;
```
— ou seja, `anon` não **lê** a senha, mas **pode escrevê-la**.

**Conclusão técnica:** `can()` e `canDo()` são controles de **apresentação**.
Qualquer portador da chave anônima — que é embutida no bundle JavaScript e
publicamente legível — faz leitura e escrita irrestritas em todas as 17 tabelas,
independentemente de login, perfil ou permissão.

O próprio projeto reconhece isso em `security.sql:162-193` (ETAPA 2, comentada):

> *"Enquanto o login for o da tabela `usuarios`, o navegador usa a chave anônima
> e qualquer política aberta a `anon` vale para quem tiver a chave."*

Ver `SEC-001` em `06_SEGURANCA_E_CRIPTOGRAFIA.md`.

---

### 1.5 Recursos protegidos e não protegidos

| Recurso | Proteção atual |
|---|---|
| 18 rotas de módulo (`App.jsx:64-81`) | `Guard` por `can(moduleId)` — só interface |
| `/status` (`App.jsx:94`) | 🔴 **nenhuma** — fora do `PrivateArea` |
| Tabelas do banco | 🔴 **nenhuma** — RLS aberta a `anon` |
| Coluna `usuarios.senha` | 🟡 leitura revogada; escrita liberada |
| View `painel_acompanhantes` | `grant select to anon` — porém **não usada** |
| Funções RPC | `grant execute to anon, authenticated` — correto para login |

---

### 1.6 Fluxos atuais

```text
FLUXO 1 — LOGIN (EVIDÊNCIA)
Usuário informa credenciais                      Login.jsx
  ↓ validação de campo vazio                     Login.jsx:21-22
  ↓ AuthContext.login()                          AuthContext.jsx:50
  ↓ RPC autenticar_usuario                       authRemote.js:26
  ├─ erro traduzível → { ok:false, error }        authRemote.js:28-30
  ├─ erro não traduzível → { unavailable:true }   authRemote.js:30
  │    ↓ supabaseEnabled? → falha explícita       AuthContext.jsx:58-64
  │    ↓ senão → compara senha em TEXTO PURO      AuthContext.jsx:66-70  🔴
  └─ ok → abrirSessao() → localStorage            AuthContext.jsx:37
  ↓ normalizePermissions()                       permissions.js:29
  ↓ allowedModules → Sidebar                     AuthContext.jsx:83
```

```text
FLUXO 2 — TROCA DE SENHA (EVIDÊNCIA)
Usuarios.jsx:172  exigeAtual = (senhaModal.id === user?.id)
  ├─ própria senha → conferirSenhaRemota() → RPC conferir_senha
  │     ├─ banco indisponível + supabaseEnabled → bloqueia   :175-178
  │     └─ sem supabase → compara texto puro local           :180      🔴
  └─ senha de terceiro → NÃO pede senha anterior
  ↓ valida mínimo 4 caracteres e confirmação      :184-185
  ↓ updateUser(id, { senha: nova })               :189
  ↓ trigger hash_senha aplica bcrypt              security.sql:34-37
```

```text
FLUXO 3 — LOGOUT (EVIDÊNCIA)
logout() → writeStorage(SESSION_KEY, null) → setSession(null)
AuthContext.jsx:75-78
Nenhuma chamada ao servidor. Nada é invalidado.
```

### 1.7 Ausências confirmadas

| Item | Status |
|---|---|
| Recuperação de senha | 🔴 AUSENTE — nenhuma evidência de fluxo de reset |
| Expiração de sessão | 🔴 AUSENTE |
| Bloqueio por tentativas | 🔴 AUSENTE — `security.sql` registra, não bloqueia |
| MFA | 🔴 AUSENTE |
| Política de complexidade de senha | 🟡 mínimo 4 caracteres (`RN-033`) |
| Histórico de senhas | 🔴 AUSENTE |
| Troca obrigatória no primeiro acesso | 🔴 AUSENTE |
| Registro de IP / user agent | 🔴 AUSENTE |

🔴 **Credencial padrão em código-fonte:** `seedUsuarios()`
(`src/data/seeds.js:317-332`) e `supabase/seed.sql:7-10` criam
`admin` / `1123`, com `master: true` e `modulos: 'all'`. Ver `SEC-012`.

---

## 2. NECESSIDADE DO BACKEND JAVA

### 2.1 Autenticação — NECESSÁRIO

| Requisito | Especificação | Resolve |
|---|---|---|
| AUT-01 | `POST /api/v1/auth/login` emite token assinado com expiração | `FUNC-003`, `SEC-003` |
| AUT-02 | Verificação com `BCryptPasswordEncoder.matches()` — compatível com o hash `$2a$` atual, **sem invalidar senhas existentes** | `security.sql:28` |
| AUT-03 | Token com `sub` (id), `exp`, `jti`; **sem** permissões embutidas se houver necessidade de revogação imediata | — |
| AUT-04 | Tabela `sessoes` (`ENT-021`) com `token_hash`, `expira_em`, `revogado_em`, `ip`, `user_agent` | `FUNC-061` |
| AUT-05 | `POST /auth/logout` marca `revogado_em` | `FLUXO 3` |
| AUT-06 | `GET /auth/me` devolve usuário e permissões — elimina o download da tabela de usuários | `AuthContext.jsx:14` |
| AUT-07 | Mensagem **genérica** para usuário inexistente e senha incorreta | `SEC-009` |
| AUT-08 | Rate limit por IP e por login no endpoint de login | `FUNC-062` |
| AUT-09 | Preservar auditoria das 4 situações de login hoje gravadas pela função SQL | `security.sql:75-93` |
| AUT-10 | **Remover o caminho de login local por texto puro** | `AuthContext.jsx:66-70`, `SEC-004` |

### 2.2 Decisão de arquitetura de sessão — PENDENTE

| Opção | A favor | Contra |
|---|---|---|
| **JWT stateless** | Escala; sem consulta por requisição | Revogação imediata exige lista de bloqueio — o que reintroduz estado |
| **Token opaco + tabela `sessoes`** | Revogação imediata; permissão sempre atual; auditoria de sessão | Uma consulta por requisição (mitigável por cache curto) |

**RECOMENDAÇÃO:** token opaco com tabela `sessoes`. Num sistema hospitalar,
revogar o acesso de um profissional desligado **no mesmo instante** vale mais
que a economia de uma consulta indexada. Permissão alterada passa a valer na
requisição seguinte, sem esperar a expiração do token.

→ **DECISÃO HUMANA NECESSÁRIA.**

### 2.3 Autorização — NECESSÁRIO

| Requisito | Especificação | Resolve |
|---|---|---|
| AUTZ-01 | Verificação de permissão **no servidor**, em todo endpoint | `GAP-01`, `SEC-001` |
| AUTZ-02 | Mapeamento direto de `{modulo: [acoes]}` → `PermissionEvaluator`, preservando o modelo que já existe | `permissions.js` |
| AUTZ-03 | `@PreAuthorize("hasPermission('nutricao','criar')")` nos controllers | — |
| AUTZ-04 | `master = true` concede tudo (`RN-036`) | `permissions.js:31` |
| AUTZ-05 | Migrar `modulos` → `permissoes` e **descartar** a coluna legada | `RN-038`, `ENT-001` |
| AUTZ-06 | Negar por padrão: módulo ausente do mapa = sem acesso | `permissions.js:52` |
| AUTZ-07 | `GET /usuarios` nunca projeta `senha` | `SEC-001` |
| AUTZ-08 | `log_auditoria` sem DELETE nem UPDATE para qualquer perfil de aplicação | `SEC-005` |
| AUTZ-09 | Endpoint público restrito a 5 colunas (`API-050`) | `SEC-002` |
| AUTZ-10 | Após a API existir, **revogar todo acesso direto de `anon`** às tabelas; a aplicação Java passa a ser o único cliente do banco, com usuário próprio | `GAP-07` |

### 2.4 Matriz de permissão por endpoint

Derivada de `canDo(...)` em cada página. Módulo → ação → endpoints.

| Módulo | ver | criar | editar | excluir |
|---|---|---|---|---|
| `dashboard` | `GET /dashboard` | — | — | — |
| `mapa` | `GET /salas-cirurgicas` | `POST` | `PUT` | `DELETE` |
| `agendamento` | `GET /cirurgias` | `POST` | `PUT`, `PUT /{id}/checklist` | `DELETE` |
| `equipe` | `GET /equipe-medica` | `POST` | `PUT` | `DELETE` |
| `prontuarios` | `GET /prontuarios/{prontuario}` (agregado) | — | — | — |
| `equipamentos` | `GET /equipamentos` | `POST` | `PUT` | `DELETE` |
| `indicadores` | `GET /indicadores/*` | — | — | — |
| `rpa` | `GET /rpa-leitos` | `POST` | `PUT` | `DELETE` |
| `escala` | `GET /escala-plantao` | `POST` | `PUT` | `DELETE` |
| `visitantes` | `GET /visitantes` | `POST`, `POST /{id}/reentrada` | `PUT`, `POST /{id}/saida` | `DELETE` |
| `leitos` | `GET /leitos` | `POST` | `PUT` | `DELETE` |
| `pronto-socorro` | `GET /ps-leitos`, `GET /ps-altas` | `POST` | `PUT` | `DELETE` |
| `nutricao` | `GET /dietas`, `GET /indicadores/nutricao-*`, `GET /uan-indicadores` | `POST /dietas`, `PUT /uan-indicadores/{comp}` (novo) | `PUT /dietas` | `DELETE /dietas` |
| `avaliacao-nutricional` | `GET /avaliacoes-nutricionais` | `POST` | `PUT` | `DELETE` |
| `etiquetas` | `GET /dietas` (reuso) | `POST /etiquetas/registro-impressao` | idem | — |
| `almoxarifado` | `GET /produtos-estoque`, `GET /movimentacoes-estoque` | `POST` ambos | `PUT /produtos-estoque` | `DELETE /produtos-estoque` |
| `auditoria` | `GET /auditoria` | 🚫 negado a todos | 🚫 | 🚫 |
| `usuarios` | `GET /usuarios` | `POST` | `PUT`, `PUT /{id}/senha` | `DELETE` (409 se master) |

**Nota sobre `etiquetas`:** `EtiquetasDieta.jsx:29` usa
`canDo('etiquetas','criar') || canDo('etiquetas','editar')` para liberar a
impressão, e `registrarLog` grava a emissão (`:81-86`). O módulo não tem coleção
própria — lê `dietas`. O endpoint de registro de impressão preserva essa
auditoria.

---

## 3. CRITÉRIOS DE ACEITE

```md
### CA-AUT-01 — Token obrigatório
Dado que um cliente chama GET /api/v1/dietas sem cabeçalho Authorization
Quando a requisição é processada
Então a resposta é 401 e nenhum dado de dieta é retornado
```

```md
### CA-AUT-02 — Permissão aplicada no servidor
Dado um usuário com permissoes = { "nutricao": ["ver"] }
Quando ele chama POST /api/v1/dietas com corpo válido
Então a resposta é 403 e nenhuma linha é inserida em `dietas`
```

```md
### CA-AUT-03 — Sessão não forjável
Dado um token válido do usuário A
Quando o cliente altera qualquer byte do token
Então a resposta é 401
E nenhuma identidade é assumida a partir do conteúdo enviado pelo cliente
```

```md
### CA-AUT-04 — Senha existente continua válida
Dado um usuário cuja senha foi gravada por crypt(senha, gen_salt('bf',10))
Quando ele faz login pela API Java com a mesma senha
Então o login é bem-sucedido sem necessidade de redefinição
```

```md
### CA-AUT-05 — Revogação imediata
Dado um usuário autenticado com token válido
Quando um administrador o desativa (ativo = false)
Então a requisição seguinte desse usuário responde 401
```

```md
### CA-AUT-06 — Senha nunca retornada
Dado qualquer endpoint da API
Quando a resposta contém um objeto de usuário
Então o campo `senha` não está presente em nenhuma projeção, nem como null
```

```md
### CA-AUT-07 — Trilha de login preservada
Dado uma tentativa de login com senha incorreta
Quando a requisição é processada
Então é gravado um registro de auditoria com o login tentado, IP e resultado
E a senha tentada não aparece em nenhum log
```

```md
### CA-AUT-08 — Master protegido
Dado o usuário com master = true
Quando um administrador chama DELETE /api/v1/usuarios/{id} para ele
Então a resposta é 409 e o usuário permanece ativo
```

```md
### CA-AUT-09 — Painel público minimizado
Dado um cliente não autenticado
Quando ele chama GET /api/v1/public/painel-cirurgico
Então a resposta contém somente prontuario, horaPrevista, status, statusPublico e inicioReal
E não contém cirurgiao, anestesista, infeccao, evento_adverso, obito nem observacao
```

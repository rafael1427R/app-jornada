# 06 — SEGURANÇA E CRIPTOGRAFIA

> Formato de cada risco, conforme a seção 19 do prompt mestre:
> Risco · Evidência · Impacto · Probabilidade qualitativa · Medida recomendada ·
> Prioridade · Impacto no backend Java.

> **Escopo:** análise técnica de código estático. A aplicação não foi executada e
> nenhum teste de intrusão foi realizado. Ver limitações em `01`, seção 10.

---

## 1. RISCOS IDENTIFICADOS

### SEC-001 — Acesso irrestrito ao banco pela chave anônima
**Prioridade: CRÍTICO**

**Risco:** qualquer pessoa com a chave anônima do Supabase lê e escreve em todas
as 17 tabelas, sem autenticação, independentemente de perfil ou permissão.

**Evidência**
- `supabase/schema.sql:510-527` — política aplicada a todas as tabelas:
  ```sql
  create policy "acesso_interno" on public.%I
    for all to anon, authenticated using (true) with check (true)
  ```
- `src/data/supabaseClient.js:4` — `import.meta.env.VITE_SUPABASE_ANON_KEY`
- Vite embute variáveis `VITE_*` no bundle em tempo de build. A chave é
  **conteúdo público** de qualquer navegador que carregue a aplicação.
- O próprio projeto documenta a limitação em `supabase/security.sql:162-193`
  (ETAPA 2, comentada).

**Impacto:** leitura integral de dados clínicos (dietas com nome de paciente,
avaliações nutricionais com diagnóstico e exames, cirurgias com desfecho),
dados pessoais de visitantes com documento, e **escrita arbitrária** —
incluindo alteração de senha (`security.sql:132` concede `update` em `usuarios`)
e exclusão da trilha de auditoria.

**Probabilidade qualitativa:** **alta**. Não exige vulnerabilidade: basta abrir o
código-fonte da página e copiar a chave. Qualquer pessoa com acesso à URL da
aplicação consegue.

**Medida recomendada**
1. Colocar o backend Java entre o navegador e o banco.
2. Criar usuário de banco exclusivo da aplicação, com privilégios mínimos.
3. **Revogar todo acesso de `anon`** às tabelas.
4. Rotacionar a chave anônima atual.
5. Autorização por módulo e ação no servidor (`AUTZ-01`).

**Impacto no backend Java:** é a razão de existir do backend. Sem ele, nenhuma
outra medida de segurança desta lista tem efeito prático.

---

### SEC-002 — Rota pública expõe a tabela de cirurgias inteira
**Prioridade: CRÍTICO**

**Risco:** a rota `/status`, sem autenticação, baixa todas as colunas de todas as
cirurgias — não apenas as do dia, e não apenas as colunas do painel.

**Evidência**
- `src/App.jsx:94` — `<Route path="/status" element={<PainelStatus />} />`,
  **fora** do `PrivateArea`
- `src/pages/PainelStatus.jsx:24` — `useCollections(['cirurgias'])`
- `src/data/supabaseAdapter.js:36` — `supabase.from(table).select('*')`
- `src/pages/PainelStatus.jsx:31` — filtro por `data_prevista === todayISO()`
  acontece **no cliente**, depois do download
- `supabase/schema.sql:533-542` — view `painel_acompanhantes` com apenas 6 colunas
- `supabase/security.sql:137` — `grant select on public.painel_acompanhantes to anon`
- `grep -rn "painel_acompanhantes" src/` → **nenhum resultado**

**Impacto:** exposição pública de `cirurgiao`, `anestesista`, `procedimento`,
`especialidade`, `infeccao`, `evento_adverso`, `obito`,
`motivo_cancelamento`, `observacao` e `checklist_oms` — de todo o histórico.
Associar prontuário a óbito ou a infecção de sítio cirúrgico é tratamento de
dado de saúde sem base legal aparente nesse contexto.

**Probabilidade qualitativa:** **alta**. O painel é feito para ficar aberto em TV
na sala de espera; a URL circula.

**Medida recomendada**
- Imediata, sem backend: trocar a chamada por consulta à view
  `painel_acompanhantes`.
- Definitiva: `API-050` — `GET /api/v1/public/painel-cirurgico`, com filtro de
  data no servidor, projeção de 5 campos e rate limit por IP.

**Impacto no backend Java:** endpoint público dedicado, o único sem autenticação.

---

### SEC-003 — Sessão sem token, assinatura ou expiração
**Prioridade: CRÍTICO**

**Risco:** escalonamento de privilégio por edição do `localStorage`.

**Evidência**
- `src/context/AuthContext.jsx:29-40` — sessão é JSON em claro
- `src/context/AuthContext.jsx:24-27` —
  `usuarios.find((item) => item.id === session.userId)`
- `src/data/collections.js:50` — chave `sys-session-v1`
- `iniciado_em` é gravado (`AuthContext.jsx:35`) e **nunca lido**

**Impacto:** trocar `userId` no armazenamento local pelo id do administrador
master concede acesso total, sem senha. Como a lista de usuários é baixada para
o navegador (`AuthContext.jsx:14`), **o id do master está disponível ao
atacante**. Não há expiração nem revogação.

**Probabilidade qualitativa:** **alta** em estação compartilhada — e estações de
posto de enfermagem normalmente são compartilhadas.

**Medida recomendada:** `AUT-01` a `AUT-05` — token assinado, expiração, tabela
`sessoes`, revogação no logout e na desativação do usuário.

**Impacto no backend Java:** autenticação stateful ou JWT com lista de
revogação; ver decisão pendente em `05`, seção 2.2.

---

### SEC-004 — Login local comparando senha em texto puro
**Prioridade: ALTO**

**Risco:** caminho de autenticação que não usa hash.

**Evidência** — `src/context/AuthContext.jsx:66-70`
```js
const found = usuarios.find((item) => normalize(item.usuario) === normalize(usuario))
if (!found) return { ok: false, error: 'Usuário não encontrado.' }
if (String(found.senha) !== String(senha)) return { ok: false, error: 'Senha incorreta.' }
```
Alcançável quando `supabaseEnabled === false` (`src/data/supabaseClient.js:7`),
isto é, sem `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY`.
Mesmo padrão em `src/pages/Usuarios.jsx:180` para conferir a senha atual.

**Impacto:** num build sem as variáveis de ambiente, o sistema opera inteiro em
`localStorage` com senhas legíveis em `seedUsuarios()`
(`src/data/seeds.js:323` — `senha: '1123'`). Um build de produção publicado sem
as variáveis sobe nesse modo **silenciosamente**.

**Probabilidade qualitativa:** **média**. É erro de configuração de deploy, e o
projeto tem três provedores de hospedagem configurados (`GAP-14`).

**Medida recomendada**
1. Remover o modo local de autenticação.
2. Falhar o build se as variáveis de ambiente estiverem ausentes.
3. Com a API Java, cliente sem backend simplesmente não autentica.

**Impacto no backend Java:** `AUT-10` — eliminar o caminho alternativo.

---

### SEC-005 — Trilha de auditoria gravável e apagável pelo cliente
**Prioridade: ALTO**

**Risco:** a auditoria não é confiável como prova.

**Evidência**
- `src/lib/audit.js:12-34` — o **cliente** monta e grava o registro
- `src/lib/audit.js:15` — `createRecord('auditoria', {...})` com `usuario` e
  `funcao` vindos do estado do navegador
- `supabase/schema.sql:510-527` — política `for all` inclui `DELETE` em
  `log_auditoria`
- `src/lib/audit.js:27-31` — falha é engolida em `console.warn`

**Impacto:** um cliente malicioso insere registros falsos atribuídos a outro
profissional, apaga os próprios registros, ou simplesmente suprime a gravação.
Para um sistema hospitalar, a trilha é o principal controle compensatório — e
aqui ela não resiste a quem já tem a chave.

**Probabilidade qualitativa:** **média** hoje; passa a **baixa** depois do
backend.

**Medida recomendada**
1. Auditoria gravada **pelo servidor**, na mesma transação da operação.
2. `usuario_id` da sessão, nunca do corpo da requisição.
3. Sem `UPDATE` nem `DELETE` para qualquer perfil de aplicação (`AUTZ-08`).
4. Considerar tabela *append-only* com retenção definida por política.

**Impacto no backend Java:** `AuditService` + interceptor; `log_auditoria` com
FK `usuario_id` em vez de nome (`ENT-012`).

---

### SEC-006 — Política de senha insuficiente
**Prioridade: ALTO**

**Risco:** senha de 4 caracteres, sem complexidade, sem expiração, sem bloqueio.

**Evidência**
- `src/pages/Usuarios.jsx:110` — `String(form.senha).length < 4`
- `src/pages/Usuarios.jsx:184` — mesmo mínimo na troca
- Nenhuma verificação de complexidade, histórico ou expiração
- `FUNC-062` — `security.sql` registra tentativa falha mas não bloqueia

**Impacto:** `1123` (a senha padrão do projeto) é adivinhável por força bruta
quase instantânea. Sem bloqueio por tentativas, não há custo para o atacante.

**Probabilidade qualitativa:** **alta**.

**Medida recomendada**
- Mínimo 8 caracteres para usuários comuns, 12 para `master`
- Bloqueio temporário progressivo após 5 tentativas (por login e por IP)
- Rejeitar senhas de lista de mais comuns
- Troca obrigatória no primeiro acesso
- **Não** impor rotação periódica sem necessidade regulatória (prática
  desaconselhada por induzir senhas fracas previsíveis)

**Impacto no backend Java:** validador de senha no DTO; contador de tentativas
com janela; campo `senha_provisoria`.

---

### SEC-007 — Semeadura de dados fictícios em banco de produção
**Prioridade: ALTO**

**Risco:** um `GET` escreve registros clínicos fictícios no banco real.

**Evidência** — `src/data/supabaseAdapter.js:34-42`
```js
const rows = await run(supabase.from(table).select('*').order('criado_em', ...))
if (rows && rows.length) return rows.map((row) => denormalize(name, row))
const initial = seed ? seed() : []
if (!initial.length) return []
const inserted = await run(supabase.from(table).insert(initial.map(...)).select())
```
Afeta 12 coleções com `seed` não vazio, entre elas `dietas`
(13 prescrições com nome de paciente fictício, `seeds.js:212-256`), `cirurgias`
(7 registros) e `usuarios` (`admin`/`1123`).

**Impacto:** prescrição de dieta e cirurgia inexistentes gravadas em prontuários
fictícios — que podem **coincidir com prontuários reais** (os seeds usam números
como `204871`, `229487`). Em registro clínico, isso é corrupção de dados.
Também recria o usuário `admin`/`1123` sempre que a tabela `usuarios` fica vazia.

**Probabilidade qualitativa:** **alta** — é o comportamento normal da primeira
carga de cada módulo.

**Medida recomendada**
1. Semeadura **nunca** como efeito de leitura.
2. Mover seeds para migração Flyway (dados estruturais: leitos, boxes de PS,
   salas) e **descartar** os dados clínicos fictícios.
3. Dados de demonstração, se necessários, só em ambiente de homologação, via
   endpoint administrativo explícito.

**Impacto no backend Java:** `GET` é somente leitura, sem exceção.
Migração `V2__dados_estruturais.sql` para os 150 leitos e 30 boxes de PS.

---

### SEC-008 — Saldo de estoque sem transação
**Prioridade: ALTO**

**Risco:** corrupção de saldo por concorrência.

**Evidência**
- `src/pages/Almoxarifado.jsx:147-148` — validação de saldo no cliente
- `src/data/store.js:184-203` — `createRecord` e `updateRecord` são chamadas
  HTTP independentes
- `supabase/schema.sql:377` — único `CHECK` é `quantidade > 0`
- `saldo_apos` (`schema.sql:378`) é calculado e enviado pelo cliente

**Impacto:** duas saídas simultâneas do mesmo item leem o mesmo saldo inicial e
ambas passam na validação. O saldo final fica incorreto e pode ficar negativo.
Para dieta enteral e espessante, isso é ruptura de insumo não detectada.

**Probabilidade qualitativa:** **média** — exige simultaneidade, mas o
almoxarifado tem mais de um operador.

**Medida recomendada:** `API-029` — `@Transactional` com
`SELECT ... FOR UPDATE`, validação e gravação na mesma transação.
Considerar `estoque_atual` como derivado da soma das movimentações.

**Impacto no backend Java:** serviço transacional; `CHECK (estoque_atual >= 0)`.

---

### SEC-009 — Enumeração de usuários
**Prioridade: MÉDIO**

**Risco:** a resposta distingue "usuário inexistente" de "senha incorreta".

**Evidência**
- `src/data/authRemote.js:13-14` — mensagens distintas
- `supabase/security.sql:77` — `raise exception 'USUARIO_NAO_ENCONTRADO'`
- `supabase/security.sql:83` — `raise exception 'SENHA_INCORRETA'`

**Impacto:** permite descobrir logins válidos antes de atacar a senha.
Agravante: a lista completa de usuários já é baixada para o navegador de
qualquer sessão autenticada (`AuthContext.jsx:14`), incluindo `usuario`, `nome`
e `funcao`.

**Probabilidade qualitativa:** **média**.

**Medida recomendada:** mensagem única ("Usuário ou senha inválidos") para os
dois casos, mantendo a distinção **apenas na auditoria**. Manter mensagem
específica para usuário inativo é aceitável. Restringir `GET /usuarios` a quem
tem `usuarios:ver`.

**Impacto no backend Java:** `AUT-07`, `AUTZ-07`.

---

### SEC-010 — Mensagem de erro do banco exibida ao usuário
**Prioridade: MÉDIO**

**Risco:** vazamento de detalhe de implementação.

**Evidência**
- `src/data/store.js:120-123` — `textoDoErro()` apenas remove o prefixo
  `"Error: "` / `"TypeError: "`
- `src/data/store.js:131` — `marcarErro(textoDoErro(error))`
- `src/context/ToastContext.jsx` — exibe
  `Não foi salvo no banco: ${mensagem}`

**Impacto:** mensagens do PostgreSQL e do PostgREST — nome de tabela, de coluna,
de constraint violada, texto de `CHECK` — aparecem em tela. Ajudam a mapear o
esquema.

**Probabilidade qualitativa:** **alta** de ocorrer; impacto isolado baixo.

**Medida recomendada:** erros em RFC 7807 com `detail` escrito para o usuário;
detalhe técnico apenas no log do servidor, correlacionado por id de requisição.

**Impacto no backend Java:** `@ControllerAdvice` central; `API-000`.

---

### SEC-011 — CORS e cabeçalhos de segurança parciais
**Prioridade: MÉDIO**

**Evidência**
- `firebase.json` — define `X-Frame-Options: SAMEORIGIN` e outros cabeçalhos
- `netlify.toml`, `vercel.json` — **não** foram verificados como equivalentes
- Nenhuma `Content-Security-Policy` identificada em nenhum dos três
- CORS hoje é configuração do Supabase, fora do repositório

**Impacto:** sem CSP, uma injeção de script na aplicação tem alcance total —
inclusive ler a chave anônima e o `localStorage` com a sessão.

**Probabilidade qualitativa:** **baixa** (não há entrada de HTML não sanitizado
identificada; React escapa por padrão), **impacto alto** se ocorrer.

**Medida recomendada:** CSP restritiva; cabeçalhos iguais nos três provedores —
ou escolher um só (`GAP-14`); CORS no backend restrito à origem do frontend.

**Impacto no backend Java:** `CorsConfig` com origem explícita, sem `*`.

---

### SEC-012 — Credencial padrão no código-fonte
**Prioridade: ALTO**

**Evidência**
- `src/data/seeds.js:317-332` — `usuario: 'admin'`, `senha: '1123'`,
  `master: true`, `modulos: 'all'`
- `supabase/seed.sql:7-10` — mesmo usuário e senha

**Impacto:** credencial de administrador total, pública no repositório, recriada
automaticamente sempre que a tabela `usuarios` ficar vazia (`SEC-007`).

**Probabilidade qualitativa:** **alta**.

**Medida recomendada**
1. Trocar a senha do `admin` imediatamente no ambiente em uso.
2. Remover a senha literal dos seeds; gerar senha aleatória na primeira
   execução e exigir troca no primeiro acesso.
3. Não recriar o usuário por efeito de leitura.

**Impacto no backend Java:** migração de *bootstrap* que cria o administrador com
senha aleatória impressa uma única vez no log de inicialização, com
`senha_provisoria = true`.

---

### SEC-013 — Código morto com erro de sintaxe
**Prioridade: BAIXO**

**Evidência**
- 81 arquivos em `legacy/` (52% do repositório)
- `legacy/src/API/base44Client.js` — importa `@base44/sdk`, ausente de
  `package.json`, e contém identificador inválido `appBaseUrldoaplicativo`
- Confirmado isolado do build: não referenciado por `src/`, `vite.config.js`,
  `package.json` ou `index.html`

**Impacto:** superfície de confusão. Não afeta o bundle. O risco real é
**indução ao erro**: um agente de IA ou desenvolvedor novo pode analisar
`Participante`, `Grupo` e `Pontuação` como entidades do domínio hospitalar.

**Probabilidade qualitativa:** **baixa** para exploração; **alta** para confusão.

**Medida recomendada:** remover `legacy/` antes de entregar a base ao
Antigravity. Se houver necessidade de histórico, ele já está no git.

**Impacto no backend Java:** nenhum, além de evitar entidades inventadas.

---

### SEC-014 — Ausência de paginação
**Prioridade: MÉDIO**

**Evidência** — `src/data/supabaseAdapter.js:36` —
`select('*').order('criado_em', { ascending: true })`, sem `range` nem `limit`,
em todas as 17 coleções.

**Impacto:** indisponibilidade por volume. `log_auditoria` cresce a cada
operação; `avaliacoes_nutricionais` tem 57 colunas. Com meses de uso real, cada
abertura de tela baixa a tabela inteira. É também amplificador de `SEC-001` e
`SEC-002`: um único `GET` entrega toda a base.

**Probabilidade qualitativa:** **alta** no médio prazo.

**Medida recomendada:** paginação obrigatória (`API-000`), limite máximo de
página no servidor, filtros por período nos endpoints de histórico.

**Impacto no backend Java:** `Pageable` em todos os `GET` de coleção.

---

### SEC-015 — Sem observabilidade
**Prioridade: MÉDIO**

**Evidência:** nenhum log estruturado, métrica, trace ou healthcheck.
A única instrumentação é `console.warn` em `src/lib/audit.js:30`.

**Impacto:** um incidente de segurança não é detectável nem reconstituível.
Acesso anômalo pela chave anônima (`SEC-001`) não deixa rastro na aplicação.

**Medida recomendada:** log estruturado com id de correlação, métricas de
autenticação e autorização negada, alerta sobre taxa de 401/403,
`/actuator/health`.

**Impacto no backend Java:** Actuator + Micrometer; log JSON.

---

## 2. RESUMO PRIORIZADO

| ID | Risco | Prioridade | Probabilidade |
|---|---|---|---|
| SEC-001 | Chave anônima com acesso total ao banco | CRÍTICO | alta |
| SEC-002 | Rota pública expõe tabela de cirurgias | CRÍTICO | alta |
| SEC-003 | Sessão sem token nem expiração | CRÍTICO | alta |
| SEC-004 | Login local em texto puro | ALTO | média |
| SEC-005 | Auditoria gravável e apagável pelo cliente | ALTO | média |
| SEC-006 | Política de senha insuficiente | ALTO | alta |
| SEC-007 | Semeadura fictícia em banco real | ALTO | alta |
| SEC-008 | Saldo de estoque sem transação | ALTO | média |
| SEC-012 | Credencial padrão `admin`/`1123` no código | ALTO | alta |
| SEC-009 | Enumeração de usuários | MÉDIO | média |
| SEC-010 | Erro do banco exibido ao usuário | MÉDIO | alta |
| SEC-011 | CORS e cabeçalhos parciais, sem CSP | MÉDIO | baixa |
| SEC-014 | Ausência de paginação | MÉDIO | alta |
| SEC-015 | Sem observabilidade | MÉDIO | — |
| SEC-013 | Código morto com erro de sintaxe | BAIXO | baixa |

### Ataques comuns — situação

| Vetor | Avaliação |
|---|---|
| SQL Injection | **Baixo risco.** Não há SQL concatenado no frontend; o cliente usa o construtor de consultas. As funções PL/pgSQL usam parâmetros tipados e `format(%I)` com identificador. **No backend Java:** JPA com parâmetros vinculados; nunca concatenar. |
| XSS | **Baixo risco hoje.** React escapa por padrão; nenhum `dangerouslySetInnerHTML` identificado. Campos de texto livre (`observacao`, `queixa`, `detalhe`) são renderizados como texto. **Mitigação pendente:** CSP (`SEC-011`). |
| CSRF | **Não aplicável hoje** — não há cookie de sessão; a autenticação é por chave no cabeçalho. **No backend Java:** se optar por cookie de sessão, habilitar proteção CSRF; com `Authorization: Bearer`, não é necessária. |
| Broken Access Control | **Risco crítico** — `SEC-001`, `SEC-002`, `SEC-003`. É a categoria dominante deste sistema. |
| Rate limiting | **Ausente** — `SEC-006`. |
| Upload malicioso | **Não aplicável** — não há upload (`FUNC-063`). |
| Exposição de segredo | **Confirmada por desenho** — a chave anônima é pública; o problema é o privilégio que ela carrega (`SEC-001`). |

---

## 3. CRIPTOGRAFIA E PROTEÇÃO DE DADOS

> Sem a regra simplista de "criptografar tudo". A classificação abaixo separa o
> que precisa de *hash*, o que precisa de *cifra reversível*, o que precisa
> apenas de *controle de acesso* e o que **não deveria ser armazenado**.

```text
Hash de senha  ≠  Criptografia reversível
```
Senha **nunca** é cifrada de forma reversível. É submetida a função de derivação
com sal, de verificação unidirecional.

### 3.1 Situação atual — EVIDÊNCIA

| Item | Situação |
|---|---|
| Hash de senha | ✅ **Correto.** bcrypt com custo 10 e sal por registro: `crypt(new.senha, gen_salt('bf', 10))` (`security.sql:28`), aplicado por trigger `hash_senha` (`:34-37`) |
| Conversão de senhas legadas | ✅ `security.sql:40-42` converte o que não começa com `$2` — idempotente |
| Verificação | ✅ No servidor de banco, `SECURITY DEFINER` (`security.sql:80`) |
| Leitura do hash pelo cliente | ✅ Revogada (`security.sql:126-129`) |
| **Escrita** do hash pelo cliente | 🔴 **Liberada** (`security.sql:132`) |
| Dados em trânsito | ✅ HTTPS pelo Supabase (fora do repositório) |
| Dados em repouso | ❓ **INDETERMINADO** — cifra em repouso é configuração da instância Supabase, não verificável neste código |
| Gestão de segredos | 🟡 `.env` ignorado pelo git (`.gitignore:3`); `.env.example` sem valor real. Mas a chave anônima é pública por desenho |
| Exposição em log | ✅ Nenhuma senha em log identificada. `security.sql` registra o login tentado, **não** a senha |
| Exposição em resposta de API | ✅ `autenticar_usuario` (`security.sql:95-98`) devolve campos explícitos, sem `senha` |
| Cifra de dado clínico | 🔴 Nenhuma. Dados de saúde em claro, protegidos somente por controle de acesso — que hoje está aberto (`SEC-001`) |

### 3.2 Classificação por dado

| Dado | Tratamento necessário | Justificativa |
|---|---|---|
| `usuarios.senha` | **Hash** (bcrypt, já correto). Nunca cifra reversível, nunca em log, nunca em resposta | Credencial |
| Token de sessão | **Hash** do token na tabela `sessoes`; valor em claro só no cliente | Credencial de portador |
| `visitantes.documento` | **Controle de acesso** + minimização. Avaliar guardar apenas os 4 últimos dígitos | Documento de identificação de terceiro; a finalidade é conferência na portaria, não arquivo |
| `visitantes.nome` | **Controle de acesso** + retenção curta | Dado pessoal de terceiro |
| `dietas.nome_paciente`, `nome_social`, `nome_mae`, `data_nascimento`, `sexo` | **Controle de acesso** + minimização. Avaliar **não armazenar** | Contradizem `RN-002`; existem só para etiqueta nominal opcional |
| `avaliacoes_nutricionais` — `diagnostico_medico`, `diagnostico_nutricional`, `alergias`, `exames`, `condicao_clinica`, `evolucoes` | **Controle de acesso rigoroso** + auditoria de leitura | Dado pessoal **sensível** de saúde (art. 5º, II, LGPD) |
| `cirurgias.infeccao`, `evento_adverso`, `obito` | **Controle de acesso** — jamais em rota pública | Dado de saúde; hoje exposto (`SEC-002`) |
| `ps_leitos.queixa`, `ps_altas.queixa` | **Controle de acesso** | Dado de saúde em texto livre |
| `prontuario` | **Controle de acesso.** É pseudônimo, não anônimo — identifica com a base do hospital | Minimização já é a estratégia do projeto |
| `log_auditoria.detalhe` | **Controle de acesso** + revisão de conteúdo | Texto livre que pode conter dado clínico |
| `equipe_medica.registro`, `telefone_ramal` | **Controle de acesso** | Dado pessoal de profissional |
| `uan_indicadores.*` | Nenhum tratamento especial | Agregado institucional, sem dado pessoal |

**Cifra em coluna — avaliação:** não é recomendada de forma ampla. Cifrar
`diagnostico_medico` impediria busca e agregação, e a chave ficaria no mesmo
ambiente da aplicação — ganho marginal sobre controle de acesso bem-feito.
**Recomendação:** cifra em repouso no nível do banco (responsabilidade da
instância) + controle de acesso + auditoria de leitura. Cifra em coluna só se
houver exigência regulatória específica.
→ **Necessita validação jurídica/compliance.**

### 3.3 Gestão de chaves e segredos — NECESSÁRIO

| Requisito | Especificação |
|---|---|
| CRY-01 | Credencial do banco e chave de assinatura de token em cofre (variável de ambiente do orquestrador, AWS Secrets Manager, Vault) — nunca em repositório |
| CRY-02 | Chave de assinatura de token com no mínimo 256 bits, rotacionável sem invalidar tudo (`kid` no cabeçalho) |
| CRY-03 | Rotacionar a chave anônima do Supabase após `SEC-001` ser corrigido |
| CRY-04 | Usuário de banco da aplicação com privilégio mínimo; nunca superusuário |
| CRY-05 | TLS obrigatório na conexão com o banco |
| CRY-06 | Senha do `admin` padrão trocada e removida do código (`SEC-012`) |

### 3.4 Backups e exportações

| Item | Situação | Recomendação |
|---|---|---|
| Backup | ❓ **INDETERMINADO** — configuração da instância Supabase, fora do repositório | Confirmar política, periodicidade, cifra e teste de restauração |
| Exportação CSV | 🔴 Gerada no cliente (`src/lib/csv.js`), **sem registro em auditoria** | `LGPD-008` — exportação pelo servidor, com auditoria de quem exportou o quê |
| Impressão | 🟡 Via `window.print()`; crachás e etiquetas levam nome | Auditar emissão de impresso nominal |

### 3.5 Acesso administrativo

**EVIDÊNCIA:** `master = true` concede todas as ações em todos os módulos
(`permissions.js:31`) e é protegido contra exclusão (`security.sql:142-160`).

**Lacuna:** não há segregação entre administrador **de sistema** (gerencia
usuários e permissões) e administrador **clínico** (acessa dado de paciente).
Hoje o master vê tudo.

**RECOMENDAÇÃO:** separar os papéis; exigir que acesso administrativo a dado
clínico seja auditado com justificativa. → **Necessita validação de compliance.**

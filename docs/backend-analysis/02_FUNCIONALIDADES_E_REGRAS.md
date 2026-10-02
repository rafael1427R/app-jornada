# 02 — FUNCIONALIDADES E REGRAS DE NEGÓCIO

> Classificação usada (definida no prompt mestre):
> 🟢 IMPLEMENTADA · 🟡 PARCIALMENTE IMPLEMENTADA · 🔵 FRONTEND/MOCK ·
> 🔴 AUSENTE · ⚠️ INCONSISTENTE · ❓ INDETERMINADA

> **Nota de classificação importante.** Com `VITE_SUPABASE_URL` definida, o CRUD
> grava em PostgreSQL — portanto é 🟢, não 🔵. O rótulo 🔵 é reservado aqui para
> o que depende de `localStorage`, de constante no código ou de dado semeado.
> O modo `localAdapter` existe apenas quando a variável de ambiente está ausente
> (`src/data/store.js:18`) e está documentado como `FUNC-002`.

---

## PARTE A — CATÁLOGO DE FUNCIONALIDADES

### Transversais

#### FUNC-001 — Autenticação por usuário e senha
**Status:** 🟢 IMPLEMENTADA

**Evidências**
- `src/pages/Login.jsx` — formulário; validação de campos vazios (linhas 21-22)
- `src/context/AuthContext.jsx:50-73` — `login()`
- `src/data/authRemote.js:23-38` — `autenticarRemoto()`, RPC `autenticar_usuario`
- `supabase/security.sql:49-100` — função `autenticar_usuario`, `SECURITY DEFINER`

**Comportamento atual:** a senha é comparada no banco com `crypt()`. O hash nunca
chega ao navegador. Erros traduzidos: `USUARIO_NAO_ENCONTRADO`, `SENHA_INCORRETA`,
`USUARIO_INATIVO` (`authRemote.js:12-16`).

**Necessidade do backend:** `POST /api/auth/login`. Ver `API-001`.

---

#### FUNC-002 — Modo offline por localStorage
**Status:** 🔵 FRONTEND / MOCK

**Evidências**
- `src/data/store.js:18` — `const primary = supabaseEnabled ? supabaseAdapter : localAdapter`
- `src/data/localAdapter.js` — CRUD completo sobre `localStorage`
- `src/data/supabaseClient.js:7` — `supabaseEnabled = Boolean(url && anonKey)`
- `src/context/AuthContext.jsx:66-70` — login local por comparação de texto puro

**Comportamento atual:** sem as variáveis de ambiente, todo o sistema opera em
`localStorage`, inclusive o login, comparando a senha **em texto puro**
(`String(found.senha) !== String(senha)`).

**Necessidade do backend:** este modo deve ser **eliminado** quando a API Java
existir. Um cliente sem backend não deve autenticar.
→ ver `SEC-004`.

---

#### FUNC-003 — Sessão persistida
**Status:** 🔵 FRONTEND / MOCK

**Evidências**
- `src/data/collections.js:50` — `SESSION_KEY = 'sys-session-v1'`
- `src/context/AuthContext.jsx:29-40` — `abrirSessao()` grava em `localStorage`
- `src/lib/storage.js:18-26` — `writeStorage()`

**Comportamento atual:** a sessão é um objeto JSON em `localStorage` contendo
`userId`, `usuario`, `nome`, `funcao`, `iniciado_em`. **Não há token, assinatura,
expiração ou revogação.** Editar o `userId` no navegador troca de usuário.

**Necessidade do backend:** sessão com token assinado e expiração. Ver `SEC-003`.

---

#### FUNC-004 — Autorização por módulo e ação
**Status:** 🟡 PARCIALMENTE IMPLEMENTADA

**Evidências**
- `src/lib/permissions.js:4-9` — `ACTIONS = { ver, criar, editar, excluir }`
- `src/lib/permissions.js:29-46` — `normalizePermissions()`
- `src/lib/permissions.js:55-57` — `hasAction()`
- `src/context/AuthContext.jsx:90-93` — `can()` e `canDo()`
- `src/App.jsx:29-43` — componente `Guard`

**Comportamento atual:** funciona **somente na interface**. Esconde itens do menu,
bloqueia a tela e oculta botões. O banco não participa: a política RLS libera
`for all to anon, authenticated using (true)` em todas as tabelas
(`supabase/schema.sql:522-524`).

**Classificação do gap:** autorização efetiva é 🔴 AUSENTE. Ver `SEC-001`.

---

#### FUNC-005 — Log de auditoria
**Status:** 🟡 PARCIALMENTE IMPLEMENTADA

**Evidências**
- `src/lib/audit.js:9-35` — `useAudit()`
- `src/pages/Auditoria.jsx` — tela de consulta
- `supabase/schema.sql:280-299` — tabela `log_auditoria`
- `src/lib/constants.js:450-457` — `AUDIT_ACTIONS` (criar, editar, excluir, ocupar, alta, status)

**Comportamento atual:** o próprio cliente grava o log, após a operação.
`audit.js:27-31` engole qualquer erro em `console.warn` para não derrubar a
operação assistencial.

**Limitação identificada:** como o cliente escreve o log e tem permissão de
`delete` na tabela, **a trilha é falsificável e apagável pelo portador da chave
anônima**. Ver `SEC-005`.

**Necessidade do backend:** auditoria gravada pelo servidor, em transação, com
tabela somente-inserção para o cliente.

---

#### FUNC-006 — Notificação de falha de gravação
**Status:** 🟢 IMPLEMENTADA

**Evidências**
- `src/data/store.js:53-69` — `registrarRelatorDeFalha()` / `reportarFalha()`
- `src/data/store.js:125-134` — `execute()` relança o erro
- `src/context/ToastContext.jsx` — registra o relator
- `src/components/layout/Sidebar.jsx` — faixa vermelha de banco indisponível
- `src/data/store.js:72-90` — `useBackendStatus()`

**Comportamento atual (decisão de projeto documentada em `store.js:8-17`):** com
Supabase configurado, falha de gravação **não** cai para `localStorage`. O erro
sobe, o toast avisa e o cabeçalho mostra "Sem conexão com o banco — nada está
sendo salvo".

---

#### FUNC-007 — Revalidação ao retomar a aba
**Status:** 🟢 IMPLEMENTADA

**Evidências:** `src/data/store.js:171-182` — `revalidateAll()` ligado a
`window.focus` e `visibilitychange`.

**Observação:** não é tempo real. Não há `WebSocket` nem Supabase Realtime.
Alterações de outro operador aparecem ao focar a aba. → `RN-025`.

---

#### FUNC-008 — Exportação CSV
**Status:** 🟢 IMPLEMENTADA

**Evidências**
- `src/lib/csv.js:11-28` — `baixarCsv()`; separador `;` e BOM UTF-8
- Usada em: `Nutricao.jsx:299`, `AvaliacaoNutricional.jsx:308`,
  `Almoxarifado.jsx`, `Auditoria.jsx`, `Leitos.jsx`, `Visitantes.jsx`,
  `Agendamento.jsx`, `EquipeMedica.jsx`, `Equipamentos.jsx`, `EscalaPlantao.jsx`

**Comportamento atual:** gerado inteiramente no navegador, a partir do que já
está em memória. **Nenhuma exportação é registrada em auditoria.** Ver `LGPD-008`.

---

#### FUNC-009 — Impressão
**Status:** 🟢 IMPLEMENTADA

**Evidências**
- `src/lib/print.js:8-12` — `PAGE_RULES` (`badge` 100×65mm, `a4`, `a4-landscape`)
- `src/lib/print.js:30-42` — `runPrint()` com `window.print()`
- `src/components/PrintArea.jsx` — portal para `#print-root` (`index.html:18`)
- `src/index.css` — classe `is-printing`

**Comportamento atual:** sem biblioteca de PDF. Impressos identificados: crachá
de visitante, etiqueta de dieta 80×40mm, ficha de avaliação nutricional, mapa de
refeições, mapa de leitos.

---

#### FUNC-010 — Chamada de paciente por voz
**Status:** 🟢 IMPLEMENTADA

**Evidências**
- `src/lib/speech.js:38-40` — `buildCallText()`
- `src/lib/speech.js:46-72` — `speak()` via `SpeechSynthesisUtterance`
- `src/pages/MapaCirurgico.jsx:49-79` — `chamar()`

**Comportamento atual:** fala **apenas o número do prontuário**, soletrado dígito
a dígito (`String(prontuario).split('').join(' ')`). Preferência por voz pt-BR
feminina (`speech.js:27-35`). Nenhum nome de paciente é vocalizado.

**Necessidade do backend:** nenhuma. É API do navegador.

---

### Centro cirúrgico

#### FUNC-011 — Mapa de salas cirúrgicas
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `src/pages/MapaCirurgico.jsx`; `ROOM_STATUS` em `constants.js:49-55`
(disponivel, em_uso, limpeza, manutencao, reservada); coleção `salas` →
`salas_cirurgicas`.

#### FUNC-012 — Agendamento cirúrgico
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `src/pages/Agendamento.jsx`; validações nas linhas 115-120;
coleção `cirurgias`.

#### FUNC-013 — Checklist de Cirurgia Segura (OMS)
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `src/lib/constants.js:85-96` — 10 itens;
`Agendamento.jsx:389-391` — marcação; `Agendamento.jsx:101` — `toggleChecklist`;
persistido em `cirurgias.checklist_oms text[]` (`schema.sql:114`).

#### FUNC-014 — Registro de desfecho cirúrgico
**Status:** 🟢 IMPLEMENTADA
**Evidências:** campos booleanos em `schema.sql:116-120` — `convertida`,
`reoperacao`, `infeccao`, `evento_adverso`, `obito`.

#### FUNC-015 — Equipe médica
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `src/pages/EquipeMedica.jsx`; `TEAM_ROLES`, `TEAM_AVAILABILITY`
em `constants.js:100-107`; coleção `equipe` → `equipe_medica`.

#### FUNC-016 — Escala de plantão
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `src/pages/EscalaPlantao.jsx`; `SCHEDULE_STATUS` em
`constants.js:109-114`; validação de substituto na linha 91.

#### FUNC-017 — Equipamentos e manutenção
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `src/pages/Equipamentos.jsx`; `EQUIPMENT_STATUS` em
`constants.js:118-123`; validação de datas na linha 79.

#### FUNC-018 — RPA com índice de Aldrete
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `src/pages/Rpa.jsx`; `RPA_BED_COUNT = 8` e
`RPA_ALERT_MINUTES = 120` (`constants.js:493-494`); `aldrete` com constraint
`between 0 and 10` (`schema.sql:185`).

#### FUNC-019 — Indicadores operacionais do CC
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `src/pages/Indicadores.jsx:122-196`, aba `operacional`.
Calculados: total, realizadas, ocupação de salas, ocupação de leitos, movimento
de 7 dias, distribuição por tipo, produção por sala, ocupação por setor.

#### FUNC-020 — Indicadores de qualidade do CC
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `src/pages/Indicadores.jsx:199-245`, aba `qualidade`.
Calculados: taxa de cancelamento, adesão ao checklist, taxa de conversão, taxa
de infecção, reoperações, eventos adversos, óbitos, adesão por item do checklist,
tendência de cancelamentos.

#### FUNC-021 — Painel público de acompanhantes
**Status:** ⚠️ INCONSISTENTE
**Evidências**
- `src/App.jsx:94` — `<Route path="/status" element={<PainelStatus />} />`, **fora** do `PrivateArea`
- `src/pages/PainelStatus.jsx:24` — `useCollections(['cirurgias'])`
- `supabase/schema.sql:533-542` — view `painel_acompanhantes` com 6 colunas
- `supabase/security.sql:137` — `grant select on public.painel_acompanhantes to anon`
- `grep -rn "painel_acompanhantes" src/` → **nenhum resultado**

**A inconsistência:** o SQL cria e libera uma view de exposição mínima, mas o
frontend **não a usa** — lê a tabela `cirurgias` inteira e filtra por data no
cliente. A view é código morto.

**Impacto:** a rota pública entrega todas as colunas de todas as cirurgias,
incluindo `cirurgiao`, `anestesista`, `infeccao`, `evento_adverso`, `obito`,
`motivo_cancelamento`. Ver `SEC-002` e `LGPD-003`.

**Decisão necessária:** o painel deve ler a view (correção mínima) ou um endpoint
dedicado no backend Java (recomendado).

---

### Internação e urgência

#### FUNC-022 — Mapa de leitos
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `src/pages/Leitos.jsx`; `BED_SECTORS` (`constants.js:137-147`) —
9 setores somando **150 leitos**; `BED_STATUS` (`constants.js:129-134`).

#### FUNC-023 — Ocupação e alta de leito
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `DISCHARGE_REASONS` (`constants.js:460-464`) — alta, transferido,
obito; `Leitos.jsx`.

#### FUNC-024 — Pronto-Socorro digital
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `src/pages/ProntoSocorro.jsx`; `PS_BED_COUNT = 30`,
`PS_PREFIX = 'PS'` (`constants.js:468-469`); `PS_STATUS` e `PS_CLASSIFICATION`
(5 cores de risco, `constants.js:471-483`); `PS_OBSERVATION_LIMIT_HOURS = 20`.

#### FUNC-025 — Evoluções do PS
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `ps_leitos.evolucoes jsonb` (`schema.sql:248`).
⚠️ Array JSON dentro da linha, sem tabela própria. Ver `ENT-010`.

#### FUNC-026 — Log de altas do PS
**Status:** 🟢 IMPLEMENTADA
**Evidências:** tabela `ps_altas` (`schema.sql:258-275`).

#### FUNC-027 — Controle de visitantes
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `src/pages/Visitantes.jsx`; `VISIT_LIMIT_MINUTES = 60`
(`constants.js:487`); `VISIT_KINSHIP` (`constants.js:489`).

#### FUNC-028 — Crachá de visitante impresso
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `Visitantes.jsx:119-120` — `imprimirCracha()`, chamado
automaticamente após o cadastro (`Visitantes.jsx:92`); formato `badge`
100×65mm (`print.js:9`).

#### FUNC-029 — Reentrada de visitante
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `Visitantes.jsx:107-111` — reinicia `entrada`, limpa `saida`,
incrementa `reentradas`.

#### FUNC-030 — Prontuários (consulta agregada)
**Status:** 🟡 PARCIALMENTE IMPLEMENTADA
**Evidências:** `src/pages/Prontuarios.jsx`; `Prontuarios.jsx:156` exibe
`checklist_oms.length + "/10 itens"`.
**Comportamento atual:** tela de leitura que agrega dados de outras coleções por
número de prontuário. **Não existe tabela `prontuarios`** nem entidade de
paciente. Não há cadastro, edição ou histórico clínico próprio.

---

### Nutrição

#### FUNC-031 — Prescrição de dietas
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `src/pages/Nutricao.jsx:221-270` — `salvar()`; coleção `dietas`.

#### FUNC-032 — Vias de alimentação (9 vias)
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `constants.js:179` — `FEEDING_ROUTES = ['VO','SNG','SOG','SNE','GTT','JTT','NPT','Mista','Zero']`;
`constants.js:182` — `ENTERAL_ROUTES` (5 vias de sonda);
`constants.js:185-201` — `FEEDING_ROUTE_LABELS` e `rotuloDaVia()`.

#### FUNC-033 — Tipo de cardápio com dedução automática
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `constants.js:236-244` — `MENU_TYPES` (7 cardápios);
`constants.js:250-265` — `tipoDeCardapio()`;
`Nutricao.jsx:737-746` — select com opção "Automático".

#### FUNC-034 — Nome social
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `src/lib/nutricao.js:18-22` — `nomeDeChamada()` (social tem
precedência); `Nutricao.jsx:830-832`; `AvaliacaoNutricional.jsx:481-483`;
`EtiquetasDieta.jsx:239-240`; colunas `nome_social` em `dietas` e
`avaliacoes_nutricionais` (`schema.sql:336,451`).

#### FUNC-035 — Sexo com opção "Outros"
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `constants.js:222-230` — `SEXOS` e `rotuloDoSexo()`.

#### FUNC-036 — Avaliação nutricional (ficha de 9 seções)
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `src/pages/AvaliacaoNutricional.jsx`; seções identificadas nos
comentários e no JSX (linhas 473, 521, 542, 589, 644, 686, 717, 744).

#### FUNC-037 — Triagem NRS-2002
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `constants.js:406-411` — `NRS_ITEMS` (4 itens);
`AvaliacaoNutricional.jsx:119-122` — `avaliarNrs()`; qualquer "sim" indica risco.

#### FUNC-038 — Cálculos antropométricos
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `AvaliacaoNutricional.jsx:103-108` — `calcularImc()`;
`111-116` — `calcularPerdaPeso()`; `154-156` — proteína por kg.

#### FUNC-039 — Exames laboratoriais com referência
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `constants.js:425-435` — `LAB_TESTS`, 9 exames com faixa.

#### FUNC-040 — Evolução/reavaliação nutricional
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `AvaliacaoNutricional.jsx:215-236` — `adicionarEvolucao()`;
`avaliacoes_nutricionais.evolucoes jsonb` (`schema.sql:445`).
⚠️ Mesmo padrão de array JSON de `FUNC-025`.

#### FUNC-041 — Indicador: avaliação em até 24h
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `AvaliacaoNutricional.jsx:125-131` — `dentroDe24h()`;
`IndicadoresNutricao.jsx:154-161`.

#### FUNC-042 — Etiquetas de dieta
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `src/pages/EtiquetasDieta.jsx`; 80×40mm; `DIET_COLORS` por
consistência (`constants.js:168-176`).

#### FUNC-043 — Listagens para a UAN
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `constants.js:287-303` — `DIET_GROUPS` (7 listagens) e
`grupoDaDieta()`.

#### FUNC-044 — Horários de refeição, geral e UTI/sonda
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `constants.js:272-279` — `MEALS`, 6 refeições com `hora` e
`horaUti`; `COMPANION_MEALS` (4 refeições do acompanhante);
`src/lib/nutricao.js:41-48` — `proximaRefeicao()`.

#### FUNC-045 — Etiqueta de acompanhante
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `EtiquetasDieta.jsx:59-68` — `montarEtiquetas()`; gera a segunda
etiqueta só quando `dieta.acompanhante_refeicao && refeicao.acompanhante`.

#### FUNC-046 — Indicadores de Nutrição Clínica
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `src/components/nutricao/IndicadoresNutricao.jsx:277-465`;
calculados das coleções `dietas` e `avaliacoes`.

#### FUNC-047 — Exibição dos indicadores da UAN
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `IndicadoresNutricao.jsx:196-274`; `constants.js:320-368` —
`UAN_INDICATORS` (8 indicadores com `meta` e `direcao`) e `metaAtingida()`;
coleção `uanIndicadores` → tabela `uan_indicadores`.

#### FUNC-048 — Lançamento dos indicadores da UAN
**Status:** 🔴 AUSENTE

**Evidências**
- `src/pages/Nutricao.jsx:103` — `const { items: uanIndicadores } = useCollection('uanIndicadores')`
  → apenas `items` é desestruturado; `create`/`update`/`remove` **não** são obtidos
- `grep -rn "uanIndicadores|uan_indicadores" src/` → 7 ocorrências, **todas de leitura**
- `supabase/seed.sql` → **não** insere em `uan_indicadores`

**Comportamento atual:** a tabela só é povoada por `seedUanIndicadores()`
(`src/data/seeds.js:262-280`), que o `supabaseAdapter` insere automaticamente
quando a tabela está vazia (`supabaseAdapter.js:39-42`). Não há tela, formulário
ou ação de usuário que grave nesses campos.

**Necessidade do backend:** `POST/PUT /api/uan-indicadores`. Ver `API-030`.
**Pendência de produto:** a tela de lançamento precisa ser construída no frontend.

#### FUNC-049 — Semeadura automática de tabela vazia
**Status:** ⚠️ INCONSISTENTE

**Evidências** — `src/data/supabaseAdapter.js:34-42`
```js
const rows = await run(supabase.from(table).select('*')...)
if (rows && rows.length) return rows.map(...)
const initial = seed ? seed() : []
if (!initial.length) return []
const inserted = await run(supabase.from(table).insert(initial...).select())
```

**Comportamento atual:** ao listar uma coleção vazia, o **cliente escreve dados
fictícios no banco de produção**. Afeta: `salas`, `cirurgias`, `equipe`,
`equipamentos`, `escala`, `rpa`, `leitos`, `psLeitos`, `usuarios`, `dietas`,
`produtos`, `uanIndicadores`.

**Por que é inconsistente:** dados de demonstração (13 prescrições com nomes de
paciente fictícios, 7 cirurgias, 1 usuário `admin`/`1123`) entram em um banco
real sem ação do operador. Em um hospital, um registro clínico fictício gravado
no banco é um defeito grave.

**Necessidade do backend:** semeadura deve ser operação administrativa explícita
(migração ou endpoint protegido), **nunca** efeito colateral de um GET.
Ver `SEC-007`.

---

### Almoxarifado

#### FUNC-050 — Cadastro de produtos
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `src/pages/Almoxarifado.jsx`; validações nas linhas 104-108;
`STOCK_CATEGORIES`, `STOCK_UNITS` (`constants.js:439-441`).

#### FUNC-051 — Movimentação de estoque com saldo
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `Almoxarifado.jsx:145-148`; `STOCK_MOVES` (`constants.js:443-446`);
tabela `movimentacoes_estoque` com `saldo_apos` (`schema.sql:378`).

#### FUNC-052 — Alerta de estoque mínimo
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `Almoxarifado.jsx:64` — `critico = (p) => Number(p.estoque_atual) <= Number(p.estoque_minimo)`.

#### FUNC-053 — Valor imobilizado em estoque
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `Almoxarifado.jsx:80` — soma de `estoque_atual * custo_unitario`.

#### FUNC-054 — Controle de validade
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `Almoxarifado.jsx:76` — `produto.validade <= todayISO()`.

---

### Administração

#### FUNC-055 — Gestão de usuários
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `src/pages/Usuarios.jsx`; validações nas linhas 105-111.

#### FUNC-056 — Troca de senha
**Status:** 🟡 PARCIALMENTE IMPLEMENTADA
**Evidências**
- `Usuarios.jsx:172-189` — `trocarSenha()`
- `src/data/authRemote.js:41-50` — `conferirSenhaRemota()` → RPC `conferir_senha`
- `supabase/security.sql:103-118` — função `conferir_senha`

**Comportamento atual:** a senha atual só é exigida quando o usuário troca a
**própria** senha (`exigeAtual = senhaModal.id === user?.id`, linha 172). Um
administrador redefine a senha de terceiros sem conhecer a anterior.
A nova senha é enviada em texto no `update` e o hash é aplicado pelo trigger
`hash_senha` (`security.sql:34-37`).

**Ausente:** recuperação de senha por e-mail, política de complexidade além de
4 caracteres, expiração, histórico de senhas, bloqueio por tentativas.

#### FUNC-057 — Proteção do administrador master
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `supabase/security.sql:142-160` — função e trigger
`proteger_master`; bloqueia `DELETE` do master e `UPDATE` que o desative.
`Usuarios.jsx:141,155,272` — interface também bloqueia.

#### FUNC-058 — Consulta do log de auditoria
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `src/pages/Auditoria.jsx`.

#### FUNC-059 — Dashboard consolidado
**Status:** 🟢 IMPLEMENTADA
**Evidências:** `src/pages/Dashboard.jsx`; usa `useCollections` (`store.js:244`).

---

### Ausentes (necessárias ou referenciadas, sem implementação)

| ID | Funcionalidade | Status | Observação |
|---|---|---|---|
| FUNC-060 | Recuperação de senha | 🔴 AUSENTE | Nenhuma evidência de fluxo de reset |
| FUNC-061 | Logout por expiração de sessão | 🔴 AUSENTE | `logout()` só é manual (`AuthContext.jsx:75`) |
| FUNC-062 | Bloqueio por tentativas de login | 🔴 AUSENTE | `security.sql` registra a tentativa, não bloqueia |
| FUNC-063 | Upload de arquivos | 🔴 AUSENTE | Nenhum `input type="file"` no projeto |
| FUNC-064 | Notificação por e-mail ou push | 🔴 AUSENTE | Só existem toasts em tela |
| FUNC-065 | Atualização em tempo real | 🔴 AUSENTE | Nenhum WebSocket/Realtime; ver `FUNC-007` |
| FUNC-066 | Paginação de listas | 🔴 AUSENTE | Todas as telas carregam a coleção inteira (`select('*')`) |
| FUNC-067 | Testes automatizados | 🔴 AUSENTE | Nenhum arquivo de teste; nenhum runner |
| FUNC-068 | Retenção/expurgo de dados | 🔴 AUSENTE | Nada apaga registro por idade |
| FUNC-069 | Entidade Paciente | 🔴 AUSENTE | Decisão de projeto (LGPD); ver `ENT-018` |
| FUNC-070 | Migrações versionadas de banco | 🟡 PARCIAL | `schema.sql` é idempotente, mas não há controle de versão de esquema |

---

## PARTE B — REGRAS DE NEGÓCIO

### Identificação e LGPD

**RN-001 — Prontuário: 3 a 12 dígitos**
Evidência: `/^\d{3,12}$/` em `Agendamento.jsx:115`, `Nutricao.jsx:225`,
`AvaliacaoNutricional.jsx:243`, `Rpa.jsx:59`, `Visitantes.jsx:72`,
`MapaCirurgico.jsx:99`.
Comportamento atual: validação só no cliente; o banco aceita `text` livre.
Impacto no backend: validar no DTO **e** no banco (`CHECK`).

**RN-002 — Paciente identificado por prontuário, não por nome**
Evidência: `supabase/schema.sql:8-9` (comentário normativo);
`src/lib/speech.js:3` (voz só com prontuário); impressos usam prontuário por padrão.
Comportamento atual: respeitado nos módulos de CC, leitos, PS e auditoria.
⚠️ **Exceção:** `dietas` e `avaliacoes_nutricionais` armazenam `nome_paciente`,
`nome_social`, `nome_mae`, `data_nascimento`, `sexo`. Ver `LGPD-001`.

**RN-003 — Nome de visitante sempre em caixa alta**
Evidência: `Visitantes.jsx:79,83` — `upper(form.nome.trim())`, idem `quarto_leito`.
Impacto no backend: normalizar no servidor; não confiar no cliente.

**RN-004 — Nome social tem precedência sobre nome de registro**
Evidência: `src/lib/nutricao.js:18-22`.

### Centro cirúrgico

**RN-005 — Cancelamento exige motivo**
Evidência: `Agendamento.jsx:120`.

**RN-006 — Checklist OMS completo = 10 de 10**
Evidência: `Indicadores.jsx:36` — `(item.checklist_oms || []).length === OMS_CHECKLIST.length`.

**RN-007 — Alerta de cancelamento acima de 15%**
Evidência: `Indicadores.jsx:201` — `tone={metricas.taxaCancelamento > 15 ? 'red' : 'emerald'}`.
Observação: é limiar de cor na interface, não meta persistida.

**RN-008 — Alerta de adesão ao checklist abaixo de 80%**
Evidência: `Indicadores.jsx:202` — `tone={metricas.taxaChecklist < 80 ? 'amber' : 'emerald'}`.

**RN-009 — Status cirúrgico: 7 estados**
Evidência: `constants.js:61-69` — agendada, em_preparo, em_andamento, em_rpa,
finalizada, cancelada, suspensa. `CHECK` correspondente em `schema.sql:109`.
Observação: **não há matriz de transição**. Qualquer status pode ir para qualquer
outro. Ver `RN-026`.

**RN-010 — Código de equipamento único**
Evidência: `Equipamentos.jsx:77`; `UNIQUE` em `schema.sql:137`.

**RN-011 — Próxima manutenção posterior à última**
Evidência: `Equipamentos.jsx:79`.

**RN-012 — Aldrete entre 0 e 10**
Evidência: `schema.sql:185` — `check (aldrete is null or (aldrete between 0 and 10))`;
`Rpa.jsx:209-210`.

**RN-013 — Alerta de permanência em RPA acima de 120 minutos**
Evidência: `constants.js:494`; `Rpa.jsx:38,132`.

### Internação, PS e visitantes

**RN-014 — 150 leitos em 9 setores**
Evidência: `constants.js:137-147`; `seedLeitos()` gera `prefixo-NN`.

**RN-015 — Código de leito único**
Evidência: `Leitos.jsx:210`; `UNIQUE` em `schema.sql:196`.

**RN-016 — 30 boxes de PS com prefixo `PS`**
Evidência: `constants.js:468-469`; `seedPsLeitos()`.

**RN-017 — Limite de observação no PS: 20 horas**
Evidência: `constants.js:387` — `PS_OBSERVATION_LIMIT_HOURS = 20`.

**RN-018 — Visita limitada a 60 minutos**
Evidência: `constants.js:487`; `Visitantes.jsx:18` —
`limiteDe(entrada) = entrada + 60min`.
Comportamento atual: o prazo é **informativo**. Nada impede a permanência; o
registro apenas aparece destacado.

**RN-019 — Reentrada reinicia o prazo e incrementa contador**
Evidência: `Visitantes.jsx:107-111`.

### Nutrição

**RN-020 — Um prontuário, uma dieta ativa**
Evidência: `Nutricao.jsx:227-228` — bloqueia se já existe dieta `ativa` para o
prontuário.
Comportamento atual: validado **somente no cliente**. Não há `UNIQUE` parcial no
banco.
Impacto no backend: `CREATE UNIQUE INDEX ... ON dietas (prontuario) WHERE status = 'ativa'`
e validação no serviço. **Hoje duas sessões simultâneas podem criar duas dietas ativas.**

**RN-021 — Mudança de regime reinicia o cronômetro**
Evidência: `Nutricao.jsx:233,239` — `inicio_em` é redefinido quando
`anterior.regime !== form.regime`.

**RN-022 — Faixas de alerta de permanência em observação**
Evidência: `constants.js:312` — `OBSERVATION_HOURS = { atencao: 6, critico: 12, limite: 24 }`;
`Nutricao.jsx:88-95` — `toneDoTempo()`.

**RN-023 — Terapia enteral define listagem e horário**
Evidência: `constants.js:298-303` — `grupoDaDieta()` devolve `DIET_GROUPS[0]`
(UTI/sonda) para qualquer via enteral, independentemente do setor;
`src/lib/nutricao.js:25-27` — `usaSonda()`.

**RN-024 — Acompanhante recebe 4 das 6 refeições, com cardápio padrão**
Evidência: `constants.js:272-281` — campo `acompanhante` por refeição;
`EtiquetasDieta.jsx:63`, `287` — "Refeição padrão do acompanhante".

**RN-025 — Dieta zero e parenteral não geram refeição**
Evidência: `IndicadoresNutricao.jsx:175` —
`ativas.filter((d) => d.via_enteral !== 'Zero' && d.via_enteral !== 'NPT')`.

**RN-026 — Dedução do tipo de cardápio**
Evidência: `constants.js:250-265` — `tipoDeCardapio()`.
Lógica atual: campo explícito vence; senão, consistência ≠ Branda → "Livre" se
Livre, senão `null`; consistência = Branda → mapeia a modificação.
⚠️ Observação: os cardápios "Branda hipossódica para diabetes" e "Branda
hipossódica para diabetes e renal" **nunca** são deduzidos, porque a dieta tem
uma única `modificacao`. Só aparecem se `tipo_cardapio` for informado à mão.

**RN-027 — Meta de indicador tem direção**
Evidência: `constants.js:362-368` — `metaAtingida()`; `direcao: 'min'` → atingida
quando `valor >= meta`; `'max'` → quando `valor <= meta`.
Metas atuais: temperatura ≥90%, custo ≤R$9,50, resto-ingestão ≤10%,
desperdício ≤12%, sobras ≤25kg, satisfações ≥80%.
⚠️ **As metas estão no código-fonte, não no banco.** Alterar uma meta exige
novo build. Ver `RN-033`.

**RN-028 — Avaliação dentro do prazo = 0 a 1 dia da admissão**
Evidência: `AvaliacaoNutricional.jsx:125-131`.

**RN-029 — Risco nutricional: qualquer "sim" no NRS-2002**
Evidência: `AvaliacaoNutricional.jsx:119-122` — `risco: positivos > 0`.

### Almoxarifado

**RN-030 — Nome de produto único**
Evidência: `Almoxarifado.jsx:105-106`.
Observação: não há `UNIQUE` no banco para `produtos_estoque.nome`.

**RN-031 — Saída não pode exceder o saldo**
Evidência: `Almoxarifado.jsx:147-148`.
⚠️ Validação só no cliente. Sem transação, duas saídas simultâneas podem deixar
saldo negativo. `schema.sql:377` só garante `quantidade > 0`.

**RN-032 — Estoque mínimo não negativo**
Evidência: `Almoxarifado.jsx:108`.

### Acesso

**RN-033 — Senha de no mínimo 4 caracteres**
Evidência: `Usuarios.jsx:110,184`.
**RECOMENDAÇÃO:** insuficiente. Ver `SEC-006`.

**RN-034 — Usuário deve ter ao menos um módulo liberado**
Evidência: `Usuarios.jsx:111`.

**RN-035 — Login único**
Evidência: `Usuarios.jsx:107-108`; `UNIQUE` em `schema.sql:33`.

**RN-036 — Master tem todas as permissões**
Evidência: `permissions.js:31` — `if (user.master || user.permissoes === 'all' || user.modulos === 'all') return fullPermissions()`.

**RN-037 — Master não pode ser excluído nem desativado**
Evidência: `security.sql:142-160`. Ver `FUNC-057`.

**RN-038 — Compatibilidade com o formato legado de permissões**
Evidência: `permissions.js:43-45` — se `permissoes` não é objeto, usa `modulos`
como lista e concede todas as 4 ações.
⚠️ Dois formatos coexistem no mesmo registro (`Usuarios.jsx:123,125` grava os
dois). Ver `ENT-001`.

**RN-039 — Usuário inativo não entra**
Evidência: `security.sql:86-90`; `AuthContext.jsx:69`.

### Estado e dados

**RN-040 — String vazia ↔ NULL em colunas de data**
Evidência: `supabaseAdapter.js:14-31` — `normalize()` converte `''` e `undefined`
em `null` nos `dateFields`; `denormalize()` faz o inverso.
Impacto no backend: o contrato JSON usa `""`, o banco usa `NULL`. A API Java
precisa decidir e documentar qual lado converte. Ver `08`.

**RN-041 — `atualizado_em` mantido por trigger**
Evidência: `schema.sql:17-25` e `484-500` — trigger `set_atualizado_em` em todas
as 17 tabelas.

**RN-042 — `id` gerado no cliente**
Evidência: `store.js:185` — `id: values.id || uid()`;
`format.js:1-7` — `crypto.randomUUID()` com fallback `'id-' + random + timestamp`.
⚠️ O fallback **não é UUID** e seria rejeitado por uma coluna `uuid`. Ocorre em
navegador sem `crypto.randomUUID` ou em contexto não seguro (HTTP).
Impacto no backend: o servidor deve gerar o id. Ver `API-000`.

---

## PARTE C — GAPS

| Gap | Categoria | Descrição |
|---|---|---|
| GAP-01 | Segurança / Autorização | Permissão existe só na interface; RLS libera tudo para `anon` |
| GAP-02 | Segurança | Rota `/status` pública lê a tabela `cirurgias` inteira |
| GAP-03 | Autenticação | Sessão sem token, sem expiração, sem revogação |
| GAP-04 | Dados | Regras de unicidade e saldo validadas só no cliente (RN-020, RN-031) |
| GAP-05 | Dados | Semeadura automática escreve dados fictícios em banco real |
| GAP-06 | Funcional | Indicadores da UAN sem tela de lançamento |
| GAP-07 | Integração | Cliente fala direto com o banco; não há camada de API |
| GAP-08 | Performance | Nenhuma paginação; `select('*')` em todas as coleções |
| GAP-09 | Observabilidade | Nenhum log estruturado de servidor, métrica ou trace |
| GAP-10 | LGPD | Sem retenção, expurgo, anonimização ou registro de exportação |
| GAP-11 | Técnico | Sem testes, sem lint, sem TypeScript |
| GAP-12 | Técnico | 81 arquivos de código morto com erro de sintaxe (`legacy/`) |
| GAP-13 | Dados | Evoluções clínicas em `jsonb`, sem tabela própria nem índice |
| GAP-14 | Infraestrutura | Três provedores de hospedagem configurados; produção indeterminada |
| GAP-15 | Funcional | Metas de indicador hardcoded no bundle |

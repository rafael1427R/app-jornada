# Vitalis — Sistema de Gestão Hospitalar

Super app de gestão hospitalar do **Hospital Regional Chagas Rodrigues — ISAC
(Instituto de Saúde e Cidadania)**, em português do Brasil, focado em **centro
cirúrgico, leitos e pronto socorro digital**.

> O nome do produto fica em um único lugar (`src/lib/brand.js`). Para renomear o
> sistema inteiro, altere `APP_NAME`.

---

## Stack

| Camada | Tecnologia |
| --- | --- |
| Front-end | React 18 + Vite 5 |
| Estilo | Tailwind CSS 3 (azul hospitalar `#0f4c81`, accent teal `#00a99d`) |
| Ícones | lucide-react (exclusivamente) |
| Gráficos | recharts |
| Rotas | react-router-dom |
| Banco de dados | Supabase (PostgreSQL) — com fallback automático para `localStorage` |
| Impressão | `window.print()` + `@page` (sem jsPDF) |
| Voz | Web Speech API (`pt-BR`, voz feminina preferida) |

---

## Como executar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/
npm run preview  # serve o build
```

### Primeiro acesso

| Usuário | Senha | Perfil |
| --- | --- | --- |
| `admin` | `1123` | Administrador Master |

A sessão fica em `localStorage` (`sys-session-v1`) e os usuários em
`sys-users-v1` (ou na tabela `usuarios` quando o Supabase está configurado).

---

## Módulos

| # | Módulo | Rota | O que faz |
| --- | --- | --- | --- |
| 1 | Dashboard | `/` | Resumo do dia: cirurgias, salas, ocupação, alertas |
| 2 | Mapa Cirúrgico | `/mapa` | Salas por setor em tempo real + **chamada de paciente por voz** |
| 3 | Agendamento | `/agendamento` | CRUD de cirurgias, checklist OMS, desfechos |
| 4 | Equipe Médica | `/equipe` | CRUD de profissionais (CRM/COREN, turno, disponibilidade) |
| 5 | Prontuários | `/prontuarios` | Histórico agrupado por prontuário + impressão A4 |
| 6 | Equipamentos | `/equipamentos` | CRUD, status e manutenção preventiva (destaque para atrasos) |
| 7 | Indicadores | `/indicadores` | Abas Operacional/Qualidade com gráficos recharts |
| 8 | RPA | `/rpa` | Recuperação pós-anestésica: entrada, saída, alerta de permanência |
| 9 | Escala de Plantão | `/escala` | Grade semanal por turno/função, substitutos e impressão paisagem |
| 10 | Visitantes | `/visitantes` | Permanência de 1 hora, contador MM:SS, crachá térmico e relatório |
| 11 | Leitos | `/leitos` | 150 leitos em 9 setores: CRUD de leitos, ocupação por prontuário, alta com motivo (alta/transferência/óbito), barra de ocupação por setor e vínculo com o acompanhante |
| 12 | Pronto Socorro Digital | `/pronto-socorro` | 30 quartos digitais: admissão, evolução clínica e alta |
| 13 | Nutrição / Dietas | `/nutricao` | Prescrição por prontuário/leito: consistência, modificação terapêutica, adequações complementares, via de alimentação, terapia enteral, regime com cronômetro, mapa de refeições e **fluxo do plantão com os prazos da UAN** |
| 14 | Avaliação Nutricional | `/avaliacao-nutricional` | Ficha do setor: triagem NRS-2002, antropometria com IMC e perda de peso calculados, avaliação clínica e dietética, exames, diagnóstico, conduta e evoluções — impressa em A4 |
| 15 | Etiquetas de Dieta | `/etiquetas` | Impressão 80mm × 40mm por refeição e por listagem da UAN, colorida ou preto e branco, identificação por prontuário ou nominal |
| 16 | Almoxarifado | `/almoxarifado` | Estoque da UAN: saldo, entrada/saída com validação de saldo, alerta de mínimo e histórico |
| 17 | Log de Auditoria | `/auditoria` | Rastreabilidade: quem fez, o quê e quando (criação, edição, exclusão, ocupação, alta e mudança de status) |
| 18 | Usuários e Acessos | `/usuarios` | CRUD de usuários, setores e módulos liberados |
| — | Painel Acompanhantes | `/status` | **Rota pública, sem login**, status por prontuário |

O menu lateral exibe **apenas os módulos liberados** para o usuário conectado.

### Distribuição dos 150 leitos

| Setor | Prefixo | Leitos |
| --- | --- | --- |
| Clínica Médica | `CM` | 30 |
| Clínica Cirúrgica | `CC` | 25 |
| Pediatria | `PED` | 20 |
| UTI Adulto | `UTIA` | 15 |
| UCInco | `UCI` | 10 |
| UTI2 | `UTI2` | 10 |
| Obstetrícia | `OBS` | 15 |
| Emergência | `EMG` | 15 |
| Isolamento | `ISO` | 10 |

---

## Identidade visual

As logos oficiais ficam em `public/logos/` e são usadas em todo o sistema —
tela de login, barra lateral, painel público, crachás, etiquetas e todos os
relatórios impressos.

| Arquivo | Uso |
| --- | --- |
| `public/logos/hospital.png` | Hospital Regional Chagas Rodrigues (formato horizontal) |
| `public/logos/isac.png` | ISAC — Instituto Saúde e Cidadania (formato vertical) |

Basta substituir os dois arquivos mantendo os nomes; não é preciso reiniciar o
servidor, só atualizar a página. São aceitos `.png`, `.svg` e `.jpg` (a ordem
de procura está em `LOGOS`, em `src/lib/brand.js`). Enquanto o arquivo oficial
não estiver na pasta, o sistema mostra uma marca substituta — nada quebra.

Para trocar o nome do produto, altere `APP_NAME` no mesmo arquivo.

## Conformidade LGPD

- **Nenhum nome de paciente** é armazenado ou exibido — apenas o número de
  prontuário, em todos os módulos, impressos e no painel público.
- Nomes de **acompanhantes** são sempre gravados em **CAIXA ALTA**.
- A chamada por voz fala somente o prontuário e a sala.
- Impressões são geradas pelo próprio navegador (`window.print()`), sem envio
  de dados a serviços externos.
- O selo "Conformidade LGPD — Sem dados pessoais identificáveis" fica visível
  no rodapé da navegação e no painel público.

---

## Backend (Supabase)

O app funciona **sem backend** (tudo em `localStorage`). Ao informar as
variáveis de ambiente, todos os módulos passam a ler e gravar no Supabase
automaticamente — nenhuma alteração de código é necessária.

### 1. Criar o projeto

1. Crie um projeto em <https://supabase.com>.
2. Abra **SQL Editor** e execute, nesta ordem:
   - `supabase/schema.sql` (tabelas, índices, triggers, RLS e a view pública)
   - `supabase/seed.sql` (admin master, salas, equipe, equipamentos,
     150 leitos, 8 leitos de RPA, 30 quartos do PS e o almoxarifado)
   - `supabase/security.sql` (hash de senhas, login no banco e auditoria
     de acesso — recomendado desde o primeiro dia)
3. Em **Project Settings → API**, copie a URL e a `anon key`.

### 2. Configurar o front-end

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Reinicie o `npm run dev`. O rodapé da barra lateral passa a indicar
`dados: Supabase`.

### 3. Tabelas

| Tabela | Conteúdo |
| --- | --- |
| `usuarios` | Login, função, setores e módulos permitidos |
| `salas_cirurgicas` | Nome, tipo, setor, andar, status, equipamentos |
| `cirurgias` | Prontuário, procedimento, tipo, técnica, sala, datas/horários, status, equipe, anestesia, checklist OMS, lateralidade, leito RPA, conversão, reoperação, infecção, evento adverso, óbito |
| `equipe_medica` | Nome, CRM/COREN, função, especialidade, turno |
| `equipamentos` | Nome, código, tipo, status, manutenções |
| `escala_plantao` | Data, turno, profissional, função, sala, status, substituto |
| `rpa_leitos` | Leitos de recuperação pós-anestésica |
| `leitos` | 150 leitos de internação |
| `visitantes` | Controle de permanência dos acompanhantes |
| `ps_leitos` | 30 quartos digitais do pronto socorro (evoluções em `jsonb`) |
| `ps_altas` | Log de altas do pronto socorro |
| `log_auditoria` | Rastreabilidade das ações (usuário, função, ação, registro, prontuário) |
| `dietas` | Prescrição nutricional por prontuário e leito |
| `produtos_estoque` | Itens do almoxarifado da UAN |
| `movimentacoes_estoque` | Entradas e saídas de estoque |

A view `painel_acompanhantes` expõe somente prontuário, horário e status do
dia — é a base mínima para o painel público.

### 4. Endurecimento de segurança (`security.sql`)

Rode `supabase/security.sql` depois do `schema.sql`. Ele aplica, de imediato:

| Proteção | O que muda |
| --- | --- |
| **Hash de senha (bcrypt)** | As senhas deixam de existir em texto puro; um trigger aplica o hash em todo insert/update e converte as já existentes |
| **Login dentro do banco** | A função `autenticar_usuario` confere a senha no servidor; o navegador nunca recebe o hash |
| **Coluna `senha` invisível** | `REVOKE`/`GRANT` por coluna: o front-end lê todas as colunas de `usuarios`, menos a senha |
| **Auditoria de acesso** | Toda tentativa recusada (usuário inexistente, senha errada, usuário inativo) vira registro no Log de Auditoria |
| **Proteção do Master** | Trigger impede excluir ou desativar o Administrador Master, mesmo por SQL direto |

O app detecta sozinho se o `security.sql` foi aplicado: havendo a função, o
login passa a ser feito por ela; se não, usa a verificação local. Não é preciso
mexer em configuração.

### 5. Limite honesto desta arquitetura

Enquanto o login for o da tabela `usuarios`, o navegador usa a **chave
anônima**, e qualquer política aberta a `anon` vale para quem tiver essa chave
— que, por definição, está no código que roda no cliente. Isso é aceitável
para uma instalação **em rede interna do hospital**; não é aceitável para
exposição na internet.

A proteção real vem do **Supabase Auth**: cada profissional ganha uma conta, o
app recebe um JWT e as políticas passam a distinguir quem é quem. O passo a
passo está comentado no fim do `security.sql` (ETAPA 2).

### 6. Checklist de segurança da plataforma

Configurações que ficam no painel do Supabase, não no código:

- [ ] **MFA na sua conta Supabase** (Account → Security) — é a chave do reino
- [ ] **Point-in-Time Recovery** (Database → Backups) — o plano gratuito guarda
      pouco; para prontuário, contrate a retenção adequada
- [ ] **Network Restrictions** (Settings → Database) — libere apenas a faixa de
      IP do hospital
- [ ] **SSL Enforcement** (Settings → Database) — recusa conexão sem TLS
- [ ] **Rotacionar a `anon key`** se ela vazar (Settings → API)
- [ ] **Nunca usar a `service_role`** no front-end — ela ignora toda a RLS
- [ ] **Log Drains / retenção de logs** para rastrear acessos
- [ ] **Revisar as políticas** após qualquer `schema.sql` novo

### 7. Recomeçar do zero

`supabase/reset.sql` apaga **todas as tabelas e todos os dados** — não há como
desfazer. Depois dele, rode `schema.sql`, `seed.sql` e `security.sql` de novo.
Para apagar o projeto inteiro: Settings → General → Delete project.

---

## Publicar (Netlify ou Vercel)

O projeto já vem configurado: `netlify.toml`, `public/_redirects` e
`vercel.json`. O ponto crítico é o **redirecionamento de página única** — sem
ele, abrir `/leitos` ou `/status` direto (ou apertar F5) devolve 404, porque o
servidor procura um arquivo que não existe.

### Netlify pelo GitHub (recomendado)

1. <https://app.netlify.com> → **Add new site** → **Import an existing project**
2. Conecte o GitHub e escolha o repositório e a branch
3. Build command e publish directory já vêm do `netlify.toml` (`npm run build`
   e `dist`) — não mexa
4. **Site configuration → Environment variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. **Deploy site**. Cada push na branch republica sozinho.

Importante: variáveis `VITE_*` são embutidas no JavaScript durante o build. Ao
mudar uma, é preciso **refazer o deploy** (Deploys → Trigger deploy) — não basta
salvar.

### Netlify sem Git (arrastar a pasta)

`npm run build` e arraste a pasta `dist` em <https://app.netlify.com/drop>.
Nesse caminho as variáveis de ambiente precisam estar no `.env` **antes** do
build, porque o Netlify só recebe os arquivos prontos.

## Estrutura de pastas

```
src/
├── components/
│   ├── layout/      Sidebar, Header, Layout e ícones do menu
│   ├── ui/          Card, Modal, KPI, tabela, inputs, toasts
│   └── PrintArea    Portal do conteúdo de impressão
├── context/         AuthContext (sessão/permissões) e ToastContext
├── data/            Coleções, adaptadores (local/Supabase), store reativo e seeds
├── lib/             Marca, constantes, formatação, voz, impressão, relógio
└── pages/           Uma página por módulo + Login + PainelStatus
public/logos/         Logos oficiais (hospital.png e isac.png)
supabase/
├── schema.sql       Tabelas, índices, triggers, RLS, view pública
├── seed.sql         Carga inicial idempotente
├── security.sql     Hash de senhas, login no banco, auditoria de acesso
└── reset.sql        Apaga tudo (use só para recomeçar do zero)
legacy/              Export anterior do projeto (mantido apenas para consulta)
```

### Camada de dados

`src/data/store.js` mantém um cache reativo por coleção e expõe
`useCollection('leitos')` com `items`, `loading`, `create`, `update`, `remove`
e `refresh`. O adaptador é escolhido em tempo de execução: Supabase quando há
variáveis de ambiente, `localStorage` caso contrário — e, se o Supabase falhar
durante o uso, a operação cai automaticamente para o armazenamento local.

Chaves de `localStorage`: `sys-session-v1`, `sys-users-v1`, `visitors-v1`,
`leitos-v1`, `ps-v1`, `ps-altas-v1`, `cirurgias-v1`, `salas-v1`, `equipe-v1`,
`equipamentos-v1`, `escala-v1`, `rpa-v1`, `audit-v1`, `dietas-v1`, `estoque-v1`,
`estoque-mov-v1`.

---

## Permissões

O Administrador Master define, **por usuário e por módulo**, quais das quatro
ações ficam liberadas:

| Ação | O que libera |
| --- | --- |
| **Visualizar** | O módulo aparece no menu e a tela pode ser aberta |
| **Criar** | Botões "Novo/Nova…" e admissões |
| **Editar** | Alterações de status, ocupações, altas, movimentações de estoque |
| **Excluir** | Remoção de registros |

"Visualizar" é pré-requisito: ao marcar criar, editar ou excluir, ele é ativado
automaticamente. Sem "visualizar", o módulo some do menu e a rota devolve
"Acesso não autorizado". Os botões de cada ação simplesmente não são
renderizados para quem não tem a permissão.

As permissões ficam em `usuarios.permissoes`, no formato
`{ "leitos": ["ver", "criar", "editar"], "nutricao": ["ver"] }`. Cadastros
antigos, que usavam apenas a lista `modulos`, continuam válidos: são lidos como
acesso total aos módulos daquela lista (`src/lib/permissions.js`).

Toda ação de escrita em leitos e dietas grava um registro no **Log de
Auditoria**, com usuário, função, data/hora, registro, prontuário e descrição.

## Tempo de permanência

O módulo de Nutrição marca cada prescrição como **Internação** ou **Em
observação** e conta o tempo desde o início do regime. A contagem reinicia
quando o regime muda. As faixas de alerta estão em `OBSERVATION_HOURS`
(`src/lib/constants.js`):

| Faixa | Cor |
| --- | --- |
| Até 6h | Verde |
| 6h a 12h | Âmbar |
| 12h a 24h | Vermelho |
| Acima de 24h | Vermelho, linha destacada e KPI "Tempo excedido" |

## Rotina da Nutrição

O módulo segue o funcionamento descrito pela coordenação do setor:

| Refeição | Geral | UTI e sondas | Acompanhante |
| --- | --- | --- | --- |
| Desjejum | 05:45 | 06:45 | Recebe |
| Lanche da manhã | 09:00 | 10:00 | Não recebe |
| Almoço | 12:00 | 13:00 | Recebe |
| Lanche da tarde | 15:00 | 16:00 | Recebe |
| Jantar | 18:00 | 19:00 | Recebe |
| Ceia | 21:30 | 22:00 | Não recebe |

Pacientes recebem 6 refeições, acompanhantes 4 — e com **cardápio padrão**: a
etiqueta do acompanhante nunca carrega a dieta terapêutica do paciente.

As etiquetas são organizadas nas listagens entregues à UAN (`DIET_GROUPS`):
UTI 1 + UTI 2 + sondas, Clínica Médica, Clínica Ortopédica/Cirúrgica,
Pediatria + UCINCo, Pronto-Socorro e Maternidade. Pacientes em uso de sonda
entram na listagem de UTI independentemente do setor, porque seguem aqueles
horários.

### Identificação nas etiquetas

Em Etiquetas de Dieta há um seletor entre **prontuário** (padrão) e **nome
completo**. No modo nominal a etiqueta traz nome, data de nascimento e nome da
mãe, campos preenchidos na prescrição. A escolha é do serviço: a LGPD permite o
tratamento de dados de saúde para a assistência (art. 11, II, "f"), e a
identificação nominal na bandeja é prática consolidada; o modo prontuário
existe para quem prefere não circular nome em impresso.

## Exportação para planilha

Nutrição, Leitos, Almoxarifado e Log de Auditoria têm botão **CSV**, que baixa
exatamente o que está filtrado na tela. O arquivo sai com separador ponto e
vírgula e BOM UTF-8, então abre direto no Excel em português sem quebrar
acentos.

## Impressão

| Documento | Formato | Onde |
| --- | --- | --- |
| Crachá de acompanhante | 100mm × 65mm (térmico) | Visitantes |
| Relatório de acompanhantes | A4 paisagem | Visitantes |
| Escala de plantão | A4 paisagem | Escala de Plantão |
| Histórico do prontuário | A4 retrato | Prontuários |

A regra `@page` é injetada no momento da impressão e o conteúdo é renderizado
em `#print-root`, que fica visível somente durante o `window.print()`.

---

## Chamada de pacientes por voz

No Mapa Cirúrgico, o botão **Chamar Paciente** usa a Web Speech API:
`cancel()` seguido de 150 ms de espera, `volume: 1`, `rate: 0.92`, idioma
`pt-BR` com preferência por voz feminina e cache de vozes via
`onvoiceschanged`. O botão fica pulsante com o texto "Chamando..." durante a
chamada. Navegadores sem suporte registram a chamada e avisam o operador.

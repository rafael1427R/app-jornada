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
| 11 | Leitos | `/leitos` | 150 leitos em 9 setores, ocupação por prontuário |
| 12 | Pronto Socorro Digital | `/pronto-socorro` | 30 quartos digitais: admissão, evolução clínica e alta |
| 13 | Usuários e Acessos | `/usuarios` | CRUD de usuários, setores e módulos liberados |
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
     150 leitos, 8 leitos de RPA e 30 quartos do PS)
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

A view `painel_acompanhantes` expõe somente prontuário, horário e status do
dia — é a base mínima para o painel público.

### 4. Segurança — leia antes de publicar na internet

As políticas de RLS entregues liberam acesso para a chave anônima, o que
atende a uma instalação **em rede interna do hospital**, e as senhas ficam em
texto puro na tabela `usuarios` (exigência do fluxo `admin/1123` pedido no
projeto). Para expor o sistema fora da rede interna, faça antes:

1. Migrar a autenticação para o **Supabase Auth** (e-mail/senha ou SSO).
2. Trocar `to anon, authenticated` por `to authenticated` nas políticas e
   restringir por função/setor.
3. Remover a coluna `senha` de `usuarios`, passando a usar `auth.users`.

---

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
supabase/
├── schema.sql       Tabelas, índices, triggers, RLS, view pública
└── seed.sql         Carga inicial idempotente
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
`equipamentos-v1`, `escala-v1`, `rpa-v1`.

---

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

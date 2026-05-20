# PLAN — Organização Financeira

Mestre de fases e acompanhamento. Spec em [`PRD.md`](./PRD.md), convenções em [`CLAUDE.md`](./CLAUDE.md).

**Legenda:** ☐ pendente · ◐ em andamento · ✅ concluído · ⏭ adiado/futuro

---

## Visão geral

| Fase | Foco | Status |
|---|---|---|
| V0 | Fundação: scaffold, DB, Auth | ✅ |
| V1 | MVP do encontro: CRUD + dashboard + orçamento + recorrências + tags + deploy preview | ◐ |
| V1.1 | Inputs com IA + conciliação | ☐ |
| V1.2 | Cartão + Metas + Alertas + Aprendizado da IA | ☐ |
| V1.3 | Investimentos + cotações automáticas | ☐ |
| V1.4 | IA de insights + projeções | ☐ |
| V1.5 | Relatórios + Export | ☐ |
| V2 | Multi-tenant, Open Finance, WhatsApp, mobile, dark mode | ⏭ |

---

## V0 — Fundação ✅

**Objetivo:** projeto rodando local com banco, auth e schema migrados.

**Entregáveis:**
- [x] Scaffold Next.js 16 (App Router, TS, Turbopack) com Tailwind v4
- [x] shadcn/ui inicializado (light only, base neutral)
- [x] Estrutura de pastas: `app/`, `components/`, `lib/{actions,db,ai}/`, `types/`
- [x] Dependências core: `zod`, `drizzle-orm`, `drizzle-kit`, `postgres`, `@anthropic-ai/sdk`, `next-auth@beta`, `@auth/drizzle-adapter`, `bcryptjs`, `tsx`, `dotenv`
- [x] `.env.example` criado; `.gitignore` ajustado
- [x] Supabase MCP configurado em `.mcp.json` (project_ref `<SEU_PROJECT_REF>`); skills Supabase + Postgres best practices instaladas em `.agents/skills/`
- [x] Supabase Postgres conectado (`DATABASE_URL` em `.env.local`) — usuário autenticou via `claude /mcp`
- [x] Drizzle config (`drizzle.config.ts`) + `lib/db/index.ts` (conexão `postgres-js`)
- [x] Schema completo em `lib/db/schema.ts`: Auth.js (`user`, `account`, `session`, `verificationToken`) + domínio (`financial_account`, `category`, `transaction`, `tag`, `transaction_tag`, `recurring_rule`, `categorization_rule`, `budget`, `goal`, `credit_card`, `holding`, `quote`, `alert`, `ai_run`) com enums e índices
- [x] Scripts npm: `db:generate`, `db:migrate`, `db:push`, `db:studio`, `db:seed`, `typecheck`
- [x] Seed de categorias hierárquicas escrito (`scripts/seed.ts`) — idempotente, ~50 categorias em 12 grupos
- [x] Migration inicial gerada (`lib/db/migrations/0000_certain_marvel_apes.sql`) e aplicada via MCP — 18 tabelas em `public`, FKs e índices criados
- [x] Seed executado via MCP: 12 grupos + 53 subcategorias (Receitas, Moradia, Alimentação, Transporte, Saúde, Educação, Família, Pessoal, Lazer, Financeiro, Investimentos, Transferências)
- [x] RLS habilitada em todas as 18 tabelas (sem políticas — anon bloqueado, app via service-role passa). Advisor security: 0 CRITICAL, só INFO esperados.
- [x] `.env.local` preenchido pelo usuário (`DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL=http://localhost:3005`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
- [x] Migração Next.js 16: `middleware.ts` → `proxy.ts` (função `proxy()` em vez de `middleware()`). Convenção `middleware` foi deprecated em Next 16.
- [x] Dev server rodando em `http://localhost:3005` (Turbopack, Ready em ~500ms); `/` redireciona pra `/login?from=%2F`; `/login` renderiza 200.
- [x] Auth.js v5 com Drizzle adapter (`lib/auth.ts`, `lib/auth-handlers.ts`, `app/api/auth/[...nextauth]/route.ts`); JWT session; provider Credentials (email+senha bcrypt cost 12) + Google opcional (ativa se `GOOGLE_CLIENT_ID` setado)
- [x] Types augmentation (`types/next-auth.d.ts`) — `session.user.id` tipado
- [x] Middleware (`middleware.ts`) protegendo rotas; redireciona não-logado pra `/login?from=...`; logado em página de auth pra `/dashboard`
- [x] Páginas `/login` e `/cadastro` funcionando (shadcn Card/Input/Label/Button); Server Action `registerUserAction` em `lib/actions/auth.ts` com validação Zod
- [x] Layout autenticado `app/(app)/layout.tsx` com header, e-mail do usuário e botão Sair (Server Action `signOut`)
- [x] Dashboard placeholder `/dashboard` com estado vazio e CTAs
- [x] `app/page.tsx` redireciona pra `/dashboard` (middleware decide se vai pra login)
- [x] `pnpm typecheck` limpo

**Critério de aceite:** consigo me cadastrar, logar, ver dashboard vazio com sessão ativa, schema completo no Supabase.

---

## V1 — MVP do encontro ◐

**Sub-fases de execução (ordem recomendada):**

1. **V1a** — Navegação + CRUD de contas
2. **V1b** — CRUD de transações manuais (sem tags ainda)
3. **V1c** — Tags + integração na transação + listagem com filtros
4. **V1d** — Dashboard real (saldos, listas, KPIs do mês)
5. **V1e** — Gráficos com Recharts
6. **V1f** — Orçamento mensal por categoria
7. **V1g** — Recorrências + Vercel Cron
8. **V1h** — Tela de config (BYOK Anthropic API key)
9. **V1i** — Deploy preview Vercel

**Objetivo:** demonstrar valor de ponta a ponta em uso manual. Sem IA, sem cartão, sem investimento ainda — mas com tudo o que torna o app utilizável no dia a dia.

**Entregáveis:**

**V1a — Navegação + CRUD de contas ✅**
- [x] Componentes shadcn adicionais: `dialog`, `select`, `dropdown-menu`, `separator`, `badge`, `table`
- [x] Helpers: `lib/auth-helpers.ts` (`requireUserId`), `lib/format.ts` (`formatCurrency`, `formatDate`)
- [x] Schema Zod `types/financial-account.ts` (tipo + labels + currencies + validação de valor monetário)
- [x] Server Actions `lib/actions/financial-accounts.ts`: `list`, `create`, `update`, `archive`, `unarchive` — todas filtram por `userId` e validam com Zod
- [x] Página `/contas` (Server Component) com tabela shadcn + estado vazio + ações
- [x] `AccountFormDialog` (client) reutilizável: criar ou editar via Dialog Base UI; toasts via Sonner
- [x] `AccountRowActions` (client): DropdownMenu com Editar/Arquivar
- [x] Layout `(app)` ganhou `AppNav` (Dashboard / Contas / Transações / Orçamento) + Toaster montado
- [x] Migração de `asChild` (Radix) → `render` (Base UI) — shadcn usa `@base-ui/react`

**V1b — CRUD de transações ✅** (receita + despesa; transferência fica pra V1c junto com tags)
- [x] Schema Zod `types/transaction.ts` + queries hierárquicas `lib/db/queries/categories.ts`
- [x] Server Actions `lib/actions/transactions.ts`: `list`, `create`, `update`, `delete`, `listAccountsForPicker`
- [x] `TransactionFormDialog` (controlado) com select de tipo, conta (com moeda exibida), categoria hierárquica (SelectGroup), data nativa, valor, descrição, notes
- [x] `NewTransactionButton` + `TransactionRowActions` (editar/excluir via AlertDialog)
- [x] Página `/transacoes` com tabela (data, descrição, categoria com pai, conta, valor com sinal e cor)
- [x] Estado vazio que orienta a criar conta primeiro

**Sidebar profissional via `shadcn add dashboard-01`** ✅
- [x] `AppSidebar` com branding, primários (Dashboard / Contas / Transações / Orçamento), secundários (Metas / Investimentos / Insights / Alertas), Configurações no rodapé
- [x] `NavMain` com Link + active state via `usePathname`
- [x] `NavUser` com session real (initials, signOut Auth.js)
- [x] `SiteHeader` com título inferido do pathname + `SidebarTrigger`
- [x] Layout `(app)` usando `SidebarProvider`/`SidebarInset`
- [x] Placeholders (`<ComingSoon>`) pra `/orcamento`, `/metas`, `/investimentos`, `/insights`, `/alertas`, `/configuracoes` — todas respondem 200

**V1d — Dashboard real ✅**
- [x] Recharts instalado
- [x] Queries agregadas em `lib/db/queries/dashboard.ts`: balances por moeda, KPIs mensais BRL, breakdown por categoria-pai, evolução mensal 6m, últimas N transações — todas em paralelo via `Promise.all`
- [x] Componentes em `components/dashboard/`: `KpiCards` (4 cards), `CategoryBreakdown` (pizza + legenda com %), `MonthlyEvolution` (area chart), `RecentTransactions`
- [x] Dashboard mostra estado vazio guiado (2 passos: cadastrar contas → lançar transações) quando ainda não tem conta
- [x] Seed de 10 transações reais (maio + abril 2026) pro usuário demo pra demonstração
- [x] Saldo consolidado por moeda · Receitas vs despesas do mês · Gráfico de gastos por categoria · Evolução mensal 6m · Estado vazio com CTAs

**Pendente em V1 (decidido adiar pra finalizar V1.1 antes):**
- [ ] V1c — Tags + transferências + filtros na listagem de transações
- [ ] V1f — Orçamento mensal por categoria (limite, progresso, alerta 80%/100%)
- [ ] V1g — Recorrências (regra + Vercel Cron) e "próximas contas a vencer" no dashboard

**V1i — Deploy Vercel ✅**
- [x] Repositório privado em `github.com/virtcaio/organizacao-financeira`
- [x] Projeto Vercel importado via dashboard, conectado ao repo (auto-deploy em push)
- [x] Env vars de produção: `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Anthropic é BYOK (não vai no servidor)
- [x] Mesma instância Supabase em prod e dev (decidido pra MVP); separar quando for SaaS multi-tenant
- [x] **Fix de build:** `useSearchParams` em `LoginForm` envolto em `<Suspense>` (Next 16 exige em prerender)

**Critério de aceite:** consigo lançar uma despesa manual, ver ela no dashboard, configurar orçamento mensal, criar uma recorrência (Netflix), ver ela aparecer no dia certo, e tudo isso rodando em `https://<preview>.vercel.app`.

---

## V1.1 — Inputs com IA + conciliação ◐

**Objetivo:** reduzir atrito de lançamento a quase zero usando IA do próprio usuário (BYOK).

### V1.1a — BYOK + Importação PDF ✅ (validado em produção: 8 transações importadas)

**Arquitetura final** — diferente do plano original:
- Anthropic SDK é **server-side** (route handlers). A chave continua só no `localStorage` do navegador e trafega no header `x-anthropic-key` em cada call — nunca persistida no DB, nunca logada (sanitização explícita).
- Motivo: SDK Anthropic 0.97+ importa `node:fs/promises` via agent-toolset, quebrando o bundle do Turbopack mesmo com `dangerouslyAllowBrowser`. Stub via `resolveAlias` falhou na análise estática.
- Bulk save também virou route handler (`/api/transactions/bulk`) — Server Action dava `Failed to fetch` no Next 16.

**Entregue:**
- [x] `lib/ai/storage.ts` + `lib/ai/use-anthropic-key.ts` — chave em `localStorage`, hook reativo, máscara no display
- [x] `lib/ai/server.ts` (server-only) — factory do SDK + `sanitizeForLog` (remove qualquer `sk-ant-*` de logs)
- [x] `lib/ai/client.ts` — fetch helper pro `/api/ai/validate-key`
- [x] `lib/ai/import-pdf.ts` — fetch helper pro `/api/ai/import-pdf` (envia PDF via FormData)
- [x] `lib/ai/types.ts` — schemas Zod (`importedTransactionSchema`, `cardMetadataSchema`, `importPdfOutputSchema`)
- [x] `lib/ai/prompts/import-pdf.ts` — system prompt com catálogo hierárquico de categorias + `cache_control: ephemeral`
- [x] Route handler `/api/ai/validate-key` — POST com header, max_tokens=8, retorna `{ok}`
- [x] Route handler `/api/ai/import-pdf` — multipart/form-data, valida PDF (max 20MB), monta system prompt com categorias do usuário, chama Claude Sonnet 4.6 com document input nativo, parse + Zod, retorna `{data, tokensIn, tokensOut, cacheReads, cacheCreations}`
- [x] Route handler `/api/transactions/bulk` — POST JSON, valida cada linha com Zod, confere ownership da conta, insere em lote
- [x] Tela `/configuracoes` com `AnthropicKeyForm` (cola → valida → salva mascarada → botão "Remover chave")
- [x] Tela `/importar` com `ImportPdfFlow`: guards (sem chave / sem conta) → seleção de conta → drag&drop PDF → processing (15-40s) → revisão (tabela editável: data, descrição, categoria com select hierárquico, valor; remover linha individual) → "Salvar X transações"
- [x] Item "Importar" na sidebar (entre Transações e Orçamento)
- [x] `proxy.ts` ajustado pra excluir `/api/*` do matcher (handlers fazem auth interna)
- [x] Smoke test Playwright (`tests/smoke.spec.ts`) — cadastro → dashboard → guards → form BYOK → validação chave inválida → 401 nos endpoints sem auth. Passa em ~12s.
- [x] **Validado em produção:** 8 transações importadas de PDF real (R$ 586,59) em ambiente do mantenedor.

### V1.1b — Resto da V1.1 (pendente)
- [ ] Importação de CSV (parser por banco — começar pelo banco principal do usuário)
- [ ] OCR de comprovante: upload de foto pro Supabase Storage (privado, signed URL) → Claude Vision → pré-preenche formulário
- [ ] Tabela `ai_run` registrando hash do input + output pra dedup (mesma foto/PDF reenviado reusa parse)
- [ ] Conciliação de saldo: botão "ajustar saldo" em cada conta → transação `type=adjustment` com motivo

**Critério de aceite:** importo uma fatura PDF, reviso linha a linha, salvo todas. Tiro foto de uma nota fiscal, o app extrai valor/data/local e sugere categoria. Ajusto saldo da conta corrente pra bater com o app do banco.

---

## V1.2 — Cartão + Metas + Alertas + Aprendizado ☐

**Objetivo:** cobrir o ciclo completo de compromissos financeiros.

**Entregáveis:**
- [ ] Cartão de crédito: configurar dia fechamento e vencimento por conta tipo `credit_card`
- [ ] Transação parcelada: ao lançar, gera N transações futuras com `installment_group_id`, `installment_seq`, `installment_total`
- [ ] Visualização da fatura atual e próximas faturas
- [ ] Pagamento de fatura: gera transferência da conta corrente → cartão
- [ ] Metas financeiras: criar (alvo, prazo, conta destino); aporte manual; barra de progresso; alerta quando atingida
- [ ] Alertas in-app (sino no header): orçamento estourado (80%/100%), conta a vencer, fatura fechou, meta atingida
- [ ] Aprendizado de categorização: ao corrigir sugestão da IA, salvar `categorization_rule` (pattern → categoria); aplicar antes da IA nas próximas importações; tela pra listar/editar regras

**Critério de aceite:** parcelo uma compra de R$ 1.200 em 4x, vejo 4 transações futuras, fatura mostra o valor certo. Corrijo "iFood" pra Alimentação > Restaurantes uma vez, próxima importação já vem certo sem mexer no Claude.

---

## V1.3 — Investimentos + cotações ☐

**Objetivo:** carteira diversificada visível.

**Entregáveis:**
- [ ] CRUD de holdings (ticker, classe, quantidade, preço médio, moeda)
- [ ] Vercel Cron diário (07:00 BRT): AwesomeAPI (USD/EUR/BTC), brapi.dev (ações/FIIs BR), CoinGecko (cripto top-N) → grava em `quote`
- [ ] Dashboard de carteira: valor atual, custo, P&L absoluto e %, alocação por classe (pizza)
- [ ] Conversão pra BRL na visão consolidada usando cotação do dia
- [ ] Histórico de preço pra calcular rentabilidade ao longo do tempo (gráfico)

**Critério de aceite:** cadastro AAPL (USD), PETR4 (BRL), BTC. Vejo carteira em BRL com rentabilidade % e alocação por classe. Cron rodou e atualizou cotações sem ação minha.

---

## V1.4 — IA de insights + projeções ☐

**Objetivo:** IA proativa que vira diferencial real do produto.

**Entregáveis:**
- [ ] Aba `/insights` no app
- [ ] Geração de insights: client agrega últimos 90 dias (categorias, médias, outliers), manda pro Claude com prompt cached, renderiza bullets
- [ ] Cache 24h em `ai_run` (hash do snapshot) — não regenera no mesmo dia
- [ ] Projeção de fechamento do mês com base no ritmo de gasto
- [ ] Simulação de cenário: modal com sliders por categoria → recalcula projeção
- [ ] Detecção de gasto anômalo → cria alerta

**Critério de aceite:** abro `/insights` e vejo 5-10 observações úteis ("você gastou 30% acima da média em delivery em maio"), projeção do mês ("R$ 8.420 estimado") e consigo simular "se eu cortar 50% em lazer, sobra R$ X".

---

## V1.5 — Relatórios + Export ☐

**Objetivo:** consolidar visão histórica e dar liberdade dos dados.

**Entregáveis:**
- [ ] Relatório mensal: receitas, despesas, saldo, top categorias, top tags, comparação com mês anterior
- [ ] Relatório anual: idem com agregação 12 meses; gráfico de evolução
- [ ] Exportação de relatório em CSV e PDF (server-side com `@react-pdf/renderer` ou similar)
- [ ] Tela `/configuracoes/export`: dump completo em JSON (todas as tabelas do usuário) + ZIP de CSVs
- [ ] Botão "deletar minha conta" com dump prévio obrigatório

**Critério de aceite:** baixo um JSON com todas as minhas transações. Exporto relatório PDF de abril que daria pra mostrar pra um contador.

---

## V2 — Pós-MVP ⏭

Adiado pra depois do MVP estabilizado:

- Multi-tenant (organizações, convites, papéis, contas compartilhadas com cônjuge)
- Open Finance (Pluggy ou Belvo)
- Integração WhatsApp/Telegram pra lançar via mensagem
- PWA / mobile dedicado
- Dark mode
- Chat conversacional com IA
- Recomendações proativas de investimento
- Multi-moeda no dia a dia (não só investimentos)

---

## Pontos críticos / decisões em aberto

- **Bancos suportados na importação V1.1.** Comece pelo banco principal do dia a dia (qual é?). Cada banco adicionado é ~30 min de parser.
- **Cartões suportados em PDF.** Idem — qual cartão emite a fatura mais usada?
- **Frequência do Vercel Cron de cotações.** Atual: 1x ao dia. Suficiente pra long-term, insuficiente pra day trade (não é o caso).
- **Limite mensal de gastos com IA por usuário.** BYOK, então custo é dele. Mostrar contador de chamadas no mês na tela de config.
- **Backup automático Supabase.** Plano free tem backup diário 7 dias. Se for dado real da família, considerar upgrade ou dump regular pra storage próprio.

---

## Histórico de decisões importantes

- **2026-05-19 manhã:** stack travada (Next.js + Tailwind + shadcn/ui + Anthropic SDK + Vercel). Auth: Auth.js. DB: Supabase. Tema: light only. BYOK no client. Recorrências, tags, conciliação, aprendizado e export entram na V1.x.
- **2026-05-19 tarde:** sidebar adotada via `shadcn add dashboard-01` (substituiu nav horizontal). Branding "Organização Financeira", agrupamento Primário/Mais/Configurações.
- **2026-05-19 noite — pivô BYOK:** SDK Anthropic 0.97+ não bundla no browser (importa `node:fs/promises` via agent-toolset). Mantive a UX BYOK (chave só no localStorage do client), mas a chamada ao Claude agora é feita por **route handler server-side** (`/api/ai/*`). A chave trafega no header `x-anthropic-key` por request, nunca é persistida no DB nem logada. Trade-off aceito: deixa de ser "puro BYOK client" mas resolve o bundling e mantém o modelo "custo do usuário".
- **2026-05-19 noite — bulk via route handler:** Server Action de salvar em lote dava `Failed to fetch` no Next 16; migrei pra `/api/transactions/bulk`. Padrão a seguir pra novas operações: route handler > Server Action quando o body é grande ou a operação não é trivial.
- **2026-05-19 noite — Playwright instalado:** `pnpm exec playwright test` cobre smoke do fluxo de cadastro + auth + guards de IA. Próximos testes adicionados conforme a feature.
- **2026-05-19 noite — Deploy Vercel:** repo `virtcaio/organizacao-financeira` privado no GitHub, projeto importado na Vercel via dashboard, auto-deploy ativo. Build de produção exigiu Suspense em volta de `useSearchParams` (LoginForm) — fix commitado.

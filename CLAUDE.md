# CLAUDE.md — Instruções para agentes de IA

Este arquivo orienta agentes (Claude Code, Cursor, Aider, etc.) que trabalham neste repositório. Contribuidores humanos podem ler também — é uma boa fonte rápida de "como esse projeto funciona".

Para visão de produto e onboarding humano, ver [`README.md`](./README.md), [`PRD.md`](./PRD.md), [`PLAN.md`](./PLAN.md), [`ROADMAP.md`](./ROADMAP.md), [`CONTRIBUTING.md`](./CONTRIBUTING.md).

---

## ⚠️ Regra inegociável — Git workflow

> **SEMPRE seguir [`docs/GIT-WORKFLOW-BEST-PRACTICES.md`](./docs/GIT-WORKFLOW-BEST-PRACTICES.md) em toda interação com Git.**

Em particular:

- **Duas branches permanentes:** `main` (produção) e `dev` (staging). **Apenas elas deployam na Vercel** — branches temporárias não geram preview.
- **NUNCA commitar direto em `main` ou `dev`.** Todo trabalho começa criando uma branch temporária a partir de **`dev` atualizado** (exceção: `hotfix/*` parte de `main`):
  ```bash
  git checkout dev && git pull origin dev
  git checkout -b feat/nome-curto
  ```
- **PR vai contra `dev`** (`gh pr create --base dev`). Promoção `dev` → `main` é feita em PR separado com **merge commit** (não squash) preservando rastreabilidade.
- **Commits seguem Conventional Commits** (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`, `style:`, `perf:`, `ci:`). Um commit = uma mudança lógica.
- **Antes de abrir PR**, rodar `pnpm lint && pnpm typecheck && pnpm build` (e `pnpm exec playwright test` se mudou UI/rotas/forms). O CI cobre esses três, mas é melhor pegar local.
- **Squash merge** pra branches temporárias → `dev`. **Merge commit** pra `dev` → `main`.
- **Nunca force-push em `main` ou `dev`.**

Antes de cada sessão de implementação, executar mentalmente o checklist da seção 3 do `docs/GIT-WORKFLOW-BEST-PRACTICES.md`. Se em dúvida sobre comando, branch ou merge strategy, consultar primeiro o doc — ele é a fonte de verdade.

---

## 1. Project overview

App web **self-hosted** de gestão financeira pessoal/familiar com IA. Cada usuário hospeda a própria instância (Vercel + Supabase) e usa a própria chave Anthropic (BYOK). Não existe servidor central do projeto.

Killer feature: **importação de fatura de cartão em PDF**. Usuário envia o PDF, Claude Sonnet 4.6 lê o documento inteiro (vision nativo) e devolve a lista de transações categorizadas. Usuário revisa em tabela editável e salva em lote.

Detalhes completos: [`PRD.md`](./PRD.md). Roadmap: [`ROADMAP.md`](./ROADMAP.md) (público) e [`PLAN.md`](./PLAN.md) (interno, com histórico de decisões).

---

## 2. Tech stack

| Camada | Escolha |
|---|---|
| Framework | **Next.js 16** (App Router, Server Actions, Turbopack) |
| Linguagem | **TypeScript** estrito (`strict: true`, sem `any`) |
| UI | **Tailwind CSS v4** + **shadcn/ui** (sobre **Base UI**, não Radix — ver §5) |
| Gráficos | **Recharts** |
| Auth | **Auth.js v5** (NextAuth) + Drizzle adapter, sessão JWT, Credentials + Google opcional |
| Banco | **Supabase Postgres** com **RLS habilitada** em todas as tabelas |
| ORM | **Drizzle ORM** + `drizzle-kit` (migrations versionadas em `lib/db/migrations/`) |
| Validação | **Zod v4** em toda borda |
| IA | **`@anthropic-ai/sdk`** rodando **server-side** via route handlers (`app/api/ai/*`). Modelo BYOK — chave no `localStorage` do client, sem chave no servidor. |
| Storage | Supabase Storage (futuro: comprovantes em foto) |
| Hash de senhas | `bcryptjs` (cost 12) |
| Deploy | **Vercel** (Fluid Compute) |
| Testes | **Playwright** (`tests/smoke.spec.ts`) |
| CI | GitHub Actions — `lint + typecheck + build` |

**Licença:** AGPL-3.0-or-later (ver [`LICENSE`](./LICENSE)).

---

## 3. Folder structure

```
app/
  (auth)/              # rotas públicas de auth — login, cadastro
    login/
      page.tsx              # Server Component
      login-form.tsx        # "use client" — usa useSearchParams (precisa Suspense)
    cadastro/
  (app)/               # rotas autenticadas (proxy.ts redireciona não-logado)
    dashboard/
    contas/
    transacoes/
    importar/
    orcamento/         # placeholder (ComingSoon)
    metas/             # placeholder
    investimentos/     # placeholder
    insights/          # placeholder
    alertas/           # placeholder
    configuracoes/     # BYOK form
    layout.tsx              # SidebarProvider + AppSidebar + SiteHeader + Toaster
  api/
    auth/[...nextauth]/route.ts
    ai/
      validate-key/route.ts # POST com x-anthropic-key header
      import-pdf/route.ts   # POST multipart/form-data
    transactions/
      bulk/route.ts          # POST JSON — bulk save (substitui Server Action quebrada)
  layout.tsx                # root layout (fonts, html)
  page.tsx                  # redireciona pra /dashboard
  globals.css               # Tailwind + tema shadcn

proxy.ts                    # Next.js 16: era middleware.ts. Função `proxy()`, não `middleware()`.

components/
  ui/                       # shadcn/ui (Base UI) — não editar à mão, usar `pnpm dlx shadcn@latest add`
  app-sidebar.tsx
  site-header.tsx
  nav-main.tsx
  nav-user.tsx
  coming-soon.tsx
  contas/                   # features de contas
  transacoes/               # features de transações
  dashboard/                # cards e gráficos do dashboard
  importar/                 # fluxo de importação PDF
  configuracoes/            # form BYOK Anthropic key

lib/
  actions/                  # Server Actions (sufixo Action) — `auth.ts`, `financial-accounts.ts`, `transactions.ts`
  ai/                       # cliente Anthropic + helpers
    storage.ts                # localStorage (BYOK key)
    use-anthropic-key.ts      # hook reativo client-side
    client.ts                 # fetch helper pra /api/ai/validate-key
    import-pdf.ts             # fetch helper pra /api/ai/import-pdf
    server.ts                 # "server-only" — factory do SDK + sanitizeForLog
    prompts/                  # system prompts
      import-pdf.ts
    types.ts                  # schemas Zod do output da IA
  db/
    index.ts                  # postgres-js client + Drizzle
    schema.ts                 # Drizzle schema (todas tabelas)
    queries/                  # queries reutilizáveis (não-action)
    migrations/               # geradas por drizzle-kit
  auth.ts                   # Auth.js config
  auth-helpers.ts           # requireUserId, getUserId
  auth-handlers.ts          # re-export GET/POST do NextAuth
  format.ts                 # formatCurrency, formatDate
  utils.ts                  # cn() do shadcn

types/                      # schemas Zod compartilhados client↔server
  auth.ts
  financial-account.ts
  transaction.ts
  next-auth.d.ts            # type augmentation pro session.user.id

scripts/
  seed.ts                   # popula categorias seed via tsx

tests/
  smoke.spec.ts             # Playwright smoke (cadastro, dashboard, guards)
playwright.config.ts

drizzle.config.ts           # drizzle-kit config
next.config.ts
proxy.ts                    # ver acima
```

Imports usam alias `@/*`.

---

## 4. Code style

- **TypeScript estrito**, sem `any`. Use `unknown` + narrowing ou tipos reais. Para entrada de Server Action/route handler, aceite `unknown` e valide com Zod.
- **Componentes** em `PascalCase` (arquivo + export).
- **Hooks** em `camelCase` com prefixo `use` (`useAnthropicKey`).
- **Server Actions** em `camelCase` com **sufixo `Action`** (`createTransactionAction`, `archiveFinancialAccountAction`).
- Variáveis e funções comuns em `camelCase`. Constantes top-level em `SCREAMING_SNAKE_CASE` (ex: `FINANCIAL_ACCOUNT_TYPES`).
- **Server Components por padrão.** Adicione `"use client"` só onde precisa: interação, hooks (`useState`, `useTransition`, `useRouter`, `usePathname`), Web APIs.
- **Datas:** ISO string `YYYY-MM-DD` no Postgres (coluna `date`, sem fuso). Para "hoje" / boundaries de mês, **sempre** use helpers de [`lib/date.ts`](./lib/date.ts) (`todayIso`, `monthStartIso`, `monthEndIso`, `monthStartIsoBack`) que respeitam `APP_TIMEZONE` (default `America/Sao_Paulo`) — `new Date().getMonth()` direto em ambiente UTC (Vercel) causa off-by-one no fim do mês. Para formatação, `formatDate()` em [`lib/format.ts`](./lib/format.ts) aceita ISO string e formata em UTC pra preservar o componente "dia".
- **Valores monetários:** `numeric(14,2)` no Postgres, trafega como **string** (pra preservar precisão decimal). Converta com `Number()` só no momento de cálculo. Formate na borda com `formatCurrency()` em `lib/format.ts`.

---

## 5. Stack-specific gotchas (LEIA ANTES DE CODAR)

Esses são pontos que quebraram durante o desenvolvimento e precisam ser respeitados. Cada um tem o caso de uso de referência no codebase.

### 5.1 Next.js 16: arquivo é `proxy.ts`, não `middleware.ts`

A convenção `middleware.ts` foi deprecated em Next 16. Use:

```ts
// proxy.ts (raiz)
export async function proxy(req: NextRequest) { ... }
export const config = { matcher: [...] };
```

Se ver `middleware.ts` em algum lugar, é resíduo — renomeie. Limpe `.next/` após renomear.

### 5.2 shadcn/ui usa **Base UI**, não Radix

`asChild` foi substituído por `render={<Component />}`:

```tsx
// ❌ Radix antigo
<DialogTrigger asChild>
  <Button>Abrir</Button>
</DialogTrigger>

// ✅ Base UI (atual)
<DialogTrigger render={<Button>Abrir</Button>} />
```

Vale pra `DialogTrigger`, `DialogClose`, `DropdownMenuTrigger`, `SelectTrigger`, `TooltipTrigger`, etc.

Em wrappers reutilizáveis, tipe a prop como `React.ReactElement` (não `ReactNode`) — `render` exige elemento único.

### 5.3 `SelectValue` não puxa label automaticamente

Diferente do Radix, o `SelectValue` do Base UI **não** lê o `ItemText` do `SelectItem`. Pra mostrar label custom quando o `value` é um ID opaco (UUID, slug), use function-as-child:

```tsx
<SelectValue placeholder="Selecione">
  {(value: string) => labelMap.get(value) ?? "Selecione"}
</SelectValue>
```

Referência viva: [`components/transacoes/transaction-form-dialog.tsx`](./components/transacoes/transaction-form-dialog.tsx) (campo "Categoria" e "Tipo").

### 5.4 Dialog dentro de menu = controlado externamente

Base UI exige que o trigger seja `<button>` nativo. Um `DropdownMenuItem` é `<div>`, então **não pode** ser usado como `render` do `DialogTrigger`. Padrão:

```tsx
const [editOpen, setEditOpen] = useState(false);

return (
  <>
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button>...</Button>} />
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => setEditOpen(true)}>Editar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <MyFormDialog open={editOpen} onOpenChange={setEditOpen} />
  </>
);
```

Wrappers de Dialog reutilizáveis devem aceitar `open` + `onOpenChange` (sempre), e opcionalmente um `trigger`. Quando usados de dentro de menu, **só o modo controlado**.

Referências: [`components/contas/account-row-actions.tsx`](./components/contas/account-row-actions.tsx), [`components/transacoes/transaction-row-actions.tsx`](./components/transacoes/transaction-row-actions.tsx).

### 5.5 `useSearchParams` precisa de `<Suspense>` em prerender

Páginas estáticas que usam `useSearchParams` quebram o build de produção sem boundary:

```tsx
// app/(auth)/login/page.tsx
<Suspense fallback={<LoginFormSkeleton />}>
  <LoginForm />  {/* usa useSearchParams pra ler ?from=... */}
</Suspense>
```

### 5.6 Anthropic SDK **só no server** (route handlers)

O SDK Anthropic 0.97+ importa `node:fs/promises` via agent-toolset. Isso quebra o bundle do Turbopack mesmo com `dangerouslyAllowBrowser: true`. Arquitetura adotada:

- **Chave** continua só no `localStorage` do browser (BYOK).
- **Chamadas** ao Claude são feitas no servidor via route handlers em `app/api/ai/*`.
- A chave trafega no header `x-anthropic-key` em cada call.
- A chave **nunca é persistida** no DB.
- A chave **nunca é logada** — use [`sanitizeForLog()`](./lib/ai/server.ts) (`sk-ant-***`) antes de qualquer `console.error`.

Referências: [`lib/ai/server.ts`](./lib/ai/server.ts), [`app/api/ai/validate-key/route.ts`](./app/api/ai/validate-key/route.ts), [`app/api/ai/import-pdf/route.ts`](./app/api/ai/import-pdf/route.ts).

### 5.7 Server Action vs Route Handler

- **Server Actions** (`lib/actions/*Action`): boas pra CRUD pequeno + `revalidatePath`.
- **Route Handlers** (`app/api/*/route.ts`): use quando o body é grande (PDFs), envolve IA, ou em Next 16 com `Failed to fetch` em Server Action grande. Bulk save migrou de Server Action pra `/api/transactions/bulk`.

Sempre que criar route handler, valide auth no topo com `await auth()` e retorne 401 se faltar sessão.

### 5.8 Filtragem por `userId` em **toda** query Drizzle

Defense in depth sobre RLS. Mesmo que RLS bloqueie no Supabase via `anon`, o app conecta com credenciais que bypassam RLS — então o filtro de `userId` no app é a barreira primária:

```ts
await db.select().from(transactions).where(eq(transactions.userId, userId));
```

Use `requireUserId()` de [`lib/auth-helpers.ts`](./lib/auth-helpers.ts) no início de cada Server Action / route handler.

---

## 6. Patterns & exemplos de referência

Quando for criar algo novo, olhe esses arquivos antes — eles são os padrões "vivos" do projeto.

| Padrão | Olhe |
|---|---|
| Form em Dialog controlado (criar + editar) | `components/contas/account-form-dialog.tsx` |
| Menu de ações com Edit + Delete (com AlertDialog) | `components/transacoes/transaction-row-actions.tsx` |
| Server Action com Zod validation | `lib/actions/transactions.ts` |
| Route handler protegido + body validado | `app/api/transactions/bulk/route.ts` |
| Route handler com IA (key no header + SDK + JSON parse + Zod) | `app/api/ai/import-pdf/route.ts` |
| System prompt com prompt caching | `lib/ai/prompts/import-pdf.ts` |
| Query agregada para dashboard | `lib/db/queries/dashboard.ts` |
| Gráfico Recharts (Pie / Area) | `components/dashboard/category-breakdown.tsx`, `monthly-evolution.tsx` |
| Página com Server Component buscando dados | `app/(app)/contas/page.tsx` |
| Hook client-side com `localStorage` reativo | `lib/ai/use-anthropic-key.ts` |
| Categoria hierárquica (sistema + custom) | `lib/db/queries/categories.ts` |

---

## 7. Segurança e privacidade

- **Nunca logar a API key.** Sempre passar erro por `sanitizeForLog()` antes de `console.error` / monitoramento. Nunca `JSON.stringify` de payload bruto.
- **Sanitizar output da IA antes de renderizar.** Renderizar como texto (`{value}`), nunca `dangerouslySetInnerHTML`. Validar com Zod antes de gravar no DB.
- Toda string vinda de **usuário ou IA** que vai pra DB é tratada como **untrusted**.
- `.env*` no `.gitignore` (exceto `.env.example`). Segredos de servidor só em env Vercel.
- `.mcp.json` no `.gitignore` — usar `.mcp.example.json` versionado com placeholder.
- Cookies de sessão: `httpOnly`, `secure`, `sameSite=lax` (já configurado pelo Auth.js).
- Bucket Supabase Storage privado; quando usar, servir via signed URL (TTL curto, ex: 5 min).
- Senhas hasheadas com `bcryptjs` cost 12.
- **RLS habilitada** em todas as tabelas (não bloqueia o app porque ele conecta com user com bypass; bloqueia se anon key vazar).

---

## 8. Banco de dados

- **Drizzle ORM** + `postgres-js` driver.
- Schema único em [`lib/db/schema.ts`](./lib/db/schema.ts).
- Migrations em `lib/db/migrations/` versionadas no git, geradas com `pnpm db:generate`.
- Aplicar com `pnpm db:push` (dev) ou `pnpm db:migrate` (prod).
- Seed em [`scripts/seed.ts`](./scripts/seed.ts) (idempotente).
- Tabelas Auth.js (`user`, `account`, `session`, `verificationToken`) coexistem com tabelas de domínio — não renomeie sem cuidado, o Drizzle adapter espera esses nomes.

---

## 9. Comandos comuns

```bash
pnpm dev                # next dev (Turbopack)
pnpm build              # build de produção
pnpm lint               # ESLint
pnpm typecheck          # tsc --noEmit
pnpm db:generate        # gera migration a partir do schema
pnpm db:push            # aplica schema no Supabase (dev)
pnpm db:seed            # popula categorias
pnpm exec playwright test    # smoke test
```

Setup completo em [`CONTRIBUTING.md`](./CONTRIBUTING.md).

---

## 10. Git workflow (resumo — leia a regra inegociável no topo deste arquivo)

> **Fonte de verdade obrigatória:** [`docs/GIT-WORKFLOW-BEST-PRACTICES.md`](./docs/GIT-WORKFLOW-BEST-PRACTICES.md). O resumo abaixo é só pra orientação rápida — se conflitar com o doc, vale o doc.

- **Duas branches permanentes:** `main` (produção) e `dev` (staging). Trabalho em branches temporárias `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `hotfix/`.
- **Branches temporárias partem de `dev`** (exceto `hotfix/*` que parte de `main`).
- **Apenas `main` e `dev` deployam na Vercel.** Branches temporárias não geram preview deployment.
- **Nunca commit direto em `main` ou `dev`** — sempre PR.
- **Squash merge** pra `feat/*` → `dev`. **Merge commit** pra `dev` → `main` (release).
- **Conventional Commits**: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`, `style:`, `perf:`, `ci:`. Escopo opcional: `feat(transactions): add filters`.

Antes de abrir PR:

```bash
pnpm lint && pnpm typecheck && pnpm build
# Se mudou UI/rotas/forms:
pnpm exec playwright test
```

Fluxo padrão pra qualquer mudança:

```bash
git checkout dev && git pull origin dev
git checkout -b feat/nome-curto
# ... commits atômicos com Conventional Commits ...
pnpm lint && pnpm typecheck && pnpm build
git push -u origin feat/nome-curto
gh pr create --base dev
# após review + CI verde:
gh pr merge <num> --squash --delete-branch
```

Release (`dev` → `main`), quando staging estiver estável:

```bash
gh pr create --base main --head dev --title "release: ..."
gh pr merge <num> --merge --delete-branch=false
```

Detalhes completos (SemVer, hotfix, comandos, armadilhas, PR template): [`docs/GIT-WORKFLOW-BEST-PRACTICES.md`](./docs/GIT-WORKFLOW-BEST-PRACTICES.md).

---

## 11. Quando criar / editar docs

- **Não criar arquivos `.md` novos sem necessidade.** A maioria das mudanças cabe em `README.md`, `PRD.md`, `PLAN.md`, `ROADMAP.md` ou `CONTRIBUTING.md`. Se o conteúdo é específico de uma feature, prefira atualizar o doc existente correspondente.
- Quando for inevitável criar um doc novo, siga as regras de [`docs/CONVENCOES.md`](./docs/CONVENCOES.md) (estados epistêmicos, hubs canônicos, regra anti-acúmulo).
- Quando uma feature ou decisão for relevante, atualize o `PLAN.md` (interno, detalhado) e/ou `ROADMAP.md` (público, leve) no mesmo PR.

---

## 12. Memória pessoal do agente vs docs do repo

- **Memória pessoal** (ex: `~/.claude/projects/.../memory/` no Claude Code) fica **fora do repo** — guarda preferências individuais, padrões surpreendentes, feedback de processo.
- **Docs do repo** (`CLAUDE.md`, `PRD.md`, `PLAN.md`, `docs/`) pertencem ao projeto e a todos os contribuidores.
- `CLAUDE.md` é a fronteira: instruções operacionais que **qualquer agente de IA** deveria seguir ao mexer no código. Não duplique conteúdo de `PRD.md` ou `PLAN.md` aqui — referencie.

---

## 13. Referências rápidas

- [`README.md`](./README.md) — visão pública (PT-BR)
- [`README.en.md`](./README.en.md) — visão pública (EN)
- [`PRD.md`](./PRD.md) — Product Requirements Document detalhado
- [`PLAN.md`](./PLAN.md) — plano técnico vivo com histórico de decisões
- [`ROADMAP.md`](./ROADMAP.md) — roadmap público (limpo)
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — setup local, fluxo de PR
- [`SECURITY.md`](./SECURITY.md) — modelo de ameaça, como reportar vulnerabilidades
- [`docs/CONVENCOES.md`](./docs/CONVENCOES.md) — organização de docs
- [`docs/GIT-WORKFLOW-BEST-PRACTICES.md`](./docs/GIT-WORKFLOW-BEST-PRACTICES.md) — Git workflow detalhado

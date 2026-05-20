# CLAUDE.md

## 1. Project Overview

Gestor financeiro pessoal/familiar com IA. Spec completa em [`PRD.md`](./PRD.md).

## 2. Tech Stack

- Next.js 16 (App Router, Server Actions, Turbopack)
- TypeScript
- Tailwind CSS + shadcn/ui (light only)
- Auth.js (NextAuth v5) + Drizzle adapter
- Supabase Postgres + Drizzle ORM (+ Supabase Storage para fotos)
- `@anthropic-ai/sdk` no **client** (BYOK, `dangerouslyAllowBrowser: true`)
- Recharts · Zod · Vercel (deploy + Cron)

## 3. Code Style

- TypeScript estrito. **Sem `any`** — usar `unknown` + narrowing, ou tipar de verdade.
- Componentes em `PascalCase` (arquivo + export).
- Hooks em `camelCase` com prefixo `use` (`useTransactions`).
- Server Actions em `camelCase` com **sufixo `Action`** (`createTransactionAction`).
- Variáveis e funções comuns em `camelCase`. Constantes top-level em `SCREAMING_SNAKE_CASE`.
- Imports absolutos via alias `@/*`.

## 4. Folder Structure

```
app/         # rotas (App Router): layouts, pages, route handlers
components/  # componentes UI (PascalCase.tsx); shadcn em components/ui/
lib/         # utils, server actions, clientes (db, ai, storage)
  actions/   # server actions (sufixo Action)
  db/        # schema Drizzle + queries
  ai/        # cliente Anthropic (client-side) + prompts + parsers
types/       # types e schemas Zod compartilhados
```

## 5. Key Conventions

- **Validação Zod em todo input do usuário** — formulários, server actions, parse de CSV/PDF, output da IA. Schema único compartilhado entre client e server.
- **API Key Anthropic NUNCA vai pro backend.** Fica apenas no `localStorage`. Chamadas Claude saem do client via `dangerouslyAllowBrowser: true`. Sem `process.env.ANTHROPIC_API_KEY` em lugar nenhum.
- **Server Actions só quando precisa do server** — leitura/escrita no Postgres, auth, Supabase Storage signed URLs, Vercel Cron. Chamadas Claude são **client-side**, não Server Action.
- Server Components por padrão; `"use client"` só onde houver interação ou chamada Claude.
- Toda query Drizzle filtra por `userId` da sessão Auth.js.
- Datas e valores monetários em `Date` e `number` (cents) internamente; formatar só na borda da UI.

## 6. Security

- **Nunca logar a API key.** Sem `console.log`, sem `Sentry.captureException` com objeto cru contendo a key, sem `JSON.stringify` de payload com a key. Antes de logar qualquer erro de chamada Claude, remover/mascarar a key.
- **Sanitizar output da IA antes de renderizar.** Renderizar como texto (`{value}`), nunca `dangerouslySetInnerHTML`. Validar com Zod antes de gravar no DB.
- Toda string vinda do usuário ou da IA que vai pra DB é tratada como **untrusted**.
- `.env*` no `.gitignore`. Segredos de servidor só em env Vercel.
- Cookies de sessão: `httpOnly`, `secure`, `sameSite=lax`.
- Bucket Supabase Storage privado; servir via signed URL (TTL 5 min).

## 7. Commit Messages

Conventional Commits:

- `feat:` nova funcionalidade
- `fix:` correção de bug
- `chore:` build, deps, configs, lint
- `refactor:` refatoração sem mudança de comportamento
- `docs:` apenas documentação
- `test:` apenas testes
- `style:` formatação, sem mudança de código

Escopo opcional entre parênteses: `feat(transactions): add bulk import review`.

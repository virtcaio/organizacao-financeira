# Organização Financeira

> Personal & family finance manager with AI — imports PDF credit card invoices, categorizes them with Claude, **BYOK** (each user brings their own Anthropic key).

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript)](./tsconfig.json)
[![Powered by Claude](https://img.shields.io/badge/AI-Claude_Sonnet_4.6-D97757)](https://www.anthropic.com)

🇧🇷 [Versão em português (principal)](./README.md)

---

## What it is

A **self-hosted** web app to manage personal/family finances with Claude. Unlike SaaS alternatives, **your data stays in your own Supabase** and the AI uses **your Anthropic key** — no central server, no subscription, no telemetry.

The killer feature is **PDF invoice import**: you upload your credit card invoice, Claude reads the whole document (native vision), categorizes each transaction using hierarchical categories, and shows an editable table before saving.

> ⚠️ The product is built **in Portuguese** (BR) — UI labels, default category names, currency formatting (BRL). The codebase itself is i18n-friendly but you'll see PT-BR strings everywhere.

## Features

### Shipped

- Sign-up / login (Auth.js v5 with email&password + optional Google)
- CRUD for accounts (checking, savings, credit card, cash, broker)
- CRUD for manual transactions (income / expense)
- Hierarchical categories (53 categories in 12 groups, pre-seeded in PT-BR)
- Dashboard with monthly KPIs, category breakdown (pie), monthly evolution (area), recent transactions
- **PDF invoice import with AI** via Claude Sonnet 4.6 (native document input)
- Editable review table before bulk save
- BYOK: your Anthropic key lives only in browser `localStorage`
- Responsive sidebar, light theme (shadcn `dashboard-01`)

### Roadmap

Tags, transfers, monthly budgets, recurring transactions, credit card statements with installments, goals, alerts, investments with auto quotes, AI insights, reports, full data export. See [`ROADMAP.md`](./ROADMAP.md).

## Stack

Next.js 16 (App Router + Turbopack) · TypeScript strict · Tailwind v4 · shadcn/ui on Base UI · Recharts · Auth.js v5 + Drizzle adapter · Supabase Postgres (RLS) · Drizzle ORM · Anthropic SDK · Vercel (Fluid Compute) · Playwright.

## Quick start

Prereqs: Node 24+, pnpm 10+, free [Supabase](https://supabase.com) account.

```bash
git clone https://github.com/virtcaio/organizacao-financeira.git
cd organizacao-financeira
pnpm install
cp .env.example .env.local       # fill with your Supabase values
pnpm db:push                     # apply schema
pnpm db:seed                     # seed ~50 categories
pnpm dev                         # http://localhost:3000
```

Detailed setup in [`CONTRIBUTING.md`](./CONTRIBUTING.md#setup-local).

## Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvirtcaio%2Forganizacao-financeira&project-name=organizacao-financeira&repository-name=organizacao-financeira&env=DATABASE_URL,DIRECT_URL,NEXTAUTH_SECRET,NEXTAUTH_URL,SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY)

After the first deploy, set `NEXTAUTH_URL` to your Vercel domain and redeploy. Details in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## BYOK — Bring Your Own Key

No `ANTHROPIC_API_KEY` on the server. The flow:

1. Create a key at <https://console.anthropic.com/settings/keys>
2. Paste it in **Settings** inside the app — stored in browser `localStorage`
3. On each import, the key is sent in the `x-anthropic-key` header to an app route handler, which calls Claude and returns structured JSON
4. The key is **never persisted to the database** and **never logged** (active sanitization)

Approximate cost per invoice: **$0.03–$0.10** depending on PDF size (Sonnet 4.6 with prompt caching).

## Privacy

- **Your data stays in your Supabase.** No central project server.
- PDF content is sent to Anthropic via your key. See [their privacy policy](https://www.anthropic.com/legal/privacy).
- Passwords stored with bcrypt cost 12.
- Session cookies `httpOnly`, `secure`, `sameSite=lax`.
- RLS enabled on every table (defense-in-depth over app-level `userId` filtering).

Full threat model & vulnerability reporting: [`SECURITY.md`](./SECURITY.md).

## Contributing

PRs welcome! See [`CONTRIBUTING.md`](./CONTRIBUTING.md). Issues tagged [`good first issue`](https://github.com/virtcaio/organizacao-financeira/labels/good%20first%20issue) are a great place to start.

## License

[AGPL-3.0-or-later](./LICENSE). TL;DR: free to use, modify, and self-host. If you run a modified version publicly (SaaS), you must open-source your changes under AGPL too.

---

Made with 🇧🇷 by [Caio Oliveira (@virtcaio)](https://github.com/virtcaio) and contributors.

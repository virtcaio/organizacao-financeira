# Organização Financeira

> Gestor financeiro pessoal e familiar com IA — importa fatura PDF, categoriza com Claude, **BYOK** (cada usuário usa a própria chave da Anthropic).

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript)](./tsconfig.json)
[![Powered by Claude](https://img.shields.io/badge/IA-Claude_Sonnet_4.6-D97757)](https://www.anthropic.com)

🇺🇸 [English version](./README.en.md)

---

## O que é

Um app web **self-hosted** para você (e sua família) controlar finanças pessoais com a ajuda do Claude. Diferente de soluções proprietárias, **seus dados ficam no seu Supabase** e a IA usa **sua chave Anthropic** — sem servidor central, sem assinatura mensal, sem coleta de dados.

A killer feature é a **importação de fatura PDF**: você envia a fatura do cartão, o Claude lê o documento inteiro (vision nativo), categoriza cada transação usando suas categorias hierárquicas, e mostra uma tabela editável antes de salvar.

## Demo

O mantenedor mantém uma instância pessoal em **<https://organizacao-financeira-p7vt.vercel.app/>**.

> ⚠️ Essa instância é a **conta pessoal** do mantenedor. Você não consegue usar pra valer ali — crie a sua hospedando o app você mesmo (instruções abaixo). É grátis (Supabase free tier + Vercel Hobby).

## Funcionalidades

### Já entregue

- ✅ Cadastro / login (Auth.js v5 + email&senha + Google opcional)
- ✅ CRUD de contas (corrente, poupança, cartão de crédito, carteira, broker)
- ✅ CRUD de transações manuais (receita / despesa)
- ✅ Categorias hierárquicas (53 categorias em 12 grupos, pré-populadas em PT-BR)
- ✅ Dashboard com KPIs do mês, gastos por categoria (pizza), evolução mensal (área), últimas transações
- ✅ **Importação de fatura PDF com IA** via Claude Sonnet 4.6 (document input nativo)
- ✅ Tela editável de revisão antes de salvar lote
- ✅ BYOK: sua chave Anthropic vive apenas no `localStorage` do navegador
- ✅ Sidebar responsiva, light theme (shadcn `dashboard-01`)

### No roadmap

Tags, transferências, orçamento mensal, transações recorrentes, cartão (fatura + parcelamento), metas, alertas, investimentos com cotação automática, insights IA, relatórios, exportação. Detalhes em [`ROADMAP.md`](./ROADMAP.md).

## Stack

| Camada | Escolha |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router + Turbopack) |
| Linguagem | TypeScript estrito |
| UI | [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (sobre [Base UI](https://base-ui.com)) |
| Gráficos | [Recharts](https://recharts.org) |
| Auth | [Auth.js v5](https://authjs.dev) + Drizzle adapter (sessão JWT) |
| Banco | [Supabase](https://supabase.com) Postgres + RLS habilitada |
| ORM | [Drizzle](https://orm.drizzle.team) + drizzle-kit |
| IA | [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript) — Claude Sonnet 4.6, BYOK no client |
| Storage | Supabase Storage (futuro: fotos de comprovante) |
| Deploy | [Vercel](https://vercel.com) (Fluid Compute) |
| Testes | [Playwright](https://playwright.dev) |

## Como rodar localmente

Pré-requisitos: Node 24+, pnpm 10+, conta Supabase grátis.

```bash
git clone https://github.com/virtcaio/organizacao-financeira.git
cd organizacao-financeira
pnpm install
cp .env.example .env.local       # edite com seus dados Supabase
pnpm db:push                     # aplica o schema no seu Supabase
pnpm db:seed                     # popula as ~50 categorias
pnpm dev                         # abre em http://localhost:3000
```

Passo a passo detalhado (criar Supabase, pegar as connection strings, configurar `NEXTAUTH_SECRET`, etc.) está em [`CONTRIBUTING.md`](./CONTRIBUTING.md#setup-local).

## Deploy na Vercel (self-hosting)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvirtcaio%2Forganizacao-financeira&project-name=organizacao-financeira&repository-name=organizacao-financeira&env=DATABASE_URL,DIRECT_URL,NEXTAUTH_SECRET,NEXTAUTH_URL,SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY&envDescription=Veja%20CONTRIBUTING.md%20para%20onde%20obter%20cada%20valor&envLink=https%3A%2F%2Fgithub.com%2Fvirtcaio%2Forganizacao-financeira%2Fblob%2Fmain%2FCONTRIBUTING.md)

Depois do primeiro deploy, atualize `NEXTAUTH_URL` com o domínio gerado pela Vercel e faça **Redeploy** (sem cache). Detalhes em [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## BYOK — Bring Your Own Key

Não existe `ANTHROPIC_API_KEY` no servidor. O fluxo é:

1. Você cria uma chave em <https://console.anthropic.com/settings/keys>
2. Cola em **Configurações** dentro do app — fica no `localStorage` do seu navegador
3. A cada importação, a chave trafega no header `x-anthropic-key` para um route handler do app, que chama o Claude e retorna o JSON estruturado
4. A chave **nunca é persistida no banco**, **nunca é logada** (sanitização ativa)

Custo aproximado por fatura: **R$ 0,15–0,50** dependendo do tamanho do PDF (Sonnet 4.6 com prompt caching).

## Privacidade

- **Seus dados ficam no seu Supabase.** Não existe servidor central do projeto.
- O conteúdo do PDF é enviado para a Anthropic via sua chave. A Anthropic permite configurar **Zero Data Retention** na sua conta Enterprise; em conta padrão, segue [a política deles](https://www.anthropic.com/legal/privacy).
- Senhas armazenadas com bcrypt cost 12.
- Cookies de sessão `httpOnly`, `secure`, `sameSite=lax`.
- RLS habilitada em todas as tabelas (defense-in-depth sobre filtragem por `userId` no app).

Veja [`SECURITY.md`](./SECURITY.md) pro modelo de ameaça completo e como reportar vulnerabilidades.

## Como contribuir

PRs são bem-vindos! Antes:

1. Leia o [Código de Conduta](./CODE_OF_CONDUCT.md)
2. Veja issues marcadas como [`good first issue`](https://github.com/virtcaio/organizacao-financeira/labels/good%20first%20issue)
3. Para mudanças grandes, abra uma [discussion](https://github.com/virtcaio/organizacao-financeira/discussions) antes
4. Siga [`CONTRIBUTING.md`](./CONTRIBUTING.md) (setup, convenções, fluxo de PR)

## Licença

[AGPL-3.0-or-later](./LICENSE). Em resumo:

- Você pode usar, modificar e redistribuir
- Se você **hospedar uma versão modificada** (publicamente), você precisa **abrir o código** das suas modificações sob AGPL também
- Uso pessoal / familiar / interno de empresa: 100% livre

A escolha por AGPL é coerente com a filosofia do projeto: **código aberto pra todos, mas forks SaaS comerciais precisam ser igualmente abertos**.

---

Feito com 🇧🇷 por [@virtcaio](https://github.com/virtcaio) e contribuidores.

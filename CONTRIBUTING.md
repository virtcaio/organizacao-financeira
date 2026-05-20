# Contribuindo

Obrigado pelo interesse em contribuir! Este guia explica como rodar o projeto localmente, padrões de código e o fluxo de PR.

Antes de qualquer coisa, leia o [Código de Conduta](./CODE_OF_CONDUCT.md).

---

## Antes de codar

Para mudanças não-triviais, **abra uma issue ou discussão antes** de gastar tempo:

- **Bug** ou comportamento incorreto → [abrir issue](https://github.com/virtcaio/organizacao-financeira/issues/new/choose)
- **Nova feature**, mudança grande de arquitetura, ou dúvida → [Discussions](https://github.com/virtcaio/organizacao-financeira/discussions)
- **Vulnerabilidade de segurança** → ver [`SECURITY.md`](./SECURITY.md) (canal privado)

Para issues marcadas como `good first issue` você pode partir direto.

---

## Setup local

### 1. Pré-requisitos

- Node.js **24+** (LTS)
- pnpm **10+**
- Conta gratuita no [Supabase](https://supabase.com)
- (Opcional, só para usar a importação por IA) Chave da [Anthropic API](https://console.anthropic.com/settings/keys)

### 2. Clonar e instalar

```bash
git clone https://github.com/SEU-USER/organizacao-financeira.git
cd organizacao-financeira
pnpm install
```

### 3. Criar projeto Supabase

1. Vá em [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Escolha uma senha forte para o banco e guarde
3. Aguarde o provisionamento
4. Em **Project Settings → Database → Connection string**, copie:
   - **Transaction pooler** (porta 6543) → `DATABASE_URL`
   - **Session pooler** ou **Direct connection** (porta 5432) → `DIRECT_URL`
5. Em **Project Settings → API**, copie:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** secret (⚠️ NÃO o `anon`) → `SUPABASE_SERVICE_ROLE_KEY`

### 4. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite o `.env.local` com os valores acima.

Para `NEXTAUTH_SECRET`, gere com:

```bash
openssl rand -base64 32
```

### 5. Aplicar migration e seed

```bash
pnpm db:push      # aplica o schema no seu Supabase
pnpm db:seed      # popula as ~50 categorias hierárquicas
```

### 6. Rodar

```bash
pnpm dev
```

Abra `http://localhost:3000` (ou a porta que você definir). Cadastre um usuário e teste.

---

## Configuração opcional: Claude Code / Cursor com MCP do Supabase

Se você usa Claude Code ou Cursor com o MCP do Supabase, copie o arquivo de exemplo:

```bash
cp .mcp.example.json .mcp.json
```

Edite `.mcp.json` substituindo `<SEU_PROJECT_REF>` pelo seu (encontrado na URL do dashboard Supabase ou em **Settings → General**).

O arquivo `.mcp.json` é gitignored — não vai commitar o seu ref de projeto.

---

## Convenções

A maioria das convenções está documentada em [`CLAUDE.md`](./CLAUDE.md). Destaques:

- **TypeScript estrito**, sem `any`. Use `unknown` + narrowing ou tipos reais.
- **Server Components por padrão** (App Router). `"use client"` só quando precisar de interação.
- **Server Actions** com sufixo `Action` (`createTransactionAction`), em `lib/actions/`.
- **Route Handlers** em `app/api/*/route.ts` quando a operação precisa fluxo de fetch tradicional ou body grande (ex.: upload de PDF).
- **Validação Zod em toda entrada do usuário** — formulários, server actions, parse de CSV/PDF, output da IA.
- **BYOK Anthropic**: a chave do usuário fica só no `localStorage`. Trafega no header `x-anthropic-key`, **nunca persistir**, **nunca logar**.
- **Filtragem por `userId`** em toda query Drizzle (defense in depth sobre o RLS do Supabase).

### Estrutura de pastas

```
app/         # rotas (App Router): layouts, pages, route handlers
components/  # componentes UI (PascalCase.tsx); shadcn em components/ui/
lib/         # utils, server actions, clientes (db, ai, storage)
  actions/   # server actions (sufixo Action)
  db/        # schema Drizzle + queries
  ai/        # cliente Anthropic + prompts + schemas Zod
types/       # types e schemas Zod compartilhados
tests/       # testes Playwright
```

### Componentes shadcn / Base UI

Este projeto usa shadcn/ui com **Base UI** (não Radix). Diferenças importantes:

- `asChild` foi substituído por `render={<Component />}`.
- `SelectValue` não puxa label automaticamente de `SelectItem` — use function-as-child quando o `value` for um ID opaco (ex.: UUID).
- Triggers de `Dialog`/`Dropdown` exigem um `<button>` nativo. Para abrir Dialog de dentro de menu/popover, controle externamente com `useState` (padrão em `components/contas/account-row-actions.tsx`).

---

## Git e PRs

### Branches

- Crie a partir de `main`: `git checkout -b feat/nome-curto` ou `fix/nome-curto`
- Mantenha o branch pequeno e focado em uma coisa

### Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` nova funcionalidade
- `fix:` correção de bug
- `chore:` build, deps, configs, lint
- `refactor:` refatoração sem mudança de comportamento
- `docs:` apenas documentação
- `test:` apenas testes
- `style:` formatação

Escopo opcional: `feat(transactions): add bulk import review`.

### Antes do PR

Tudo isso precisa passar localmente:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Se você mexeu em UI/rotas/forms, rode o smoke test:

```bash
# em outro terminal, com dev rodando:
pnpm exec playwright test
```

### Abrir o PR

1. Push do seu branch
2. Abra o PR contra `main`
3. Preencha o template (descrição, test plan, screenshots se aplicável, issue relacionada)
4. CI vai rodar `lint + typecheck + build` automaticamente
5. Aguarde review

PRs são geralmente fechados com **squash merge** pra manter o histórico de `main` linear.

Mais detalhes (SemVer, hotfix, comandos rápidos, armadilhas comuns) em [`docs/GIT-WORKFLOW-BEST-PRACTICES.md`](./docs/GIT-WORKFLOW-BEST-PRACTICES.md).

---

## Documentação técnica

Pra entender a organização interna de docs e onde colocar novos arquivos `.md`, veja [`docs/CONVENCOES.md`](./docs/CONVENCOES.md). Índice completo em [`docs/README.md`](./docs/README.md).

---

## Dúvidas?

[Discussions](https://github.com/virtcaio/organizacao-financeira/discussions) é o melhor lugar pra perguntas, ideias e discussões abertas.

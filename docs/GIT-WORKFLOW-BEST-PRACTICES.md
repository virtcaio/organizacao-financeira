# Git Workflow & Best Practices

> **Status:** 🟢 ATIVO — convenção viva. Aplicada em todo PR do projeto.

Guia detalhado de Git pra este projeto. Resume o fluxo, convenção de commits, regras de merge e armadilhas comuns. Pra setup local e o passo-a-passo de contribuição, veja [`CONTRIBUTING.md`](../CONTRIBUTING.md).

---

## 1. Modelo de branches

Este projeto usa **duas branches permanentes** (`main` e `dev`) + branches temporárias por trabalho. **Apenas `main` e `dev` deployam na Vercel** — branches temporárias não geram preview.

### Branches permanentes

| Branch | Papel | Deploy |
|--------|-------|--------|
| `main` | Produção — código estável e testado. Nunca commitar direto. | Production (URL fixa) |
| `dev` | Staging — integração contínua de features. Nunca commitar direto. | Preview com URL fixa por branch |

### Branches temporárias (partem de `dev`)

| Prefixo | Quando usar | Exemplo |
|---------|-------------|---------|
| `feat/` | Nova funcionalidade | `feat/user-notifications` |
| `fix/` | Correção de bug | `fix/import-pdf-empty-response` |
| `refactor/` | Refatoração sem mudança de comportamento | `refactor/auth-split` |
| `chore/` | Deps, config, CI, scripts | `chore/update-drizzle` |
| `docs/` | Apenas documentação | `docs/contributing-update` |
| `hotfix/` | Correção urgente em produção | `hotfix/login-crash` (única que parte de `main`) |

### Regras absolutas

- **Nunca commitar direto em `main` ou `dev`** — sempre via Pull Request
- **Nunca force-push em `main` ou `dev`**
- **Branches temporárias partem de `dev`** (exceto `hotfix/*` que parte de `main`)
- **Branches temporárias não deployam na Vercel** — só após merge em `dev` ou `main` é que o deploy roda
- Branch names em inglês, kebab-case, máximo ~4 palavras
- Após merge, a branch temporária é deletada (squash merge faz isso automaticamente)

---

## 2. Conventional Commits

Formato obrigatório:

```
tipo(escopo opcional): descrição curta em português ou inglês
```

### Tipos

| Tipo | Quando usar |
|------|-------------|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `refactor` | Refatoração (sem mudança de comportamento externo) |
| `style` | Formatação, espaços, vírgulas — sem mudança de lógica |
| `docs` | Apenas documentação |
| `test` | Adição ou correção de testes |
| `chore` | Tarefas de manutenção (deps, config, CI) |
| `perf` | Melhoria de performance |
| `ci` | Mudanças em pipelines de CI/CD |

### Escopo (opcional mas recomendado)

Nome do módulo, página ou domínio afetado: `auth`, `api`, `db`, `ui`, `transactions`, `import`, `dashboard`, `sidebar`, `e2e`, etc.

### Exemplos válidos

```
feat(import): add CSV parser for Nubank
fix(api): handle empty PDF response from Claude
refactor(db): extract pagination helper
chore(deps): upgrade drizzle-orm to 0.46
docs: update CONTRIBUTING with mcp.json setup
test(transactions): add E2E for bulk save flow
```

### Regras de commit

- **Um commit = uma mudança lógica.** Não misturar `feat` + `fix` no mesmo commit.
- Descrição no imperativo, sem ponto final: `"add user modal"`, não `"added user modal."`
- Use o corpo do commit pra explicar *por quê*, não *o quê* (o diff já mostra o quê).

---

## 3. Fluxo de trabalho

### Feature / fix

```bash
# 1. Partir de dev atualizado
git checkout dev
git pull origin dev

# 2. Criar branch
git checkout -b feat/nome-da-feature

# 3. Desenvolver com commits atômicos
git add src/arquivo-modificado.ts
git commit -m "feat(scope): description"

# 4. Publicar e abrir PR contra dev
git push -u origin feat/nome-da-feature
gh pr create --base dev --title "feat: ..." --body "..."

# 5. Após aprovação e CI verde: squash merge via GitHub/CLI
gh pr merge <número> --squash --delete-branch
```

### Antes de abrir o PR

```bash
pnpm lint
pnpm typecheck
pnpm build
# Se mexeu em UI/rotas/forms:
pnpm exec playwright test
```

Todos precisam passar. O CI no GitHub Actions vai rodar `lint + typecheck + build` automaticamente.

### Promoção `dev` → `main` (release)

Quando `dev` estiver estável e pronto pra produção, abra um PR `dev` → `main`. Use **merge commit** (não squash) pra preservar histórico de commits que vieram do `dev`:

```bash
gh pr create --base main --head dev --title "release: promote dev to main"
# Após review:
gh pr merge <número> --merge --delete-branch=false
```

`dev` continua existindo após o merge (não deletar).

### Hotfix (urgência em produção)

```bash
# Único caso em que branch parte de main, não dev
git checkout main && git pull origin main
git checkout -b hotfix/descricao-do-problema

# Corrige e abre PR contra main
git commit -m "fix(scope): critical fix description"
gh pr create --base main --title "hotfix: ..."

# Squash merge depois do review
gh pr merge <número> --squash --delete-branch

# Sincronizar dev com a correção
git checkout dev && git pull origin dev
git merge main
git push origin dev
```

---

## 4. Estratégia de merge

| Origem → Destino | Estratégia | Motivo |
|-------|-----------|--------|
| `feat/*` `fix/*` `chore/*` `docs/*` `refactor/*` → `dev` | **Squash merge** | Histórico de `dev` fica linear; um squash = uma feature |
| `dev` → `main` (release) | **Merge commit** | Preserva rastreabilidade — `main` reflete quais features foram promovidas em cada release |
| `hotfix/*` → `main` | **Squash merge** | Correção pontual e urgente, sem WIP a preservar |

Squash merge no GitHub também deleta a branch automaticamente após o merge.

---

## 5. Versionamento Semântico (SemVer)

Quando o projeto começar a marcar releases, usar `vMAJOR.MINOR.PATCH`:

| Incremento | Quando | Exemplo |
|-----------|--------|---------|
| `PATCH` (0.0.X) | Bug fix sem quebrar API/UX | `v0.1.1` |
| `MINOR` (0.X.0) | Nova feature retrocompatível | `v0.2.0` |
| `MAJOR` (X.0.0) | Breaking change ou grande reescrita | `v1.0.0` |

### Regras de tag

- Tags sempre em `main`, nunca em branches temporárias
- Formato anotado (`-a`), nunca lightweight: `git tag -a v0.2.0 -m "v0.2.0 — Importação de CSV"`
- Sempre fazer push da tag explicitamente: `git push origin v0.2.0`

### Quando começar a taggear

Hoje o projeto está em desenvolvimento ativo na `v0.1.0`. Vale taggear quando:

- Atingir um marco significativo (ex: V1 completa do roadmap)
- Quiser criar um `CHANGELOG.md` formal
- Houver mais contribuidores externos e a comunidade pedir versões estáveis

---

## 6. Pull Request — boas práticas

Use o [template padrão](../.github/PULL_REQUEST_TEMPLATE.md). Resumo:

- **Summary**: 1-3 frases do que muda
- **Test plan**: checklist do que rodou (lint, typecheck, build, playwright, teste manual)
- **Screenshots**: se mudou UI
- **Issue relacionada**: `Closes #N` pra fechar automaticamente

### Checklist antes de abrir PR

- [ ] Branch parte de `dev` atualizado (ou `main` se for `hotfix/*`)
- [ ] PR tem como **base** `dev` (ou `main` se for `hotfix/*` ou release)
- [ ] Commits seguem Conventional Commits
- [ ] Nenhum arquivo sensível commitado (`.env`, secrets, `.mcp.json` local)
- [ ] `pnpm lint && pnpm typecheck && pnpm build` passam
- [ ] Testes Playwright passam (se mudou UI/rotas)
- [ ] PRD/PLAN/ROADMAP atualizados se a mudança é relevante pro roadmap

---

## 7. Comandos de referência rápida

```bash
# Ver log compacto da branch atual vs dev
git log --oneline feat/minha-feature ^dev

# Ver diferença entre branch e dev
git diff dev..feat/minha-feature --stat

# Ver diferença entre dev e main (o que ainda não está em prod)
git diff main..dev --stat

# Listar todas as tags ordenadas
git tag -l --sort=-v:refname | head -10

# Desfazer último commit (mantendo as mudanças)
git reset HEAD~1 --soft

# Criar tag anotada e publicar (sempre em main)
git checkout main && git pull origin main
git tag -a v0.2.0 -m "v0.2.0 — descrição"
git push origin v0.2.0

# Deletar branch local e remota
git branch -d feat/nome
git push origin --delete feat/nome

# Listar PRs abertos
gh pr list

# Ver status de um PR
gh pr view <número>

# Squash merge e delete branch (feat/fix/chore → dev)
gh pr merge <número> --squash --delete-branch

# Merge commit (dev → main em release)
gh pr merge <número> --merge --delete-branch=false
```

---

## 8. Armadilhas comuns

| Situação | Errado | Certo |
|----------|--------|-------|
| Commitar em `main` ou `dev` | `git commit` direto | Sempre via PR |
| Abrir PR contra `main` em vez de `dev` | `gh pr create --base main` (exceto hotfix/release) | `gh pr create --base dev` pra feat/fix/chore/docs/refactor |
| Branch partir de `main` em vez de `dev` | `git checkout main && git checkout -b feat/x` | `git checkout dev && git checkout -b feat/x` (hotfix é exceção) |
| Force-push em branch compartilhada | `git push --force` | Nunca em `main` ou `dev`; usar `--force-with-lease` em branches pessoais se realmente precisar |
| Squash merge em `dev` → `main` | Perde rastreabilidade do que foi promovido | Usar `--merge` (merge commit) pra release |
| Esquecer de sincronizar `dev` após hotfix | `dev` fica desatualizado | `git checkout dev && git merge main && git push` após hotfix |
| Misturar `feat` + `fix` num commit | Commit gigante | Commits atômicos, um por mudança lógica |
| Commitar `.env` | `git add .` sem verificar | Usar `.gitignore` + revisar `git status` antes |
| Commitar `.mcp.json` | Esquecer que tem o `project_ref` pessoal | Sempre usar `.mcp.example.json`; o real fica gitignored |
| PR sem CI verde | Forçar merge | Aguardar o GitHub Actions ficar verde primeiro |
| PR enorme cobrindo várias features | Difícil de revisar | Quebrar em PRs menores, atômicos |
| Esquecer de fechar issue | Issue aberta após PR merged | Usar `Closes #N` no PR body |

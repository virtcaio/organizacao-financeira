# Convenções de documentação

> **Status:** 🟢 ATIVO — fonte de verdade para organização de docs neste repositório.

Regras práticas pra criar, classificar e organizar arquivos `.md` neste projeto. O objetivo é evitar acúmulo de docs obsoletos e deixar claro o **peso epistêmico** de cada documento — quem lê precisa saber em segundos se aquilo é confiável.

---

## 1. Estados epistêmicos visíveis

Docs **vivos** (em `docs/` ou raiz) podem ganhar um header de status logo após o `# Título`:

| Status | Significado | Header sugerido |
|---|---|---|
| 🟢 **ATIVO** | Fonte de verdade, atualizado conforme o projeto muda. | `> **Status:** 🟢 ATIVO — atualizado em [data]. Fonte de verdade.` |
| 🟡 **DORMENTE** | Snapshot parcialmente válido. Verificar antes de usar. | `> **Status:** 🟡 DORMENTE — snapshot de [data]. Verificar antes de usar.` |
| 🔵 **HISTÓRICO** | Decisão tomada ou plano cumprido. Preservado por referência. Não atualizar. | `> **Status:** 🔵 HISTÓRICO — registrado em [data]. Não atualizar.` |
| 🟠 **ADIADO** | Plano pausado por decisão deliberada. | `> **Status:** 🟠 ADIADO — [razão]. Retomar quando [trigger].` |

**Custo**: uma linha por doc. **Benefício**: o leitor sabe em 1 segundo se pode confiar.

Arquivos curtos e padronizados (LICENSE, README, CODE_OF_CONDUCT) não precisam de header — são autoexplicativos.

---

## 2. Hubs canônicos (não mover de lugar)

Estes arquivos têm caminho fixo e são referenciados de muitos pontos:

| Arquivo | Papel |
|---|---|
| `README.md` | Apresentação pública (PT-BR) |
| `README.en.md` | Versão em inglês |
| `LICENSE` | Licença AGPL-3.0 |
| `CONTRIBUTING.md` | Como contribuir (setup, convenções, fluxo de PR) |
| `CODE_OF_CONDUCT.md` | Código de conduta da comunidade |
| `SECURITY.md` | Como reportar vulnerabilidades |
| `ROADMAP.md` | Próximas iterações (público, leve) |
| `PRD.md` | Product Requirements Document |
| `PLAN.md` | Plano técnico vivo (sub-fases, decisões, histórico) |
| `CLAUDE.md` | Instruções para agentes de IA (Claude Code, Cursor) |
| `docs/CONVENCOES.md` | Este arquivo |
| `docs/GIT-WORKFLOW-BEST-PRACTICES.md` | Git workflow detalhado |

Movimentar um desses quebra links em código e em outros docs. Se for inevitável, atualize todas as referências no mesmo PR.

---

## 3. Onde colocar um novo `.md`

Fluxograma de triagem:

```
1. É algo público pra usuário / contribuidor?
   → raiz do repo (README, ROADMAP, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT)

2. É runbook técnico vivo (guia operacional reutilizável)?
   → docs/X.md
   → Header: 🟢 ATIVO

3. É decisão ou snapshot pontual (com data específica)?
   → docs/historico/YYYY-MM-DD-tema.md
   → Header: 🔵 HISTÓRICO

4. É documentação de uma feature/módulo específico?
   → comentário em código + entrada no PLAN.md
   → evite criar arquivo .md novo se a info já cabe em um existente

5. NUNCA crie quando a informação já cabe em
   CLAUDE.md / PRD.md / PLAN.md / README — atualize o existente.
```

Princípio: **menos arquivos é melhor**. Cada novo `.md` é dívida de manutenção.

---

## 4. Bucket = README

Quando criar uma subpasta em `docs/` (ex: `docs/historico/`), inclua um `README.md` próprio como entrypoint. Quem entra na pasta vê de cara o que tem ali — evita "click roulette".

---

## 5. Regra anti-acúmulo

Ao concluir uma sprint, fechar uma decisão ou cumprir um plano:

- **No mesmo PR que finaliza a feature**, atualize o status do doc relacionado pra 🔵 HISTÓRICO (se for snapshot pontual) ou mantenha como 🟢 ATIVO (se for runbook vivo que continua valendo).
- Sem ritual de arquivamento separado → docs nunca migram → a pasta acumula → ninguém confia mais.

---

## 6. Memória de IA vs docs do repo

| Camada | Localização | O que vai aqui |
|---|---|---|
| **Memória pessoal do agente** | local na máquina do contribuidor (`~/.claude/projects/.../memory/`, `.cursor/`, etc.) | Preferências individuais, padrões surpreendentes, feedback de processo. **Fica fora do repo.** |
| **Documentação do projeto** | `CLAUDE.md`, `PRD.md`, `PLAN.md`, `docs/`, etc. | Decisões de produto, arquitetura, convenções. **Pertence ao repo.** |

`CLAUDE.md` é a fronteira: contém instruções operacionais que qualquer agente de IA deveria respeitar ao mexer no código. **Não duplique** conteúdo que já está em PRD.md ou PLAN.md — referencie.

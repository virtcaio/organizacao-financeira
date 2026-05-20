# PRD — Organização Financeira

## 1. Overview

Aplicação web de gestão financeira pessoal/familiar com IA embarcada para categorizar lançamentos, gerar insights e simular cenários. Usuário inicial: o autor e família; arquitetura pronta para multi-tenant. Stack Next.js na Vercel, com Claude (Anthropic SDK) fazendo o trabalho de IA — categorização, OCR de comprovantes e análises.

## 2. Goals

1. Centralizar receitas, despesas, cartões e investimentos da família em uma única visão, em BRL com suporte a ativos em USD/EUR.
2. Reduzir o atrito de lançamento manual via importação de CSV/PDF e OCR de foto de comprovante.
3. Substituir planilhas por dashboards com orçamento, metas e alertas em tempo real.
4. Usar IA para classificar transações automaticamente e gerar insights/projeções acionáveis ("você gastou 30% acima da média em X", "projeção do mês: R$ Y").
5. Manter arquitetura preparada para virar SaaS multi-tenant na V2 sem refatoração estrutural.

## 3. Core Features

### V1 — MVP (escopo do encontro de hoje)

- **Auth** — Auth.js (NextAuth v5) com email/senha + Google OAuth, sessão JWT, middleware de proteção.
- **Contas** — múltiplas contas tipadas: corrente, poupança, cartão de crédito, carteira (cash), broker.
- **Transações** — CRUD manual de receita / despesa / transferência / aporte de investimento / ajuste de saldo. Campos: valor, data, descrição, conta, categoria, subcategoria, tags livres, observação.
- **Tags livres** — campo `tags[]` opcional na transação. Permite agregar cross-categoria (ex.: `#viagem-cancun-2025`, `#mae`, `#trabalho`).
- **Transações recorrentes** — regra com frequência (mensal/semanal/anual), valor, próxima ocorrência. Gera transações agendadas automaticamente. Editar/pausar/encerrar a regra. Salário, aluguel, assinaturas.
- **Categorias hierárquicas** — catálogo seed fixo de ~50 categorias em 2 níveis (Receitas, Moradia, Alimentação, Transporte, Saúde, Educação, Família, Pessoal, Lazer, Financeiro, Investimentos, Transferências).
- **Dashboard principal** — saldo consolidado, receitas vs despesas do mês, gráfico de gastos por categoria, evolução mensal, próximas contas a vencer.
- **Orçamento mensal** — limite por categoria com barra de progresso e alerta visual em 80% / 100%.
- **Importação CSV/PDF** — upload de extrato/fatura, IA categoriza, tela de revisão antes de gravar.
- **OCR de comprovante** — upload de foto, Claude Sonnet 4.6 (visão) extrai valor/data/estabelecimento e sugere categoria; usuário confirma.
- **Cartão de crédito** — fechamento e vencimento configuráveis; transação parcelada gera N lançamentos futuros; visualização da fatura atual e próximas.
- **Metas** — alvo, prazo, conta destino; aporte manual; barra de progresso.
- **Investimentos** — holdings (ticker, quantidade, preço médio, moeda); sincronização diária de cotações via Vercel Cron usando AwesomeAPI (USD/EUR), brapi.dev (ações/FIIs BR) e CoinGecko (cripto); rentabilidade % no dashboard.
- **Alertas in-app** — orçamento estourado, conta a vencer, fatura fechou, meta atingida, gasto anômalo (via IA).
- **Conciliação de saldo** — botão "ajustar saldo" em cada conta. Gera transação especial (`type=adjustment`) com a diferença, mantendo histórico do motivo.
- **Aprendizado de categorização** — quando o usuário corrige uma sugestão da IA (CSV/OCR), salva regra em `categorization_rule` (pattern → categoria). Regras têm prioridade sobre a IA nas próximas importações.
- **IA de insights e projeções** — painel gerado pelo Claude com observações sobre padrão de gasto e projeção de fechamento do mês; simulações "e se eu cortar X% em Y?".
- **Relatórios** — visão mensal/anual com exportação CSV/PDF.
- **Export completo dos dados** — rota `/configuracoes/export` que gera dump JSON e CSV de todas as transações, contas, metas, holdings.
- **Tema** — light only.

### V2 — Pós-encontro

- Multi-tenant real (organizações, convites, papéis).
- Open Finance / conexão com banco (Pluggy, Belvo).
- Compartilhamento da conta entre membros da família com permissões.
- Integração WhatsApp/Telegram para lançar via mensagem.
- Aplicativo mobile (PWA evolution ou React Native).
- Dark mode.
- Chat conversacional com a IA ("quanto gastei com comida em abril?").
- Recomendações proativas de realocação de investimentos.

## 4. User Flow

### Fluxo principal — lançar uma despesa

1. Usuário loga (email/senha ou Google).
2. Dashboard abre na home com visão do mês corrente.
3. Clica em "Nova transação" no header.
4. Escolhe modo: Manual / Foto / Importar arquivo.
5. **Manual:** preenche formulário (valor, data, conta, categoria sugerida pela IA com base na descrição). Salva.
6. **Foto:** faz upload → Claude Vision extrai dados → formulário pré-preenchido → confirma e salva.
7. **Importar CSV/PDF:** faz upload → parser + Claude categorizam em lote → tela de revisão (editar linha a linha) → salvar em lote.
8. Dashboard atualiza saldos, gráficos e progresso de orçamento.
9. Se passar de limite, alerta aparece no sino de notificações.

### Fluxo de insights

1. Usuário acessa aba "Insights".
2. Painel gerado por Claude na primeira carga do mês (cache 24h).
3. Botão "Simular cenário" → modal com sliders por categoria → IA recalcula projeção.

## 5. Data Model

Entidades principais (Postgres via Drizzle):

- **user** — id, email, name, password_hash, created_at. (Padrão Auth.js + colunas extras.)
- **account** — id, user_id, name, type (`checking|savings|credit_card|cash|broker`), currency, opening_balance, created_at.
- **category** — id, name, parent_id (nullable, hierárquico), kind (`income|expense|investment|transfer`), icon, color, is_system. Seed inicial.
- **transaction** — id, user_id, account_id, category_id, type (`income|expense|transfer|investment|adjustment`), amount (numeric), currency, date, description, notes, source (`manual|photo|csv|pdf|recurring`), source_ref, installment_group_id (nullable), installment_seq, installment_total, recurring_rule_id (nullable), created_at.
- **tag** — id, user_id, name (slug), color.
- **transaction_tag** — transaction_id, tag_id (M:N).
- **recurring_rule** — id, user_id, account_id, category_id, type, amount, currency, description, frequency (`daily|weekly|monthly|yearly`), interval, day_of_month (nullable), next_run_at, end_date (nullable), paused, created_at.
- **categorization_rule** — id, user_id, pattern (string ou regex em `description`/`merchant`), category_id, priority, hit_count, created_at. Aplicada antes da IA em CSV/OCR.
- **budget** — id, user_id, category_id, month (date 1º dia), limit_amount.
- **goal** — id, user_id, name, target_amount, current_amount, deadline, target_account_id.
- **credit_card** — id, account_id, closing_day, due_day, credit_limit.
- **holding** — id, user_id, account_id, ticker, asset_class (`stock_br|fii|stock_intl|crypto|fixed_income`), quantity, avg_price, currency.
- **quote** — id, ticker, currency, price, fetched_at. (Cache de cotações.)
- **alert** — id, user_id, kind, payload (jsonb), read_at, created_at.
- **ai_run** — id, user_id, kind (`categorize|insight|projection|ocr`), input_hash, output (jsonb), tokens_in, tokens_out, cost_cents, created_at. (Auditoria/cache de chamadas Claude.)

Auth.js gerencia também `account` (OAuth, conflita com nome — renomear tabela de conta financeira para `financial_account`), `session`, `verification_token`.

## 6. Tech Stack

| Camada | Escolha |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions, Turbopack) |
| Linguagem | TypeScript |
| UI | Tailwind CSS + shadcn/ui (light only) |
| Gráficos | Recharts |
| Auth | Auth.js (NextAuth v5) + Drizzle adapter |
| DB | Supabase Postgres |
| ORM | Drizzle ORM + drizzle-kit |
| Storage | Supabase Storage (fotos de comprovante) |
| IA | `@anthropic-ai/sdk` direto **no client** (`dangerouslyAllowBrowser: true`) — Claude Sonnet 4.6 com prompt caching. Modelo BYOK: cada usuário cola a própria API key, armazenada em `localStorage`. |
| Cotações | AwesomeAPI (moedas), brapi.dev (ações/FIIs BR), CoinGecko (cripto) |
| Jobs | Vercel Cron (sync diário de cotações) |
| Validação | Zod |
| Deploy | Vercel |

## 7. Non-Functional Requirements

### Segurança

- **Modelo BYOK para Anthropic:** cada usuário cola a própria API key em uma tela de configuração; ela é gravada **só no `localStorage` do navegador**. Nunca trafega pelo backend, nunca é persistida no DB, nunca é logada. Chamadas Claude saem **direto do client** (`dangerouslyAllowBrowser: true`).
- `DATABASE_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_SECRET` apenas em variáveis de ambiente Vercel. Nunca commitar `.env*`.
- Senhas hashadas com bcrypt (cost 12).
- Toda query filtra por `user_id` na camada de serviço; RLS opcional como segunda barreira no Supabase.
- Supabase Storage com bucket privado; URLs assinadas de curta duração (5 min) para servir fotos. Para OCR, a foto pode ser enviada direto do client ao Claude sem passar pelo servidor (apenas o resultado estruturado é gravado).
- CSRF protegido pelo Auth.js; cookies `httpOnly`, `secure`, `sameSite=lax`.
- Output da IA é **sanitizado** antes de renderizar (sem `dangerouslySetInnerHTML`; render como texto). Em campos como descrição auto-categorizada, validar com Zod antes de gravar.

### Performance

- Server Components por padrão; Client Components onde houver interação **e** onde chamar Claude (BYOK).
- Prompt caching da Anthropic (system + catálogo de categorias) — cache hit esperado >80% em categorização.
- Categorização em lote (CSV/PDF) num único turno do Claude, não uma chamada por linha.
- Cotações cacheadas em `quote` (TTL 24h) — UI lê do banco, não da API externa.
- Tabela `ai_run` armazena apenas o **resultado** estruturado da IA (sem o prompt completo) com `input_hash` para deduplicar — ex.: mesma foto reenviada reaproveita o parse sem nova chamada Claude.
- Índices: `transaction(user_id, date desc)`, `transaction(user_id, category_id)`, `budget(user_id, month)`, `quote(ticker, fetched_at desc)`.
- Streaming de respostas da IA (insights) para feedback instantâneo na UI.

### Custo

- Modelo default: Claude Sonnet 4.6. Reservar Opus 4.7 para insights mensais.
- **Custo da IA é do próprio usuário** (BYOK). Painel de configuração mostra contagem de chamadas no mês corrente (registradas em `ai_run`) para o usuário acompanhar.

## 8. Milestones

| Marco | Data | Entregáveis |
|---|---|---|
| **V0 — Scaffold** | 19/05 manhã | Next.js + Tailwind + shadcn/ui rodando; Supabase + Drizzle conectados; schema inicial migrado; seed de categorias; Auth.js login/cadastro funcionando. |
| **V1 — Encontro de hoje** | 19/05 fim do dia | CRUD de contas e transações manuais; dashboard principal com gráficos; orçamento mensal por categoria; deploy preview na Vercel funcionando. |
| **V1.1 — Inputs com IA** | +3 dias | Importação CSV/PDF com categorização Claude; OCR de comprovante via Claude Vision; tela de revisão antes de gravar. |
| **V1.2 — Cartão + Metas + Alertas** | +5 dias | Cartão de crédito (fatura, parcelamento); metas com progresso; alertas in-app. |
| **V1.3 — Investimentos** | +7 dias | Holdings; Vercel Cron de cotações; dashboard de carteira com rentabilidade. |
| **V1.4 — IA de insights** | +9 dias | Painel de insights com Claude; simulações de cenário; cache `ai_run`. |
| **V1.5 — Relatórios** | +10 dias | Visão mensal/anual; exportação CSV/PDF. |
| **V2** | a definir | Multi-tenant; Open Finance; WhatsApp; chat conversacional; mobile; dark mode. |

---

**Stakeholders:** Caio (owner, dev, primeiro usuário).
**Status:** Aprovado para execução em 2026-05-19.

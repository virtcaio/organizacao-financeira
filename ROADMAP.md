# Roadmap

Versão pública do plano. Para detalhes técnicos, histórico de decisões e contexto completo, ver [`PLAN.md`](./PLAN.md).

## ✅ Já entregue

- Cadastro/login (Auth.js v5 + Drizzle adapter)
- CRUD de contas (corrente, poupança, cartão, carteira, broker)
- CRUD de transações manuais (receita e despesa)
- Categorias hierárquicas (53 categorias em 12 grupos, pré-populadas)
- Dashboard com KPIs do mês, gastos por categoria, evolução mensal e últimas transações
- Sidebar navegação shadcn `dashboard-01`
- Importação de **fatura PDF via Claude Sonnet 4.6** (BYOK) com revisão editável antes de salvar
- Configuração BYOK da API key Anthropic (armazenada no `localStorage`)
- Deploy na Vercel (route handlers, Fluid Compute, sem chave no servidor)
- Suite de smoke test em Playwright

## 🚧 Now (próximas iterações)

- **Importação de CSV de extrato bancário** — parser por banco brasileiro, começando pelos mais comuns. Reusa o pipeline IA da importação PDF.
- **OCR de comprovante via Claude Vision** — upload de foto pro Supabase Storage, parse, sugere conta + categoria.
- **Dedup de chamadas IA** — tabela `ai_run` com hash do input pra evitar reprocessar PDF/foto idênticos (poupa tokens).
- **Conciliação de saldo** — botão "ajustar saldo" em cada conta gera transação tipo `adjustment` pra alinhar com o saldo real.

## 🔜 Next

- **Tags livres** em transações (schema já existe).
- **Transferências entre contas** (tipo `transfer` + `transfer_pair_id` já estão no schema).
- **Filtros na listagem de transações** (período, conta, categoria, tag, busca).
- **Orçamento mensal por categoria** com barra de progresso e alerta 80%/100%.
- **Transações recorrentes** (regra + Vercel Cron diário).
- **Cartão de crédito**: fechamento e vencimento, fatura, parcelamento (`installment_*` no schema).
- **Metas financeiras** (alvo, prazo, conta destino, progresso).
- **Alertas in-app** (sino no header).
- **Aprendizado de categorização** — quando o usuário corrige a IA, salva regra `categorization_rule` que se aplica antes da próxima chamada.

## 🔭 Later

- **Investimentos** — holdings com classes (renda fixa, renda variável BR, internacional, cripto, previdência).
- **Cotações automáticas** via Vercel Cron (AwesomeAPI, brapi.dev, CoinGecko).
- **IA de insights e projeções** — análise mensal automática, simulações de cenário.
- **Relatórios** mensais e anuais com exportação CSV/PDF.
- **Exportação completa** dos dados (JSON + CSV em ZIP) e botão "deletar minha conta".

## ❓ Maybe / V2

- Multi-tenant (famílias compartilhando uma conta com permissões)
- Open Finance / conexão real com banco (Pluggy, Belvo)
- Integração WhatsApp/Telegram para lançar via mensagem
- App mobile dedicado / PWA
- Dark mode
- Chat conversacional com IA
- Multi-moeda no dia a dia (não só investimentos)

---

## Como ajudar

Tem uma feature da lista que te interessa? Olhe as [issues abertas](https://github.com/virtcaio/organizacao-financeira/issues) (especialmente as marcadas `good first issue` e `help wanted`) ou abra uma nova proposta em [Discussions](https://github.com/virtcaio/organizacao-financeira/discussions) antes de codar.

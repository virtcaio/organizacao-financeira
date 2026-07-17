# Roadmap

Versão pública do plano. Para detalhes técnicos, histórico de decisões e contexto completo, ver [`PLAN.md`](./PLAN.md).

> Atualizado em 2026-07-17 (reflete os PRs #12–#51).

## ✅ Já entregue

### Fundação
- Cadastro/login (Auth.js v5 + Drizzle adapter)
- CRUD de contas (corrente, poupança, cartão, carteira, broker)
- CRUD de transações manuais (receita e despesa)
- Categorias hierárquicas (53 categorias em 12 grupos, pré-populadas)
- Dashboard com KPIs do mês, gastos por categoria, evolução mensal e últimas transações
- Configuração BYOK da API key Anthropic (armazenada no `localStorage`)
- Deploy na Vercel (route handlers, Fluid Compute, sem chave no servidor)

### Importação & IA
- Importação de **fatura PDF via Claude** (BYOK) com revisão editável antes de salvar
- **Importação OFX** (extrato/fatura) com hub unificado em `/importar`, detecção de encoding (latin-1 de bancos BR) e dedup por FITID
- **OCR de comprovante via Claude Vision** — foto → despesa preenchida, comprovante anexado à transação (Supabase Storage, signed URL)
- **Dedup de chamadas IA** — tabela `ai_run` com hash do input (PDF, OCR e categorização); reprocessar o mesmo arquivo é instantâneo e grátis
- **Aprendizado de categorização** — regras `pattern → categoria` criadas a partir das correções do usuário, aplicadas antes da IA (poupa tokens)
- Dedup de transações importadas com constraint no banco (reimportar fatura/extrato não duplica)

### Gestão financeira
- **Orçamento mensal por categoria** — padrão recorrente + override por mês, barra de progresso com estados ok/atenção/excedido
- **Transações recorrentes** — regras com frequência/intervalo, geradas por Vercel Cron diário com catch-up
- **Transferências entre contas** (par ligado por `transfer_pair_id`)
- **Tags livres** em transações
- **Filtros completos na listagem** (período, conta, categoria, tag, busca) com paginação
- **Conciliação de saldo** — ajuste gera transação `adjustment`; coluna de saldo atual em /contas
- **Gestão de categorias** — categorias custom + arquivar seeds
- **Alertas in-app** — sino no header + página /alertas; orçamento ≥80%/100% e recorrências a vencer, gerados no cron diário com dedup

### Qualidade
- Suite E2E Playwright (smoke, categorias, regras, conciliação, filtros) **rodando no CI** com Postgres dedicado
- Testes unitários (vitest) de dinheiro, datas/timezone, parser OFX e regras de categorização
- Style guide vivo de UX/UI + tokens semânticos de cor income/expense
- Rate limiting nos endpoints sensíveis, security headers, error boundaries e política de senha

## 🚧 Now (próximas iterações)

- **Cartão de crédito** ([#7](https://github.com/virtcaio/organizacao-financeira/issues/7)) — fechamento e vencimento, visão de fatura, parcelamento (`installment_*` já flui do import até o banco).
- **Importação de CSV** ([#56](https://github.com/virtcaio/organizacao-financeira/issues/56)) — reusa o fluxo OFX + categorização IA (o hub já promete na UI).

## 🔜 Next

- **Metas financeiras** ([#57](https://github.com/virtcaio/organizacao-financeira/issues/57)) — alvo, prazo, conta destino, progresso.
- **IA de insights** ([#58](https://github.com/virtcaio/organizacao-financeira/issues/58)) — painel com análise mensal automática (infra pronta: BYOK server-side, prompt caching, dedup, agregações).
- **Painel de custo de IA** ([#59](https://github.com/virtcaio/organizacao-financeira/issues/59)) — tokens por chamada já são gravados em `ai_run`; falta a superfície em /configuracoes.
- **Hardening restante** ([#63](https://github.com/virtcaio/organizacao-financeira/issues/63)) — CSP com nonce, validação de Origin, magic bytes no upload (rate limiting, headers e error boundaries já entregues).

## 🔭 Later

- **Investimentos** — holdings com classes (renda fixa, renda variável BR, internacional, cripto, previdência).
- **Cotações automáticas** via Vercel Cron (AwesomeAPI, brapi.dev, CoinGecko).
- **Projeções e simulações de cenário** com IA.
- **Relatórios** mensais e anuais com exportação CSV/PDF.
- **Exportação completa + deletar conta (LGPD)** ([#60](https://github.com/virtcaio/organizacao-financeira/issues/60)) — dump JSON/CSV em ZIP e exclusão com dump prévio.

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

# UX/UI Style Guide

> **Status:** 🟢 ATIVO — fonte de verdade para decisões de UI deste repositório. Atualizado em 2026-05-20.

Este doc consolida as decisões de UI/UX do projeto. Cada regra tem:
- **O que**: a decisão concreta
- **Por quê**: a motivação (geralmente uma inconsistência observada)
- **Como aplicar**: snippet ou regra mecânica

Origem: auditoria em [`04-uxui-inconsistencias.md`](./04-uxui-inconsistencias.md) e sugestões em [`03-uxui-sugestoes-de-melhoria.md`](./03-uxui-sugestoes-de-melhoria.md). Issue de tracking: [#11](https://github.com/virtcaio/organizacao-financeira/issues/11).

Quando bater em dúvida durante review de PR, este doc resolve. Se não cobrir o caso, atualize o doc no mesmo PR — não decida silenciosamente.

---

## 1. Tokens de cor semântica

### 1.1 Cores financeiras

Cada conceito financeiro tem um token. **Nunca usar utility class de cor crua** (`text-emerald-600`, `text-rose-600`) para representar conceitos — usar o token.

| Token | Significado | Light | Dark | Marcador não-cromático |
|---|---|---|---|---|
| `--color-income` | Receita / entrada / saldo positivo | `oklch(0.62 0.18 145)` (verde) | `oklch(0.72 0.16 145)` | `↑` ou prefixo `+` |
| `--color-expense` | Despesa / saída / saldo negativo | `oklch(0.58 0.22 25)` (vermelho) | `oklch(0.70 0.20 25)` | `↓` ou prefixo `-` |
| `--color-transfer` | Transferência entre contas (neutro) | `oklch(0.55 0.12 250)` (azul) | `oklch(0.70 0.14 250)` | `↔` |
| `--color-investment` | Aplicação / resgate (categoria especial) | `oklch(0.60 0.16 290)` (violeta) | `oklch(0.72 0.14 290)` | — |

Tailwind classes geradas (via `@theme inline`): `text-income`, `text-expense`, `text-transfer`, `text-investment` e seus equivalentes `bg-*` / `border-*`.

**Acessibilidade (a11y daltônica):** cor sozinha não pode ser o único sinal. Sempre adicionar marcador não-cromático (`↑` `↓` `+` `-`) junto do valor.

```tsx
// ❌ Antes
<span className="text-emerald-600">{formatCurrency(amount)}</span>

// ✅ Depois
<span className="text-income tabular-nums">
  <ArrowUp className="inline size-3 mr-1" aria-hidden />
  {formatCurrency(amount)}
</span>
```

### 1.2 Quando NÃO usar tokens financeiros

- Botões neutros, ícones de UI genéricos, texto comum: usar `text-foreground` / `text-muted-foreground` do shadcn.
- Destrutivo (delete, archive): `text-destructive` (já existe).
- Estado de erro de form/validação: `text-destructive` — distinto de `text-expense` semanticamente, mesmo que visualmente parecido.

---

## 2. Larguras de Dialog

Definidas por tipo de conteúdo. Não escolher por estética — escolher pelo tipo:

| Conteúdo | Classe | Max-width |
|---|---|---|
| Form simples (1-3 campos) | `sm:max-w-sm` | 24rem |
| Form padrão (4-6 campos) | `sm:max-w-md` | 28rem |
| Form com colunas / muitos campos | `sm:max-w-lg` | 32rem |
| Form com tabela embedded ou preview | `sm:max-w-2xl` | 42rem |
| Confirmação (AlertDialog) | `sm:max-w-sm` | 24rem |

Exemplos atuais:
- `account-form-dialog.tsx`: 4 campos → `sm:max-w-md` ✅
- `transaction-form-dialog.tsx`: 6 campos com colunas → `sm:max-w-lg` ✅

---

## 3. EmptyState

Componente único para estados vazios. Substitui as 4 variações ad-hoc atuais.

### API proposta

```tsx
<EmptyState
  variant="list"        // border + p-12 + CTA único
  icon={<WalletIcon />}
  title="Nenhuma conta cadastrada"
  description="Adicione sua primeira conta para começar."
  action={<Button>Nova conta</Button>}
/>

<EmptyState
  variant="onboarding"  // grid de cards numerados
  steps={[
    { title: "1. Cadastre suas contas", action: <Link href="/contas">Contas</Link> },
    { title: "2. Configure a IA", action: <Link href="/configuracoes">Configurar</Link> },
  ]}
/>

<EmptyState
  variant="coming-soon" // tracejada + ConstructionIcon
  feature="Orçamento mensal"
  description="Em breve."
/>

<EmptyState
  variant="error"       // outline destructive
  title="Falha ao carregar"
  description="Tente novamente em alguns segundos."
  action={<Button onClick={retry}>Tentar de novo</Button>}
/>
```

Localização: `components/ui/empty-state.tsx` (criado nesta padronização).

---

## 4. Loading text

### Regras

1. **Sempre gerúndio em PT-BR** ("Salvando", "Validando", "Excluindo").
2. **Sempre ellipsis Unicode `…`** (U+2026), nunca três pontos `...`.
3. **Sempre desabilitar o botão** durante o loading (`disabled={isPending}`).

### Constantes

Definidas em `lib/ui-text.ts` (criado nesta padronização):

```ts
export const LOADING_TEXT = {
  save: 'Salvando…',
  delete: 'Excluindo…',
  archive: 'Arquivando…',
  validate: 'Validando…',
  import: 'Importando…',
  authenticate: 'Entrando…',
  upload: 'Enviando…',
} as const;
```

Uso:

```tsx
<Button disabled={isPending}>
  {isPending ? LOADING_TEXT.save : 'Salvar'}
</Button>
```

---

## 5. Microcopy & tom

### Regras gerais

- **PT-BR**, sem termos em inglês desnecessários ("Save" → "Salvar", "Cancel" → "Cancelar").
- **Tom familiar mas profissional** — projeto é doméstico, não corporativo. Evitar "Por favor" excessivo; preferir verbos diretos.
- **Sem ponto final** em botões e labels curtos. Com ponto em frases completas (descrições, helpers).

### Sidebar vs CTA

- **Sidebar (navegação):** substantivo no singular. `Contas`, `Transações`, `Importar`, `Orçamento`.
- **Botão CTA:** verbo imperativo. `Nova conta`, `Adicionar transação`, `Importar PDF`.

### Botão Cancelar

**Sempre presente** em Dialog com ação primária. Ordem: `[Cancelar] [Ação primária]` (cancelar à esquerda, ação à direita — padrão ocidental).

```tsx
<DialogFooter>
  <DialogClose render={<Button variant="outline">Cancelar</Button>} />
  <Button type="submit">Salvar</Button>
</DialogFooter>
```

### Toast

Variantes:

| Variant | Quando | Exemplo |
|---|---|---|
| `toast.success` | Operação concluída | "Transação salva" |
| `toast.error` | Erro do usuário ou servidor | "Não foi possível salvar" |
| `toast.info` | Estado neutro / pré-requisito | "Configure sua chave primeiro" |
| `toast.message` | Action button (Desfazer) | "Conta arquivada — Desfazer" |

Posição: `bottom-center` em mobile, `top-right` em desktop. Configuração no `<Toaster>` em `app/(app)/layout.tsx`:

```tsx
<Toaster
  position={isMobile ? 'bottom-center' : 'top-right'}
  closeButton
/>
```

---

## 6. Confirmação destrutiva

Regra simples:

| Reversibilidade | Padrão |
|---|---|
| **Irreversível** (delete transação, delete categoria custom) | `<AlertDialog>` exigindo confirmação explícita |
| **Reversível em <30s** (archive conta, hide transação) | `toast.message` com action button "Desfazer" |
| **Reversível navegando** (filtros, ordenação) | Ação direta, sem confirmação |

### AlertDialog (irreversível)

```tsx
<AlertDialog open={open} onOpenChange={setOpen}>
  <AlertDialogContent>
    <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
    <AlertDialogDescription>
      Esta ação não pode ser desfeita.
    </AlertDialogDescription>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction variant="destructive" onClick={handleDelete}>
        Excluir
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Toast Desfazer (reversível)

```tsx
async function handleArchive(id: string) {
  await archiveAccountAction(id);
  toast.message('Conta arquivada', {
    action: {
      label: 'Desfazer',
      onClick: () => unarchiveAccountAction(id),
    },
  });
}
```

---

## 7. Forms

### Padrões obrigatórios

- **Sempre `useTransition`** para Server Actions (não `useFormStatus` solto).
- **Sempre Zod** na borda (server side) — mesmo schema usado no client com `react-hook-form` + `zodResolver`.
- **Sempre `<FieldError>`** abaixo do campo + `aria-invalid` no Input quando há erro.
- **Campos obrigatórios** marcados visualmente — atributo `required` HTML + sufixo `*` no label.

### Exemplo

```tsx
<FormField name="description">
  {({ field, error }) => (
    <>
      <Label htmlFor="description">
        Descrição <span className="text-destructive">*</span>
      </Label>
      <Input
        id="description"
        {...field}
        aria-invalid={!!error}
        className={cn(error && 'border-destructive')}
      />
      <FieldError>{error?.message}</FieldError>
    </>
  )}
</FormField>
```

### Currency input

Input deve **aceitar formato BR e EN** e normalizar antes do submit:

```ts
function parseBRLInput(raw: string): number {
  // Aceita: "1.000,50", "1000.5", "1,000.50", "1000,50"
  const cleaned = raw.replace(/\s/g, '');
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    // Determine separator decimal pela posição (último vence)
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    return lastComma > lastDot
      ? Number(cleaned.replace(/\./g, '').replace(',', '.'))
      : Number(cleaned.replace(/,/g, ''));
  }
  if (hasComma) return Number(cleaned.replace(',', '.'));
  return Number(cleaned);
}
```

Display sempre via `formatCurrency()` (já existe em `lib/format.ts`).

---

## 8. Shape de retorno (Server Action & Route Handler)

### Padrão único

```ts
type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
```

### Exemplo Server Action

```ts
'use server';

export async function createTransactionAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  const parsed = TransactionInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Dados inválidos',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const [row] = await db.insert(transactions).values({ ...parsed.data, userId }).returning();
  revalidatePath('/transacoes');
  return { ok: true, data: { id: row.id } };
}
```

### Exemplo Route Handler

```ts
export async function POST(req: NextRequest): Promise<NextResponse<ActionResult<{ inserted: number }>>> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 });
  }
  // ...
  return NextResponse.json({ ok: true, data: { inserted: rows.length } });
}
```

### Consumo no cliente

```ts
const result = await createTransactionAction(formData);
if (!result.ok) {
  toast.error(result.error);
  if (result.fieldErrors) setFieldErrors(result.fieldErrors);
  return;
}
toast.success('Transação salva');
router.refresh();
```

---

## 9. Tabelas

### Regras

- **Coluna de ações** (`<TableHead className="w-12">`) sempre com `<span className="sr-only">Ações</span>` para a11y.
- **Valores monetários** sempre com `tabular-nums` (alinha colunas verticalmente).
- **Linha "soft-deleted" / arquivada** com `opacity-60` + tooltip "Arquivada".

```tsx
<TableHead className="w-12 text-right">
  <span className="sr-only">Ações</span>
</TableHead>

<TableCell className="text-right tabular-nums text-income">
  + {formatCurrency(amount)}
</TableCell>
```

---

## 10. Iconografia

Sempre `lucide-react`. Tamanhos padrão:

| Contexto | Tamanho |
|---|---|
| Sidebar | `size-4` (16px) |
| Botão inline | `size-4` |
| Header de card | `size-5` (20px) |
| EmptyState central | `size-12` (48px) |
| Indicador de receita/despesa em linha de transação | `size-3` (12px) |

### Ícones por tipo de conta

| Tipo | Ícone (lucide) |
|---|---|
| `checking` (corrente) | `Landmark` |
| `savings` (poupança) | `PiggyBank` |
| `credit_card` | `CreditCard` |
| `wallet` (carteira) | `Wallet` |
| `broker` (corretora) | `TrendingUp` |
| `other` | `CircleHelp` |

Mapeamento em `lib/account-icons.tsx` (a criar).

---

## 11. Layout

- **`<main>`** do AppLayout: `max-w-7xl mx-auto p-4 md:p-6` (sem o `max-w` atual, conteúdo dispersa em 1920px+).
- **Página NÃO usa `<h1>`** quando já existe em `<SiteHeader>`. Decisão: **header da rota = SiteHeader** (centralizado). Páginas podem ter `<h2>` de subseção.
- **Hierarquia visual:** Page → Section (`<h2>`) → Subsection (`<h3>`). Pular níveis quebra screen reader.

---

## 12. Datas

- **Armazenar como string ISO `YYYY-MM-DD`** (não `Date`) em campos do tipo `date`.
- **Formatar com `formatDate()`** de `lib/format.ts`.
- **Comparar como string** (`'2026-05-19' < '2026-05-20'` é válido em ISO).
- **Display padrão:** `dd MMM` em listas (`19 mai`), `dd MMM yyyy` em detalhes.

> Bug aberto sobre timezone implícito: [#10](https://github.com/virtcaio/organizacao-financeira/issues/10). Após resolver, atualizar esta seção com o helper canônico.

---

## 13. Acessibilidade (cross-cut)

Não é uma seção isolada — toda decisão acima já incorpora. Resumo de checagem rápida:

- [ ] Cor não é único sinal (`text-income` sempre acompanhado de `↑` ou `+`)
- [ ] `aria-invalid` em Input com erro
- [ ] `<span className="sr-only">` em headers de ação só-ícone
- [ ] Botões nativos para triggers (Base UI exige)
- [ ] Foco visível (`focus-visible:ring-2 ring-ring`) — já vem do shadcn

Auditoria detalhada: [`12-acessibilidade.md`](./12-acessibilidade.md).

---

## 14. Apêndice — tokens completos (CSS variables)

Adicionar em `app/globals.css` dentro de `@theme inline` (geram utility classes Tailwind):

```css
@theme inline {
  /* ... tokens existentes ... */
  --color-income: var(--income);
  --color-expense: var(--expense);
  --color-transfer: var(--transfer);
  --color-investment: var(--investment);
}
```

E nos blocos `:root` / `.dark`:

```css
:root {
  /* ... tokens existentes ... */
  --income: oklch(0.62 0.18 145);
  --expense: oklch(0.58 0.22 25);
  --transfer: oklch(0.55 0.12 250);
  --investment: oklch(0.60 0.16 290);
}

.dark {
  /* ... tokens existentes ... */
  --income: oklch(0.72 0.16 145);
  --expense: oklch(0.70 0.20 25);
  --transfer: oklch(0.70 0.14 250);
  --investment: oklch(0.72 0.14 290);
}
```

---

## Como atualizar este doc

- **Bater dúvida em PR review?** Atualize o doc no mesmo PR. Não fechar PR com decisão silenciosa.
- **Mudança quebra decisão antiga?** Adicionar nota: "Antes era X; mudou em [PR-link] porque Y."
- **Componente padrão muda API?** Atualizar snippet aqui antes de fechar PR.

---

## Referências

- [`04-uxui-inconsistencias.md`](./04-uxui-inconsistencias.md) — auditoria que originou estas decisões
- [`03-uxui-sugestoes-de-melhoria.md`](./03-uxui-sugestoes-de-melhoria.md) — oportunidades correlatas
- [`12-acessibilidade.md`](./12-acessibilidade.md) — WCAG 2.1 AA
- [shadcn/ui (Base UI)](https://ui.shadcn.com/docs)
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4)
- Issue de tracking: [#11](https://github.com/virtcaio/organizacao-financeira/issues/11)

import { describe, expect, it } from "vitest";
import {
  applyFilters,
  expandCategoryFilter,
  hasAnyFilter,
  parseFilters,
} from "@/lib/transactions/filter";
import type { TransactionListItem } from "@/lib/actions/transactions";
import type { CategoryNode } from "@/lib/db/queries/categories";

const sub = (id: string, name: string): CategoryNode => ({
  id,
  name,
  kind: "expense",
  icon: null,
  parentId: "mae",
  isEditable: false,
  children: [],
});

const CATEGORIES: CategoryNode[] = [
  {
    id: "mae",
    name: "Alimentação",
    kind: "expense",
    icon: null,
    parentId: null,
    isEditable: false,
    children: [sub("sub1", "Mercado"), sub("sub2", "Restaurante")],
  },
];

const ACCOUNTS = [{ id: "acc1" }];
const TAGS = [{ id: "tag1" }];

function tx(overrides: Partial<TransactionListItem>): TransactionListItem {
  return {
    id: "t1",
    type: "expense",
    amount: "10.00",
    currency: "BRL",
    date: "2026-07-17",
    description: "Café",
    notes: null,
    accountId: "acc1",
    accountName: "Conta",
    categoryId: null,
    categoryName: null,
    categoryParentName: null,
    transferPairId: null,
    receiptKey: null,
    tags: [],
    ...overrides,
  };
}

describe("parseFilters", () => {
  it("from > to ignora ambos; from válido sozinho passa", () => {
    expect(
      parseFilters({ from: "2026-07-31", to: "2026-07-01" }, ACCOUNTS, CATEGORIES, TAGS),
    ).toEqual({});
    expect(
      parseFilters({ from: "2026-07-01" }, ACCOUNTS, CATEGORIES, TAGS),
    ).toEqual({ from: "2026-07-01" });
  });

  it("ignora ids desconhecidos e trunca busca em 100 chars", () => {
    const f = parseFilters(
      { account: "outro", category: "outro", tag: "outro", q: "x".repeat(150) },
      ACCOUNTS,
      CATEGORIES,
      TAGS,
    );
    expect(f.accountId).toBeUndefined();
    expect(f.categoryId).toBeUndefined();
    expect(f.tagId).toBeUndefined();
    expect(f.q).toHaveLength(100);
  });

  it("hasAnyFilter reflete o resultado", () => {
    expect(hasAnyFilter({})).toBe(false);
    expect(hasAnyFilter({ q: "a" })).toBe(true);
  });
});

describe("expandCategoryFilter", () => {
  it("mãe inclui ela + todas as subs; sub inclui só ela", () => {
    expect(Array.from(expandCategoryFilter("mae", CATEGORIES)).sort()).toEqual([
      "mae",
      "sub1",
      "sub2",
    ]);
    expect(Array.from(expandCategoryFilter("sub1", CATEGORIES))).toEqual(["sub1"]);
  });
});

describe("applyFilters", () => {
  it("boundaries de data são inclusivos", () => {
    const rows = [
      tx({ id: "a", date: "2026-07-01" }),
      tx({ id: "b", date: "2026-07-15" }),
      tx({ id: "c", date: "2026-07-31" }),
      tx({ id: "d", date: "2026-08-01" }),
    ];
    const out = applyFilters(
      rows,
      { from: "2026-07-01", to: "2026-07-31" },
      CATEGORIES,
    );
    expect(out.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("filtro de categoria-mãe pega transações das subs", () => {
    const rows = [
      tx({ id: "a", categoryId: "sub1" }),
      tx({ id: "b", categoryId: null }),
    ];
    const out = applyFilters(rows, { categoryId: "mae" }, CATEGORIES);
    expect(out.map((r) => r.id)).toEqual(["a"]);
  });

  it("busca textual é case-insensitive e tag filtra pela lista da linha", () => {
    const rows = [
      tx({ id: "a", description: "UBER TRIP" }),
      tx({ id: "b", description: "Padaria", tags: [{ id: "tag1", name: "x", color: "red" }] }),
    ];
    expect(applyFilters(rows, { q: "uber" }, CATEGORIES).map((r) => r.id)).toEqual(["a"]);
    expect(applyFilters(rows, { tagId: "tag1" }, CATEGORIES).map((r) => r.id)).toEqual(["b"]);
  });
});

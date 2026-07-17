import { describe, expect, it } from "vitest";
import {
  applyRulesToItems,
  extractRulePattern,
  findFirstMatchingRule,
  type CategorizationRule,
} from "@/lib/categorization/apply";

const rule = (
  id: string,
  pattern: string,
  priority: number,
  categoryId = `cat-${id}`,
): CategorizationRule => ({ id, pattern, priority, categoryId }) as CategorizationRule;

describe("findFirstMatchingRule", () => {
  it("match é case-insensitive por substring", () => {
    const r = findFirstMatchingRule("UBER *TRIP 0498", [rule("1", "uber", 100)]);
    expect(r?.id).toBe("1");
  });

  it("menor priority vence quando duas regras casam", () => {
    const r = findFirstMatchingRule("uber eats pedido", [
      rule("food", "eats", 50),
      rule("transport", "uber", 100),
    ]);
    expect(r?.id).toBe("food");
  });
});

describe("applyRulesToItems", () => {
  it("separa matched/unmatched preservando os itens", () => {
    const items = [
      { id: "a", description: "UBER *TRIP", amount: 20, type: "expense" as const },
      { id: "b", description: "PADARIA DO ZÉ", amount: 8, type: "expense" as const },
    ];
    const { matched, unmatched } = applyRulesToItems(items, [rule("1", "uber", 100)]);
    expect(matched.map((m) => m.id)).toEqual(["a"]);
    expect(matched[0].categoryId).toBe("cat-1");
    expect(matched[0].ruleId).toBe("1");
    expect(unmatched.map((u) => u.id)).toEqual(["b"]);
  });

  it("sem regras, tudo é unmatched", () => {
    const items = [{ id: "a", description: "X", amount: 1, type: "expense" as const }];
    const { matched, unmatched } = applyRulesToItems(items, []);
    expect(matched).toHaveLength(0);
    expect(unmatched).toHaveLength(1);
  });
});

describe("extractRulePattern", () => {
  it("remove códigos numéricos longos e separadores", () => {
    expect(extractRulePattern("UBER *TRIP 0498-J HELP.UBER.COM")).toBe(
      "uber trip j help.uber.com",
    );
  });
});

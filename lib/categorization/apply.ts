/**
 * Helpers puros pra aplicar regras de categorização a uma lista de transações.
 * Sem dependência de DB — recebe regras já carregadas.
 */

export type CategorizationRule = {
  id: string;
  pattern: string;
  categoryId: string;
  priority: number;
};

export type Categorizable = {
  description: string;
};

export type RuleMatchedItem<T extends Categorizable> = T & {
  categoryId: string;
  ruleId: string;
};

export type ApplyResult<T extends Categorizable> = {
  matched: RuleMatchedItem<T>[];
  unmatched: T[];
};

/** Regras ordenadas: priority asc (menor = aplica primeiro). Mesma priority: ordem do array. */
function sortRules(rules: CategorizationRule[]): CategorizationRule[] {
  return [...rules].sort((a, b) => a.priority - b.priority);
}

/** Primeira regra cuja pattern (lowercase) está contida na description (lowercase). */
export function findFirstMatchingRule(
  description: string,
  rules: CategorizationRule[],
): CategorizationRule | null {
  const desc = description.toLowerCase();
  const sorted = sortRules(rules);
  for (const r of sorted) {
    if (desc.includes(r.pattern.toLowerCase())) {
      return r;
    }
  }
  return null;
}

/**
 * Particiona items entre matched (têm regra) e unmatched (não têm).
 * Preserva ordem original — `matched` e `unmatched` mantêm a sequência relativa do input.
 */
export function applyRulesToItems<T extends Categorizable>(
  items: T[],
  rules: CategorizationRule[],
): ApplyResult<T> {
  // Pré-computa o lowercase dos patterns uma vez — dentro do loop era
  // O(items × rules) toLowerCase repetidos.
  const sorted = sortRules(rules).map((r) => ({
    rule: r,
    patternLower: r.pattern.toLowerCase(),
  }));
  const matched: RuleMatchedItem<T>[] = [];
  const unmatched: T[] = [];

  for (const item of items) {
    const desc = item.description.toLowerCase();
    let hit: CategorizationRule | null = null;
    for (const { rule, patternLower } of sorted) {
      if (desc.includes(patternLower)) {
        hit = rule;
        break;
      }
    }
    if (hit) {
      matched.push({ ...item, categoryId: hit.categoryId, ruleId: hit.id });
    } else {
      unmatched.push(item);
    }
  }

  return { matched, unmatched };
}

/**
 * Sugere um padrão de regra a partir da descrição.
 * Lower + remove sequências de 4+ dígitos (códigos, datas) + colapsa espaços + trim.
 * User edita antes de salvar.
 */
export function extractRulePattern(description: string): string {
  return description
    .toLowerCase()
    .replace(/\d{4,}/g, " ")
    .replace(/[*\-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

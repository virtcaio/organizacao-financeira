import "server-only";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";

export type CategoryNode = {
  id: string;
  name: string;
  kind: "income" | "expense" | "investment" | "transfer";
  icon: string | null;
  parentId: string | null;
  children: CategoryNode[];
};

/**
 * Returns the seeded (system) categories + the user's own categories, grouped
 * hierarchically by `parent_id`. System categories have `user_id = null`.
 */
export async function listCategoriesForUser(userId: string): Promise<CategoryNode[]> {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      kind: categories.kind,
      icon: categories.icon,
      parentId: categories.parentId,
      archived: categories.archived,
    })
    .from(categories)
    .where(
      and(
        or(isNull(categories.userId), eq(categories.userId, userId)),
        eq(categories.archived, false),
      ),
    )
    .orderBy(asc(categories.name));

  const byId = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const r of rows) {
    byId.set(r.id, {
      id: r.id,
      name: r.name,
      kind: r.kind,
      icon: r.icon,
      parentId: r.parentId,
      children: [],
    });
  }

  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort parents by name; children already sorted by the SQL.
  roots.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return roots;
}

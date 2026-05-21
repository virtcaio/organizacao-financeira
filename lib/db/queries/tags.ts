import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { tags, transactionTags } from "@/lib/db/schema";
import type { Tag, TagColor } from "@/types/tag";

export async function listTagsForUser(userId: string): Promise<Tag[]> {
  const rows = await db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(asc(tags.name));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: (r.color as TagColor | null) ?? null,
  }));
}

/** Mapa transactionId → Tag[] pra um conjunto de transações. */
export async function getTagsByTransactionIds(
  userId: string,
  transactionIds: string[],
): Promise<Map<string, Tag[]>> {
  const map = new Map<string, Tag[]>();
  if (transactionIds.length === 0) return map;

  const rows = await db
    .select({
      transactionId: transactionTags.transactionId,
      id: tags.id,
      name: tags.name,
      color: tags.color,
    })
    .from(transactionTags)
    .innerJoin(tags, eq(tags.id, transactionTags.tagId))
    .where(
      and(
        eq(tags.userId, userId),
        inArray(transactionTags.transactionId, transactionIds),
      ),
    );

  for (const r of rows) {
    const arr = map.get(r.transactionId) ?? [];
    arr.push({
      id: r.id,
      name: r.name,
      color: (r.color as TagColor | null) ?? null,
    });
    map.set(r.transactionId, arr);
  }
  return map;
}

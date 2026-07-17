import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// cache() memoiza por request: uma renderização de página chama
// requireUserId em vários pontos (página + queries) e decodificava o JWT N vezes.
const getSession = cache(() => auth());

export async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user.id;
}

export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}

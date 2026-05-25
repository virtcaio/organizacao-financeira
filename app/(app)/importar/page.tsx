import { ImportHub } from "@/components/importar/import-hub";
import { listAccountsForPickerAction } from "@/lib/actions/transactions";
import { listCategoriesForUser } from "@/lib/db/queries/categories";
import { requireUserId } from "@/lib/auth-helpers";

export const metadata = { title: "Importar" };

export default async function ImportarPage() {
  const userId = await requireUserId();
  const [accounts, categories] = await Promise.all([
    listAccountsForPickerAction(),
    listCategoriesForUser(userId),
  ]);

  return <ImportHub accounts={accounts} categories={categories} />;
}

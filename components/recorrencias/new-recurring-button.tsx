"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecurringRuleFormDialog } from "./recurring-rule-form-dialog";
import type { AccountOption } from "@/components/transacoes/transaction-form-dialog";
import type { CategoryNode } from "@/lib/db/queries/categories";

export function NewRecurringButton({
  accounts,
  categories,
}: {
  accounts: AccountOption[];
  categories: CategoryNode[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 size-4" />
        Nova recorrência
      </Button>
      <RecurringRuleFormDialog
        open={open}
        onOpenChange={setOpen}
        accounts={accounts}
        categories={categories}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TransactionFormDialog,
  type AccountOption,
} from "./transaction-form-dialog";
import type { CategoryNode } from "@/lib/db/queries/categories";

export function NewTransactionButton({
  accounts,
  categories,
  disabled,
}: {
  accounts: AccountOption[];
  categories: CategoryNode[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={disabled}>
        <Plus className="mr-2 h-4 w-4" />
        Nova transação
      </Button>
      <TransactionFormDialog
        open={open}
        onOpenChange={setOpen}
        accounts={accounts}
        categories={categories}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BudgetFormDialog } from "./budget-form-dialog";
import type { CategoryNode } from "@/lib/db/queries/categories";

type Props = {
  month: string;
  monthLabel: string;
  categories: CategoryNode[];
  variant?: "default" | "outline";
};

export function NewBudgetButton({ month, monthLabel, categories, variant = "default" }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <PlusIcon className="mr-2 size-4" />
        Novo orçamento
      </Button>
      <BudgetFormDialog
        open={open}
        onOpenChange={setOpen}
        month={month}
        monthLabel={monthLabel}
        categories={categories}
      />
    </>
  );
}

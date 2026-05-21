"use client";

import { useState } from "react";
import { ArrowLeftRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransferFormDialog } from "./transfer-form-dialog";
import type { AccountOption } from "./transaction-form-dialog";

export function NewTransferButton({
  accounts,
  variant = "outline",
}: {
  accounts: AccountOption[];
  variant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <ArrowLeftRightIcon className="mr-2 size-4" />
        Transferência
      </Button>
      <TransferFormDialog open={open} onOpenChange={setOpen} accounts={accounts} />
    </>
  );
}

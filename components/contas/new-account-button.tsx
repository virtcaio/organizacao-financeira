"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountFormDialog } from "./account-form-dialog";

export function NewAccountButton({
  variant = "default",
  label = "Nova conta",
}: {
  variant?: "default" | "outline";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        {label}
      </Button>
      <AccountFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  archiveFinancialAccountAction,
  unarchiveFinancialAccountAction,
} from "@/lib/actions/financial-accounts";
import { AccountFormDialog } from "./account-form-dialog";
import type { FinancialAccountType } from "@/types/financial-account";

type Props = {
  account: {
    id: string;
    name: string;
    type: FinancialAccountType;
    currency: string;
    openingBalance: string;
    archived: boolean;
  };
};

export function AccountRowActions({ account }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  function toggleArchive() {
    startTransition(async () => {
      const res = account.archived
        ? await unarchiveFinancialAccountAction(account.id)
        : await archiveFinancialAccountAction(account.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(account.archived ? "Conta restaurada" : "Conta arquivada");
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isPending}>
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Ações</span>
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>Editar</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={toggleArchive}>
              {account.archived ? "Restaurar" : "Arquivar"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AccountFormDialog
        account={account}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}

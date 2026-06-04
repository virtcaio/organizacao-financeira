"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCategoryAction,
  updateCategoryAction,
} from "@/lib/actions/categories";
import { LOADING_TEXT } from "@/lib/ui-text";
import { cn } from "@/lib/utils";
import {
  CATEGORY_KINDS,
  CATEGORY_KIND_LABELS,
  type CategoryKind,
} from "@/types/category";
import type { CategoryAdminNode } from "@/lib/db/queries/categories";

/** Edição: dados pré-existentes; criar: undefined. */
export type CategoryEditPreset = {
  id: string;
  name: string;
  icon: string | null;
  kindLabel: string;
  parentLabel: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Árvore completa (admin) — usada pra popular o Select de mães em "criar sub". */
  allCategories: CategoryAdminNode[];
  preset?: CategoryEditPreset;
};

type Scope = "parent" | "child";

export function CategoryFormDialog({
  open,
  onOpenChange,
  allCategories,
  preset,
}: Props) {
  const router = useRouter();
  const isEdit = !!preset;
  const [scope, setScope] = useState<Scope>("child");
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [parentId, setParentId] = useState<string>("");
  const [name, setName] = useState(preset?.name ?? "");
  const [icon, setIcon] = useState(preset?.icon ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  // Mães disponíveis: nível 1 (sem parent) e não arquivadas pra esse user.
  const parents = allCategories.filter((c) => !c.archivedForUser);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const input = isEdit
      ? { name: name.trim(), icon: icon.trim() || undefined }
      : scope === "parent"
        ? { name: name.trim(), icon: icon.trim() || undefined, kind }
        : { name: name.trim(), icon: icon.trim() || undefined, parentId };

    startTransition(async () => {
      const res = isEdit
        ? await updateCategoryAction(preset!.id, input)
        : await createCategoryAction(input);
      if (!res.ok) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
        return;
      }
      toast.success(isEdit ? "Categoria atualizada" : "Categoria criada");
      onOpenChange(false);
      setName("");
      setIcon("");
      setParentId("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar categoria" : "Nova categoria"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Renomeie ou troque o ícone. Tipo e categoria-mãe não mudam — recrie se precisar."
              : "Categorias-mãe agrupam subcategorias. Subcategorias herdam o tipo da mãe."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          {isEdit ? (
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Input
                value={
                  preset!.parentLabel
                    ? `${preset!.parentLabel} · ${preset!.kindLabel}`
                    : preset!.kindLabel
                }
                disabled
                readOnly
              />
            </div>
          ) : (
            <div className="grid gap-2">
              <Label>Tipo de categoria</Label>
              <div className="grid grid-cols-2 gap-2">
                <ScopeButton
                  active={scope === "child"}
                  onClick={() => setScope("child")}
                  disabled={isPending}
                  title="Subcategoria"
                  hint="Dentro de uma mãe existente"
                />
                <ScopeButton
                  active={scope === "parent"}
                  onClick={() => setScope("parent")}
                  disabled={isPending}
                  title="Categoria-mãe"
                  hint="Nova categoria de topo"
                />
              </div>
            </div>
          )}

          {!isEdit && scope === "parent" ? (
            <div className="grid gap-2">
              <Label htmlFor="kind">Tipo</Label>
              <Select
                value={kind}
                onValueChange={(v) => v && setKind(v as CategoryKind)}
                disabled={isPending}
              >
                <SelectTrigger id="kind" className="w-full">
                  <SelectValue>
                    {(v: string) => CATEGORY_KIND_LABELS[v as CategoryKind]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {CATEGORY_KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.kind ? <FieldError msg={errors.kind} /> : null}
            </div>
          ) : null}

          {!isEdit && scope === "child" ? (
            <div className="grid gap-2">
              <Label htmlFor="parentId">Categoria-mãe</Label>
              <Select
                value={parentId}
                onValueChange={(v) => setParentId(v ?? "")}
                disabled={isPending}
              >
                <SelectTrigger id="parentId" className="w-full">
                  <SelectValue placeholder="Selecione a mãe">
                    {(v: string) =>
                      parents.find((p) => p.id === v)?.name ?? "Selecione"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_KINDS.map((k) => {
                    const parentsOfKind = parents.filter((p) => p.kind === k);
                    if (parentsOfKind.length === 0) return null;
                    return (
                      <SelectGroup key={k}>
                        <SelectLabel>{CATEGORY_KIND_LABELS[k]}</SelectLabel>
                        {parentsOfKind.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.icon ? `${p.icon} ` : ""}
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.parentId ? <FieldError msg={errors.parentId} /> : null}
            </div>
          ) : null}

          <div className="grid grid-cols-[1fr_5rem] gap-3">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sushi de domingo"
                required
                disabled={isPending}
                maxLength={80}
              />
              {errors.name ? <FieldError msg={errors.name} /> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="icon">Ícone</Label>
              <Input
                id="icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="🍣"
                disabled={isPending}
                maxLength={8}
                className="text-center"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose
              render={
                <Button type="button" variant="ghost" disabled={isPending}>
                  Cancelar
                </Button>
              }
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? LOADING_TEXT.save : isEdit ? "Salvar" : "Criar categoria"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ScopeButton({
  active,
  onClick,
  disabled,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-start rounded-lg border p-3 text-left transition-colors",
        active
          ? "border-primary bg-primary/5"
          : "border-input hover:bg-accent",
      )}
    >
      <span className="text-sm font-medium">{title}</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </button>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <p className="text-sm text-destructive" role="alert">
      {msg}
    </p>
  );
}

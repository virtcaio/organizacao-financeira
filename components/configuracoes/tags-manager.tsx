"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { XIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagBadge, tagColorClass } from "@/components/transacoes/tag-badge";
import { createTagAction, deleteTagAction } from "@/lib/actions/tags";
import { LOADING_TEXT } from "@/lib/ui-text";
import { TAG_COLORS, type Tag, type TagColor } from "@/types/tag";
import { cn } from "@/lib/utils";

export function TagsManager({ initialTags }: { initialTags: Tag[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState<TagColor>("slate");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toDelete, setToDelete] = useState<Tag | null>(null);

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createTagAction({ name: name.trim(), color });
      if (!res.ok) {
        setError(res.fieldErrors?.name ?? res.error);
        return;
      }
      toast.success("Tag criada");
      setName("");
      router.refresh();
    });
  }

  function onDelete(tag: Tag) {
    startTransition(async () => {
      const res = await deleteTagAction(tag.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Tag excluída");
      setToDelete(null);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tags</CardTitle>
        <CardDescription>
          Rótulos livres pra agrupar transações cross-categoria (ex: uma viagem,
          um projeto). Aplique nas transações ao criar ou editar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={onCreate} className="space-y-3" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="tag-name">Nova tag</Label>
            <div className="flex gap-2">
              <Input
                id="tag-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="viagem-cancun-2026"
                maxLength={64}
                disabled={isPending}
              />
              <Button type="submit" disabled={isPending || name.trim() === ""}>
                {isPending ? LOADING_TEXT.save : "Adicionar"}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Cor:</span>
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Cor ${c}`}
                aria-pressed={color === c}
                className={cn(
                  "size-6 rounded-full border-2",
                  tagColorClass(c),
                  color === c ? "ring-2 ring-ring ring-offset-1" : "",
                )}
              />
            ))}
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </form>

        <div className="space-y-2">
          {initialTags.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma tag ainda. Crie a primeira acima.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {initialTags.map((tag) => (
                <span key={tag.id} className="inline-flex items-center gap-1">
                  <TagBadge name={tag.name} color={tag.color} />
                  <button
                    type="button"
                    onClick={() => setToDelete(tag)}
                    disabled={isPending}
                    aria-label={`Excluir tag ${tag.name}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tag “{toDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              A tag será removida de todas as transações que a usam. Esta ação
              não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && onDelete(toDelete)}
              disabled={isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isPending ? LOADING_TEXT.delete : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

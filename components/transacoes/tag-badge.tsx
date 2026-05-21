import { cn } from "@/lib/utils";
import type { TagColor } from "@/types/tag";

const TAG_COLOR_CLASSES: Record<TagColor, string> = {
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  red: "bg-red-100 text-red-700 border-red-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  green: "bg-green-100 text-green-700 border-green-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  violet: "bg-violet-100 text-violet-700 border-violet-200",
  pink: "bg-pink-100 text-pink-700 border-pink-200",
};

export function tagColorClass(color: TagColor | null): string {
  return color ? TAG_COLOR_CLASSES[color] : "bg-secondary text-secondary-foreground border-transparent";
}

export function TagBadge({
  name,
  color,
  className,
}: {
  name: string;
  color: TagColor | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        tagColorClass(color),
        className,
      )}
    >
      {name}
    </span>
  );
}

import { cn } from "@/lib/utils";

type Props = {
  percent: number;
  status: "ok" | "warning" | "exceeded";
  className?: string;
};

export function BudgetProgressBar({ percent, status, className }: Props) {
  const visualPercent = Math.min(percent, 100);
  const color =
    status === "exceeded"
      ? "bg-expense"
      : status === "warning"
        ? "bg-amber-500"
        : "bg-income";

  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
    >
      <div
        className={cn("h-full transition-[width]", color)}
        style={{ width: `${visualPercent}%` }}
      />
    </div>
  );
}

import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  month: string; // YYYY-MM-01
  monthLabel: string;
};

function shiftMonth(monthIso: string, delta: number): string {
  const year = Number(monthIso.slice(0, 4));
  const month = Number(monthIso.slice(5, 7));
  let targetMonth = month + delta;
  let targetYear = year;
  while (targetMonth <= 0) {
    targetMonth += 12;
    targetYear -= 1;
  }
  while (targetMonth > 12) {
    targetMonth -= 12;
    targetYear += 1;
  }
  return `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
}

export function BudgetMonthNav({ month, monthLabel }: Props) {
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, +1);
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/orcamento?month=${prev}`}
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}
        aria-label="Mês anterior"
      >
        <ChevronLeftIcon className="size-4" />
      </Link>
      <span className="text-sm font-medium tabular-nums first-letter:uppercase min-w-32 text-center">
        {monthLabel}
      </span>
      <Link
        href={`/orcamento?month=${next}`}
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}
        aria-label="Mês seguinte"
      >
        <ChevronRightIcon className="size-4" />
      </Link>
    </div>
  );
}

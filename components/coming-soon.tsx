import { ConstructionIcon } from "lucide-react";

export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-card p-12 text-center text-muted-foreground">
        <ConstructionIcon className="size-6" />
        <p className="text-sm">Em construção. Voltamos com novidades em breve.</p>
      </div>
    </div>
  );
}

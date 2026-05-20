import { ConstructionIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type BaseProps = {
  className?: string;
};

type ListProps = BaseProps & {
  variant?: "list";
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

type OnboardingStep = {
  number: number;
  title: string;
  description: string;
  action: React.ReactNode;
};

type OnboardingProps = BaseProps & {
  variant: "onboarding";
  steps: OnboardingStep[];
};

type ComingSoonProps = BaseProps & {
  variant: "coming-soon";
  message?: string;
};

export type EmptyStateProps = ListProps | OnboardingProps | ComingSoonProps;

export function EmptyState(props: EmptyStateProps) {
  if (props.variant === "onboarding") {
    return (
      <div className={cn("grid gap-4 sm:grid-cols-2", props.className)}>
        {props.steps.map((step) => (
          <OnboardingCard key={step.number} step={step} />
        ))}
      </div>
    );
  }

  if (props.variant === "coming-soon") {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-3 rounded-lg border border-dashed bg-card p-12 text-center text-muted-foreground",
          props.className,
        )}
      >
        <ConstructionIcon className="size-6" />
        <p className="text-sm">{props.message ?? "Em construção. Voltamos com novidades em breve."}</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border bg-card p-12 text-center", props.className)}>
      {props.icon ? (
        <div className="mb-4 flex justify-center text-muted-foreground">{props.icon}</div>
      ) : null}
      <h2 className="font-medium">{props.title}</h2>
      {props.description ? (
        <p className="mt-1 text-sm text-muted-foreground">{props.description}</p>
      ) : null}
      {props.action ? <div className="mt-6 flex justify-center">{props.action}</div> : null}
    </div>
  );
}

function OnboardingCard({ step }: { step: OnboardingStep }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-6">
      <div className="flex size-7 items-center justify-center rounded-full border text-xs font-medium text-muted-foreground">
        {step.number}
      </div>
      <div>
        <h2 className="font-medium">{step.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
      </div>
      <div>{step.action}</div>
    </div>
  );
}

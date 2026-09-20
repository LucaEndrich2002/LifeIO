import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function KpiCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="gap-4 px-6">
      <dl>
        <dt className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
          {label}
          <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
        </dt>
        <dd className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">
          {value}
        </dd>
      </dl>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </Card>
  );
}

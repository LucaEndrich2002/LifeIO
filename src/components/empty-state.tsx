import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  href,
  linkLabel,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex h-full flex-col items-start">
      <span className="mb-5 flex size-11 items-center justify-center rounded-2xl bg-accent text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h3 className="font-medium">{title}</h3>
      <p className="mt-2 mb-5 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <Link
        href={href}
        className="mt-auto inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-primary hover:underline"
      >
        {linkLabel}
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

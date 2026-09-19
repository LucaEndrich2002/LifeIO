import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  name: string;
  headline: string;
  description: string;
  icon: LucideIcon;
  items: readonly string[];
};

export function ModulePlaceholder({
  name,
  headline,
  description,
  icon: Icon,
  items,
}: Props) {
  return (
    <div className="space-y-8">
      <div>
        <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          {name}
        </p>
        <h1 className="max-w-2xl text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
          {headline}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <Card className="max-w-3xl py-12 sm:py-16">
        <CardContent className="flex flex-col items-center text-center">
          <span className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-accent text-primary">
            <Icon className="size-7" aria-hidden="true" />
          </span>
          <span className="mb-4 rounded-full border px-3 py-1 text-xs text-muted-foreground">
            In Vorbereitung
          </span>
          <h2 className="text-xl font-semibold">
            Hier bekommt dein Alltag mehr Klarheit.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Dieser Bereich ist noch nicht verfügbar. Bald findest du hier:
          </p>
          <ul
            className="mt-6 flex flex-wrap justify-center gap-2"
            aria-label="Geplante Funktionen"
          >
            {items.map((item) => (
              <li key={item} className="rounded-lg bg-muted px-3 py-2 text-sm">
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/"
            className="mt-10 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-primary hover:bg-accent"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Zum Überblick
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

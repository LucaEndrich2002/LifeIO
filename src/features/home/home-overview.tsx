import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const areas = [
  {
    href: "/money",
    name: "Money",
    icon: Wallet,
    title: "Dein Geld im Blick",
    description:
      "Einkommen, Ausgaben und Budgets. Verstehe, wie dein Monat aussieht.",
    tag: "Finanzieller Spielraum",
  },
  {
    href: "/plan",
    name: "Plan",
    icon: CalendarDays,
    title: "Raum für deinen Tag",
    description:
      "Aufgaben und Termine. Finde heraus, was als Nächstes wichtig ist.",
    tag: "Zeit für das Wesentliche",
  },
  {
    href: "/goals",
    name: "Goals",
    icon: Target,
    title: "Schritt für Schritt weiter",
    description:
      "Deine Ziele und dein Fortschritt. Mach aus guten Absichten einen Plan.",
    tag: "Eine Richtung, die zählt",
  },
];

export function HomeOverview() {
  return (
    <div className="space-y-10">
      <section
        aria-labelledby="welcome-title"
        className="relative overflow-hidden rounded-3xl border bg-accent/50 px-6 py-9 sm:px-10 sm:py-12"
      >
        <div className="relative z-10 max-w-xl">
          <p className="mb-5 flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-primary uppercase">
            <span className="size-1.5 rounded-full bg-primary" />
            Willkommen bei LifeOS
          </p>
          <h1
            id="welcome-title"
            className="text-4xl leading-[1.12] font-semibold tracking-[-0.04em] sm:text-5xl"
          >
            Mehr Überblick.
            <br />
            <span className="text-primary">Mehr Raum fürs Leben.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            Dein Geld, deine Zeit und deine Ziele gehören zusammen. Hier
            entsteht dein persönlicher Überblick.
          </p>
          <Link
            href="/goals"
            className="mt-8 inline-flex min-h-11 items-center gap-3 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Goals entdecken
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 -bottom-36 size-[430px] rounded-full border border-primary/10 sm:-right-36 xl:-right-8"
        >
          <div className="absolute inset-12 rounded-full border border-primary/10" />
          <div className="absolute inset-24 rounded-full border border-primary/10" />
          <div className="absolute inset-36 rounded-full bg-primary/5" />
        </div>
      </section>
      <section aria-labelledby="areas-title">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 id="areas-title" className="text-lg font-semibold tracking-tight">
            Was dir wichtig ist
          </h2>
          <span className="text-xs text-muted-foreground">
            Drei Bereiche. Ein Zusammenhang.
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {areas.map(({ href, name, icon: Icon, title, description, tag }) => (
            <Card key={href} className="h-full">
              <CardHeader>
                <div className="mb-5 flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
                    <Icon className="size-5 text-primary" aria-hidden="true" />
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    In Vorbereitung
                  </span>
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <p className="mb-6 text-xs text-muted-foreground">{tag}</p>
                <Link
                  href={href}
                  className="flex items-center justify-between rounded-md py-1 text-sm font-medium hover:text-primary"
                >
                  {name} entdecken
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section
        aria-labelledby="connections-title"
        className="grid gap-6 border-t pt-8 sm:grid-cols-[1fr_auto] sm:items-center"
      >
        <div className="flex items-start gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
          </span>
          <div>
            <h2 id="connections-title" className="text-sm font-semibold">
              Die Zusammenhänge machen den Unterschied.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Später verbindet Life AI deine Bereiche zu hilfreichen Einblicken.
              Verständlich und unter deiner Kontrolle.
            </p>
          </div>
        </div>
        <Link
          href="/ai"
          className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-primary"
        >
          AI kennenlernen
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}

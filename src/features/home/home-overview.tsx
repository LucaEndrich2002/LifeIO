import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Circle,
  Clock3,
  Flag,
  Target,
  Wallet,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PreviewSwitcher } from "@/features/home/preview-switcher";

// Display-only fixtures for the Phase 2 prototype, not financial records or calculations.
const exampleGoals = [
  {
    name: "Notgroschen",
    detail: "Mehr Sicherheit im Alltag",
    amount: "3.600,00 €",
    target: "6.000,00 €",
    progress: 60,
  },
  {
    name: "Auszeit am Meer",
    detail: "Eine Reise im Sommer 2027",
    amount: "840,00 €",
    target: "1.200,00 €",
    progress: 70,
  },
];

function AreaLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 rounded-md text-xs font-medium text-primary hover:underline"
    >
      {children}
      <ArrowUpRight className="size-3.5" aria-hidden="true" />
    </Link>
  );
}

function ExampleDashboard() {
  return (
    <div className="space-y-6">
      <section
        aria-label="Auf einen Blick"
        className="grid gap-4 md:grid-cols-3"
      >
        <KpiCard
          label="Monatssaldo · September"
          value="820,00 €"
          description="3.200,00 € Einnahmen − 2.380,00 € Ausgaben"
          icon={Wallet}
        />
        <KpiCard
          label="Heute geplant"
          value="3 Einträge"
          description="2 Aufgaben und 1 Termin für deinen Tag"
          icon={CalendarDays}
        />
        <KpiCard
          label="Deine Ziele"
          value="2 aktiv"
          description="Kleine Schritte für größere Pläne"
          icon={Target}
        />
      </section>
      <div className="grid items-start gap-6 xl:grid-cols-[1.15fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Heute</CardTitle>
              <AreaLink href="/plan">Plan ansehen</AreaLink>
            </div>
            <CardDescription>
              Beispieltag · Samstag, 19. September 2026
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul aria-label="Beispiel-Tagesplan" className="space-y-2">
              <li className="flex gap-4 rounded-xl bg-accent/60 p-4">
                <span className="mt-0.5 text-sm font-medium tabular-nums">
                  10:00
                </span>
                <div className="min-w-0 border-l border-primary/25 pl-4">
                  <p className="text-sm font-medium">
                    Zeit für den Wochenüberblick
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock3 className="size-3" aria-hidden="true" />
                    Termin · 30 Minuten
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-4 px-4 py-5">
                <Circle
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium">
                    Ausgaben der Woche durchsehen
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Aufgabe · Heute fällig
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-4 border-t px-4 py-5">
                <Circle
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium">Reiseideen sammeln</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Aufgabe · Gehört zu „Auszeit am Meer“
                  </p>
                </div>
              </li>
            </ul>
            <p className="mt-3 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
              In dieser Vorschau lassen sich Einträge noch nicht bearbeiten oder
              abhaken.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Deine Ziele</CardTitle>
              <AreaLink href="/goals">Goals ansehen</AreaLink>
            </div>
            <CardDescription>Was dir langfristig wichtig ist.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-6">
              {exampleGoals.map((goal) => (
                <li
                  key={goal.name}
                  className="border-b pb-6 last:border-0 last:pb-0"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-medium">{goal.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {goal.detail}
                      </p>
                    </div>
                    <span className="rounded-lg bg-accent px-2 py-1 text-xs font-semibold text-primary tabular-nums">
                      {goal.progress} %
                    </span>
                  </div>
                  <Progress
                    label={`Fortschritt: ${goal.name}`}
                    value={goal.progress}
                  />
                  <p className="mt-3 text-xs text-muted-foreground tabular-nums">
                    <span className="font-medium text-foreground">
                      {goal.amount}
                    </span>{" "}
                    von {goal.target}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
      <section
        aria-labelledby="attention-title"
        className="grid gap-5 rounded-2xl border border-primary/20 bg-accent/50 p-6 sm:grid-cols-[auto_1fr_auto] sm:items-center"
      >
        <span className="flex size-11 items-center justify-center rounded-2xl bg-card text-primary">
          <Flag className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id="attention-title" className="font-semibold">
            Ein Blick lohnt sich
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Im Beispiel sind 270,00 € von 300,00 € Freizeitbudget verbraucht.
            Für September bleiben in dieser Kategorie 30,00 €.
          </p>
        </div>
        <AreaLink href="/money">Money ansehen</AreaLink>
      </section>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Der Monatssaldo zeigt im Beispiel Einnahmen minus erfasste Ausgaben im
        September 2026. Er ist kein Kontostand und berücksichtigt keine weiteren
        Rücklagen.
      </p>
    </div>
  );
}

function EmptyDashboard() {
  return (
    <div className="space-y-6">
      <section
        aria-labelledby="empty-title"
        className="rounded-2xl border bg-accent/40 p-6 sm:p-8"
      >
        <p className="mb-3 text-xs font-medium tracking-wide text-primary uppercase">
          Vorschau ohne Einträge
        </p>
        <h2 id="empty-title" className="text-2xl font-semibold tracking-tight">
          Dein Überblick beginnt mit dir.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Sobald du später dein Konto einrichtest und erste Einträge erfasst,
          kommen hier Geld, Zeit und Ziele zusammen. Bis dahin kannst du die
          geplanten Bereiche entdecken.
        </p>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            area: "Money",
            title: "Noch kein Monatsüberblick",
            description:
              "Mit deinem ersten Einkommen und deinen Ausgaben entsteht später dein Monatsüberblick.",
            icon: Wallet,
            href: "/money",
            linkLabel: "Money entdecken",
          },
          {
            area: "Heute",
            title: "Platz für deinen Tag",
            description:
              "Deine ersten Aufgaben und Termine machen sichtbar, was als Nächstes ansteht.",
            icon: CalendarDays,
            href: "/plan",
            linkLabel: "Plan entdecken",
          },
          {
            area: "Deine Ziele",
            title: "Was möchtest du erreichen?",
            description:
              "Ein erstes Ziel gibt deinen nächsten Schritten eine Richtung. Du bestimmst das Tempo.",
            icon: Target,
            href: "/goals",
            linkLabel: "Goals entdecken",
          },
        ].map(({ area, ...props }) => (
          <Card key={area}>
            <CardHeader>
              <CardTitle>{area}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <EmptyState {...props} />
            </CardContent>
          </Card>
        ))}
      </div>
      <section
        aria-labelledby="empty-attention-title"
        className="flex items-start gap-4 rounded-2xl border p-6"
      >
        <ArrowRight
          className="mt-0.5 size-5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <div>
          <h2 id="empty-attention-title" className="text-sm font-medium">
            Hinweise wachsen mit deinem Überblick
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Ohne Einträge gibt es noch keine Grundlage für Budget- oder
            Fristenhinweise.
          </p>
        </div>
      </section>
    </div>
  );
}

export function HomeOverview() {
  return (
    <div className="space-y-7">
      <header className="pb-1">
        <p className="mb-3 text-xs font-medium tracking-[0.14em] text-primary uppercase">
          Geld. Zeit. Ziele.
        </p>
        <h1 className="text-3xl leading-tight font-semibold tracking-[-0.035em] sm:text-4xl">
          Dein Tag, mit Überblick.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Alles Wichtige an einem Ort. Mehr Raum für das, was zählt.
        </p>
      </header>
      <PreviewSwitcher
        example={<ExampleDashboard />}
        empty={<EmptyDashboard />}
      />
    </div>
  );
}

import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Plan" };

export default function PlanPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Platz für das Wesentliche.
      </h1>
      <p className="max-w-xl text-muted-foreground">
        Behalte deine nächsten Schritte im Blick – mit Priorität, Fälligkeit und
        einer übersichtlichen Aufgabenliste.
      </p>
      <Card className="max-w-3xl">
        <CardContent className="space-y-5">
          <CalendarDays className="size-8 text-primary" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Deine Aufgaben, dein Tempo</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Melde dich an und schließe die Einrichtung ab. Danach kannst du
            Aufgaben verwalten, erledigen und nach Tag oder Woche anzeigen. Im
            Kalender verwaltest du eigene Termine mit Zeitzone und Tages- oder
            Wochenansicht. In deinen Zielen kannst du passende Aufgaben und
            Termine verknüpfen.
          </p>
          <Link
            href="/account/plan"
            prefetch={false}
            className="inline-flex min-h-12 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            Private Aufgaben öffnen
          </Link>
          <Link
            href="/account/plan/calendar"
            prefetch={false}
            className="ml-4 inline-flex min-h-12 items-center text-sm underline"
          >
            Privaten Kalender öffnen
          </Link>
        </CardContent>
      </Card>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center text-sm text-primary underline"
      >
        Zum Überblick
      </Link>
    </div>
  );
}

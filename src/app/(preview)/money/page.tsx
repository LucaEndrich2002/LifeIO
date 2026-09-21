import type { Metadata } from "next";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Money" };

export default function MoneyPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="mb-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Money
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Dein Geld, gut sortiert.
        </h1>
        <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
          Erfasse deine Einnahmen und variablen Ausgaben und sieh, was nach
          Fixkosten und geplanter Sparrate bleibt.
        </p>
      </div>
      <Card className="max-w-3xl">
        <CardContent className="space-y-5">
          <Wallet className="size-8 text-primary" aria-hidden="true" />
          <h2 className="text-xl font-semibold">
            Deine persönliche Monatsübersicht
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Melde dich an und schließe deine Einrichtung ab, um mit deinen
            eigenen Angaben zu arbeiten. Budgets und die laufende Pflege von
            Fixkosten folgen im nächsten Ausbau.
          </p>
          <Link
            href="/account/money"
            prefetch={false}
            className="inline-flex min-h-12 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            Private Finanzübersicht öffnen
          </Link>
        </CardContent>
      </Card>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline"
      >
        Zum Überblick
      </Link>
    </div>
  );
}

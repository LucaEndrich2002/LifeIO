import type { Metadata } from "next";
import { Target } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Goals" };

export default function GoalsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Aus Wünschen werden Ziele.
      </h1>
      <p className="max-w-xl text-muted-foreground">
        Plane deine Sparziele und halte echte Einzahlungen fest.
      </p>
      <Card className="max-w-3xl">
        <CardContent className="space-y-5">
          <Target className="size-8 text-primary" aria-hidden="true" />
          <h2 className="text-xl font-semibold">
            Dein persönlicher Sparfortschritt
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Melde dich an und schließe die Einrichtung ab. Danach kannst du
            Sparziele verwalten, Sparraten planen und Einzahlungen erfassen.
          </p>
          <Link
            href="/account/goals"
            prefetch={false}
            className="inline-flex min-h-12 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            Private Sparziele öffnen
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

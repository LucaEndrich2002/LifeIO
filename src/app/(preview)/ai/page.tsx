import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "AI" };

export default function AIPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <Sparkles aria-hidden="true" className="size-8 text-primary" />
      <h1 className="text-3xl font-semibold sm:text-4xl">
        Dein Alltag im Zusammenhang.
      </h1>
      <p className="text-muted-foreground">
        Prüfe deine eigenen Monatssummen und lasse sie auf Wunsch erklären. Du
        entscheidest vor jeder Anfrage, ob du die angezeigten Daten an OpenAI
        senden möchtest.
      </p>
      <p className="text-sm text-muted-foreground">
        Die private Monatsansicht setzt ein eingerichtetes Konto voraus.
        KI-Erklärungen benötigen zusätzlich eine eingerichtete KI-Verbindung.
        Weitere Datenbereiche folgen später.
      </p>
      <Link
        href="/account/ai"
        className="inline-flex min-h-12 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
      >
        Privaten KI-Monatsüberblick öffnen
      </Link>
      <div>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-sm underline"
        >
          Zum Überblick
        </Link>
      </div>
    </div>
  );
}

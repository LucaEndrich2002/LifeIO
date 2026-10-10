import { Suspense } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { homeInsightHref, type HomeQuery } from "@/domain/home";
import { monthLabel } from "@/domain/money";
import { loadHomeInsight } from "@/server/ai/home-data";
import { aiConfig } from "@/server/ai/provider";
import { MonthForm } from "@/features/ai/month-form";
import { PlanExplanationForm } from "@/features/ai/plan-form";
import { GoalsExplanationForm } from "@/features/ai/goals-form";

type Props = {
  client: SupabaseClient<Database>;
  query: HomeQuery;
  now: Date;
};

export function HomeAiInsight(props: Props) {
  const { query } = props;
  return (
    <section
      id="home-ai"
      aria-labelledby="home-ai-title"
      className="space-y-5 rounded-2xl border bg-card p-6"
    >
      <header className="space-y-2">
        <h2
          id="home-ai-title"
          className="flex items-center gap-2 text-xl font-semibold"
        >
          <Sparkles
            aria-hidden="true"
            className="size-5 shrink-0 text-primary"
          />
          Dein Überblick mit Life AI
        </h2>
        <p className="text-sm text-muted-foreground">
          Wähle einen Bereich, prüfe die Vorschau und entscheide dann, ob du die
          Daten an OpenAI senden möchtest. Deine Erklärung erscheint hier. Beim
          Öffnen oder Wechseln wird noch nichts gesendet.
        </p>
      </header>
      <nav
        aria-label="Bereich für die KI-Einordnung"
        className="grid gap-3 sm:grid-cols-3"
      >
        {(
          [
            ["month", "Meinen Monat einordnen", monthLabel(query.month)],
            [
              "plan",
              "Meine Woche einordnen",
              "Aktuelle Woche · Aufgaben und Termine",
            ],
            [
              "goals",
              "Meine Ziele einordnen",
              `Angezeigte Zielseite ${query.goal_page + 1}`,
            ],
          ] as const
        ).map(([insight, label, detail]) => (
          <a
            key={insight}
            href={homeInsightHref({ ...query, insight })}
            aria-current={query.insight === insight ? "true" : undefined}
            className="min-w-0 space-y-1 rounded-xl border p-4 text-sm aria-[current=true]:border-primary aria-[current=true]:bg-accent"
          >
            <span className="block font-medium underline">{label}</span>
            <span className="block text-muted-foreground">{detail}</span>
          </a>
        ))}
      </nav>
      {query.insight && (
        <a
          href={homeInsightHref({ ...query, insight: undefined })}
          className="inline-flex min-h-11 items-center text-sm underline"
        >
          KI-Bereich schließen
        </a>
      )}
      <Suspense
        key={homeInsightHref(query)}
        fallback={<p role="status">Deine Datenvorschau wird geladen …</p>}
      >
        <HomeAiPreview {...props} />
      </Suspense>
    </section>
  );
}

export async function HomeAiPreview({ client, query, now }: Props) {
  const result = await loadHomeInsight(client, query, now);
  const reloadHref = homeInsightHref(query);
  if (result.status === "idle")
    return (
      <p className="text-sm text-muted-foreground">
        Noch kein Bereich ausgewählt. Die Hinweise oben beruhen auf festen
        Regeln und benötigen keine KI-Anfrage.
      </p>
    );
  if (result.status === "unavailable")
    return (
      <div role="alert" className="space-y-2 rounded-xl border p-4 text-sm">
        <p>
          Die KI-Datenvorschau ist gerade nicht verfügbar. Deinen Überblick und
          die Originaldaten kannst du weiter nutzen.
        </p>
        <a
          href={reloadHref}
          className="inline-flex min-h-11 items-center underline"
        >
          Datenvorschau erneut laden
        </a>
      </div>
    );
  if (result.status === "page_limit")
    return (
      <div className="space-y-2 text-sm">
        <p>
          Diese Zielseite liegt außerhalb der KI-Vorschau. Deine Ziele bleiben
          oben im Dashboard erreichbar.
        </p>
        <a
          href={homeInsightHref({ ...query, goal_page: 0 })}
          className="inline-flex min-h-11 items-center underline"
        >
          Erste Zielseite für die KI öffnen
        </a>
      </div>
    );
  const shared = { configured: !!aiConfig(), reloadHref };
  if (result.kind === "month")
    return (
      <MonthForm
        key={result.snapshot.fingerprint}
        {...result.snapshot}
        {...shared}
      />
    );
  if (result.kind === "plan")
    return (
      <PlanExplanationForm
        key={result.snapshot.fingerprint}
        {...result.snapshot}
        {...shared}
      />
    );
  if (!result.snapshot.facts.goals.length)
    return (
      <div className="space-y-2 text-sm">
        <p>
          {result.snapshot.facts.total
            ? "Auf dieser Zielseite gibt es keine Ziele für eine Erklärung."
            : "Noch keine Ziele für eine Erklärung erfasst."}
        </p>
        {result.snapshot.facts.total ? (
          <a
            href={homeInsightHref({ ...query, goal_page: 0 })}
            className="inline-flex min-h-11 items-center underline"
          >
            Erste Zielseite für die KI öffnen
          </a>
        ) : (
          <Link
            href="/account/goals"
            className="inline-flex min-h-11 items-center underline"
          >
            Ziele für die KI-Übersicht anlegen
          </Link>
        )}
      </div>
    );
  return (
    <GoalsExplanationForm
      key={result.snapshot.fingerprint}
      {...result.snapshot}
      {...shared}
    />
  );
}

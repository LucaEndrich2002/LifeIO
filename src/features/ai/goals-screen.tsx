import Link from "next/link";
import { notFound } from "next/navigation";
import { aiGoalsHref, aiGoalsPageSchema } from "@/domain/ai-goals";
import { requireMoneyAccount } from "@/server/money";
import { loadAiGoals } from "@/server/ai/goals-data";
import { aiConfig } from "@/server/ai/provider";
import { GoalsExplanationForm } from "@/features/ai/goals-form";

export async function AiGoalsScreen({ page = "0" }: { page?: string }) {
  const { supabase } = await requireMoneyAccount();
  if (typeof page !== "string" || !/^\d{1,4}$/.test(page)) notFound();
  const parsed = aiGoalsPageSchema.safeParse(Number(page));
  if (!parsed.success) notFound();
  const selected = parsed.data;
  const snapshot = await loadAiGoals(supabase, selected).catch(() => null);
  if (!snapshot)
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Zielübersicht nicht verfügbar</h1>
        <p>Deine Ziele konnten gerade nicht vollständig geladen werden.</p>
        <a
          href={aiGoalsHref(selected)}
          className="inline-flex min-h-11 items-center underline"
        >
          Erneut laden
        </a>
        <Link
          href="/account/goals"
          className="ml-4 inline-flex min-h-11 items-center underline"
        >
          Zu deinen Zielen
        </Link>
      </div>
    );
  const { facts } = snapshot;
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Deine Ziele mit Life AI
        </h1>
        <p className="text-sm text-muted-foreground">
          Welche Ziele brauchen Aufmerksamkeit? Prüfe Fortschritt und
          Termin-Hinweise, bevor du eine Einordnung freigibst.
        </p>
        <Link
          href="/account/ai"
          className="inline-flex min-h-11 items-center text-sm underline"
        >
          Zur Monatserklärung
        </Link>
      </header>
      {(selected > 0 || facts.total > 6) && (
        <nav
          aria-label="KI-Zielseiten"
          className="flex flex-wrap items-center gap-4 text-sm"
        >
          {selected > 0 && (
            <a
              href={aiGoalsHref(selected - 1)}
              className="inline-flex min-h-11 items-center underline"
            >
              Vorherige Zielseite
            </a>
          )}
          <span>
            Seite {selected + 1} · {facts.total} Ziele
          </span>
          {(selected + 1) * 6 < facts.total &&
            (selected < 1000 ? (
              <a
                href={aiGoalsHref(selected + 1)}
                className="inline-flex min-h-11 items-center underline"
              >
                Nächste Zielseite
              </a>
            ) : (
              <Link
                href="/account/home?goal_page=1001#home-goals"
                className="inline-flex min-h-11 items-center underline"
              >
                Weitere Ziele im Dashboard
              </Link>
            ))}
        </nav>
      )}
      {facts.goals.length ? (
        <GoalsExplanationForm
          key={snapshot.fingerprint}
          facts={facts}
          names={snapshot.names}
          fingerprint={snapshot.fingerprint}
          configured={!!aiConfig()}
        />
      ) : (
        <section className="space-y-3 rounded-xl border p-5">
          <h2 className="font-semibold">
            {facts.total
              ? "Keine Ziele auf dieser Seite"
              : "Noch keine Ziele erfasst"}
          </h2>
          <p className="text-sm">
            {facts.total
              ? "Lade die erste Zielseite, um vorhandene Ziele zu prüfen."
              : "Lege ein Sparziel oder persönliches Ziel an. Danach kannst du seinen Fortschritt hier einordnen lassen."}
          </p>
          <Link
            href={facts.total ? aiGoalsHref(0) : "/account/goals"}
            className="inline-flex min-h-11 items-center text-sm underline"
          >
            {facts.total ? "Zur ersten Zielseite" : "Ziele verwalten"}
          </Link>
        </section>
      )}
    </div>
  );
}

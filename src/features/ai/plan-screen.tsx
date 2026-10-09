import Link from "next/link";
import { requireMoneyAccount } from "@/server/money";
import { loadAiPlan } from "@/server/ai/plan-data";
import { aiConfig } from "@/server/ai/provider";
import { PlanExplanationForm } from "@/features/ai/plan-form";

export async function AiPlanScreen() {
  const { supabase } = await requireMoneyAccount();
  const snapshot = await loadAiPlan(supabase).catch(() => null);
  if (!snapshot)
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Wochenübersicht nicht verfügbar</h1>
        <p>
          Deine Aufgaben und Termine konnten gerade nicht vollständig geladen
          werden.
        </p>
        <a
          href="/account/ai/plan"
          className="inline-flex min-h-11 items-center underline"
        >
          Erneut laden
        </a>
        <Link
          href="/account/plan"
          className="ml-4 inline-flex min-h-11 items-center underline"
        >
          Zu deinen Aufgaben
        </Link>
      </div>
    );
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Deine Woche mit Life AI
        </h1>
        <p className="text-sm text-muted-foreground">
          Was sollte ich diese Woche erledigen? Prüfe deine Aufgaben und
          anstehenden Termine und entscheide dann über eine Einordnung.
        </p>
        <Link
          href="/account/ai"
          className="inline-flex min-h-11 items-center text-sm underline"
        >
          Zur Monatserklärung
        </Link>
      </header>
      <PlanExplanationForm
        key={snapshot.fingerprint}
        facts={snapshot.facts}
        fingerprint={snapshot.fingerprint}
        configured={!!aiConfig()}
      />
    </div>
  );
}

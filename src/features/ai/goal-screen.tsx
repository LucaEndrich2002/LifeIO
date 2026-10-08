import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireMoneyAccount } from "@/server/money";
import { loadAiGoal } from "@/server/ai/goal-data";
import { aiConfig } from "@/server/ai/provider";
import { GoalExplanationForm } from "@/features/ai/goal-form";

export async function AiGoalScreen({ id }: { id: string }) {
  const { supabase } = await requireMoneyAccount();
  if (!z.uuid().safeParse(id).success) notFound();
  // RLS makes foreign and missing goal IDs indistinguishable. No raw error escapes.
  const snapshot = await loadAiGoal(supabase, id).catch(() => null);
  if (!snapshot)
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Sparprognose nicht verfügbar</h1>
        <p>
          Dieses Sparziel kann gerade nicht geladen werden. Öffne deine Ziele
          und wähle ein verfügbares Sparziel aus.
        </p>
        <Link
          href="/account/goals"
          className="inline-flex min-h-11 items-center underline"
        >
          Zu deinen Zielen
        </Link>
        <a
          href={`/account/ai/goals/${id}`}
          className="ml-4 inline-flex min-h-11 items-center underline"
        >
          Erneut laden
        </a>
      </div>
    );
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Dein Sparziel mit Life AI
        </h1>
        <p className="text-lg [overflow-wrap:anywhere]">{snapshot.name}</p>
        <p className="text-sm text-muted-foreground">
          Wann erreichst du dein Sparziel? Prüfe zuerst die berechnete Prognose
          und entscheide dann über eine Erklärung.
        </p>
        <Link
          href="/account/ai"
          className="inline-flex min-h-11 items-center text-sm underline"
        >
          Zur Monatserklärung
        </Link>
      </header>
      <GoalExplanationForm
        key={snapshot.fingerprint}
        id={id}
        facts={snapshot.facts}
        fingerprint={snapshot.fingerprint}
        configured={!!aiConfig()}
      />
    </div>
  );
}

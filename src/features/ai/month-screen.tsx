import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";
import { monthInZone, monthSchema } from "@/domain/money";
import { requireMoneyAccount } from "@/server/money";
import { loadAiMonth } from "@/server/ai/month-data";
import { aiConfig } from "@/server/ai/provider";
import { MonthForm } from "@/features/ai/month-form";
import Link from "next/link";

export async function AiMonthScreen({ month }: { month?: string }) {
  const account = await requireMoneyAccount();
  const parsed = monthSchema.safeParse(
    month ?? monthInZone(new Date(), account.profile.time_zone),
  );
  if (!parsed.success) notFound();
  const snapshot = await loadAiMonth(account.supabase, parsed.data);
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Sparkles aria-hidden="true" className="size-7 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">
          Dein Monat mit Life AI
        </h1>
        <p className="text-sm text-muted-foreground">
          Verstehe deinen Finanzmonat – mit deinen Daten und nachvollziehbaren
          Quellen.
        </p>
      </header>
      <section className="space-y-2 rounded-xl border p-4">
        <h2 className="font-semibold">Wann erreiche ich mein Sparziel?</h2>
        <p className="text-sm text-muted-foreground">
          Öffne ein Sparziel und wähle „Sparprognose mit Life AI verstehen“. Die
          berechnete Prognose ist auch ohne KI-Antwort verfügbar.
        </p>
        <Link
          href="/account/goals"
          className="inline-flex min-h-11 items-center text-sm underline"
        >
          Sparziel auswählen
        </Link>
      </section>
      <section className="space-y-2 rounded-xl border p-4">
        <h2 className="font-semibold">Was sollte ich diese Woche erledigen?</h2>
        <p className="text-sm text-muted-foreground">
          Prüfe deine offenen Aufgaben und anstehenden Termine, bevor du sie zur
          Einordnung freigibst.
        </p>
        <Link
          href="/account/ai/plan"
          className="inline-flex min-h-11 items-center text-sm underline"
        >
          Aufgaben und Termine mit Life AI
        </Link>
      </section>
      <form action="/account/ai" className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="ai-month" className="mb-2 block text-sm font-medium">
            Monat auswählen
          </label>
          <input
            id="ai-month"
            name="month"
            type="month"
            defaultValue={parsed.data}
            min="2000-01"
            max="2100-12"
            required
            className="min-h-12 w-full min-w-0 rounded-xl border bg-background px-3"
          />
        </div>
        <button className="min-h-12 rounded-xl border px-4 text-sm font-medium">
          Daten anzeigen
        </button>
      </form>
      <MonthForm
        key={snapshot.fingerprint}
        facts={snapshot.facts}
        fingerprint={snapshot.fingerprint}
        configured={!!aiConfig()}
      />
    </div>
  );
}

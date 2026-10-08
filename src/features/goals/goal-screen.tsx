import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { goalProgress } from "@/domain/goals";
import { milestonePageSchema } from "@/domain/milestones";
import {
  amountInput,
  formatEuro,
  monthInZone,
  monthLabel,
} from "@/domain/money";
import { dateInZone } from "@/domain/transactions";
import { GoalForm, type GoalInitial } from "@/features/goals/goal-form";
import { GoalForecastCard } from "@/features/goals/goal-forecast-card";
import { loadGoal } from "@/server/goals";
import { loadMilestones } from "@/server/milestones";
import { MilestonesSection } from "@/features/goals/milestones-section";
import { requireMoneyAccount } from "@/server/money";
import { goalKindSchema } from "@/domain/personal-goals";
import { PersonalGoalScreen } from "@/features/goals/personal-goal-screen";
import { GoalBudgetsSection } from "@/features/goals/goal-budgets-section";
import { GoalPlanEntry } from "@/features/goals/goal-plan-entry";
import { linkPageSchema } from "@/domain/goal-budget-links";

export type GoalQuery = {
  kind?: string;
  edit?: string;
  deposit?: string;
  cancel?: string;
  page?: string;
  milestone_page?: string;
  budget_page?: string;
};
export async function GoalScreen({
  id,
  query,
}: {
  id: string;
  query: GoalQuery;
}) {
  const account = await requireMoneyAccount();
  const { supabase, user, profile } = account;
  const editing = query.edit === "1";
  const deposit = query.deposit === "1";
  if (
    (id !== "new" && !z.uuid().safeParse(id).success) ||
    (query.cancel && !z.uuid().safeParse(query.cancel).success) ||
    Number(editing) + Number(deposit) + Number(!!query.cancel) > 1 ||
    !/^\d{1,7}$/.test(query.page ?? "0") ||
    Number(query.page ?? 0) > 1000000 ||
    (id === "new" && (editing || deposit || query.cancel))
  )
    notFound();
  const page = Number(query.page ?? 0);
  const milestonePage = milestonePageSchema.safeParse(
    query.milestone_page ?? "0",
  );
  if (!milestonePage.success) notFound();
  const budgetPage = linkPageSchema.safeParse(query.budget_page ?? "0");
  if (!budgetPage.success) notFound();
  let kind = goalKindSchema.safeParse(query.kind ?? "financial");
  if (!kind.success) notFound();
  if (id !== "new") {
    const { data: record, error } = await supabase
      .from("goals")
      .select("kind")
      .eq("user_id", user.id)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Goal unavailable.");
    if (!record) notFound();
    kind = goalKindSchema.safeParse(record.kind);
    if (!kind.success) throw new Error("Unsupported goal kind.");
  }
  if (kind.data === "personal") {
    if (deposit || query.cancel || query.page !== undefined) notFound();
    return (
      <PersonalGoalScreen
        account={account}
        id={id}
        editing={editing}
        page={milestonePage.data}
        budgetPage={budgetPage.data}
      />
    );
  }
  const data = id === "new" ? null : await loadGoal(supabase, id, page);
  const today = dateInZone(new Date(), profile.time_zone);
  const latest = data?.rates[0];
  if (!data || editing || deposit || query.cancel) {
    const goal = data?.goal;
    const initial: GoalInitial = {
      id: goal?.id ?? randomUUID(),
      entry_id: randomUUID(),
      revision: goal?.revision ?? 0,
      operation: !goal
        ? "create"
        : editing
          ? "update"
          : deposit
            ? "contribute"
            : "cancel",
      name: goal?.name ?? "",
      target: goal ? amountInput(goal.target_minor) : "",
      opening: goal ? amountInput(goal.current_minor) : "",
      monthly: latest ? amountInput(latest.amount_minor) : "",
      month:
        latest?.month.slice(0, 7) ?? monthInZone(new Date(), profile.time_zone),
      deadline: goal?.deadline ?? "",
      amount: "",
      date: today,
      note: "",
    };
    if (query.cancel) {
      const { data: entry, error } = await supabase
        .from("goal_contributions")
        .select("id,amount_minor,paid_on,note,cancelled_at")
        .eq("user_id", user.id)
        .eq("goal_id", id)
        .eq("id", query.cancel)
        .maybeSingle();
      if (error) throw new Error("Contribution unavailable.");
      if (!entry || entry.cancelled_at) notFound();
      initial.entry_id = entry.id;
      initial.date = entry.paid_on;
      initial.note = entry.note;
      initial.cancelledAmount = entry.amount_minor;
    }
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">
          {!goal
            ? "Sparziel anlegen"
            : editing
              ? "Sparziel bearbeiten"
              : deposit
                ? "Einzahlung erfassen"
                : "Einzahlung stornieren"}
        </h1>
        {goal && (
          <p className="break-words text-sm text-muted-foreground">
            {goal.name}
          </p>
        )}
        <GoalForm
          key={`${id}-${initial.operation}-${initial.entry_id}`}
          initial={initial}
        />
      </div>
    );
  }
  const { goal, balance, rates, entries, count } = data;
  const milestones = await loadMilestones(supabase, id, milestonePage.data);
  const progress = goalProgress(goal.target_minor, balance);
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-xs font-medium tracking-widest text-primary uppercase">
          Sparziel · EUR
        </p>
        <h1 className="break-words text-3xl font-semibold">{goal.name}</h1>
      </div>
      <Card>
        <CardContent className="space-y-4">
          <h2 className="font-semibold">Dein tatsächlicher Sparstand</h2>
          <p
            data-testid="goal-balance"
            className="break-words text-2xl font-semibold tabular-nums"
          >
            {formatEuro(balance)}
          </p>
          <p className="text-sm">
            von {formatEuro(goal.target_minor)} Zielbetrag
          </p>
          <Progress
            label={`Fortschritt für ${goal.name}`}
            value={progress.progress}
          />
          <p data-testid="goal-progress" className="text-sm">
            {BigInt(progress.percent).toLocaleString("de-DE")} % erreicht
          </p>
          {progress.reached && (
            <p className="font-medium text-primary">Ziel erreicht</p>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Startguthaben {formatEuro(goal.current_minor)} plus erfasste, nicht
            stornierte Einzahlungen. Geplante Sparraten verändern diesen Stand
            nicht automatisch. Prozentwerte sind gerundet.
          </p>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/account/goals/${id}?deposit=1`}
          className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Einzahlung erfassen
        </Link>
        <Link
          href={`/account/goals/${id}?edit=1`}
          className="inline-flex min-h-11 items-center px-2 text-sm underline"
        >
          Sparziel bearbeiten
        </Link>
      </div>
      <GoalForecastCard
        data={data}
        today={today}
        timeZone={profile.time_zone}
      />
      <Link
        href={`/account/ai/goals/${id}`}
        className="inline-flex min-h-11 items-center text-sm underline"
      >
        Sparprognose mit Life AI verstehen
      </Link>
      <MilestonesSection
        goalId={id}
        data={milestones}
        page={milestonePage.data}
      />
      <section className="space-y-3 rounded-xl border p-5">
        <h2 className="font-semibold">Geplante Sparraten</h2>
        <p className="text-sm">
          Zuletzt geplant: {formatEuro(latest!.amount_minor)} monatlich ab{" "}
          {monthLabel(latest!.month)}.
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Jede Rate gilt bis zum Monat vor der nächsten Änderung. Die
          Finanzübersicht verwendet die Rate des ausgewählten Monats.
          Tatsächliche Einzahlungen werden nicht zusätzlich als variable Ausgabe
          abgezogen.
        </p>
        <details>
          <summary className="min-h-11 cursor-pointer py-3 text-sm underline">
            Verlauf der Sparraten
          </summary>
          <ul className="space-y-3 text-sm">
            {rates.map((rate) => (
              <li key={rate.month}>
                Ab {monthLabel(rate.month)}: {formatEuro(rate.amount_minor)}{" "}
                monatlich
              </li>
            ))}
          </ul>
        </details>
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Deine Einzahlungen</h2>
        {entries.length ? (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="space-y-2 rounded-xl border p-4 text-sm"
              >
                <p className="font-medium tabular-nums">
                  {formatEuro(entry.amount_minor)} · {entry.paid_on}
                </p>
                {entry.note && <p className="break-words">{entry.note}</p>}
                {entry.cancelled_at ? (
                  <p className="text-muted-foreground">
                    Storniert · zählt nicht zum Sparstand
                  </p>
                ) : (
                  <Link
                    href={`/account/goals/${id}?cancel=${entry.id}`}
                    aria-label={`Einzahlung vom ${entry.paid_on} über ${formatEuro(entry.amount_minor)} stornieren`}
                    className="inline-flex min-h-11 items-center underline"
                  >
                    Stornieren
                  </Link>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border p-5 text-sm text-muted-foreground">
            {count
              ? "Auf dieser Seite gibt es keine Einzahlungen."
              : "Du hast noch keine Einzahlungen erfasst. Dein Startguthaben ist bereits berücksichtigt."}
          </p>
        )}
        {(count > 25 || page > 0) && (
          <nav
            aria-label="Einzahlungen Seiten"
            className="flex flex-wrap gap-5 text-sm"
          >
            {page > 0 && (
              <Link
                className="inline-flex min-h-11 items-center underline"
                href={`/account/goals/${id}?page=${page - 1}`}
              >
                Vorherige Seite
              </Link>
            )}
            <span className="py-3">
              Seite {page + 1} · {count} Einträge
            </span>
            {(page + 1) * 25 < count && (
              <Link
                className="inline-flex min-h-11 items-center underline"
                href={`/account/goals/${id}?page=${page + 1}`}
              >
                Nächste Seite
              </Link>
            )}
          </nav>
        )}
      </section>
      <GoalBudgetsSection
        account={account}
        goalId={id}
        page={budgetPage.data}
      />
      <GoalPlanEntry goalId={id} />
      <div className="flex flex-wrap gap-5 text-sm">
        <Link
          href="/account/goals"
          className="inline-flex min-h-11 items-center underline"
        >
          Alle Sparziele
        </Link>
        <Link
          href="/account/money"
          className="inline-flex min-h-11 items-center underline"
        >
          Zur Finanzübersicht
        </Link>
      </div>
    </div>
  );
}

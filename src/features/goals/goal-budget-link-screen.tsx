import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { linkedBudgetSchema, linkPageSchema } from "@/domain/goal-budget-links";
import {
  monthInZone,
  monthLabel,
  monthSchema,
  formatEuro,
} from "@/domain/money";
import { GoalBudgetLinkForm } from "@/features/goals/goal-budget-link-form";
import { loadLinkGoal, loadLinkBudget } from "@/server/goal-budget-links";
import { requireMoneyAccount } from "@/server/money";
export async function GoalBudgetLinkScreen({
  goalId,
  id,
  month,
  page,
}: {
  goalId: string;
  id: string;
  month?: string;
  page?: string;
}) {
  const account = await requireMoneyAccount();
  const selected = monthSchema.safeParse(
    month ?? monthInZone(new Date(), account.profile.time_zone),
  );
  const selectedPage = linkPageSchema.safeParse(page ?? "0");
  if (
    !z.uuid().safeParse(goalId).success ||
    (id !== "new" && !z.uuid().safeParse(id).success) ||
    !selected.success ||
    !selectedPage.success
  )
    notFound();
  const goal = await loadLinkGoal(account, goalId);
  let budget: z.output<typeof linkedBudgetSchema> | null;
  let existing = false;
  if (id === "new") {
    const result = await account.supabase
      .from("budgets")
      .select("id,name,month,amount_minor,currency")
      .eq("user_id", account.user.id)
      .eq("month", `${selected.data}-01`)
      .maybeSingle();
    if (result.error) throw new Error("Budget unavailable.");
    budget = result.data ? linkedBudgetSchema.parse(result.data) : null;
    if (budget) {
      const links = await account.supabase
        .from("entity_links")
        .select("id")
        .eq("user_id", account.user.id)
        .eq("goal_id", goalId)
        .eq("budget_id", budget.id)
        .maybeSingle();
      if (links.error) throw new Error("Link unavailable.");
      existing = !!links.data;
    }
  } else {
    const result = await account.supabase
      .from("entity_links")
      .select("budget_id")
      .eq("user_id", account.user.id)
      .eq("goal_id", goalId)
      .eq("id", id)
      .maybeSingle();
    if (result.error) throw new Error("Link unavailable.");
    if (!result.data) notFound();
    budget = await loadLinkBudget(account, result.data.budget_id);
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">
        {id === "new"
          ? "Monatsbudget verknüpfen"
          : "Budget-Verknüpfung entfernen"}
      </h1>
      <p className="break-words text-sm">Ziel: {goal.name}</p>
      <p className="text-sm text-muted-foreground">
        Die Verknüpfung ordnet das Monatsbudget deiner Planung zu. Sie verändert
        keine Beträge und reserviert kein Geld.
      </p>
      {id === "new" && (
        <form method="get" className="space-y-3">
          <label htmlFor="budget-month" className="block text-sm font-medium">
            Budgetmonat
          </label>
          <input
            id="budget-month"
            name="month"
            type="month"
            min="2000-01"
            max="2100-12"
            defaultValue={selected.data}
            required
            className="min-h-12 w-full min-w-0 rounded-xl border bg-background px-3 text-base"
          />
          <button className="min-h-11 rounded-xl border px-4 text-sm">
            Budget suchen
          </button>
        </form>
      )}
      {budget ? (
        <>
          <div className="space-y-2 rounded-xl border p-4">
            <h2 className="break-words font-semibold">{budget.name}</h2>
            <p className="text-sm">
              {monthLabel(budget.month)} · Monatslimit{" "}
              {formatEuro(budget.amount_minor)}
            </p>
          </div>
          {existing ? (
            <>
              <p role="status" className="text-sm">
                Dieses Monatsbudget ist bereits mit dem Ziel verknüpft.
              </p>
              <a
                href={`/account/goals/${goalId}#budgets`}
                className="inline-flex min-h-11 items-center text-sm underline"
              >
                Zum Ziel
              </a>
            </>
          ) : (
            <GoalBudgetLinkForm
              key={`${id}-${budget.id}`}
              initial={{
                id: id === "new" ? randomUUID() : id,
                goal_id: goalId,
                budget_id: budget.id,
                operation: id === "new" ? "create" : "remove",
                return_page: selectedPage.data,
              }}
            />
          )}
        </>
      ) : (
        <div className="space-y-3 rounded-xl border p-4 text-sm">
          <p>
            Für {monthLabel(`${selected.data}-01`)} hast du noch kein
            Monatsbudget angelegt. Wähle einen anderen Monat oder lege zuerst
            ein Budget an.
          </p>
          <Link
            href={`/account/money/budget/new?month=${selected.data}`}
            className="inline-flex min-h-11 items-center underline"
          >
            Monatsbudget anlegen
          </Link>
          <a
            href={`/account/goals/${goalId}#budgets`}
            className="flex min-h-11 items-center underline"
          >
            Zurück zum Ziel
          </a>
        </div>
      )}
    </div>
  );
}

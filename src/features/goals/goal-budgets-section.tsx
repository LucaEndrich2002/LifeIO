import Link from "next/link";
import { formatEuro, monthLabel } from "@/domain/money";
import { LinkPages } from "@/features/goals/link-pages";
import { loadGoalBudgetLinks } from "@/server/goal-budget-links";
import type { requireMoneyAccount } from "@/server/money";
export async function GoalBudgetsSection({
  account,
  goalId,
  page,
}: {
  account: Awaited<ReturnType<typeof requireMoneyAccount>>;
  goalId: string;
  page: number;
}) {
  const data = await loadGoalBudgetLinks(account, goalId, page);
  const base = `/account/goals/${goalId}`;
  return (
    <section
      id="budgets"
      aria-labelledby="goal-budgets-heading"
      className="space-y-4 rounded-xl border p-5"
    >
      <h2 id="goal-budgets-heading" className="text-lg font-semibold">
        Verknüpfte Monatsbudgets
      </h2>
      <p className="text-sm text-muted-foreground">
        Diese Zuordnung dient deiner Planung. Das Monatsbudget umfasst weiterhin
        alle variablen Ausgaben; es reserviert kein Geld für dieses Ziel.
      </p>
      <Link
        href={`${base}/budgets/new`}
        className="inline-flex min-h-11 items-center text-sm underline"
      >
        Monatsbudget verknüpfen
      </Link>
      {data.items.length ? (
        <ul className="space-y-4">
          {data.items.map(({ id, budget }) => (
            <li key={id} className="space-y-2 rounded-xl border p-4">
              <h3 className="break-words font-medium">{budget.name}</h3>
              <p className="text-sm">
                {monthLabel(budget.month)} · Monatslimit{" "}
                {formatEuro(budget.amount_minor)}
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <a
                  href={`/account/money?month=${budget.month.slice(0, 7)}#budget`}
                  aria-label={`${budget.name} für ${monthLabel(budget.month)} öffnen`}
                  className="inline-flex min-h-11 items-center underline"
                >
                  Monatsbudget öffnen
                </a>
                <Link
                  href={`${base}/budgets/${id}?page=${page}`}
                  aria-label={`Verknüpfung mit ${budget.name} für ${monthLabel(budget.month)} entfernen`}
                  className="inline-flex min-h-11 items-center underline"
                >
                  Verknüpfung entfernen
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm">
          {data.count
            ? "Auf dieser Seite gibt es keine Verknüpfungen."
            : "Du hast noch kein Monatsbudget mit diesem Ziel verknüpft."}
        </p>
      )}
      <LinkPages
        page={page}
        count={data.count}
        label="Verknüpfte Budgets Seiten"
        href={(value) => `${base}?budget_page=${value}#budgets`}
      />
    </section>
  );
}

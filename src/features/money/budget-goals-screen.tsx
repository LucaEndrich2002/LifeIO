import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { linkPageSchema } from "@/domain/goal-budget-links";
import { formatEuro, monthLabel } from "@/domain/money";
import { LinkPages } from "@/features/goals/link-pages";
import {
  loadLinkBudget,
  loadBudgetGoalLinks,
} from "@/server/goal-budget-links";
import { requireMoneyAccount } from "@/server/money";
export async function BudgetGoalsScreen({
  id,
  page,
}: {
  id: string;
  page?: string;
}) {
  const account = await requireMoneyAccount();
  const selected = linkPageSchema.safeParse(page ?? "0");
  if (!z.uuid().safeParse(id).success || !selected.success) notFound();
  const budget = await loadLinkBudget(account, id);
  const data = await loadBudgetGoalLinks(account, id, selected.data);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">
        Mit diesem Budget verknüpfte Ziele
      </h1>
      <p className="break-words font-medium">{budget.name}</p>
      <p className="text-sm">
        {monthLabel(budget.month)} · Monatslimit{" "}
        {formatEuro(budget.amount_minor)}
      </p>
      <p className="text-sm text-muted-foreground">
        Die Zuordnung reserviert kein Geld. Das Monatsbudget umfasst weiterhin
        alle variablen Ausgaben.
      </p>
      {data.items.length ? (
        <ul className="space-y-4">
          {data.items.map(({ id: linkId, goal }) => (
            <li key={linkId} className="space-y-2 rounded-xl border p-4">
              <h2 className="break-words font-medium">{goal.name}</h2>
              <p className="text-sm text-muted-foreground">
                {goal.kind === "personal" ? "Persönliches Ziel" : "Sparziel"}
              </p>
              <a
                href={`/account/goals/${goal.id}#budgets`}
                aria-label={`${goal.name} öffnen`}
                className="inline-flex min-h-11 items-center text-sm underline"
              >
                Ziel öffnen
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border p-5 text-sm">
          {data.count
            ? "Auf dieser Seite gibt es keine verknüpften Ziele."
            : "Mit diesem Monatsbudget sind noch keine Ziele verknüpft. Öffne ein Ziel, um ein Budget zuzuordnen."}
        </p>
      )}
      <LinkPages
        page={selected.data}
        count={data.count}
        label="Verknüpfte Ziele Seiten"
        href={(value) => `/account/money/budget/${id}/goals?page=${value}`}
      />
      <div className="flex flex-wrap gap-5 text-sm">
        <a
          href={`/account/money?month=${budget.month.slice(0, 7)}#budget`}
          className="inline-flex min-h-11 items-center underline"
        >
          Zurück zum Monatsbudget
        </a>
        <Link
          href="/account/goals"
          className="inline-flex min-h-11 items-center underline"
        >
          Ziele verwalten
        </Link>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { linkPageSchema } from "@/domain/goal-budget-links";
import { planTargetHref, type PlanKind } from "@/domain/goal-plan-links";
import { requireMoneyAccount } from "@/server/money";
import { loadPlanTarget, loadPlanGoals } from "@/server/goal-plan-links";
import { PlanTargetSummary } from "@/features/plan/plan-target-summary";
import { LinkPages } from "@/features/goals/link-pages";
export async function PlanGoalsScreen({
  kind,
  id,
  page: pageInput,
}: {
  kind: PlanKind;
  id: string;
  page?: string;
}) {
  const account = await requireMoneyAccount(),
    page = linkPageSchema.safeParse(pageInput ?? "0");
  if (!z.uuid().safeParse(id).success || !page.success) notFound();
  const target = await loadPlanTarget(account, kind, id),
    data = await loadPlanGoals(account, kind, id, page.data);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Verknüpfte Ziele</h1>
      <div className="rounded-xl border p-4">
        <PlanTargetSummary target={target} zone={account.profile.time_zone} />
      </div>
      <p role="status" className="text-sm">
        {data.count} {data.count === 1 ? "Ziel" : "Ziele"} verknüpft
      </p>
      {data.items.length ? (
        <ul className="space-y-4">
          {data.items.map(({ id: linkId, goal }) => (
            <li key={linkId} className="space-y-2 rounded-xl border p-4">
              <h2 className="break-words font-semibold">{goal.name}</h2>
              <p className="text-sm">
                {goal.kind === "financial" ? "Sparziel" : "Persönliches Ziel"}
              </p>
              <div className="flex flex-wrap gap-5 text-sm">
                <Link
                  href={`/account/goals/${goal.id}`}
                  aria-label={`${goal.name} öffnen`}
                  className="inline-flex min-h-11 items-center underline"
                >
                  Ziel öffnen
                </Link>
                <Link
                  href={`/account/goals/${goal.id}/plan/${kind}/${linkId}?from=target&page=${page.data}`}
                  aria-label={`Verknüpfung mit ${goal.name} entfernen`}
                  className="inline-flex min-h-11 items-center underline"
                >
                  Verknüpfung entfernen
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border p-4 text-sm">
          {data.count
            ? "Auf dieser Seite gibt es keine Verknüpfungen. Gehe zur vorherigen Seite."
            : "Noch keine Ziele verknüpft. Öffne ein Ziel und wähle dort Aufgaben oder Termine aus."}
        </p>
      )}
      <LinkPages
        page={page.data}
        count={data.count}
        label="Zielseiten"
        href={(value) => `${planTargetHref(kind, id)}/goals?page=${value}`}
      />
      <div className="flex flex-wrap gap-5 text-sm">
        <Link
          href={planTargetHref(kind, id)}
          className="inline-flex min-h-11 items-center underline"
        >
          Zurück zum Eintrag
        </Link>
        <Link
          href="/account/goals"
          className="inline-flex min-h-11 items-center underline"
        >
          Ziele öffnen
        </Link>
      </div>
    </div>
  );
}

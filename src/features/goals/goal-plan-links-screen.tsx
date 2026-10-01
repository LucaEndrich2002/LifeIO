import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  goalPlanHref,
  planTargetHref,
  planKindLabel,
  planLinksQuerySchema,
  type PlanLinksSearch,
} from "@/domain/goal-plan-links";
import { requireMoneyAccount } from "@/server/money";
import { loadLinkGoal } from "@/server/goal-budget-links";
import {
  loadGoalPlanLinks,
  loadPlanCandidates,
} from "@/server/goal-plan-links";
import { PlanTargetSummary } from "@/features/plan/plan-target-summary";
import { LinkPages } from "@/features/goals/link-pages";
export async function GoalPlanLinksScreen({
  goalId,
  query,
}: {
  goalId: string;
  query: PlanLinksSearch;
}) {
  const account = await requireMoneyAccount(),
    parsed = planLinksQuerySchema.safeParse(query);
  if (!z.uuid().safeParse(goalId).success || !parsed.success) notFound();
  const goal = await loadLinkGoal(account, goalId),
    { kind, mode, page } = parsed.data;
  const choosing = mode === "choose";
  const data = choosing
    ? await loadPlanCandidates(account, kind, page)
    : await loadGoalPlanLinks(account, goalId, kind, page);
  const plural = kind === "task" ? "Aufgaben" : "Termine";
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">
        {choosing ? `${planKindLabel[kind]} auswählen` : `Verknüpfte ${plural}`}
      </h1>
      <p className="break-words text-sm">Ziel: {goal.name}</p>
      <p className="text-sm text-muted-foreground">
        Die Verknüpfung hilft deiner Planung. Sie verändert weder den
        Ziel-Fortschritt noch Geldbeträge.
      </p>
      <nav
        aria-label="Ziel-Plan-Ansicht"
        className="flex flex-wrap gap-5 text-sm"
      >
        {(["task", "event"] as const).map((value) => (
          <Link
            key={value}
            href={goalPlanHref(goalId, value, 0, mode)}
            aria-current={kind === value ? "page" : undefined}
            className="inline-flex min-h-11 items-center underline aria-[current=page]:font-bold"
          >
            {value === "task" ? "Aufgaben" : "Termine"}
          </Link>
        ))}
      </nav>
      {!choosing && (
        <Link
          href={goalPlanHref(goalId, kind, 0, "choose")}
          className="inline-flex min-h-12 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          {planKindLabel[kind]} verknüpfen
        </Link>
      )}
      <p role="status" className="text-sm">
        {data.count} {data.count === 1 ? planKindLabel[kind] : plural}{" "}
        {choosing ? "zur Auswahl" : "verknüpft"}
      </p>
      {data.items.length ? (
        <ul className="space-y-4">
          {data.items.map(({ link_id, target }) => (
            <li
              key={target.item.id}
              className="space-y-3 rounded-xl border p-4"
            >
              <PlanTargetSummary
                target={target}
                zone={account.profile.time_zone}
              />
              <div className="flex flex-wrap gap-5 text-sm">
                {choosing ? (
                  <Link
                    href={`/account/goals/${goalId}/plan/${kind}/new?target=${target.item.id}&page=${page}`}
                    aria-label={`${target.item.title} auswählen`}
                    className="inline-flex min-h-11 items-center underline"
                  >
                    Auswählen
                  </Link>
                ) : (
                  <>
                    <Link
                      href={planTargetHref(kind, target.item.id)}
                      aria-label={`${target.item.title} öffnen`}
                      className="inline-flex min-h-11 items-center underline"
                    >
                      {planKindLabel[kind]} öffnen
                    </Link>
                    <Link
                      href={`/account/goals/${goalId}/plan/${kind}/${link_id}?page=${page}`}
                      aria-label={`Verknüpfung mit ${target.item.title} entfernen`}
                      className="inline-flex min-h-11 items-center underline"
                    >
                      Verknüpfung entfernen
                    </Link>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-3 rounded-xl border p-4 text-sm">
          <p>
            {data.count
              ? "Auf dieser Seite gibt es keine Einträge. Gehe zur vorherigen Seite."
              : choosing
                ? `Du hast noch keine ${plural}. Lege zuerst einen Eintrag an.`
                : `Mit diesem Ziel sind noch keine ${plural} verknüpft.`}
          </p>
          {choosing && !data.count && (
            <Link
              href={
                kind === "task"
                  ? "/account/plan/new"
                  : "/account/plan/calendar/new"
              }
              className="inline-flex min-h-11 items-center underline"
            >
              {planKindLabel[kind]} anlegen
            </Link>
          )}
        </div>
      )}
      <LinkPages
        page={page}
        count={data.count}
        label={choosing ? "Auswahlseiten" : "Verknüpfungsseiten"}
        unit={choosing ? "Einträge" : undefined}
        href={(value) => goalPlanHref(goalId, kind, value, mode)}
      />
      {choosing && (
        <Link
          href={goalPlanHref(goalId, kind)}
          className="inline-flex min-h-11 items-center text-sm underline"
        >
          Zu den Verknüpfungen
        </Link>
      )}
      <Link
        href={`/account/goals/${goalId}`}
        className="inline-flex min-h-11 items-center text-sm underline"
      >
        Zurück zum Ziel
      </Link>
    </div>
  );
}

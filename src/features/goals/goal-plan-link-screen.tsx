import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { z } from "zod";
import { linkPageSchema } from "@/domain/goal-budget-links";
import {
  goalPlanHref,
  planKindSchema,
  planKindLabel,
} from "@/domain/goal-plan-links";
import { requireMoneyAccount } from "@/server/money";
import { loadLinkGoal } from "@/server/goal-budget-links";
import {
  loadPlanTarget,
  loadPlanLink,
  planLinkExists,
} from "@/server/goal-plan-links";
import { PlanTargetSummary } from "@/features/plan/plan-target-summary";
import { GoalPlanLinkForm } from "@/features/goals/goal-plan-link-form";
export type PlanLinkSearch = { target?: string; page?: string; from?: string };
export async function GoalPlanLinkScreen({
  goalId,
  kind: kindInput,
  id,
  query,
}: {
  goalId: string;
  kind: string;
  id: string;
  query: PlanLinkSearch;
}) {
  const account = await requireMoneyAccount();
  const kind = planKindSchema.safeParse(kindInput),
    page = linkPageSchema.safeParse(query.page ?? "0"),
    from = z.enum(["goal", "target"]).safeParse(query.from ?? "goal");
  if (
    !z.uuid().safeParse(goalId).success ||
    !kind.success ||
    !page.success ||
    !from.success ||
    (id !== "new" && !z.uuid().safeParse(id).success) ||
    (id === "new" &&
      (!z.uuid().safeParse(query.target).success || from.data !== "goal"))
  )
    notFound();
  const goal = await loadLinkGoal(account, goalId);
  const targetId =
    id === "new"
      ? query.target!
      : await loadPlanLink(account, goalId, kind.data, id);
  const target = await loadPlanTarget(account, kind.data, targetId);
  const existing =
    id === "new" &&
    (await planLinkExists(account, goalId, kind.data, targetId));
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">
        {id === "new"
          ? `${planKindLabel[kind.data]} verknüpfen`
          : "Verknüpfung entfernen"}
      </h1>
      <p className="break-words text-sm">Ziel: {goal.name}</p>
      <div className="rounded-xl border p-4">
        <PlanTargetSummary target={target} zone={account.profile.time_zone} />
      </div>
      <p className="text-sm text-muted-foreground">
        Die Zuordnung verändert keine Inhalte, Fortschritte oder Geldbeträge.
      </p>
      {existing ? (
        <div className="space-y-3 text-sm">
          <p role="status">
            Dieser Eintrag ist bereits mit dem Ziel verknüpft.
          </p>
          <a
            href={goalPlanHref(goalId, kind.data)}
            className="inline-flex min-h-11 items-center underline"
          >
            Zu den Verknüpfungen
          </a>
        </div>
      ) : (
        <GoalPlanLinkForm
          initial={{
            id: id === "new" ? randomUUID() : id,
            goal_id: goalId,
            target_id: targetId,
            kind: kind.data,
            operation: id === "new" ? "create" : "remove",
            from: from.data,
            return_page: page.data,
          }}
        />
      )}
    </div>
  );
}

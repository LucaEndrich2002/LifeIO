import { GoalPlanLinksScreen } from "@/features/goals/goal-plan-links-screen";
import type { PlanLinksSearch } from "@/domain/goal-plan-links";
export default async function GoalPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<PlanLinksSearch>;
}) {
  const { id } = await params;
  return <GoalPlanLinksScreen goalId={id} query={await searchParams} />;
}

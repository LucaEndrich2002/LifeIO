import {
  GoalPlanLinkScreen,
  type PlanLinkSearch,
} from "@/features/goals/goal-plan-link-screen";
export default async function GoalPlanLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; kind: string; linkId: string }>;
  searchParams: Promise<PlanLinkSearch>;
}) {
  const { id, kind, linkId } = await params;
  return (
    <GoalPlanLinkScreen
      goalId={id}
      kind={kind}
      id={linkId}
      query={await searchParams}
    />
  );
}

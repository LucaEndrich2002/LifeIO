import { GoalBudgetLinkScreen } from "@/features/goals/goal-budget-link-screen";
export default async function GoalBudgetLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; linkId: string }>;
  searchParams: Promise<{ month?: string; page?: string }>;
}) {
  const { id, linkId } = await params;
  const { month, page } = await searchParams;
  return (
    <GoalBudgetLinkScreen goalId={id} id={linkId} month={month} page={page} />
  );
}

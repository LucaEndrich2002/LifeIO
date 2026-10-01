import { PlanGoalsScreen } from "@/features/plan/plan-goals-screen";
export default async function TaskGoalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params,
    query = await searchParams;
  return <PlanGoalsScreen kind="task" id={id} page={query.page} />;
}

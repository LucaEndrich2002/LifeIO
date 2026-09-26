import { GoalScreen, type GoalQuery } from "@/features/goals/goal-screen";
export default async function GoalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<GoalQuery>;
}) {
  return <GoalScreen id={(await params).id} query={await searchParams} />;
}

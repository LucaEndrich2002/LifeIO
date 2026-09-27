import { MilestoneScreen } from "@/features/goals/milestone-screen";
export default async function MilestonePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; milestoneId: string }>;
  searchParams: Promise<{ action?: string; page?: string }>;
}) {
  const { id, milestoneId } = await params;
  const { action, page } = await searchParams;
  return (
    <MilestoneScreen goalId={id} id={milestoneId} action={action} page={page} />
  );
}

import { TaskScreen } from "@/features/plan/task-screen";
import type { TaskSearch } from "@/features/plan/tasks-screen";
export default async function TaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<TaskSearch & { action?: string }>;
}) {
  const { id } = await params;
  const { action, ...query } = await searchParams;
  return <TaskScreen id={id} action={action} query={query} />;
}

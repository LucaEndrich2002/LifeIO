import { TasksScreen, type TaskSearch } from "@/features/plan/tasks-screen";
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<TaskSearch>;
}) {
  return <TasksScreen query={await searchParams} />;
}

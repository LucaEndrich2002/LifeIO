import "server-only";
import { notFound } from "next/navigation";
import { taskSchema, taskSnapshotSchema, type TaskQuery } from "@/domain/tasks";
import type { requireMoneyAccount } from "@/server/money";
type Account = Awaited<ReturnType<typeof requireMoneyAccount>>;

export async function loadTasks({ supabase }: Account, query: TaskQuery) {
  const { data, error } = await supabase.rpc("read_tasks", {
    p_day: query.day,
    p_view: query.view,
    p_status: query.status,
    p_page: query.page,
  });
  if (error) throw new Error("Tasks unavailable.");
  return taskSnapshotSchema.parse(data);
}
export async function loadTask({ supabase, user }: Account, id: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("id,title,priority,due_on,revision,completed_at")
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Task unavailable.");
  if (!data) notFound();
  return taskSchema.parse(data);
}

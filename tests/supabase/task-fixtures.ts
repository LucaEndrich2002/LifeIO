import { randomUUID } from "node:crypto";
import type { createPlanFixture } from "./plan-fixtures";
import type { Database } from "../../src/types/database";
import { taskSnapshotSchema } from "../../src/domain/tasks";
export type TaskAccount = Awaited<ReturnType<typeof createPlanFixture>>;
type Mutation = Database["public"]["Functions"]["mutate_task"]["Args"];
export const mutateTask = (
  user: TaskAccount,
  args: Partial<Mutation> & Pick<Mutation, "p_id" | "p_operation">,
) => user.client.rpc("mutate_task", { p_revision: 0, ...args });
export async function createTask(
  user: TaskAccount,
  title = "Nächster Schritt",
  due = "",
  priority = "normal",
) {
  const id = randomUUID();
  const { error } = await mutateTask(user, {
    p_id: id,
    p_operation: "create",
    p_title: title,
    p_due_on: due,
    p_priority: priority,
  });
  if (error) throw new Error("Could not prepare task fixture.");
  return id;
}
export async function readTasks(
  user: TaskAccount,
  args: Partial<Database["public"]["Functions"]["read_tasks"]["Args"]> = {},
) {
  const { data, error } = await user.client.rpc("read_tasks", {
    p_day: "2026-09-28",
    ...args,
  });
  if (error) throw new Error("Could not read task fixture.");
  return taskSnapshotSchema.parse(data);
}

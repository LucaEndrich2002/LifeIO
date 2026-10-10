import { randomUUID } from "node:crypto";
import type { createPlanFixture } from "./plan-fixtures";
type Account = Awaited<ReturnType<typeof createPlanFixture>>;
export async function createAiSavings(
  user: Account,
  name = "Reise",
  deadline = "2026-11-30",
) {
  const id = randomUUID();
  const result = await user.client.rpc("mutate_goal", {
    p_operation: "create",
    p_id: id,
    p_entry_id: randomUUID(),
    p_revision: 0,
    p_payload: {
      name,
      target: 100000,
      opening: 25000,
      monthly: 25000,
      month: "2026-09",
      deadline,
    },
  });
  if (result.error)
    throw new Error("Could not prepare overview savings fixture.");
  return id;
}
export async function createAiPersonal(
  user: Account,
  name: string,
  deadline = "",
) {
  const id = randomUUID();
  const result = await user.client.rpc("mutate_personal_goal", {
    p_id: id,
    p_operation: "create",
    p_revision: 0,
    p_name: name,
    p_deadline: deadline,
  });
  if (result.error)
    throw new Error("Could not prepare overview personal fixture.");
  return id;
}

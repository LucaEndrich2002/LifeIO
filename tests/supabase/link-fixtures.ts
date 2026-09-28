import { randomUUID } from "node:crypto";
import type { createPlanFixture } from "./plan-fixtures";
export type LinkAccount = Awaited<ReturnType<typeof createPlanFixture>>;
export async function createLinkBudget(
  user: LinkAccount,
  month = "2026-09",
  name = "Alltagsbudget",
) {
  const id = randomUUID();
  const { error } = await user.client.rpc("mutate_budget", {
    p_operation: "create",
    p_id: id,
    p_revision: 0,
    p_payload: { name, amount: 50000, month },
  });
  if (error) throw new Error("Could not prepare link budget.");
  return id;
}
export async function createLinkGoal(
  user: LinkAccount,
  name = "Sprache lernen",
) {
  const id = randomUUID();
  const { error } = await user.client.rpc("mutate_personal_goal", {
    p_operation: "create",
    p_id: id,
    p_revision: 0,
    p_name: name,
  });
  if (error) throw new Error("Could not prepare personal link goal.");
  return id;
}
export async function financialLinkGoal(user: LinkAccount) {
  const { data, error } = await user.client
    .from("goals")
    .select("id")
    .eq("onboarding_slot", 0)
    .single();
  if (error || !data) throw new Error("Could not locate financial link goal.");
  return data.id;
}
export const mutateLink = (
  user: LinkAccount,
  goal: string,
  budget: string,
  id = randomUUID(),
  operation = "create",
) =>
  user.client.rpc("mutate_goal_budget_link", {
    p_operation: operation,
    p_id: id,
    p_goal_id: goal,
    p_budget_id: budget,
  });

import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { aiGoalFactsSchema } from "@/domain/ai-goal";
import { readAiTool } from "@/server/ai/read-tools";

export async function loadAiGoal(
  client: SupabaseClient<Database>,
  id: string,
  now = new Date(),
) {
  z.uuid().parse(id);
  const result = await readAiTool(
    client,
    {
      name: "get_goal_projection",
      arguments: { goal_id: id },
    },
    ["get_goal_projection"],
    now,
  );
  if (
    result.status !== "ok" ||
    !("projection" in result.data) ||
    !("as_of" in result.period)
  ) {
    throw new Error("Goal unavailable.");
  }
  const data = result.data,
    projection = data.projection;
  const facts = aiGoalFactsSchema.parse({
    currency: "EUR",
    amount_unit: "minor",
    as_of: result.period.as_of,
    time_zone: result.time_zone,
    target: data.target_minor,
    balance: data.balance_minor,
    remaining: data.remaining_minor,
    deadline: data.deadline,
    projection_status: projection.status,
    projected_date: projection.status === "projected" ? projection.date : null,
    next_contribution_date:
      projection.status === "projected"
        ? projection.nextContributionDate
        : null,
    contributions:
      "contributions" in projection ? projection.contributions : null,
    deadline_status: projection.deadlineStatus,
  });
  return {
    // The name is for the local heading only. The provider receives facts only.
    name: data.name,
    facts,
    fingerprint: createHash("sha256")
      .update(JSON.stringify({ id, facts }))
      .digest("hex"),
    observedAt: result.observed_at,
  };
}

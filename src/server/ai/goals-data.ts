import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  aiGoalLabels,
  aiGoalsFactsSchema,
  aiGoalsPageSchema,
} from "@/domain/ai-goals";
import { readAiTool } from "@/server/ai/read-tools";

export async function loadAiGoals(
  client: SupabaseClient<Database>,
  page: number,
  now = new Date(),
) {
  aiGoalsPageSchema.parse(page);
  const result = await readAiTool(
    client,
    { name: "get_goals", arguments: { page } },
    ["get_goals"],
    now,
  );
  if (
    result.status !== "ok" ||
    !Array.isArray(result.data) ||
    !("as_of" in result.period) ||
    !("coverage" in result)
  )
    throw new Error("Goals unavailable.");
  const entries = result.data.map((goal) => {
    if (!("goal_id" in goal)) throw new Error("Goals unavailable.");
    return goal;
  });
  const facts = aiGoalsFactsSchema.parse({
    as_of: result.period.as_of,
    time_zone: result.time_zone,
    currency: "EUR",
    amount_unit: "minor",
    page,
    total: result.coverage.total,
    goals: entries.map((goal, index) => {
      const common = {
        label: aiGoalLabels[index],
        kind: goal.kind,
        deadline: goal.deadline,
      };
      return goal.kind === "financial"
        ? {
            ...common,
            target: goal.progress.target_minor,
            balance: goal.progress.balance_minor,
            remaining: goal.remaining_minor,
            projection_status: goal.projection.status,
            projected_date:
              goal.projection.status === "projected"
                ? goal.projection.date
                : null,
            deadline_status: goal.projection.deadlineStatus,
          }
        : {
            ...common,
            milestones: goal.progress.milestones,
            completed: goal.progress.completed,
          };
    }),
  });
  const names = entries.map((goal) => ({ id: goal.goal_id, name: goal.name }));
  return {
    facts,
    names,
    // Names and IDs bind consent to the visible goals but never reach the provider.
    fingerprint: createHash("sha256")
      .update(JSON.stringify({ facts, names }))
      .digest("hex"),
    observedAt: result.observed_at,
  };
}

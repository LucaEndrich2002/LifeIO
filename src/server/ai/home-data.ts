import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { homeQuerySchema } from "@/domain/home";
import { loadAiMonth } from "@/server/ai/month-data";
import { loadAiPlan } from "@/server/ai/plan-data";
import { loadAiGoals } from "@/server/ai/goals-data";

export async function loadHomeInsight(
  client: SupabaseClient<Database>,
  input: unknown,
  now = new Date(),
) {
  const query = homeQuerySchema.parse(input);
  // Opening Home never loads an AI preview or invokes a provider by itself.
  if (!query.insight) return { status: "idle" } as const;
  if (query.insight === "goals" && query.goal_page > 1000)
    return { status: "page_limit" } as const;
  try {
    switch (query.insight) {
      case "month":
        return {
          status: "ready",
          kind: "month",
          snapshot: await loadAiMonth(client, query.month),
        } as const;
      case "plan":
        return {
          status: "ready",
          kind: "plan",
          snapshot: await loadAiPlan(client, now),
        } as const;
      case "goals":
        return {
          status: "ready",
          kind: "goals",
          snapshot: await loadAiGoals(client, query.goal_page, now),
        } as const;
    }
  } catch {
    // An unavailable AI preview must not replace the rest of Home with an error.
    return { status: "unavailable" } as const;
  }
}

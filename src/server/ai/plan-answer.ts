import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { aiPlanQuestionSchema, type AiPlanAnswerState } from "@/domain/ai-plan";
import { answerFromSnapshot } from "@/server/ai/answer";
import { loadAiPlan } from "@/server/ai/plan-data";
import { explainPlan, type AiConfig } from "@/server/ai/provider";

export async function answerPlan(
  client: SupabaseClient<Database>,
  request: unknown,
  config: AiConfig | null,
  provider = explainPlan,
): Promise<AiPlanAnswerState> {
  const parsed = aiPlanQuestionSchema.safeParse(request);
  if (!parsed.success)
    return {
      status: "error",
      message:
        "Bitte prüfe deine Frage und bestätige das Senden der angezeigten Aufgaben und Termine.",
    };
  return answerFromSnapshot(
    client,
    parsed.data,
    config,
    () => loadAiPlan(client),
    provider,
  );
}

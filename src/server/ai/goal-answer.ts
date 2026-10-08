import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { aiGoalQuestionSchema, type AiGoalAnswerState } from "@/domain/ai-goal";
import { answerFromSnapshot } from "@/server/ai/answer";
import { loadAiGoal } from "@/server/ai/goal-data";
import { explainGoal, type AiConfig } from "@/server/ai/provider";

export async function answerGoal(
  client: SupabaseClient<Database>,
  request: unknown,
  config: AiConfig | null,
  provider = explainGoal,
): Promise<AiGoalAnswerState> {
  const parsed = aiGoalQuestionSchema.safeParse(request);
  if (!parsed.success)
    return {
      status: "error",
      message:
        "Bitte prüfe Sparziel und Frage und bestätige das Senden der angezeigten Prognosedaten.",
    };
  return answerFromSnapshot(
    client,
    parsed.data,
    config,
    () => loadAiGoal(client, parsed.data.goal_id),
    provider,
  );
}

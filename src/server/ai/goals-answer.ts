import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  aiGoalsQuestionSchema,
  type AiGoalsAnswerState,
} from "@/domain/ai-goals";
import { answerFromSnapshot } from "@/server/ai/answer";
import { loadAiGoals } from "@/server/ai/goals-data";
import { explainGoals, type AiConfig } from "@/server/ai/provider";

export async function answerGoals(
  client: SupabaseClient<Database>,
  request: unknown,
  config: AiConfig | null,
  provider = explainGoals,
): Promise<AiGoalsAnswerState> {
  const parsed = aiGoalsQuestionSchema.safeParse(request);
  if (!parsed.success)
    return {
      status: "error",
      message:
        "Bitte prüfe Zielseite und Frage und bestätige das Senden der angezeigten Zieldaten.",
    };
  return answerFromSnapshot(
    client,
    parsed.data,
    config,
    async () => {
      const snapshot = await loadAiGoals(client, parsed.data.page);
      if (!snapshot.facts.goals.length) throw new Error("No goals to explain.");
      return snapshot;
    },
    provider,
  );
}

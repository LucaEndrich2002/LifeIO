"use server";
import "server-only";
import type { AiAnswerState } from "@/domain/ai-month";
import { requireIdentity } from "@/server/identity";
import { aiConfig } from "@/server/ai/provider";
import { answerMonth } from "@/server/ai/answer";
import type { AiGoalAnswerState } from "@/domain/ai-goal";
import { answerGoal } from "@/server/ai/goal-answer";
import type { AiPlanAnswerState } from "@/domain/ai-plan";
import { answerPlan } from "@/server/ai/plan-answer";

export async function askAiMonth(
  _previous: AiAnswerState,
  form: FormData,
): Promise<AiAnswerState> {
  const { supabase } = await requireIdentity(true);
  return answerMonth(
    supabase,
    Object.fromEntries(
      [...form].filter(([key]) => !key.startsWith("$ACTION_")),
    ),
    aiConfig(),
  );
}

export async function askAiGoal(
  _previous: AiGoalAnswerState,
  form: FormData,
): Promise<AiGoalAnswerState> {
  const { supabase } = await requireIdentity(true);
  return answerGoal(
    supabase,
    Object.fromEntries(
      [...form].filter(([key]) => !key.startsWith("$ACTION_")),
    ),
    aiConfig(),
  );
}

export async function askAiPlan(
  _previous: AiPlanAnswerState,
  form: FormData,
): Promise<AiPlanAnswerState> {
  const { supabase } = await requireIdentity(true);
  return answerPlan(
    supabase,
    Object.fromEntries(
      [...form].filter(([key]) => !key.startsWith("$ACTION_")),
    ),
    aiConfig(),
  );
}

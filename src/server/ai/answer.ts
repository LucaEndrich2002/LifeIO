import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { aiQuestionSchema, type AiAnswerState } from "@/domain/ai-month";
import { loadAiMonth } from "@/server/ai/month-data";
import { explainMonth, type AiConfig } from "@/server/ai/provider";
import type { ExplanationState } from "@/domain/ai-explanation";

export async function answerMonth(
  client: SupabaseClient<Database>,
  request: unknown,
  config: AiConfig | null,
  provider = explainMonth,
): Promise<AiAnswerState> {
  const parsed = aiQuestionSchema.safeParse(request);
  if (!parsed.success)
    return {
      status: "error",
      message:
        "Bitte prüfe Monat und Frage und bestätige das Senden der angezeigten Monatssummen.",
    };
  return answerFromSnapshot(
    client,
    parsed.data,
    config,
    () => loadAiMonth(client, parsed.data.month),
    provider,
  );
}

export async function answerFromSnapshot<Facts, Answer>(
  client: SupabaseClient<Database>,
  request: { fingerprint: string; question: string },
  config: AiConfig | null,
  load: () => Promise<{
    facts: Facts;
    fingerprint: string;
    observedAt: string;
  }>,
  provider: (
    config: AiConfig,
    facts: Facts,
    question: string,
  ) => Promise<Answer>,
): Promise<ExplanationState<Facts, Answer>> {
  try {
    const { data, error } = await client.auth.getUser();
    if (error || !data.user)
      return { status: "error", message: "Bitte melde dich erneut an." };
    const snapshot = await load();
    if (snapshot.fingerprint !== request.fingerprint)
      return {
        status: "error",
        message:
          "Deine Daten haben sich geändert. Lade die Ansicht neu und prüfe die aktuellen Werte vor dem Senden.",
      };
    if (!config)
      return {
        status: "error",
        message:
          "Die KI-Verbindung ist noch nicht eingerichtet. Deine Datenübersicht bleibt verfügbar; es wurde nichts an OpenAI gesendet.",
      };
    const quota = await client.rpc("claim_ai_request");
    if (quota.error) throw new Error("Quota unavailable.");
    if (!quota.data)
      return {
        status: "error",
        message:
          "Bitte warte mindestens 30 Sekunden zwischen Anfragen. Pro Konto sind höchstens 20 Versuche am Tag möglich (UTC).",
      };
    const answer = await provider(config, snapshot.facts, request.question);
    // Do not deliver an answer into a session that was removed during the request.
    const current = await client.auth.getUser();
    if (current.error || current.data.user?.id !== data.user.id)
      return { status: "error", message: "Bitte melde dich erneut an." };
    return {
      status: "success",
      answer,
      facts: snapshot.facts,
      observedAt: snapshot.observedAt,
    };
  } catch {
    return {
      status: "error",
      message:
        "Die Erklärung ist gerade nicht verfügbar. Deine Eingaben bleiben erhalten. Prüfe deine Originalwerte oder versuche es später erneut.",
    };
  }
}

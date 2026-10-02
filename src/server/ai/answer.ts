import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { aiQuestionSchema, type AiAnswerState } from "@/domain/ai-month";
import { loadAiMonth } from "@/server/ai/month-data";
import { explainMonth, type AiConfig } from "@/server/ai/provider";

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
  try {
    const { data, error } = await client.auth.getUser();
    if (error || !data.user)
      return { status: "error", message: "Bitte melde dich erneut an." };
    const snapshot = await loadAiMonth(client, parsed.data.month);
    if (snapshot.fingerprint !== parsed.data.fingerprint)
      return {
        status: "error",
        message:
          "Deine Monatsdaten haben sich geändert. Lade die Ansicht neu und prüfe die aktuellen Summen vor dem Senden.",
      };
    if (!config)
      return {
        status: "error",
        message:
          "Die KI-Verbindung ist noch nicht eingerichtet. Deine Monatsübersicht bleibt verfügbar; es wurde nichts an OpenAI gesendet.",
      };
    const quota = await client.rpc("claim_ai_request");
    if (quota.error) throw new Error("Quota unavailable.");
    if (!quota.data)
      return {
        status: "error",
        message:
          "Bitte warte mindestens 30 Sekunden zwischen Anfragen. Pro Konto sind höchstens 20 Versuche am Tag möglich (UTC).",
      };
    const answer = await provider(config, snapshot.facts, parsed.data.question);
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
        "Die Erklärung ist gerade nicht verfügbar. Deine Eingaben bleiben erhalten. Prüfe deine Monatsübersicht oder versuche es später erneut.",
    };
  }
}

import "server-only";
import type { AiReadToolName } from "@/domain/ai-read-tools";
import { createSupabaseReadClient } from "@/server/supabase";
import { readAiTool } from "@/server/ai/read-tools";

// Server-side entry point. The caller supplies only the tools explicitly
// authorized for the current request; the model never supplies this grant.
export async function executeAiReadTool(
  request: unknown,
  allowedTools: readonly AiReadToolName[],
) {
  try {
    return await readAiTool(
      await createSupabaseReadClient(),
      request,
      allowedTools,
    );
  } catch {
    return { status: "error" as const, code: "unavailable" as const };
  }
}
export type AiReadToolResult = Awaited<ReturnType<typeof executeAiReadTool>>;

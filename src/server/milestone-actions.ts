"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  milestoneMutationSchema,
  milestoneTitleSchema,
} from "@/domain/milestones";
import type { FormState } from "@/features/auth/form-state";
import { requireIdentity } from "@/server/identity";

export async function saveMilestone(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireIdentity(true);
  const mutation = milestoneMutationSchema.safeParse(Object.fromEntries(form));
  if (!mutation.success)
    return {
      status: "error",
      message: "Ungültiger Formularstand. Bitte öffne den Meilenstein erneut.",
    };
  const { goal_id, id, revision, operation, return_page } = mutation.data;
  if (operation === "remove" && form.get("confirm") !== "yes")
    return {
      status: "error",
      message: "Bitte bestätige das Entfernen dieses Meilensteins.",
    };
  let title: string | undefined;
  if (operation === "create" || operation === "rename") {
    const parsed = milestoneTitleSchema.safeParse(form.get("title"));
    if (!parsed.success)
      return {
        status: "error",
        message: "Bitte prüfe den Namen. Es wurde nichts gespeichert.",
        errors: { title: parsed.error.issues[0]!.message },
      };
    title = parsed.data;
  }
  try {
    const { error } = await supabase.rpc("mutate_goal_milestone", {
      p_operation: operation,
      p_goal_id: goal_id,
      p_id: id,
      p_revision: revision,
      p_title: title,
    });
    if (error)
      return {
        status: "error",
        message:
          error.code === "40001"
            ? "Dieser Meilenstein wurde inzwischen geändert. Deine Eingaben bleiben erhalten. Öffne den aktuellen Stand."
            : "Die Änderung konnte nicht gespeichert werden. Bitte öffne den aktuellen Stand und prüfe die Angaben.",
      };
  } catch {
    return {
      status: "error",
      message:
        "Die Verbindung wurde unterbrochen. Deine Eingaben bleiben erhalten. Bitte versuche es erneut.",
    };
  }
  revalidatePath(`/account/goals/${goal_id}`);
  redirect(
    `/account/goals/${goal_id}${return_page ? `?milestone_page=${return_page}` : ""}#milestones`,
  );
}

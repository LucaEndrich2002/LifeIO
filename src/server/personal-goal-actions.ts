"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  personalGoalInputSchema,
  personalGoalMutationSchema,
} from "@/domain/personal-goals";
import type { FormState } from "@/features/auth/form-state";
import { requireIdentity } from "@/server/identity";

export async function savePersonalGoal(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireIdentity(true);
  const raw = Object.fromEntries(form);
  const mutation = personalGoalMutationSchema.safeParse(raw);
  if (!mutation.success)
    return {
      status: "error",
      message: "Ungültiger Formularstand. Bitte öffne das Ziel erneut.",
    };
  const input = personalGoalInputSchema.safeParse(raw);
  if (!input.success)
    return {
      status: "error",
      message:
        "Bitte prüfe die markierten Angaben. Es wurde nichts gespeichert.",
      errors: Object.fromEntries(
        input.error.issues.map((issue) => [
          String(issue.path[0]),
          issue.message,
        ]),
      ),
    };
  try {
    const { error } = await supabase.rpc("mutate_personal_goal", {
      p_operation: mutation.data.operation,
      p_id: mutation.data.id,
      p_revision: mutation.data.revision,
      p_name: input.data.name,
      p_deadline: input.data.deadline,
    });
    if (error)
      return {
        status: "error",
        message:
          error.code === "40001"
            ? "Dieses Ziel wurde inzwischen geändert. Deine Eingaben bleiben erhalten. Öffne den aktuellen Stand."
            : "Das Ziel konnte nicht gespeichert werden. Bitte prüfe deine Angaben und versuche es erneut.",
      };
  } catch {
    return {
      status: "error",
      message:
        "Die Verbindung wurde unterbrochen. Deine Eingaben bleiben erhalten. Bitte versuche es erneut.",
    };
  }
  revalidatePath("/account", "layout");
  redirect(`/account/goals/${mutation.data.id}`);
}

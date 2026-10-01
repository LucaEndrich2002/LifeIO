"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  goalPlanMutationSchema,
  goalPlanReturn,
} from "@/domain/goal-plan-links";
import type { FormState } from "@/features/auth/form-state";
import { requireIdentity } from "@/server/identity";
export async function saveGoalPlanLink(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireIdentity(true);
  const parsed = goalPlanMutationSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      status: "error",
      message: "Ungültiger Formularstand. Bitte öffne die Verknüpfung erneut.",
    };
  const { id, goal_id, target_id, kind, operation } = parsed.data;
  if (operation === "remove" && form.get("confirm") !== "yes")
    return {
      status: "error",
      message: "Bitte bestätige das Entfernen dieser Verknüpfung.",
    };
  try {
    const { error } = await supabase.rpc("mutate_goal_plan_link", {
      p_id: id,
      p_goal_id: goal_id,
      p_kind: kind,
      p_target_id: target_id,
      p_operation: operation,
    });
    if (error)
      return {
        status: "error",
        message:
          error.code === "40001"
            ? "Diese Verknüpfung besteht bereits oder wurde inzwischen entfernt. Bitte öffne den aktuellen Stand."
            : "Die Verknüpfung konnte nicht gespeichert werden. Ziel, Aufgabe oder Termin ist möglicherweise nicht mehr verfügbar.",
      };
  } catch {
    return {
      status: "error",
      message: "Die Verbindung wurde unterbrochen. Bitte versuche es erneut.",
    };
  }
  revalidatePath("/account", "layout");
  redirect(goalPlanReturn(parsed.data));
}

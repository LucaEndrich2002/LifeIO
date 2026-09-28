"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { goalBudgetMutationSchema } from "@/domain/goal-budget-links";
import type { FormState } from "@/features/auth/form-state";
import { requireIdentity } from "@/server/identity";

export async function saveGoalBudgetLink(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireIdentity(true);
  const parsed = goalBudgetMutationSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      status: "error",
      message: "Ungültiger Formularstand. Bitte öffne die Verknüpfung erneut.",
    };
  const { id, goal_id, budget_id, operation, return_page } = parsed.data;
  if (operation === "remove" && form.get("confirm") !== "yes")
    return {
      status: "error",
      message: "Bitte bestätige das Entfernen dieser Verknüpfung.",
    };
  try {
    const { error } = await supabase.rpc("mutate_goal_budget_link", {
      p_operation: operation,
      p_id: id,
      p_goal_id: goal_id,
      p_budget_id: budget_id,
    });
    if (error)
      return {
        status: "error",
        message:
          error.code === "40001"
            ? "Diese Verknüpfung besteht bereits oder wurde inzwischen entfernt. Bitte öffne den aktuellen Stand."
            : "Die Verknüpfung konnte nicht gespeichert werden. Ziel oder Budget ist möglicherweise nicht mehr verfügbar.",
      };
  } catch {
    return {
      status: "error",
      message: "Die Verbindung wurde unterbrochen. Bitte versuche es erneut.",
    };
  }
  revalidatePath("/account", "layout");
  redirect(
    `/account/goals/${goal_id}${operation === "remove" && return_page ? `?budget_page=${return_page}` : ""}#budgets`,
  );
}

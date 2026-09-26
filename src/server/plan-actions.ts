"use server";
import "server-only";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  budgetInputSchema,
  fixedInputSchema,
  planMutationSchema,
} from "@/domain/plans";
import type { FormState } from "@/features/auth/form-state";
import { requireIdentity } from "@/server/identity";
import type { Json } from "@/types/database";

export async function savePlan(
  kind: "fixed" | "budget",
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireIdentity(true);
  const raw = Object.fromEntries(form);
  const mutation = planMutationSchema.safeParse(raw);
  if (!mutation.success || !["fixed", "budget"].includes(kind))
    return {
      status: "error",
      message: "Ungültiger Formularstand. Bitte öffne den Eintrag erneut.",
    };
  const { operation, id, new_id, revision, return_month } = mutation.data;
  if (
    !(
      kind === "fixed"
        ? ["create", "change", "end"]
        : ["create", "update", "delete"]
    ).includes(operation)
  )
    return { status: "error", message: "Diese Änderung ist nicht verfügbar." };
  if (
    (operation === "end" || operation === "delete") &&
    form.get("confirm") !== "yes"
  )
    return {
      status: "error",
      message: "Bitte bestätige die angezeigte Änderung.",
    };
  let payload: Json = {};
  let destination = return_month;
  try {
    if (operation !== "delete") {
      const input =
        operation === "end"
          ? budgetInputSchema.pick({ month: true }).safeParse(raw)
          : (kind === "fixed" ? fixedInputSchema : budgetInputSchema).safeParse(
              raw,
            );
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
      payload = input.data;
      destination = input.data.month;
      if (kind === "fixed" && operation !== "create") {
        const { data, error } = await supabase
          .from("expenses")
          .select("start_month,end_month,superseded_by")
          .eq("user_id", user.id)
          .eq("id", id)
          .eq("recurrence", "monthly")
          .maybeSingle();
        if (error || !data)
          return {
            status: "error",
            message: "Die Fixkosten sind nicht verfügbar.",
          };
        const start = data.start_month!.slice(0, 7);
        if (
          !data.superseded_by &&
          ((operation === "change" &&
            (input.data.month <= start ||
              (data.end_month &&
                input.data.month > data.end_month.slice(0, 7)))) ||
            (operation === "end" && input.data.month < start))
        )
          return {
            status: "error",
            message: "Bitte prüfe den gewählten Monat.",
            errors: {
              month:
                operation === "change"
                  ? "Die Änderung muss nach dem Start und innerhalb der bisherigen Laufzeit beginnen."
                  : "Der letzte Monat darf nicht vor dem Start liegen.",
            },
          };
      }
    }
    const result =
      kind === "fixed"
        ? await supabase.rpc("mutate_fixed_cost", {
            p_operation: operation,
            p_id: id,
            p_new_id: new_id,
            p_revision: revision,
            p_payload: payload,
          })
        : await supabase.rpc("mutate_budget", {
            p_operation: operation,
            p_id: id,
            p_revision: revision,
            p_payload: payload,
          });
    if (result.error)
      return {
        status: "error",
        message:
          result.error.code === "40001"
            ? "Dieser Plan wurde inzwischen geändert oder für diesen Monat bereits angelegt. Deine Eingaben bleiben erhalten. Öffne den aktuellen Stand."
            : "Die Änderung konnte nicht gespeichert werden. Bitte öffne den aktuellen Stand und prüfe die Angaben.",
      };
  } catch {
    return {
      status: "error",
      message:
        "Die Verbindung wurde unterbrochen. Deine Eingaben bleiben erhalten. Bitte versuche es erneut.",
    };
  }
  revalidatePath("/account", "layout");
  redirect(`/account/money?month=${destination}`);
}

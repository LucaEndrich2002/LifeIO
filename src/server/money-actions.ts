"use server";
import "server-only";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { monthSchema } from "@/domain/money";
import {
  expenseInputSchema,
  incomeInputSchema,
  mutationSchema,
  transactionKindSchema,
} from "@/domain/transactions";
import type { FormState } from "@/features/auth/form-state";
import { requireIdentity } from "@/server/identity";
import type { Json } from "@/types/database";

export async function saveTransaction(
  kind: string,
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireIdentity(true);
  const parsedKind = transactionKindSchema.safeParse(kind);
  const raw = Object.fromEntries(form);
  const mutation = mutationSchema.safeParse(raw);
  const returnMonth = monthSchema.safeParse(form.get("return_month"));
  if (!parsedKind.success || !mutation.success || !returnMonth.success)
    return {
      status: "error",
      message: "Ungültiger Formularstand. Bitte öffne den Eintrag erneut.",
    };
  let payload: Json = {};
  let destination = returnMonth.data;
  if (mutation.data.operation === "delete") {
    if (form.get("confirm_delete") !== "yes")
      return {
        status: "error",
        message: "Bitte bestätige, dass dieser Eintrag gelöscht werden soll.",
      };
  } else {
    const parsed =
      parsedKind.data === "income"
        ? incomeInputSchema.safeParse(raw)
        : expenseInputSchema.safeParse(raw);
    if (!parsed.success)
      return {
        status: "error",
        message:
          "Bitte prüfe die markierten Angaben. Es wurde nichts gespeichert.",
        errors: Object.fromEntries(
          parsed.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      };
    payload = parsed.data;
    destination =
      "month" in parsed.data
        ? parsed.data.month
        : parsed.data.spent_on.slice(0, 7);
  }
  try {
    const { error } = await supabase.rpc("mutate_money", {
      p_kind: parsedKind.data,
      p_operation: mutation.data.operation,
      p_id: mutation.data.id,
      p_revision: mutation.data.revision,
      p_payload: payload,
    });
    if (error)
      return {
        status: "error",
        message:
          error.code === "40001"
            ? "Dieser Eintrag wurde inzwischen geändert. Deine Eingaben bleiben erhalten. Öffne den aktuellen Stand erneut, bevor du speicherst."
            : "Der Eintrag konnte nicht gespeichert werden. Er ist möglicherweise nicht mehr verfügbar. Deine Eingaben bleiben erhalten.",
      };
  } catch {
    return {
      status: "error",
      message:
        "Die Verbindung wurde unterbrochen. Bitte versuche es erneut. Deine Eingaben bleiben erhalten.",
    };
  }
  revalidatePath("/account", "layout");
  redirect(`/account/money?month=${destination}`);
}

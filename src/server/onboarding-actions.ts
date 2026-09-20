"use server";

import "server-only";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  expensesSchema,
  goalSchema,
  incomeSchema,
  revisionSchema,
  stepSchema,
} from "@/domain/onboarding";
import type { FormState } from "@/features/auth/form-state";
import { requireIdentity } from "@/server/identity";
import type { Json } from "@/types/database";

export async function saveOnboarding(
  step: string,
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireIdentity(true);
  const parsedStep = stepSchema.safeParse(step);
  const revision = revisionSchema.safeParse(form.get("revision"));
  if (!parsedStep.success || !revision.success || form.get("revision") === null)
    return {
      status: "error",
      message: "Ungültiger Formularstand. Bitte lade die Seite neu.",
    };
  let payload: Json = {};
  if (parsedStep.data !== "review") {
    const raw = Object.fromEntries(form);
    const names = form.getAll("expense_name");
    const amounts = form.getAll("expense_amount");
    const input =
      parsedStep.data === "income"
        ? incomeSchema.safeParse(raw)
        : parsedStep.data === "goal"
          ? goalSchema.safeParse(raw)
          : expensesSchema.safeParse({
              ...raw,
              items: names.map((name, index) => ({
                name,
                amount: amounts[index],
              })),
            });
    if (!input.success)
      return {
        status: "error",
        message:
          "Bitte prüfe die markierten Angaben. Es wurde nichts gespeichert.",
        errors: Object.fromEntries(
          input.error.issues.map((issue) => [
            issue.path.join("."),
            issue.message,
          ]),
        ),
      };
    payload = input.data;
  }
  try {
    const { error } = await supabase.rpc("save_onboarding_step", {
      p_step: parsedStep.data === "review" ? "complete" : parsedStep.data,
      p_payload: payload,
      p_revision: revision.data,
    });
    if (error)
      return {
        status: "error",
        message:
          error.code === "40001"
            ? "In einem anderen Tab wurde bereits gespeichert. Deine Eingaben bleiben hier erhalten. Lade den aktuellen Stand neu, bevor du ihn bearbeitest."
            : "Speichern fehlgeschlagen. Deine Eingaben bleiben erhalten. Bitte versuche es erneut oder lade den aktuellen Stand neu.",
      };
  } catch {
    return {
      status: "error",
      message:
        "Die Verbindung wurde unterbrochen. Deine Eingaben bleiben erhalten. Bitte versuche es erneut.",
    };
  }
  revalidatePath("/account", "layout");
  const destination = {
    income: "expenses",
    expenses: "goal",
    goal: "review",
    review: null,
  }[parsedStep.data];
  redirect(
    destination ? `/account/onboarding/${destination}` : "/account/overview",
  );
}

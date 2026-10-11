"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { reviewMutationSchema } from "@/domain/weekly-review";
import type { FormState } from "@/features/auth/form-state";
import { requireIdentity } from "@/server/identity";

export async function saveWeeklyReview(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireIdentity(true);
  const input = reviewMutationSchema.safeParse(Object.fromEntries(form));
  if (!input.success)
    return {
      status: "error",
      message:
        "Ungültige Woche oder Formularfassung. Bitte lade den aktuellen Stand neu.",
    };
  try {
    const { error } = await supabase.rpc("generate_weekly_review", {
      p_week: input.data.week,
      p_revision: input.data.revision,
    });
    if (error)
      return {
        status: "error",
        message:
          error.code === "40001"
            ? "Dieser Rückblick wurde inzwischen aktualisiert. Lade den aktuellen Stand neu."
            : "Der Rückblick konnte nicht gespeichert werden. Wähle eine abgeschlossene Woche und versuche es erneut.",
      };
  } catch {
    return {
      status: "error",
      message:
        "Die Verbindung wurde unterbrochen. Dein gespeicherter Rückblick bleibt erhalten. Bitte versuche es erneut.",
    };
  }
  revalidatePath("/account/review");
  redirect(`/account/review?week=${input.data.week}`);
}

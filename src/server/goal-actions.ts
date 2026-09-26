"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  contributionInputSchema,
  goalInputSchema,
  goalMutationSchema,
} from "@/domain/goals";
import { dateInZone } from "@/domain/transactions";
import type { FormState } from "@/features/auth/form-state";
import { requireIdentity } from "@/server/identity";
import type { Json } from "@/types/database";

export async function saveGoal(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireIdentity(true);
  const raw = Object.fromEntries(form);
  const mutation = goalMutationSchema.safeParse(raw);
  if (!mutation.success)
    return {
      status: "error",
      message: "Ungültiger Formularstand. Bitte öffne das Ziel erneut.",
    };
  const { id, entry_id, revision, operation } = mutation.data;
  let payload: Json = {};
  if (operation === "cancel") {
    if (form.get("confirm") !== "yes")
      return {
        status: "error",
        message: "Bitte bestätige die Stornierung dieser Einzahlung.",
      };
  } else {
    const parsed = (
      operation === "contribute" ? contributionInputSchema : goalInputSchema
    ).safeParse(raw);
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
  }
  try {
    if (operation === "contribute") {
      const { data, error } = await supabase
        .from("profiles")
        .select("time_zone")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error || !data)
        return {
          status: "error",
          message: "Das Profil ist gerade nicht verfügbar.",
        };
      if (String(raw.date) > dateInZone(new Date(), data.time_zone))
        return {
          status: "error",
          message: "Bitte prüfe das Einzahlungsdatum.",
          errors: {
            date: "Erfasse nur bereits erfolgte Einzahlungen, keine zukünftigen.",
          },
        };
    }
    const { error } = await supabase.rpc("mutate_goal", {
      p_operation: operation,
      p_id: id,
      p_entry_id: entry_id,
      p_revision: revision,
      p_payload: payload,
    });
    if (error)
      return {
        status: "error",
        message:
          error.code === "40001"
            ? "Dieses Ziel wurde inzwischen geändert. Deine Eingaben bleiben erhalten. Öffne den aktuellen Stand."
            : error.code === "22003"
              ? "Startguthaben und aktive Einzahlungen dürfen zusammen höchstens 999.999.999,99 € ergeben."
              : error.code === "22023"
                ? "Bitte prüfe deine Angaben. Eine geänderte Sparrate muss nach dem letzten geplanten Startmonat beginnen."
                : "Die Änderung konnte nicht gespeichert werden. Das Ziel oder die Einzahlung ist möglicherweise nicht mehr verfügbar.",
      };
  } catch {
    return {
      status: "error",
      message:
        "Die Verbindung wurde unterbrochen. Deine Eingaben bleiben erhalten. Bitte versuche es erneut.",
    };
  }
  revalidatePath("/account", "layout");
  redirect(`/account/goals/${id}`);
}

"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { notificationMutationSchema } from "@/domain/notifications";
import type { FormState } from "@/features/auth/form-state";
import { requireIdentity } from "@/server/identity";

export async function checkNotifications(): Promise<FormState> {
  const { supabase } = await requireIdentity(true);
  try {
    const { data, error } = await supabase.rpc("synchronize_notifications");
    if (error)
      return {
        status: "error",
        message:
          "Hinweise konnten nicht geprüft werden. Bitte versuche es erneut.",
      };
    revalidatePath("/account/notifications");
    return {
      status: "success",
      message: `Prüfung abgeschlossen. ${data} neue Hinweise gespeichert. Bereits gelesene Hinweise bleiben gelesen.`,
    };
  } catch {
    return {
      status: "error",
      message:
        "Die Verbindung wurde unterbrochen. Bitte prüfe den aktuellen Stand und versuche es erneut.",
    };
  }
}
export async function changeNotificationRead(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireIdentity(true);
  const input = notificationMutationSchema.safeParse(Object.fromEntries(form));
  if (!input.success)
    return {
      status: "error",
      message:
        "Ungültiger Hinweis oder Formularstand. Bitte lade die Seite neu.",
    };
  try {
    const { error } = await supabase.rpc("set_notification_read", {
      p_id: input.data.id,
      p_revision: input.data.revision,
      p_read: input.data.read,
    });
    if (error)
      return {
        status: "error",
        message:
          error.code === "40001"
            ? "Der Lesestatus wurde inzwischen geändert. Bitte lade den aktuellen Stand neu."
            : "Der Hinweis ist nicht mehr verfügbar oder konnte nicht geändert werden. Bitte lade den aktuellen Stand neu.",
      };
    revalidatePath("/account/notifications");
    return { status: "success" };
  } catch {
    return {
      status: "error",
      message:
        "Die Verbindung wurde unterbrochen. Bitte lade den aktuellen Stand neu.",
    };
  }
}

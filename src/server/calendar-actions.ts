"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  calendarInputSchema,
  calendarMutationSchema,
  calendarHref,
} from "@/domain/calendar";
import {
  calendarInstants,
  calendarDayInZone,
  CalendarTimeError,
} from "@/domain/calendar-time";
import type { FormState } from "@/features/auth/form-state";
import { requireIdentity } from "@/server/identity";
export async function saveCalendarEvent(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireIdentity(true);
  const mutation = calendarMutationSchema.safeParse(Object.fromEntries(form));
  if (!mutation.success)
    return {
      status: "error",
      message: "Ungültiger Formularstand. Bitte öffne den Termin erneut.",
    };
  const { id, revision, operation } = mutation.data;
  if (operation === "remove" && form.get("confirm") !== "yes")
    return {
      status: "error",
      message: "Bitte bestätige das Löschen dieses Termins.",
    };
  let input: {
    title?: string;
    time_zone?: string;
    starts_at?: string;
    ends_at?: string;
  } = {};
  let destination = calendarHref(mutation.data);
  try {
    if (operation !== "remove") {
      const parsed = calendarInputSchema.safeParse(Object.fromEntries(form));
      if (!parsed.success)
        return {
          status: "error",
          message: "Bitte prüfe die Angaben. Es wurde nichts gespeichert.",
          errors: Object.fromEntries(
            parsed.error.issues.map((issue) => [
              String(issue.path[0]),
              issue.message,
            ]),
          ),
        };
      input = { ...parsed.data, ...calendarInstants(parsed.data) };
      if (operation === "create") {
        const profile = await supabase
          .from("profiles")
          .select("time_zone")
          .eq("user_id", user.id)
          .single();
        if (profile.error) throw new Error("Profile unavailable.");
        destination = calendarHref({
          ...mutation.data,
          page: 0,
          day: calendarDayInZone(input.starts_at!, profile.data.time_zone),
        });
      }
    }
    const { error } = await supabase.rpc("mutate_calendar_event", {
      p_id: id,
      p_revision: revision,
      p_operation: operation,
      p_title: input.title,
      p_time_zone: input.time_zone,
      p_starts_at: input.starts_at,
      p_ends_at: input.ends_at,
    });
    if (error)
      return {
        status: "error",
        message:
          error.code === "40001"
            ? "Dieser Termin wurde inzwischen geändert. Deine Eingaben bleiben erhalten. Öffne den aktuellen Stand."
            : "Der Termin konnte nicht gespeichert werden und ist möglicherweise nicht mehr verfügbar. Bitte öffne den aktuellen Stand.",
      };
  } catch (error) {
    if (error instanceof CalendarTimeError)
      return {
        status: "error",
        message: "Bitte prüfe die Uhrzeiten. Es wurde nichts gespeichert.",
        errors: { [error.field]: error.message },
      };
    return {
      status: "error",
      message:
        "Die Änderung konnte nicht gespeichert werden. Deine Eingaben bleiben erhalten. Bitte versuche es erneut.",
    };
  }
  revalidatePath("/account/plan/calendar", "layout");
  redirect(destination);
}

"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  taskInputSchema,
  taskMutationSchema,
  taskListHref,
} from "@/domain/tasks";
import type { FormState } from "@/features/auth/form-state";
import { requireIdentity } from "@/server/identity";

export async function saveTask(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireIdentity(true);
  const mutation = taskMutationSchema.safeParse(Object.fromEntries(form));
  if (!mutation.success)
    return {
      status: "error",
      message: "Ungültiger Formularstand. Bitte öffne die Aufgabe erneut.",
    };
  const { id, revision, operation } = mutation.data;
  if (operation === "remove" && form.get("confirm") !== "yes")
    return {
      status: "error",
      message: "Bitte bestätige das Löschen dieser Aufgabe.",
    };
  let input: { title?: string; priority?: string; due_on?: string } = {};
  if (operation === "create" || operation === "update") {
    const parsed = taskInputSchema.safeParse(Object.fromEntries(form));
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
    input = parsed.data;
  }
  try {
    const { error } = await supabase.rpc("mutate_task", {
      p_operation: operation,
      p_id: id,
      p_revision: revision,
      p_title: input.title,
      p_priority: input.priority,
      p_due_on: input.due_on,
    });
    if (error)
      return {
        status: "error",
        message:
          error.code === "40001"
            ? "Diese Aufgabe wurde inzwischen geändert. Deine Eingaben bleiben erhalten. Öffne den aktuellen Stand."
            : "Die Aufgabe konnte nicht gespeichert werden und ist möglicherweise nicht mehr verfügbar. Bitte öffne den aktuellen Stand.",
      };
  } catch {
    return {
      status: "error",
      message:
        "Die Verbindung wurde unterbrochen. Deine Eingaben bleiben erhalten. Bitte versuche es erneut.",
    };
  }
  revalidatePath("/account/plan", "layout");
  redirect(
    taskListHref(
      operation === "create"
        ? { ...mutation.data, view: "all", status: "open", page: 0 }
        : mutation.data,
    ),
  );
}

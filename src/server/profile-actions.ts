"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { profileSchema } from "@/domain/profile";
import type { FormState } from "@/features/auth/form-state";
import { requireIdentity } from "@/server/identity";

export async function saveProfile(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireIdentity(true);
  const input = profileSchema.safeParse(Object.fromEntries(form));
  if (!input.success)
    return {
      status: "error",
      message: "Bitte prüfe deine Profilangaben.",
      errors: Object.fromEntries(
        input.error.issues.map((issue) => [
          String(issue.path[0]),
          issue.message,
        ]),
      ),
    };
  const { error } = await supabase
    .from("profiles")
    .upsert({ ...input.data, user_id: user.id }, { onConflict: "user_id" });
  if (error)
    return {
      status: "error",
      message:
        "Dein Profil konnte nicht gespeichert werden. Deine Eingaben bleiben erhalten. Bitte versuche es erneut.",
    };
  revalidatePath("/account");
  return { status: "success", message: "Dein Profil wurde gespeichert." };
}

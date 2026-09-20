"use server";

import "server-only";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  emailFormSchema,
  loginSchema,
  newPasswordSchema,
  signupSchema,
  verificationSchema,
} from "@/domain/auth";
import type { FormState } from "@/features/auth/form-state";
import { createSupabaseServerClient } from "@/server/supabase";

function invalid(error: z.ZodError): FormState {
  return {
    status: "error",
    message: "Bitte prüfe deine Eingaben.",
    errors: Object.fromEntries(
      error.issues.map((issue) => [String(issue.path[0]), issue.message]),
    ),
  };
}

export async function signUp(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const input = signupSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return invalid(input.error);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp(input.data);
  if (error)
    return {
      status: "error",
      message:
        "Die Registrierung ist gerade nicht möglich. Prüfe deine Angaben oder versuche es später erneut.",
    };
  // Same next step for new and already registered addresses; no account enumeration.
  redirect("/auth/confirm");
}

export async function signIn(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const input = loginSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return invalid(input.error);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(input.data);
  if (error)
    return {
      status: "error",
      message:
        "Anmeldung fehlgeschlagen. Prüfe E-Mail und Passwort und bestätige zuerst deine E-Mail-Adresse.",
    };
  redirect("/account");
}

export async function confirmEmail(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const input = verificationSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return invalid(input.error);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    ...input.data,
    type: "signup",
  });
  if (error)
    return {
      status: "error",
      message:
        "Der Code ist ungültig oder abgelaufen. Prüfe auch die E-Mail-Adresse.",
    };
  redirect("/account");
}

export async function requestRecovery(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const input = emailFormSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return invalid(input.error);
  const supabase = await createSupabaseServerClient();
  // Always the same response, including unknown addresses and rate limits.
  await supabase.auth.resetPasswordForEmail(input.data.email);
  redirect("/auth/recovery");
}

export async function resendConfirmation(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const input = emailFormSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return invalid(input.error);
  const supabase = await createSupabaseServerClient();
  await supabase.auth.resend({ type: "signup", email: input.data.email });
  redirect("/auth/confirm");
}

export async function verifyRecovery(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const input = verificationSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return invalid(input.error);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    ...input.data,
    type: "recovery",
  });
  if (error)
    return {
      status: "error",
      message:
        "Der Code ist ungültig oder abgelaufen. Fordere bei Bedarf einen neuen Code an.",
    };
  redirect("/account/password");
}

export async function changePassword(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const input = newPasswordSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return invalid(input.error);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth/login");
  const { error } = await supabase.auth.updateUser({
    password: input.data.password,
  });
  if (error)
    return {
      status: "error",
      message:
        "Das Passwort konnte nicht geändert werden. Fordere einen neuen Bestätigungscode an und versuche es erneut.",
    };
  redirect("/account?notice=password-updated");
}

export async function signOut(): Promise<FormState> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error)
    return {
      status: "error",
      message: "Abmelden ist gerade nicht möglich. Bitte versuche es erneut.",
    };
  redirect("/auth/login");
}

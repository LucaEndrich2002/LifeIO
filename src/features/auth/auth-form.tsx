"use client";

import { useActionState, useState } from "react";
import type { AuthMode, FormState } from "@/features/auth/form-state";

export function AuthForm({
  mode,
  action,
  submitLabel,
}: {
  mode: AuthMode;
  action: (previous: FormState, form: FormData) => Promise<FormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {
    status: "idle",
  });
  const [values, setValues] = useState({ email: "", password: "", token: "" });
  const fields = [
    ...(mode !== "password"
      ? [
          {
            name: "email" as const,
            label: "E-Mail-Adresse",
            type: "email",
            autoComplete: "email",
            maxLength: 254,
          },
        ]
      : []),
    ...(["login", "signup", "password"].includes(mode)
      ? [
          {
            name: "password" as const,
            label: mode === "password" ? "Neues Passwort" : "Passwort",
            type: "password",
            autoComplete:
              mode === "login" ? "current-password" : "new-password",
            maxLength: 128,
          },
        ]
      : []),
    ...(["confirm", "recovery"].includes(mode)
      ? [
          {
            name: "token" as const,
            label: "Bestätigungscode",
            type: "text",
            autoComplete: "one-time-code",
            maxLength: 6,
          },
        ]
      : []),
  ];
  return (
    <form action={formAction} className="space-y-5">
      {fields.map((field) => (
        <div key={field.name}>
          <label
            htmlFor={field.name}
            className="mb-2 block text-sm font-medium"
          >
            {field.label}
          </label>
          <input
            id={field.name}
            name={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
            required
            maxLength={field.maxLength}
            minLength={
              field.name === "password" && mode !== "login" ? 12 : undefined
            }
            inputMode={field.name === "token" ? "numeric" : undefined}
            pattern={field.name === "token" ? "[0-9]{6}" : undefined}
            value={values[field.name]}
            onChange={(event) =>
              setValues({ ...values, [field.name]: event.target.value })
            }
            aria-invalid={!!state.errors?.[field.name]}
            aria-describedby={
              state.errors?.[field.name]
                ? `${field.name}-error`
                : field.name === "password" && mode !== "login"
                  ? "password-help"
                  : undefined
            }
            className="min-h-12 w-full rounded-xl border bg-background px-3 text-base"
          />
          {field.name === "password" && mode !== "login" && (
            <p
              id="password-help"
              className="mt-2 text-xs text-muted-foreground"
            >
              12 bis 128 Zeichen. Ein Passwortmanager hilft dir dabei.
            </p>
          )}
          {state.errors?.[field.name] && (
            <p id={`${field.name}-error`} className="mt-2 text-sm">
              {state.errors[field.name]}
            </p>
          )}
        </div>
      ))}
      {state.message && (
        <p
          role="alert"
          className="rounded-xl border p-3 text-sm leading-relaxed"
        >
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Einen Moment …" : submitLabel}
      </button>
    </form>
  );
}

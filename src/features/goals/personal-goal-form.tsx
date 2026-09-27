"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import type { z } from "zod";
import type { personalGoalMutationSchema } from "@/domain/personal-goals";
import type { FormState } from "@/features/auth/form-state";
import { savePersonalGoal } from "@/server/personal-goal-actions";

export type PersonalGoalInitial = z.output<
  typeof personalGoalMutationSchema
> & { name: string; deadline: string };
export function PersonalGoalForm({
  initial,
}: {
  initial: PersonalGoalInitial;
}) {
  const [state, action, pending] = useActionState(savePersonalGoal, {
    status: "idle",
  } as FormState);
  const [values, setValues] = useState({
    name: initial.name,
    deadline: initial.deadline,
  });
  const destination =
    initial.operation === "create"
      ? "/account/goals?kind=personal"
      : `/account/goals/${initial.id}`;
  return (
    <form action={action} noValidate className="space-y-4">
      {(["id", "revision", "operation"] as const).map((key) => (
        <input key={key} type="hidden" name={key} value={initial[key]} />
      ))}
      <fieldset
        disabled={pending}
        className="min-w-0 space-y-4 disabled:opacity-60"
      >
        <legend className="sr-only">Persönliches Ziel</legend>
        {(["name", "deadline"] as const).map((key) => (
          <div key={key}>
            <label
              htmlFor={`personal-${key}`}
              className="mb-2 block text-sm font-medium"
            >
              {key === "name" ? "Name des Ziels" : "Zieldatum (optional)"}
            </label>
            <input
              id={`personal-${key}`}
              name={key}
              type={key === "deadline" ? "date" : "text"}
              maxLength={key === "name" ? 160 : undefined}
              min={key === "deadline" ? "2000-01-01" : undefined}
              max={key === "deadline" ? "2100-12-31" : undefined}
              value={values[key]}
              onChange={(e) => setValues({ ...values, [key]: e.target.value })}
              aria-invalid={!!state.errors?.[key]}
              aria-describedby={`personal-${key}-error`}
              className="min-h-12 w-full min-w-0 rounded-xl border bg-background px-3 text-base"
            />
            <p id={`personal-${key}-error`} className="mt-2 text-sm">
              {state.errors?.[key]}
            </p>
          </div>
        ))}
        <p className="text-sm text-muted-foreground">
          Deinen Fortschritt hältst du anschließend mit Meilensteinen fest.
        </p>
        <button
          disabled={pending}
          className="min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
        >
          {pending ? "Speichern …" : "Persönliches Ziel speichern"}
        </button>
      </fieldset>
      {state.message && (
        <div role="alert" className="space-y-2 rounded-xl border p-3 text-sm">
          <p>{state.message}</p>
          <a
            href={destination}
            className="inline-flex min-h-11 items-center underline"
          >
            Aktuellen Stand öffnen
          </a>
        </div>
      )}
      <Link
        href={destination}
        className="inline-flex min-h-11 items-center text-sm underline"
      >
        Abbrechen und zurück
      </Link>
    </form>
  );
}

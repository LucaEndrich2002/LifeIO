"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import type { z } from "zod";
import type { milestoneMutationSchema } from "@/domain/milestones";
import type { FormState } from "@/features/auth/form-state";
import { saveMilestone } from "@/server/milestone-actions";

export type MilestoneInitial = z.output<typeof milestoneMutationSchema> & {
  title: string;
};
export function MilestoneForm({ initial }: { initial: MilestoneInitial }) {
  const [state, action, pending] = useActionState(saveMilestone, {
    status: "idle",
  } as FormState);
  const [title, setTitle] = useState(initial.title);
  const [confirmed, setConfirmed] = useState(false);
  const editing =
    initial.operation === "create" || initial.operation === "rename";
  const compact =
    initial.operation === "complete" || initial.operation === "reopen";
  const destination = `/account/goals/${initial.goal_id}${initial.return_page ? `?milestone_page=${initial.return_page}` : ""}#milestones`;
  const label = editing
    ? "Meilenstein speichern"
    : initial.operation === "remove"
      ? "Entfernen bestätigen"
      : initial.operation === "complete"
        ? "Als erledigt markieren"
        : "Wieder öffnen";
  return (
    <form action={action} noValidate className="space-y-3">
      {(["goal_id", "id", "revision", "operation", "return_page"] as const).map(
        (key) => (
          <input key={key} type="hidden" name={key} value={initial[key]} />
        ),
      )}
      <fieldset
        disabled={pending}
        className="min-w-0 space-y-4 disabled:opacity-60"
      >
        <legend className="sr-only">
          {initial.title || "Neuer Meilenstein"}
        </legend>
        {editing && (
          <div>
            <label
              htmlFor={`milestone-${initial.id}`}
              className="mb-2 block text-sm font-medium"
            >
              Name des Meilensteins
            </label>
            <input
              id={`milestone-${initial.id}`}
              name="title"
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={!!state.errors?.title}
              aria-describedby={`milestone-${initial.id}-error`}
              className="min-h-12 w-full rounded-xl border bg-background px-3 text-base"
            />
            <p id={`milestone-${initial.id}-error`} className="mt-2 text-sm">
              {state.errors?.title}
            </p>
          </div>
        )}
        {initial.operation === "remove" && (
          <>
            <p className="break-words rounded-xl border p-4 text-sm">
              {initial.title}
            </p>
            <p className="text-sm text-muted-foreground">
              Der Meilenstein zählt danach nicht mehr zum
              Meilenstein-Fortschritt. Dein Sparstand bleibt unverändert.
            </p>
            <label className="flex min-h-12 items-start gap-3 rounded-xl border p-4 text-sm">
              <input
                type="checkbox"
                name="confirm"
                value="yes"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 size-4"
              />
              <span>Diesen Meilenstein entfernen</span>
            </label>
          </>
        )}
        <button
          disabled={pending}
          aria-label={compact ? `${label}: ${initial.title}` : undefined}
          className={
            compact
              ? "min-h-11 rounded-lg border px-3 text-sm font-medium"
              : "min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
          }
        >
          {pending ? "Speichern …" : label}
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
      {!compact && (
        <Link
          href={destination}
          className="inline-flex min-h-11 items-center text-sm underline"
        >
          Abbrechen und zurück
        </Link>
      )}
    </form>
  );
}

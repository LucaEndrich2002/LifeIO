"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import type { z } from "zod";
import {
  taskListHref,
  taskPriorities,
  type taskMutationSchema,
  type taskInputSchema,
} from "@/domain/tasks";
import type { FormState } from "@/features/auth/form-state";
import { saveTask } from "@/server/task-actions";

export type TaskInitial = z.output<typeof taskMutationSchema> &
  z.output<typeof taskInputSchema>;
export function TaskForm({ initial }: { initial: TaskInitial }) {
  const [state, action, pending] = useActionState(saveTask, {
    status: "idle",
  } as FormState);
  const [title, setTitle] = useState(initial.title);
  const [priority, setPriority] = useState<string>(initial.priority);
  const [due, setDue] = useState(initial.due_on);
  const [confirmed, setConfirmed] = useState(false);
  const editing =
    initial.operation === "create" || initial.operation === "update";
  const compact =
    initial.operation === "complete" || initial.operation === "reopen";
  const label = editing
    ? "Aufgabe speichern"
    : initial.operation === "remove"
      ? "Aufgabe löschen"
      : initial.operation === "complete"
        ? "Als erledigt markieren"
        : "Wieder öffnen";
  const destination = taskListHref(initial);
  const fieldClass =
    "min-h-12 w-full min-w-0 rounded-xl border bg-background px-3 text-base";
  return (
    <form action={action} noValidate className="space-y-3">
      {(
        [
          "id",
          "revision",
          "operation",
          "view",
          "status",
          "day",
          "page",
        ] as const
      ).map((key) => (
        <input key={key} type="hidden" name={key} value={initial[key]} />
      ))}
      <fieldset
        disabled={pending}
        className="min-w-0 space-y-4 disabled:opacity-60"
      >
        <legend className="sr-only">{initial.title || "Neue Aufgabe"}</legend>
        {editing && (
          <>
            <div>
              <label
                htmlFor="task-title"
                className="mb-2 block text-sm font-medium"
              >
                Titel der Aufgabe
              </label>
              <input
                id="task-title"
                name="title"
                maxLength={160}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-invalid={!!state.errors?.title}
                aria-describedby="task-title-error"
                className={fieldClass}
              />
              <p id="task-title-error" className="mt-2 text-sm">
                {state.errors?.title}
              </p>
            </div>
            <div>
              <label
                htmlFor="task-priority"
                className="mb-2 block text-sm font-medium"
              >
                Priorität
              </label>
              <select
                id="task-priority"
                name="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                aria-invalid={!!state.errors?.priority}
                aria-describedby="task-priority-error"
                className={fieldClass}
              >
                {Object.entries(taskPriorities).map(([value, name]) => (
                  <option key={value} value={value}>
                    {name}
                  </option>
                ))}
              </select>
              <p id="task-priority-error" className="mt-2 text-sm">
                {state.errors?.priority}
              </p>
            </div>
            <div>
              <label
                htmlFor="task-due"
                className="mb-2 block text-sm font-medium"
              >
                Fällig am (optional)
              </label>
              <input
                id="task-due"
                name="due_on"
                type="date"
                min="2000-01-01"
                max="2100-12-31"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                aria-invalid={!!state.errors?.due_on}
                aria-describedby="task-due-help task-due-error"
                className={fieldClass}
              />
              <p
                id="task-due-help"
                className="mt-2 text-sm text-muted-foreground"
              >
                Ohne Datum bleibt die Aufgabe in „Alle“ und „Ohne Datum“
                sichtbar.
              </p>
              <p id="task-due-error" className="mt-2 text-sm">
                {state.errors?.due_on}
              </p>
            </div>
          </>
        )}
        {initial.operation === "remove" && (
          <>
            <p className="break-words rounded-xl border p-4 text-sm">
              {initial.title}
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
              <span>Diese Aufgabe löschen</span>
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

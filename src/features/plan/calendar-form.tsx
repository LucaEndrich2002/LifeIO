"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import type { z } from "zod";
import {
  calendarHref,
  type calendarMutationSchema,
  type calendarInputSchema,
} from "@/domain/calendar";
import type { FormState } from "@/features/auth/form-state";
import { saveCalendarEvent } from "@/server/calendar-actions";
export type CalendarInitial = z.output<typeof calendarMutationSchema> &
  z.output<typeof calendarInputSchema>;
export function CalendarForm({
  initial,
  timeZones,
}: {
  initial: CalendarInitial;
  timeZones: string[];
}) {
  const [state, action, pending] = useActionState(saveCalendarEvent, {
    status: "idle",
  } as FormState);
  const [values, setValues] = useState<Record<string, string>>({
    title: initial.title,
    time_zone: initial.time_zone,
    start_local: initial.start_local,
    end_local: initial.end_local,
    start_occurrence: initial.start_occurrence,
    end_occurrence: initial.end_occurrence,
  });
  const [confirmed, setConfirmed] = useState(false);
  const removing = initial.operation === "remove";
  const fieldClass =
    "min-h-12 w-full min-w-0 rounded-xl border bg-background px-3 text-base";
  return (
    <form action={action} noValidate className="space-y-4">
      {(["id", "revision", "operation", "view", "day", "page"] as const).map(
        (key) => (
          <input key={key} type="hidden" name={key} value={initial[key]} />
        ),
      )}
      <fieldset
        disabled={pending}
        className="min-w-0 space-y-4 disabled:opacity-60"
      >
        <legend className="sr-only">Termindaten</legend>
        {removing ? (
          <label className="flex min-h-12 items-start gap-3 rounded-xl border p-4 text-sm">
            <input
              type="checkbox"
              name="confirm"
              value="yes"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 size-4"
            />
            <span>Diesen Termin löschen</span>
          </label>
        ) : (
          <>
            <div>
              <label
                htmlFor="event-title"
                className="mb-2 block text-sm font-medium"
              >
                Titel des Termins
              </label>
              <input
                id="event-title"
                name="title"
                value={values.title}
                onChange={(e) =>
                  setValues({ ...values, title: e.target.value })
                }
                maxLength={160}
                aria-invalid={!!state.errors?.title}
                aria-describedby="event-title-error"
                className={fieldClass}
              />
              <p id="event-title-error" className="mt-2 text-sm">
                {state.errors?.title}
              </p>
            </div>
            <div>
              <label
                htmlFor="event-zone"
                className="mb-2 block text-sm font-medium"
              >
                Zeitzone des Termins
              </label>
              <select
                id="event-zone"
                name="time_zone"
                value={values.time_zone}
                onChange={(e) =>
                  setValues({ ...values, time_zone: e.target.value })
                }
                aria-invalid={!!state.errors?.time_zone}
                aria-describedby="event-zone-help event-zone-error"
                className={fieldClass}
              >
                {timeZones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
              <p
                id="event-zone-help"
                className="mt-2 text-sm text-muted-foreground"
              >
                Beginn und Ende gelten in dieser Zeitzone. Eine andere Auswahl
                behält die eingegebenen Uhrzeiten und verändert damit den
                Zeitpunkt.
              </p>
              <p id="event-zone-error" className="mt-2 text-sm">
                {state.errors?.time_zone}
              </p>
            </div>
            {(["start", "end"] as const).map((part) => {
              const name = `${part}_local`;
              const occurrence = `${part}_occurrence`;
              const label = part === "start" ? "Beginn" : "Ende";
              return (
                <div key={part} className="space-y-2">
                  <label htmlFor={name} className="block text-sm font-medium">
                    {label}
                  </label>
                  <input
                    id={name}
                    name={name}
                    type="datetime-local"
                    min="2000-01-01T00:00"
                    max="2100-12-31T23:59"
                    step="60"
                    value={values[name]}
                    onChange={(e) =>
                      setValues({ ...values, [name]: e.target.value })
                    }
                    aria-invalid={!!state.errors?.[name]}
                    aria-describedby={`${name}-error`}
                    className={fieldClass}
                  />
                  <p id={`${name}-error`} className="text-sm">
                    {state.errors?.[name]}
                  </p>
                  <label htmlFor={occurrence} className="block text-sm">
                    {label}: bei doppelter Uhrzeit
                  </label>
                  <select
                    id={occurrence}
                    name={occurrence}
                    value={values[occurrence]}
                    onChange={(e) =>
                      setValues({ ...values, [occurrence]: e.target.value })
                    }
                    className={fieldClass}
                  >
                    <option value="auto">Nur eindeutige Uhrzeit</option>
                    <option value="earlier">Erstes Vorkommen</option>
                    <option value="later">Zweites Vorkommen</option>
                  </select>
                </div>
              );
            })}
            <p className="text-sm text-muted-foreground">
              Bei der Zeitumstellung können Uhrzeiten fehlen oder zweimal
              vorkommen. Fehlende Uhrzeiten werden nicht automatisch verschoben.
            </p>
          </>
        )}
        <button
          disabled={pending}
          className="min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
        >
          {pending
            ? "Speichern …"
            : removing
              ? "Termin löschen"
              : "Termin speichern"}
        </button>
      </fieldset>
      {state.message && (
        <div role="alert" className="space-y-2 rounded-xl border p-3 text-sm">
          <p>{state.message}</p>
          <a
            href={calendarHref(initial)}
            className="inline-flex min-h-11 items-center underline"
          >
            Aktuellen Stand öffnen
          </a>
        </div>
      )}
      <Link
        href={calendarHref(initial)}
        className="inline-flex min-h-11 items-center text-sm underline"
      >
        Abbrechen und zurück
      </Link>
    </form>
  );
}

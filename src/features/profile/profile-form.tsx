"use client";

import { useActionState, useState } from "react";
import { saveProfile } from "@/server/profile-actions";

export function ProfileForm({
  initial,
  timeZones,
}: {
  initial: { display_name: string; time_zone: string };
  timeZones: string[];
}) {
  const [state, action, pending] = useActionState(saveProfile, {
    status: "idle",
  });
  const [name, setName] = useState(initial.display_name);
  const [timeZone, setTimeZone] = useState(initial.time_zone);
  return (
    <form action={action} className="space-y-5">
      <div>
        <label
          htmlFor="display_name"
          className="mb-2 block text-sm font-medium"
        >
          Anzeigename
        </label>
        <input
          id="display_name"
          name="display_name"
          autoComplete="nickname"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={80}
          aria-invalid={!!state.errors?.display_name}
          aria-describedby={
            state.errors?.display_name ? "name-error" : undefined
          }
          className="min-h-12 w-full rounded-xl border bg-background px-3"
        />
        {state.errors?.display_name && (
          <p id="name-error" className="mt-2 text-sm">
            {state.errors.display_name}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="time_zone" className="mb-2 block text-sm font-medium">
          Zeitzone
        </label>
        <select
          id="time_zone"
          name="time_zone"
          value={timeZone}
          onChange={(event) => setTimeZone(event.target.value)}
          aria-invalid={!!state.errors?.time_zone}
          aria-describedby="timezone-help"
          className="min-h-12 w-full rounded-xl border bg-background px-3"
        >
          {timeZones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
        <p id="timezone-help" className="mt-2 text-xs text-muted-foreground">
          Diese Zeitzone bestimmt später deine Tages- und Monatsgrenzen.
        </p>
        {state.errors?.time_zone && (
          <p className="mt-2 text-sm">{state.errors.time_zone}</p>
        )}
      </div>
      <div className="rounded-xl bg-muted p-4 text-sm">
        <p className="font-medium">Euro · Deutsch · Wochenbeginn Montag</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Die Grundlage für die erste Version von LifeOS.
        </p>
        <input type="hidden" name="currency" value="EUR" />
      </div>
      {state.message && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className="rounded-xl border p-3 text-sm"
        >
          {state.message}
        </p>
      )}
      <button
        disabled={pending}
        className="min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Speichern …" : "Profil speichern"}
      </button>
    </form>
  );
}

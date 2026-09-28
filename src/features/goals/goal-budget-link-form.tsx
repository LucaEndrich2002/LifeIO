"use client";
import { useActionState, useState } from "react";
import type { z } from "zod";
import type { goalBudgetMutationSchema } from "@/domain/goal-budget-links";
import type { FormState } from "@/features/auth/form-state";
import { saveGoalBudgetLink } from "@/server/goal-budget-link-actions";
export function GoalBudgetLinkForm({
  initial,
}: {
  initial: z.output<typeof goalBudgetMutationSchema>;
}) {
  const [state, action, pending] = useActionState(saveGoalBudgetLink, {
    status: "idle",
  } as FormState);
  const [confirmed, setConfirmed] = useState(false);
  const removing = initial.operation === "remove";
  const destination = `/account/goals/${initial.goal_id}${initial.return_page ? `?budget_page=${initial.return_page}` : ""}#budgets`;
  return (
    <form action={action} className="space-y-4">
      {(
        ["id", "goal_id", "budget_id", "operation", "return_page"] as const
      ).map((key) => (
        <input key={key} type="hidden" name={key} value={initial[key]} />
      ))}
      <fieldset
        disabled={pending}
        className="min-w-0 space-y-4 disabled:opacity-60"
      >
        <legend className="sr-only">Budget-Verknüpfung</legend>
        {removing && (
          <label className="flex min-h-12 items-start gap-3 rounded-xl border p-4 text-sm">
            <input
              type="checkbox"
              name="confirm"
              value="yes"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 size-4"
            />
            <span>
              Nur diese Verknüpfung entfernen. Ziel und Budget bleiben erhalten.
            </span>
          </label>
        )}
        <button
          disabled={pending}
          className="min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
        >
          {pending
            ? "Speichern …"
            : removing
              ? "Entfernen bestätigen"
              : "Dieses Budget verknüpfen"}
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
      <a
        href={destination}
        className="inline-flex min-h-11 items-center text-sm underline"
      >
        Abbrechen und zurück
      </a>
    </form>
  );
}

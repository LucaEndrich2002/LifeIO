"use client";
import { useActionState } from "react";
import type { FormState } from "@/features/auth/form-state";
import { saveWeeklyReview } from "@/server/weekly-review-actions";

export function ReviewForm({
  week,
  revision,
}: {
  week: string;
  revision: number;
}) {
  const [state, action, pending] = useActionState(saveWeeklyReview, {
    status: "idle",
  } as FormState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="week" value={week} />
      <input type="hidden" name="revision" value={revision} />
      <button
        disabled={pending}
        className="min-h-12 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {pending
          ? "Rückblick wird gespeichert …"
          : revision < 0
            ? "Wochenrückblick erstellen"
            : "Rückblick aktualisieren"}
      </button>
      {state.message && (
        <div role="alert" className="space-y-2 rounded-xl border p-4 text-sm">
          <p>{state.message}</p>
          <a
            href={`/account/review?week=${week}`}
            className="inline-flex min-h-11 items-center underline"
          >
            Aktuellen Stand neu laden
          </a>
        </div>
      )}
    </form>
  );
}

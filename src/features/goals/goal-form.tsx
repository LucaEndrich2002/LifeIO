"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { formatEuro } from "@/domain/money";
import type { FormState } from "@/features/auth/form-state";
import { saveGoal } from "@/server/goal-actions";

export type GoalInitial = {
  id: string;
  entry_id: string;
  revision: number;
  operation: "create" | "update" | "contribute" | "cancel";
  name: string;
  target: string;
  opening: string;
  monthly: string;
  month: string;
  deadline: string;
  amount: string;
  date: string;
  note: string;
  cancelledAmount?: number;
};
export function GoalForm({ initial }: { initial: GoalInitial }) {
  const [state, action, pending] = useActionState(saveGoal, {
    status: "idle",
  } as FormState);
  const [values, setValues] = useState(initial);
  const [confirmed, setConfirmed] = useState(false);
  const metadata =
    initial.operation === "create" || initial.operation === "update";
  const fields = metadata
    ? [
        { name: "name" as const, label: "Name deines Sparziels", type: "text" },
        { name: "target" as const, label: "Zielbetrag (€)", type: "text" },
        { name: "opening" as const, label: "Startguthaben (€)", type: "text" },
        {
          name: "monthly" as const,
          label: "Geplante monatliche Sparrate (€)",
          type: "text",
        },
        { name: "month" as const, label: "Sparrate gültig ab", type: "month" },
        {
          name: "deadline" as const,
          label: "Zieldatum (optional)",
          type: "date",
        },
      ]
    : initial.operation === "contribute"
      ? [
          { name: "amount" as const, label: "Einzahlung (€)", type: "text" },
          { name: "date" as const, label: "Einzahlungsdatum", type: "date" },
          { name: "note" as const, label: "Notiz (optional)", type: "text" },
        ]
      : [];
  const errors = state.errors ?? {};
  return (
    <form action={action} noValidate className="space-y-5">
      {(["id", "entry_id", "revision", "operation"] as const).map((key) => (
        <input key={key} type="hidden" name={key} value={initial[key]} />
      ))}
      <fieldset
        disabled={pending}
        className="min-w-0 space-y-5 disabled:opacity-60"
      >
        <legend className="sr-only">Sparziel bearbeiten</legend>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {metadata
            ? "Das Startguthaben enthält nur den Betrag vor den hier erfassten Einzahlungen. Die geplante Sparrate ist keine automatische Einzahlung. Eine Rate von 0 pausiert die Planung."
            : initial.operation === "contribute"
              ? "Erfasse nur tatsächlich eingezahltes Geld, das noch nicht im Startguthaben oder einer anderen Einzahlung enthalten ist. Dies erhöht deinen Sparstand; Monatsbudget und geplante Sparrate bleiben unverändert."
              : "Die Einzahlung bleibt im Verlauf als storniert sichtbar und zählt nicht mehr zum Sparstand. Monatsbudget und geplante Sparrate bleiben unverändert."}
        </p>
        {initial.operation === "update" && (
          <p className="rounded-xl border p-4 text-sm">
            Für eine andere Sparrate wähle einen Monat nach {initial.month}.
            Frühere Monatspläne behalten ihre Rate. Für Änderungen nur an Name,
            Zielbetrag, Startguthaben oder Zieldatum lasse Rate und Startmonat
            unverändert.
          </p>
        )}
        {fields.map((field) => {
          const monetary = ["target", "opening", "monthly", "amount"].includes(
            field.name,
          );
          return (
            <div key={field.name}>
              <label
                htmlFor={`goal-${field.name}`}
                className="mb-2 block text-sm font-medium"
              >
                {field.label}
              </label>
              <input
                id={`goal-${field.name}`}
                name={field.name}
                type={field.type}
                inputMode={monetary ? "decimal" : undefined}
                maxLength={
                  ["name", "note"].includes(field.name) ? 80 : undefined
                }
                min={
                  field.type === "month"
                    ? "2000-01"
                    : field.type === "date"
                      ? "2000-01-01"
                      : undefined
                }
                max={
                  field.type === "month"
                    ? "2100-12"
                    : field.type === "date"
                      ? "2100-12-31"
                      : undefined
                }
                value={values[field.name]}
                onChange={(event) =>
                  setValues({ ...values, [field.name]: event.target.value })
                }
                aria-invalid={!!errors[field.name]}
                aria-describedby={`${field.name}-error${monetary ? " money-help" : ""}`}
                className="min-h-12 w-full rounded-xl border bg-background px-3 text-base"
              />
              <p id={`${field.name}-error`} className="mt-2 text-sm">
                {errors[field.name]}
              </p>
            </div>
          );
        })}
        {initial.operation !== "cancel" && (
          <p id="money-help" className="text-xs text-muted-foreground">
            Beträge bis 999.999.999,99 €, höchstens zwei Nachkommastellen, ohne
            Tausendertrennzeichen. Startguthaben und Sparrate dürfen 0 sein.
          </p>
        )}
        {initial.operation === "cancel" && (
          <>
            <p className="rounded-xl border p-4 text-sm break-words">
              {formatEuro(initial.cancelledAmount!)} · {initial.date}
              {initial.note ? ` · ${initial.note}` : ""}
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
              <span>Diese Einzahlung stornieren</span>
            </label>
          </>
        )}
        <button
          disabled={pending}
          className="min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
        >
          {pending
            ? "Speichern …"
            : metadata
              ? "Sparziel speichern"
              : initial.operation === "contribute"
                ? "Einzahlung speichern"
                : "Stornierung bestätigen"}
        </button>
      </fieldset>
      {state.message && (
        <div role="alert" className="space-y-2 rounded-xl border p-4 text-sm">
          <p>{state.message}</p>
          <a
            className="inline-flex min-h-11 items-center underline"
            href={
              initial.operation === "create"
                ? "/account/goals"
                : `/account/goals/${initial.id}`
            }
          >
            Aktuellen Stand öffnen
          </a>
        </div>
      )}
      <Link
        href={
          initial.operation === "create"
            ? "/account/goals"
            : `/account/goals/${initial.id}`
        }
        className="inline-flex min-h-11 items-center text-sm underline"
      >
        Abbrechen und zurück
      </Link>
    </form>
  );
}

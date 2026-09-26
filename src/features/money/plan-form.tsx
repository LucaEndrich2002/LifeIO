"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { amountInput, formatEuro, monthLabel } from "@/domain/money";
import type { FormState } from "@/features/auth/form-state";
import { savePlan } from "@/server/plan-actions";

export type PlanInitial = {
  id: string;
  new_id: string;
  revision: number;
  operation: "create" | "change" | "end" | "update" | "delete";
  name: string;
  amount: number | null;
  month: string;
  end_month: string;
  start_month: string;
  return_month: string;
};
export function PlanForm({
  kind,
  initial,
}: {
  kind: "fixed" | "budget";
  initial: PlanInitial;
}) {
  const [state, action, pending] = useActionState(savePlan.bind(null, kind), {
    status: "idle",
  } as FormState);
  const [values, setValues] = useState({
    name: initial.name,
    amount: initial.amount === null ? "" : amountInput(initial.amount),
    month: initial.month,
    end_month: initial.end_month,
  });
  const [confirmed, setConfirmed] = useState(false);
  const destructive =
    initial.operation === "end" || initial.operation === "delete";
  const errors = state.errors ?? {};
  const fields = [
    ...(!destructive
      ? [
          { name: "name" as const, label: "Bezeichnung", type: "text" },
          {
            name: "amount" as const,
            label:
              kind === "budget" ? "Monatslimit (€)" : "Monatlicher Betrag (€)",
            type: "text",
          },
        ]
      : []),
    ...(initial.operation !== "delete"
      ? [
          {
            name: "month" as const,
            label:
              initial.operation === "end"
                ? "Letzter gültiger Monat"
                : kind === "budget"
                  ? "Budgetmonat"
                  : initial.operation === "change"
                    ? "Änderung gültig ab"
                    : "Erster gültiger Monat",
            type: "month",
          },
        ]
      : []),
    ...(kind === "fixed" && !destructive
      ? [
          {
            name: "end_month" as const,
            label: "Letzter gültiger Monat (optional)",
            type: "month",
          },
        ]
      : []),
  ];
  return (
    <form action={action} noValidate className="space-y-5">
      {(["id", "new_id", "revision", "operation", "return_month"] as const).map(
        (key) => (
          <input key={key} type="hidden" name={key} value={initial[key]} />
        ),
      )}
      <fieldset
        disabled={pending}
        className="min-w-0 space-y-5 disabled:opacity-60"
      >
        <legend className="sr-only">
          {kind === "fixed" ? "Fixkosten" : "Monatsbudget"}
        </legend>
        {initial.operation !== "create" && (
          <div className="space-y-2 rounded-xl border p-4 text-sm">
            <p className="break-words font-medium">
              {initial.name} · {formatEuro(initial.amount!)}
            </p>
            <p className="text-muted-foreground">
              {kind === "fixed"
                ? `Bisher ab ${monthLabel(initial.start_month)}${initial.end_month ? ` bis einschließlich ${monthLabel(initial.end_month)}` : " ohne Endmonat"}.`
                : monthLabel(initial.month)}
            </p>
          </div>
        )}
        <p className="text-sm leading-relaxed text-muted-foreground">
          {kind === "budget"
            ? "Dieses Limit gilt für alle erfassten variablen Ausgaben dieses Monats, unabhängig von ihrer Kategorie. Fixkosten und Sparraten zählen nicht dazu. Das Limit wird nicht zusätzlich vom verfügbaren Betrag abgezogen."
            : initial.operation === "end"
              ? "Der gewählte letzte Monat zählt noch vollständig. Ab dem Folgemonat entfällt diese Fixkostenposition. Frühere Monate bleiben erhalten."
              : initial.operation === "change"
                ? "Der neue Betrag gilt ab einem späteren Monat innerhalb der bisherigen Laufzeit. Monate davor behalten ihre bisherigen Werte. Die bisherigen Angaben werden als Verlauf aufbewahrt."
                : "Die Fixkosten zählen in jedem gültigen Monat einmal. Der letzte Monat zählt noch mit; ohne Endmonat läuft die Planung weiter. Erfasse diese Beträge nicht zusätzlich als variable Ausgabe."}
        </p>
        {fields.map((field) => (
          <div key={field.name}>
            <label
              htmlFor={`plan-${field.name}`}
              className="mb-2 block text-sm font-medium"
            >
              {field.label}
            </label>
            <input
              id={`plan-${field.name}`}
              name={field.name}
              type={field.type}
              inputMode={field.name === "amount" ? "decimal" : undefined}
              min={field.type === "month" ? "2000-01" : undefined}
              max={field.type === "month" ? "2100-12" : undefined}
              maxLength={field.name === "name" ? 80 : undefined}
              readOnly={
                kind === "budget" &&
                initial.operation === "update" &&
                field.name === "month"
              }
              value={values[field.name]}
              onChange={(event) =>
                setValues({ ...values, [field.name]: event.target.value })
              }
              aria-invalid={!!errors[field.name]}
              aria-describedby={`${field.name}-error${field.name === "amount" ? " amount-help" : ""}`}
              className="min-h-12 w-full rounded-xl border bg-background px-3 text-base read-only:bg-muted"
            />
            {field.name === "amount" && (
              <p
                id="amount-help"
                className="mt-2 text-xs text-muted-foreground"
              >
                Positiv, höchstens 999.999.999,99 €. Komma oder Punkt, ohne
                Tausendertrennzeichen.
              </p>
            )}
            <p id={`${field.name}-error`} className="mt-2 text-sm">
              {errors[field.name]}
            </p>
          </div>
        ))}
        {destructive && (
          <label className="flex min-h-12 items-start gap-3 rounded-xl border p-4 text-sm">
            <input
              type="checkbox"
              name="confirm"
              value="yes"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1 size-4 shrink-0"
            />
            <span>
              {initial.operation === "end"
                ? "Fixkosten nach dem gewählten Monat beenden"
                : "Dieses Monatsbudget endgültig löschen. Meine Ausgaben bleiben erhalten."}
            </span>
          </label>
        )}
        <button
          disabled={pending}
          className="min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
        >
          {pending
            ? "Speichern …"
            : initial.operation === "end"
              ? "Fixkosten beenden"
              : initial.operation === "delete"
                ? "Budget löschen"
                : kind === "fixed"
                  ? "Fixkosten speichern"
                  : "Budget speichern"}
        </button>
      </fieldset>
      {state.message && (
        <div role="alert" className="space-y-2 rounded-xl border p-4 text-sm">
          <p>{state.message}</p>
          <a
            href={
              kind === "fixed"
                ? `/account/money/fixed?month=${initial.return_month}`
                : `/account/money?month=${initial.return_month}`
            }
            className="inline-flex min-h-11 items-center underline"
          >
            Aktuellen Stand öffnen
          </a>
        </div>
      )}
      <Link
        href={`/account/money?month=${initial.return_month}`}
        className="inline-flex min-h-11 items-center text-sm underline"
      >
        Abbrechen und zurück
      </Link>
    </form>
  );
}

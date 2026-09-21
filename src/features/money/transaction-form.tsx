"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { categories, type TransactionKind } from "@/domain/transactions";
import { amountInput, formatEuro } from "@/domain/money";
import type { FormState } from "@/features/auth/form-state";
import { saveTransaction } from "@/server/money-actions";

export type TransactionInitial = {
  id: string;
  revision: number;
  name: string;
  amount: number | null;
  date: string;
  category: string;
  operation: "create" | "update" | "delete";
  returnMonth: string;
};
export function TransactionForm({
  kind,
  initial,
}: {
  kind: TransactionKind;
  initial: TransactionInitial;
}) {
  const [state, action, pending] = useActionState(
    saveTransaction.bind(null, kind),
    { status: "idle" } as FormState,
  );
  const [name, setName] = useState(initial.name);
  const [amount, setAmount] = useState(
    initial.amount === null ? "" : amountInput(initial.amount),
  );
  const [date, setDate] = useState(initial.date);
  const [category, setCategory] = useState(initial.category);
  const [confirmed, setConfirmed] = useState(false);
  const inputClass =
    "min-h-12 w-full rounded-xl border bg-background px-3 text-base";
  const errors = state.errors ?? {};
  const dateName = kind === "income" ? "month" : "spent_on";
  return (
    <form action={action} noValidate className="space-y-5">
      {(["id", "revision", "operation"] as const).map((key) => (
        <input key={key} type="hidden" name={key} value={initial[key]} />
      ))}
      <input type="hidden" name="return_month" value={initial.returnMonth} />
      <fieldset
        disabled={pending}
        className="min-w-0 space-y-5 disabled:opacity-60"
      >
        <legend className="sr-only">
          {kind === "income" ? "Einnahme" : "Ausgabe"}
        </legend>
        {initial.operation === "delete" ? (
          <>
            <div className="space-y-2 rounded-xl border p-4">
              <p className="break-words font-medium">{initial.name}</p>
              <p className="text-sm">
                {formatEuro(initial.amount!)} · {initial.date}
              </p>
              <p className="text-sm text-muted-foreground">
                Der Eintrag wird endgültig entfernt und zählt danach nicht mehr
                in der Monatsrechnung.
              </p>
            </div>
            <label className="flex min-h-12 items-center gap-3 text-sm">
              <input
                type="checkbox"
                name="confirm_delete"
                value="yes"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="size-5 shrink-0 accent-primary"
              />
              Diesen Eintrag endgültig löschen
            </label>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium">
                Bezeichnung
              </label>
              <input
                id="name"
                name="name"
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={inputClass}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              {errors.name && (
                <p id="name-error" className="mt-2 text-sm">
                  {errors.name}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="amount"
                className="mb-2 block text-sm font-medium"
              >
                Betrag (€)
              </label>
              <input
                id="amount"
                name="amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className={inputClass}
                aria-invalid={!!errors.amount}
                aria-describedby="amount-help amount-error"
              />
              <p
                id="amount-help"
                className="mt-2 text-xs text-muted-foreground"
              >
                Positiv, höchstens 999.999.999,99 €. Komma oder Punkt, ohne
                Tausendertrennzeichen.
              </p>
              <p id="amount-error" className="mt-2 text-sm">
                {errors.amount}
              </p>
            </div>
            <div>
              <label
                htmlFor="entry-date"
                className="mb-2 block text-sm font-medium"
              >
                {kind === "income" ? "Monat" : "Datum"}
              </label>
              <input
                id="entry-date"
                name={dateName}
                type={kind === "income" ? "month" : "date"}
                min={kind === "income" ? "2000-01" : "2000-01-01"}
                max={kind === "income" ? "2100-12" : "2100-12-31"}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={inputClass}
                aria-invalid={!!errors[dateName]}
                aria-describedby={errors[dateName] ? "date-error" : undefined}
              />
              {errors[dateName] && (
                <p id="date-error" className="mt-2 text-sm">
                  {errors[dateName]}
                </p>
              )}
            </div>
            {kind === "expense" && (
              <div>
                <label
                  htmlFor="category"
                  className="mb-2 block text-sm font-medium"
                >
                  Kategorie
                </label>
                <select
                  id="category"
                  name="category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className={inputClass}
                  aria-invalid={!!errors.category}
                  aria-describedby={
                    errors.category ? "category-error" : undefined
                  }
                >
                  {Object.entries(categories).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p id="category-error" className="mt-2 text-sm">
                    {errors.category}
                  </p>
                )}
              </div>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">
              {kind === "income"
                ? "Diese Einnahme gilt nur für den gewählten Monat und wird nicht automatisch wiederholt."
                : "Erfasse hier variable Ausgaben. Bereits eingeplante Fixkosten werden separat berücksichtigt; trage sie hier nicht noch einmal ein."}
            </p>
          </>
        )}
        <button
          disabled={pending}
          className="min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
        >
          {pending
            ? "Speichern …"
            : initial.operation === "delete"
              ? "Jetzt löschen"
              : "Eintrag speichern"}
        </button>
      </fieldset>
      {state.message && (
        <div role="alert" className="space-y-2 rounded-xl border p-4 text-sm">
          <p>{state.message}</p>
          {initial.operation !== "create" && (
            <a
              href={`/account/money/${kind}/${initial.id}?month=${initial.returnMonth}`}
              className="inline-flex min-h-11 items-center underline"
            >
              Aktuellen Stand öffnen
            </a>
          )}
        </div>
      )}
      <Link
        href={`/account/money?month=${initial.returnMonth}`}
        className="inline-flex min-h-11 items-center text-sm underline"
      >
        Abbrechen und zurück
      </Link>
    </form>
  );
}

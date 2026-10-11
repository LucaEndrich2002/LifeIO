"use client";

import { useActionState, useState } from "react";
import { OnboardingField } from "@/features/onboarding/onboarding-field";
import { amountInput } from "@/domain/money";
import type { OnboardingStep } from "@/domain/onboarding";
import type { FormState } from "@/features/auth/form-state";
import { saveOnboarding } from "@/server/onboarding-actions";
import { OnboardingTasksFields } from "@/features/onboarding/onboarding-tasks-fields";

export type InitialOnboardingForm = {
  revision: number;
  month: string;
  decision: string;
  name: string;
  amount: number | null;
  expenses: { name: string; amount_minor: number }[];
  tasks: { title: string; priority: string; due_on: string }[];
  target: number | null;
  current: number | null;
  monthly: number | null;
};

export function OnboardingForm({
  step,
  initial,
}: {
  step: OnboardingStep;
  initial: InitialOnboardingForm;
}) {
  const [state, action, pending] = useActionState(
    saveOnboarding.bind(null, step),
    { status: "idle" } as FormState,
  );
  const [decision, setDecision] = useState(
    initial.decision === "skipped" ? "skipped" : "saved",
  );
  const [name, setName] = useState(initial.name);
  const [amount, setAmount] = useState(
    initial.amount === null ? "" : amountInput(initial.amount),
  );
  const [month, setMonth] = useState(initial.month);
  const [target, setTarget] = useState(
    initial.target === null ? "" : amountInput(initial.target),
  );
  const [current, setCurrent] = useState(
    initial.current === null ? "" : amountInput(initial.current),
  );
  const [monthly, setMonthly] = useState(
    initial.monthly === null ? "" : amountInput(initial.monthly),
  );
  const [items, setItems] = useState(
    initial.expenses.length
      ? initial.expenses.map((item, key) => ({
          key,
          name: item.name,
          amount: amountInput(item.amount_minor),
        }))
      : [{ key: 0, name: "", amount: "" }],
  );
  const errors = state.errors ?? {};
  const labels = {
    income: ["Einkommen erfassen", "Kein Einkommen angeben"],
    expenses: ["Fixkosten erfassen", "Keine Fixkosten angeben"],
    goal: ["Sparziel erfassen", "Noch kein Sparziel angeben"],
    tasks: ["Erste Aufgaben erfassen", "Aufgaben vorerst überspringen"],
    review: [],
  };

  return (
    <form action={action} noValidate className="space-y-6">
      <input type="hidden" name="revision" value={initial.revision} />
      <fieldset
        disabled={pending}
        className="min-w-0 space-y-6 disabled:opacity-60"
      >
        <legend className="sr-only">
          {step === "review" ? "Einrichtung abschließen" : "Deine Angaben"}
        </legend>
        {step === "income" && (
          <>
            <OnboardingField
              id="month"
              name="month"
              type="month"
              min="2000-01"
              max="2100-12"
              label="Dein Startmonat"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              error={errors.month}
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Dieser Monat gilt für dein Einkommen und den Beginn deiner
              monatlichen Fixkosten. Du kannst ihn vor dem Abschluss noch
              ändern.
            </p>
          </>
        )}
        {step !== "review" && (
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">
              Was möchtest du angeben?
            </legend>
            {["saved", "skipped"].map((value, index) => (
              <label
                key={value}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm"
              >
                <input
                  type="radio"
                  name="decision"
                  value={value}
                  checked={decision === value}
                  onChange={() => setDecision(value)}
                  className="size-4 shrink-0 accent-primary"
                />
                {labels[step][index]}
              </label>
            ))}
          </fieldset>
        )}
        {decision === "skipped" && step !== "review" && (
          <p className="rounded-xl bg-muted p-4 text-sm leading-relaxed">
            {step === "tasks"
              ? "Du startest ohne erste Aufgaben. Bereits in diesem Schritt gespeicherte Aufgaben werden beim Fortfahren entfernt. Später kannst du in Plan jederzeit Aufgaben anlegen."
              : "Wir speichern deine Entscheidung ohne einen Finanzdatensatz. Bereits in diesem Schritt gespeicherte Angaben werden beim Fortfahren entfernt."}
          </p>
        )}
        {decision === "saved" && (step === "income" || step === "goal") && (
          <OnboardingField
            id="name"
            name="name"
            label={
              step === "income"
                ? "Bezeichnung des Einkommens"
                : "Name deines Sparziels"
            }
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={errors.name}
          />
        )}
        {decision === "saved" && step === "income" && (
          <OnboardingField
            id="amount"
            name="amount"
            label="Monatliches Nettoeinkommen (€)"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            error={errors.amount}
          />
        )}
        {decision === "saved" && step === "expenses" && (
          <div className="space-y-4">
            {items.map((item, index) => (
              <fieldset
                key={item.key}
                className="min-w-0 space-y-4 rounded-xl border p-4"
              >
                <legend className="px-2 text-sm font-medium">
                  Fixkosten {index + 1}
                </legend>
                <OnboardingField
                  id={`expense-${item.key}-name`}
                  name="expense_name"
                  label={`Bezeichnung ${index + 1}`}
                  maxLength={80}
                  value={item.name}
                  onChange={(event) =>
                    setItems(
                      items.map((row) =>
                        row.key === item.key
                          ? { ...row, name: event.target.value }
                          : row,
                      ),
                    )
                  }
                  error={errors[`items.${index}.name`]}
                />
                <OnboardingField
                  id={`expense-${item.key}-amount`}
                  name="expense_amount"
                  label={`Monatsbetrag ${index + 1} (€)`}
                  inputMode="decimal"
                  value={item.amount}
                  onChange={(event) =>
                    setItems(
                      items.map((row) =>
                        row.key === item.key
                          ? { ...row, amount: event.target.value }
                          : row,
                      ),
                    )
                  }
                  error={errors[`items.${index}.amount`]}
                />
                <button
                  type="button"
                  className="min-h-11 text-sm text-muted-foreground underline"
                  onClick={() =>
                    setItems(items.filter((row) => row.key !== item.key))
                  }
                >
                  Fixkosten {index + 1} entfernen
                </button>
              </fieldset>
            ))}
            {errors.items && (
              <p role="alert" className="text-sm text-destructive">
                {errors.items}
              </p>
            )}
            <button
              type="button"
              disabled={items.length >= 20}
              className="min-h-12 w-full rounded-xl border px-4 text-sm font-medium disabled:opacity-50"
              onClick={() =>
                setItems([
                  ...items,
                  {
                    key: Math.max(-1, ...items.map((item) => item.key)) + 1,
                    name: "",
                    amount: "",
                  },
                ])
              }
            >
              Weitere Fixkosten hinzufügen
            </button>
          </div>
        )}
        {decision === "saved" && step === "goal" && (
          <>
            <OnboardingField
              id="target"
              name="target"
              label="Zielbetrag (€)"
              inputMode="decimal"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              error={errors.target}
            />
            <OnboardingField
              id="current"
              name="current"
              label="Bereits gespart (€)"
              inputMode="decimal"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              error={errors.current}
            />
            <OnboardingField
              id="monthly"
              name="monthly"
              label="Geplante monatliche Sparrate (€)"
              inputMode="decimal"
              value={monthly}
              onChange={(event) => setMonthly(event.target.value)}
              error={errors.monthly}
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Noch nichts gespart oder keine feste Sparrate? Gib 0 ein. Eine
              geplante Sparrate ist noch keine Einzahlung.
            </p>
          </>
        )}
        {step === "tasks" && (
          <OnboardingTasksFields
            initial={initial.tasks}
            errors={errors}
            hidden={decision !== "saved"}
          />
        )}
        {step !== "review" && step !== "tasks" && decision === "saved" && (
          <p className="text-xs text-muted-foreground">
            Alle Beträge in Euro. Komma oder Punkt als Dezimalzeichen, ohne
            Tausendertrennzeichen. Höchstens 999.999.999,99 € je Betrag.
          </p>
        )}
        <button
          disabled={pending}
          className="min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {pending
            ? "Speichern …"
            : step === "review"
              ? "Einrichtung abschließen"
              : "Speichern und weiter"}
        </button>
      </fieldset>
      {state.message && (
        <div role="alert" className="space-y-2 rounded-xl border p-4 text-sm">
          <p>{state.message}</p>
          <a
            href={`/account/onboarding/${step}`}
            className="inline-flex min-h-11 items-center font-medium underline"
          >
            Aktuellen Stand neu laden
          </a>
        </div>
      )}
    </form>
  );
}

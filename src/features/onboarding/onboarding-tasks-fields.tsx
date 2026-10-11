"use client";

import { useState } from "react";
import { onboardingTaskLimit } from "@/domain/onboarding";
import { taskPriorities } from "@/domain/tasks";
import { OnboardingField } from "@/features/onboarding/onboarding-field";

type TaskInput = { title: string; priority: string; due_on: string };
export function OnboardingTasksFields({
  initial,
  errors,
  hidden,
}: {
  initial: TaskInput[];
  errors: Record<string, string>;
  hidden: boolean;
}) {
  const [items, setItems] = useState(() =>
    (initial.length
      ? initial
      : [{ title: "", priority: "normal", due_on: "" }]
    ).map((item, key) => ({ ...item, key })),
  );
  function change(key: number, field: keyof TaskInput, value: string) {
    setItems(
      items.map((item) =>
        item.key === key ? { ...item, [field]: value } : item,
      ),
    );
  }
  return (
    <fieldset hidden={hidden} disabled={hidden} className="min-w-0 space-y-4">
      <legend className="sr-only">Erste Aufgaben</legend>
      <p className="text-sm text-muted-foreground">
        Fälligkeiten sind Kalendertage ohne Uhrzeit. Ohne Datum bleibt eine
        Aufgabe jederzeit in Plan sichtbar.
      </p>
      {items.map((item, index) => (
        <fieldset
          key={item.key}
          className="min-w-0 space-y-4 rounded-xl border p-4"
        >
          <legend className="px-2 text-sm font-medium">
            Aufgabe {index + 1}
          </legend>
          <OnboardingField
            id={`task-${item.key}-title`}
            name="task_title"
            label={`Titel ${index + 1}`}
            value={item.title}
            onChange={(event) => change(item.key, "title", event.target.value)}
            error={errors[`items.${index}.title`]}
          />
          <div>
            <label
              htmlFor={`task-${item.key}-priority`}
              className="mb-2 block text-sm font-medium"
            >
              Priorität {index + 1}
            </label>
            <select
              id={`task-${item.key}-priority`}
              name="task_priority"
              value={item.priority}
              onChange={(event) =>
                change(item.key, "priority", event.target.value)
              }
              className="min-h-12 w-full rounded-xl border bg-background px-3 text-base"
              aria-invalid={!!errors[`items.${index}.priority`]}
              aria-describedby={
                errors[`items.${index}.priority`]
                  ? `task-${item.key}-priority-error`
                  : undefined
              }
            >
              {Object.entries(taskPriorities).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors[`items.${index}.priority`] && (
              <p
                id={`task-${item.key}-priority-error`}
                className="mt-2 text-sm text-destructive"
              >
                {errors[`items.${index}.priority`]}
              </p>
            )}
          </div>
          <OnboardingField
            id={`task-${item.key}-date`}
            name="task_due_on"
            label={`Fällig am ${index + 1} (optional)`}
            type="date"
            min="2000-01-01"
            max="2100-12-31"
            value={item.due_on}
            onChange={(event) => change(item.key, "due_on", event.target.value)}
            error={errors[`items.${index}.due_on`]}
          />
          <button
            type="button"
            className="min-h-11 text-sm text-muted-foreground underline"
            onClick={() =>
              setItems(items.filter((row) => row.key !== item.key))
            }
          >
            Aufgabe {index + 1} entfernen
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
        disabled={items.length >= onboardingTaskLimit}
        className="min-h-12 w-full rounded-xl border px-4 text-sm font-medium disabled:opacity-50"
        onClick={() =>
          setItems([
            ...items,
            {
              key: Math.max(-1, ...items.map((item) => item.key)) + 1,
              title: "",
              priority: "normal",
              due_on: "",
            },
          ])
        }
      >
        Weitere Aufgabe hinzufügen
      </button>
    </fieldset>
  );
}

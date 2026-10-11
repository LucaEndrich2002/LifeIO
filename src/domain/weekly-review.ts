import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod";
import {
  dateInZone,
  dateSchema,
  moneySnapshotSchema,
} from "@/domain/transactions";
import { formatEuro, monthLabel, monthSchema } from "@/domain/money";
import { taskPrioritySchema } from "@/domain/tasks";

export const firstReviewWeek = "2000-01-03";
export const lastReviewWeek = "2100-12-13";
export function reviewWeek(day: string) {
  const date = Temporal.PlainDate.from(dateSchema.parse(day));
  return date.subtract({ days: date.dayOfWeek - 1 }).toString();
}
export const reviewWeekSchema = dateSchema.pipe(
  z
    .string()
    .refine(
      (day) =>
        day >= firstReviewWeek &&
        day <= lastReviewWeek &&
        reviewWeek(day) === day,
      "Bitte wähle eine unterstützte Woche ab Montag.",
    ),
);
export function latestReviewWeek(now: Date, zone: string) {
  const week = Temporal.PlainDate.from(reviewWeek(dateInZone(now, zone)))
    .subtract({ days: 7 })
    .toString();
  return week > lastReviewWeek ? lastReviewWeek : week;
}
export function reviewDays(week: string) {
  const start = Temporal.PlainDate.from(reviewWeekSchema.parse(week));
  return {
    start: week,
    end: start.add({ days: 6 }).toString(),
    previous: start.subtract({ days: 7 }).toString(),
    next: start.add({ days: 7 }).toString(),
    nextEnd: start.add({ days: 13 }).toString(),
  };
}
export const reviewMutationSchema = z.object({
  week: reviewWeekSchema,
  revision: z.coerce.number().int().min(-1).max(2147483646),
});
const count = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const total = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .refine(Number.isSafeInteger);
const instant = z.iso.datetime({ offset: true });
const goal = z
  .object({
    id: z.uuid(),
    name: z.string(),
    kind: z.enum(["financial", "personal"]),
    deadline: dateSchema.nullable(),
    reached: z.boolean(),
    target_minor: count.positive().nullable(),
    balance: total.nullable(),
    milestone_total: count,
    milestone_completed: count,
  })
  .refine(
    (value) =>
      value.milestone_completed <= value.milestone_total &&
      (value.kind === "financial"
        ? value.target_minor !== null && value.balance !== null
        : value.target_minor === null && value.balance === null),
  );
export const weeklySnapshotSchema = z
  .object({
    version: z.literal(1),
    currency: z.literal("EUR"),
    week_start: reviewWeekSchema,
    week_end: dateSchema,
    time_zone: z.string(),
    range_start: instant,
    range_end: instant,
    expenses: z.object({
      current_minor: total,
      current_count: count,
      previous_minor: total,
      previous_count: count,
    }),
    months: z
      .array(
        z.object({
          month: monthSchema,
          totals: moneySnapshotSchema.shape.totals,
          fixed_known: z.boolean(),
          budget: moneySnapshotSchema.shape.budget,
        }),
      )
      .min(1)
      .max(2),
    goals: z.object({
      total: count,
      items: z.array(goal).max(6),
      contributions_minor: total,
      contribution_count: count,
      milestones_completed: count,
      next_count: count,
      next_items: z
        .array(
          z.object({ id: z.uuid(), name: z.string(), deadline: dateSchema }),
        )
        .max(3),
    }),
    tasks: z.object({
      open: count,
      undated: count,
      due_by_end: count,
      next_due: count,
      completed: count,
      items: z
        .array(
          z.object({
            id: z.uuid(),
            title: z.string(),
            priority: taskPrioritySchema,
            due_on: dateSchema.nullable(),
          }),
        )
        .max(3),
    }),
    events: z.object({
      next_count: count,
      items: z
        .array(
          z.object({
            id: z.uuid(),
            title: z.string(),
            starts_at: instant,
            ends_at: instant,
          }),
        )
        .max(3),
    }),
  })
  .refine(
    (value) =>
      value.week_end === reviewDays(value.week_start).end &&
      value.goals.items.length <= value.goals.total &&
      value.goals.next_items.length <= value.goals.next_count &&
      value.tasks.items.length <= value.tasks.open &&
      value.tasks.undated <= value.tasks.open &&
      value.tasks.due_by_end <= value.tasks.open &&
      value.tasks.next_due <= value.tasks.open &&
      value.events.items.length <= value.events.next_count,
  );
export type WeeklySnapshot = z.output<typeof weeklySnapshotSchema>;
export const weeklyReviewSchema = z
  .object({
    week_start: reviewWeekSchema,
    time_zone: z.string(),
    rule_version: z.literal(1),
    revision: count,
    created_at: instant,
    updated_at: instant,
    snapshot: weeklySnapshotSchema,
  })
  .refine(
    (value) =>
      value.week_start === value.snapshot.week_start &&
      value.time_zone === value.snapshot.time_zone,
  );
export type WeeklyReview = z.output<typeof weeklyReviewSchema>;

// Version 1 is part of the saved review contract. Future rule changes need a new
// version so reopening an old snapshot cannot silently change its interpretation.
export function weeklyInsights(data: WeeklySnapshot) {
  const hints: { id: string; title: string; detail: string; href: string }[] =
    [];
  for (const month of data.months) {
    if (
      month.budget &&
      BigInt(month.totals.variable) * 100n >=
        BigInt(month.budget.amount_minor) * 90n
    )
      hints.push({
        id: `budget-${month.month}`,
        title:
          month.totals.variable > month.budget.amount_minor
            ? "Monatsbudget überschritten"
            : "Mindestens 90 % des Monatsbudgets genutzt",
        detail: `${monthLabel(month.month)}: ${formatEuro(month.totals.variable)} variable Ausgaben bei ${formatEuro(month.budget.amount_minor)} Budget. Der Wert umfasst den ganzen Monat.`,
        href: `/account/money?month=${month.month}#budget`,
      });
  }
  if (data.tasks.due_by_end)
    hints.push({
      id: "due-tasks",
      title: "Offene Aufgaben mit vergangener Fälligkeit",
      detail: `${data.tasks.due_by_end} zum Datenstand offene Aufgaben waren bis zum Ende dieser Woche fällig.`,
      href: "/account/plan?view=all&status=open",
    });
  const expense = data.expenses;
  if (expense.current_count && expense.previous_count) {
    const difference = expense.current_minor - expense.previous_minor;
    hints.push({
      id: "expenses",
      title: "Variable Ausgaben im Wochenvergleich",
      detail:
        difference === 0
          ? `In beiden Wochen sind ${formatEuro(expense.current_minor)} erfasst.`
          : `Diese Woche sind ${formatEuro(Math.abs(difference))} ${difference > 0 ? "mehr" : "weniger"} erfasst als in der Vorwoche.`,
      href: `/account/money?month=${data.week_start.slice(0, 7)}`,
    });
  }
  if (data.goals.contribution_count)
    hints.push({
      id: "contributions",
      title: "Einzahlungen für deine Sparziele",
      detail: `${formatEuro(data.goals.contributions_minor)} aus ${data.goals.contribution_count} nicht stornierten Einzahlungen mit Buchungsdatum in dieser Woche.`,
      href: "/account/goals",
    });
  if (data.tasks.completed)
    hints.push({
      id: "completed",
      title: "Aufgaben erledigt",
      detail: `${data.tasks.completed} aktuell noch erledigte Aufgaben wurden in dieser Woche abgeschlossen.`,
      href: "/account/plan?status=completed",
    });
  if (
    !hints.length &&
    (expense.current_count ||
      data.goals.total ||
      data.tasks.open ||
      data.events.next_count ||
      data.months.some(
        (m) => m.totals.income_count || m.budget || m.fixed_known,
      ))
  )
    hints.push({
      id: "basis",
      title: "Deine Angaben bilden die Grundlage",
      detail:
        "Der gespeicherte Überblick zeigt deine erfassten Daten. Für einen belastbaren Wochenvergleich fehlen passende Vergleichsdaten oder Auslöser.",
      href: "/account/home",
    });
  return hints.slice(0, 3);
}

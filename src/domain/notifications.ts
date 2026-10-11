import { z } from "zod";
import { formatEuro, monthLabel, monthSchema } from "@/domain/money";
import { dateSchema } from "@/domain/transactions";
import { taskDateLabel } from "@/domain/tasks";
import { reviewDays, reviewWeekSchema } from "@/domain/weekly-review";

export const notificationQuerySchema = z.object({
  filter: z.enum(["all", "unread"]).default("all"),
  page: z.coerce.number().int().min(0).max(1000000).default(0),
});
export type NotificationQuery = z.output<typeof notificationQuerySchema>;
export function notificationHref(query: NotificationQuery) {
  const valid = notificationQuerySchema.parse(query);
  return `/account/notifications?${new URLSearchParams({ filter: valid.filter, page: String(valid.page) })}`;
}
export const notificationMutationSchema = notificationQuerySchema.extend({
  id: z.uuid(),
  revision: z.coerce.number().int().min(0).max(2147483646),
  read: z.enum(["yes", "no"]).transform((value) => value === "yes"),
});
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const instant = z.iso.datetime({ offset: true });
const minor = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .refine(Number.isSafeInteger);
const base = z.object({
  id: z.uuid(),
  created_at: instant,
  read_at: instant.nullable(),
  revision: count,
  rule_version: z.literal(1),
  checked_on: dateSchema,
  time_zone: z.string(),
});
const namedDeadline = z.object({ name: z.string(), due_on: dateSchema });
export const notificationSchema = z
  .discriminatedUnion("kind", [
    base.extend({
      kind: z.literal("task"),
      task_id: z.uuid(),
      goal_id: z.null(),
      budget_id: z.null(),
      review_week: z.null(),
      context: namedDeadline,
    }),
    base.extend({
      kind: z.literal("goal"),
      task_id: z.null(),
      goal_id: z.uuid(),
      budget_id: z.null(),
      review_week: z.null(),
      context: namedDeadline,
    }),
    base.extend({
      kind: z.literal("budget"),
      task_id: z.null(),
      goal_id: z.null(),
      budget_id: z.uuid(),
      review_week: z.null(),
      context: z.object({
        name: z.string(),
        month: monthSchema,
        currency: z.literal("EUR"),
        spent_minor: minor,
        limit_minor: minor.refine((value) => value > 0),
      }),
    }),
    base.extend({
      kind: z.literal("review"),
      task_id: z.null(),
      goal_id: z.null(),
      budget_id: z.null(),
      review_week: reviewWeekSchema,
      context: z.object({ week_start: reviewWeekSchema }),
    }),
  ])
  .refine((value) => {
    if (value.kind === "review")
      return value.review_week === value.context.week_start;
    if (value.kind === "budget")
      return (
        Number.isSafeInteger(value.context.spent_minor) &&
        Number.isSafeInteger(value.context.limit_minor) &&
        BigInt(value.context.spent_minor) * 100n >=
          BigInt(value.context.limit_minor) * 90n
      );
    return value.context.due_on < value.checked_on;
  });
export type Notification = z.output<typeof notificationSchema>;
export const notificationSnapshotSchema = z
  .object({
    items: z.array(notificationSchema).max(25),
    total: count,
    unread: count,
  })
  .refine((value) => value.items.length <= value.total);

// Stored context describes the first evaluation, never a claim about live data.
export function notificationContent(item: Notification) {
  switch (item.kind) {
    case "task":
      return {
        title: "Aufgabe war überfällig",
        detail: `${item.context.name} · fällig am ${taskDateLabel(item.context.due_on)}; bei der Prüfung noch offen.`,
        href: `/account/plan/${item.task_id}`,
      };
    case "goal":
      return {
        title: "Zieltermin war überschritten",
        detail: `${item.context.name} · Zieltermin ${taskDateLabel(item.context.due_on)}; bei der Prüfung noch nicht erreicht.`,
        href: `/account/goals/${item.goal_id}`,
      };
    case "budget":
      return {
        title:
          item.context.spent_minor > item.context.limit_minor
            ? "Monatsbudget war überschritten"
            : "Mindestens 90 % des Monatsbudgets waren genutzt",
        detail: `${item.context.name} · ${monthLabel(item.context.month)}: ${formatEuro(item.context.spent_minor)} variable Ausgaben bei ${formatEuro(item.context.limit_minor)} Budget.`,
        href: `/account/money?month=${item.context.month}#budget`,
      };
    case "review":
      return {
        title: "Wochenrückblick ist gespeichert",
        detail: `${taskDateLabel(item.review_week)} bis ${taskDateLabel(reviewDays(item.review_week).end)}. Öffne den Rückblick für seinen gespeicherten Datenstand.`,
        href: `/account/review?week=${item.review_week}`,
      };
  }
}

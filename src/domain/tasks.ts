import { z } from "zod";
import { dateSchema } from "@/domain/transactions";

export const taskPriorities = {
  high: "Hoch",
  normal: "Normal",
  low: "Niedrig",
} as const;
export const taskPrioritySchema = z.enum(["high", "normal", "low"]);
export const taskViews = {
  all: "Alle",
  day: "Tag",
  week: "Woche",
  undated: "Ohne Datum",
} as const;
export const taskQuerySchema = z.object({
  view: z.enum(["all", "day", "week", "undated"]).default("all"),
  status: z.enum(["open", "completed"]).default("open"),
  day: dateSchema,
  page: z.coerce.number().int().min(0).max(1000000).default(0),
});
export type TaskQuery = z.output<typeof taskQuerySchema>;
export const taskInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Bitte gib einen Titel ein.")
    .refine((value) => [...value].length <= 80, "Höchstens 80 Zeichen."),
  priority: taskPrioritySchema,
  due_on: z.union([z.literal(""), dateSchema]),
});
export const taskMutationSchema = taskQuerySchema.extend({
  id: z.uuid(),
  revision: z.coerce.number().int().min(0).max(2147483646),
  operation: z.enum(["create", "update", "complete", "reopen", "remove"]),
});
export const taskSchema = z.object({
  id: z.uuid(),
  title: taskInputSchema.shape.title,
  priority: taskPrioritySchema,
  due_on: dateSchema.nullable(),
  revision: z.number().int().nonnegative(),
  completed_at: z.string().nullable(),
});
export const taskSnapshotSchema = z
  .object({
    items: z.array(taskSchema).max(25),
    total: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  })
  .refine((value) => value.items.length <= value.total);

export function taskListHref(query: TaskQuery) {
  const valid = taskQuerySchema.parse(query);
  return `/account/plan?${new URLSearchParams({ view: valid.view, status: valid.status, day: valid.day, page: String(valid.page) })}`;
}
// Fälligkeiten are calendar days, never instants. Weeks run Monday through Sunday.
export function taskWeek(day: string) {
  const date = new Date(`${dateSchema.parse(day)}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  const start = date.toISOString().slice(0, 10);
  date.setUTCDate(date.getUTCDate() + 6);
  return { start, end: date.toISOString().slice(0, 10) };
}
export function taskDateLabel(day: string) {
  const [year, month, date] = day.split("-");
  return `${date}.${month}.${year}`;
}
export function taskIsOverdue(
  task: { due_on: string | null; completed_at: string | null },
  today: string,
) {
  return (
    task.completed_at === null && task.due_on !== null && task.due_on < today
  );
}

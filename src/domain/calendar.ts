import { z } from "zod";
import { dateSchema } from "@/domain/transactions";
import { profileSchema } from "@/domain/profile";
import { taskInputSchema } from "@/domain/tasks";

const localTime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/,
    "Bitte gib Datum und Uhrzeit minutengenau an.",
  )
  .refine(
    (value) => dateSchema.safeParse(value.slice(0, 10)).success,
    "Bitte wähle ein gültiges Datum zwischen 2000 und 2100.",
  );
export const occurrenceSchema = z.enum(["auto", "earlier", "later"]);
export const calendarInputSchema = z.object({
  title: taskInputSchema.shape.title,
  time_zone: profileSchema.shape.time_zone,
  start_local: localTime,
  end_local: localTime,
  start_occurrence: occurrenceSchema,
  end_occurrence: occurrenceSchema,
});
// Adjacent boundary days remain selectable when an event is viewed in another zone.
export const calendarDaySchema = z.union([
  dateSchema,
  z.enum(["1999-12-30", "1999-12-31", "2101-01-01", "2101-01-02"]),
]);
export const calendarQuerySchema = z.object({
  view: z.enum(["day", "week"]).default("week"),
  day: calendarDaySchema,
  page: z.coerce.number().int().min(0).max(1000000).default(0),
});
export type CalendarQuery = z.output<typeof calendarQuerySchema>;
export type CalendarSearch = { view?: string; day?: string; page?: string };
export const calendarMutationSchema = calendarQuerySchema.extend({
  id: z.uuid(),
  revision: z.coerce.number().int().min(0).max(2147483646),
  operation: z.enum(["create", "update", "remove"]),
});
export const calendarEventSchema = z
  .object({
    id: z.uuid(),
    title: taskInputSchema.shape.title,
    time_zone: profileSchema.shape.time_zone,
    starts_at: z.iso.datetime({ offset: true }),
    ends_at: z.iso.datetime({ offset: true }),
    revision: z.number().int().nonnegative(),
  })
  .refine((value) => Date.parse(value.ends_at) > Date.parse(value.starts_at));
export type CalendarEvent = z.output<typeof calendarEventSchema>;
export const calendarSnapshotSchema = z
  .object({
    items: z.array(calendarEventSchema).max(25),
    total: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  })
  .refine((value) => value.items.length <= value.total);
export function calendarHref(query: CalendarQuery) {
  const valid = calendarQuerySchema.parse(query);
  return `/account/plan/calendar?${new URLSearchParams({ view: valid.view, day: valid.day, page: String(valid.page) })}`;
}

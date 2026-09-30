import { Temporal } from "@js-temporal/polyfill";
import type { z } from "zod";
import {
  calendarInputSchema,
  calendarQuerySchema,
  calendarDaySchema,
  type CalendarEvent,
  type CalendarQuery,
  type occurrenceSchema,
} from "@/domain/calendar";

type Occurrence = z.output<typeof occurrenceSchema>;
export class CalendarTimeError extends Error {
  constructor(
    readonly field: "start_local" | "end_local",
    message: string,
  ) {
    super(message);
  }
}
export function resolveCalendarTime(
  value: string,
  zone: string,
  occurrence: Occurrence,
  field: "start_local" | "end_local",
) {
  const local = Temporal.PlainDateTime.from(value);
  const earlier = local.toZonedDateTime(zone, { disambiguation: "earlier" });
  const later = local.toZonedDateTime(zone, { disambiguation: "later" });
  if (
    !earlier.toPlainDateTime().equals(local) ||
    !later.toPlainDateTime().equals(local)
  )
    throw new CalendarTimeError(
      field,
      "Diese Uhrzeit existiert in der gewählten Zeitzone nicht. Bitte wähle eine andere Uhrzeit.",
    );
  if (
    earlier.epochNanoseconds !== later.epochNanoseconds &&
    occurrence === "auto"
  )
    throw new CalendarTimeError(
      field,
      "Diese Uhrzeit kommt zweimal vor. Wähle das erste oder zweite Vorkommen.",
    );
  return (occurrence === "later" ? later : earlier).toInstant().toString();
}
export function calendarInstants(input: z.output<typeof calendarInputSchema>) {
  const valid = calendarInputSchema.parse(input);
  const starts_at = resolveCalendarTime(
    valid.start_local,
    valid.time_zone,
    valid.start_occurrence,
    "start_local",
  );
  const ends_at = resolveCalendarTime(
    valid.end_local,
    valid.time_zone,
    valid.end_occurrence,
    "end_local",
  );
  if (Temporal.Instant.compare(ends_at, starts_at) <= 0)
    throw new CalendarTimeError(
      "end_local",
      "Das Ende muss nach dem Beginn liegen.",
    );
  return { starts_at, ends_at };
}
// Read the stored instant back into its original zone, preserving a chosen DST fold.
export function calendarLocal(instant: string, zone: string) {
  const time = Temporal.Instant.from(instant).toZonedDateTimeISO(zone);
  const local = time.toPlainDateTime();
  const earlier = local.toZonedDateTime(zone, { disambiguation: "earlier" });
  const later = local.toZonedDateTime(zone, { disambiguation: "later" });
  const occurrence: Occurrence =
    earlier.epochNanoseconds === later.epochNanoseconds
      ? "auto"
      : time.epochNanoseconds === earlier.epochNanoseconds
        ? "earlier"
        : "later";
  return { local: local.toString({ smallestUnit: "minute" }), occurrence };
}
export function calendarDays(query: CalendarQuery, zone: string) {
  const valid = calendarQuerySchema.parse(query);
  let day = Temporal.PlainDate.from(valid.day);
  if (valid.view === "week") day = day.subtract({ days: day.dayOfWeek - 1 });
  return Array.from({ length: valid.view === "week" ? 7 : 1 }, (_, index) => {
    const current = day.add({ days: index });
    // Start-of-day handles zones whose transition skips or repeats midnight.
    return {
      day: current.toString(),
      start: current.toZonedDateTime(zone).toInstant().toString(),
      end: current
        .add({ days: 1 })
        .toZonedDateTime(zone)
        .toInstant()
        .toString(),
    };
  });
}
export function calendarOverlaps(
  event: Pick<CalendarEvent, "starts_at" | "ends_at">,
  range: { start: string; end: string },
) {
  return (
    Temporal.Instant.compare(range.start, range.end) < 0 &&
    Temporal.Instant.compare(event.starts_at, range.end) < 0 &&
    Temporal.Instant.compare(event.ends_at, range.start) > 0
  );
}
export function calendarStamp(instant: string, zone: string) {
  const time = Temporal.Instant.from(instant).toZonedDateTimeISO(zone);
  return `${String(time.day).padStart(2, "0")}.${String(time.month).padStart(2, "0")}.${time.year}, ${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")} (UTC${time.offset})`;
}
export function calendarDayInZone(instant: string, zone: string) {
  return calendarDaySchema.parse(
    Temporal.Instant.from(instant)
      .toZonedDateTimeISO(zone)
      .toPlainDate()
      .toString(),
  );
}

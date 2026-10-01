import { Temporal } from "@js-temporal/polyfill";
import { dateSchema } from "@/domain/transactions";
import { calendarDays } from "@/domain/calendar-time";

export function aiEventRange(
  day: string,
  days: number,
  zone: string,
  now: Date,
) {
  dateSchema.parse(day);
  if (!Number.isInteger(days) || days < 1 || days > 7)
    throw new Error("Invalid event range.");
  const instant = Temporal.Instant.from(now.toISOString());
  const today = instant.toZonedDateTimeISO(zone).toPlainDate().toString();
  if (day < today) throw new Error("Upcoming events cannot start in the past.");
  const first = calendarDays({ day, view: "day", page: 0 }, zone)[0]!;
  return {
    start: day === today ? instant.toString() : first.start,
    end: Temporal.PlainDate.from(day)
      .add({ days })
      .toZonedDateTime(zone)
      .toInstant()
      .toString(),
  };
}

import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { calendarQuerySchema, type CalendarSearch } from "@/domain/calendar";
import { calendarLocal, calendarStamp } from "@/domain/calendar-time";
import { dateInZone } from "@/domain/transactions";
import { supportedTimeZones } from "@/domain/profile";
import {
  CalendarForm,
  type CalendarInitial,
} from "@/features/plan/calendar-form";
import { requireMoneyAccount } from "@/server/money";
import { loadCalendarEvent } from "@/server/calendar";
export async function CalendarEventScreen({
  id,
  query,
  action,
}: {
  id: string;
  query: CalendarSearch;
  action?: string;
}) {
  const account = await requireMoneyAccount();
  const parsed = calendarQuerySchema.safeParse({
    ...query,
    day: query.day ?? dateInZone(new Date(), account.profile.time_zone),
  });
  if (
    !parsed.success ||
    (id !== "new" && !z.uuid().safeParse(id).success) ||
    (action !== undefined && action !== "remove") ||
    (id === "new" && action)
  )
    notFound();
  let initial: CalendarInitial = {
    ...parsed.data,
    id: randomUUID(),
    revision: 0,
    operation: "create",
    title: "",
    time_zone: account.profile.time_zone,
    start_local: "",
    end_local: "",
    start_occurrence: "auto",
    end_occurrence: "auto",
  };
  let summary: {
    title: string;
    start: string;
    end: string;
    zone: string;
  } | null = null;
  if (id !== "new") {
    const event = await loadCalendarEvent(account, id);
    const start = calendarLocal(event.starts_at, event.time_zone),
      end = calendarLocal(event.ends_at, event.time_zone);
    initial = {
      ...initial,
      ...event,
      operation: action === "remove" ? "remove" : "update",
      start_local: start.local,
      end_local: end.local,
      start_occurrence: start.occurrence,
      end_occurrence: end.occurrence,
    };
    summary = {
      title: event.title,
      start: calendarStamp(event.starts_at, event.time_zone),
      end: calendarStamp(event.ends_at, event.time_zone),
      zone: event.time_zone,
    };
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">
        {id === "new"
          ? "Termin anlegen"
          : action === "remove"
            ? "Termin löschen"
            : "Termin bearbeiten"}
      </h1>
      {summary && (
        <div className="space-y-2 rounded-xl border p-4 text-sm">
          <p className="break-words font-semibold">{summary.title}</p>
          <p>
            {summary.start} bis {summary.end}
          </p>
          <p>Terminzeitzone: {summary.zone}</p>
        </div>
      )}
      <CalendarForm initial={initial} timeZones={supportedTimeZones} />
      {id !== "new" && action !== "remove" && (
        <Link
          href={`/account/plan/calendar/${id}/goals`}
          className="inline-flex min-h-11 items-center text-sm underline"
        >
          Verknüpfte Ziele
        </Link>
      )}
    </div>
  );
}

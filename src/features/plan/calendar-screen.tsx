import Link from "next/link";
import { notFound } from "next/navigation";
import {
  calendarQuerySchema,
  calendarHref,
  type CalendarSearch,
} from "@/domain/calendar";
import {
  calendarDays,
  calendarOverlaps,
  calendarStamp,
} from "@/domain/calendar-time";
import { dateInZone } from "@/domain/transactions";
import { taskDateLabel } from "@/domain/tasks";
import { requireMoneyAccount } from "@/server/money";
import { loadCalendar } from "@/server/calendar";
export async function CalendarScreen({ query }: { query: CalendarSearch }) {
  const account = await requireMoneyAccount();
  const zone = account.profile.time_zone;
  const parsed = calendarQuerySchema.safeParse({
    ...query,
    day: query.day ?? dateInZone(new Date(), zone),
  });
  if (!parsed.success) notFound();
  const selected = parsed.data,
    days = calendarDays(selected, zone);
  const data = await loadCalendar(
    account,
    days[0]!.start,
    days.at(-1)!.end,
    selected.page,
  );
  const suffix = calendarHref(selected).slice("/account/plan/calendar".length);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Dein Kalender</h1>
      <p className="text-sm text-muted-foreground">
        Tage und Uhrzeiten werden in deiner Profilzeitzone {zone} angezeigt. Die
        Zeitzone des einzelnen Termins bleibt gespeichert.
      </p>
      <Link
        href={`/account/plan/calendar/new${suffix}`}
        className="inline-flex min-h-12 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground"
      >
        Termin anlegen
      </Link>
      <nav
        aria-label="Kalenderansicht"
        className="flex flex-wrap gap-5 text-sm"
      >
        {(["day", "week"] as const).map((view) => (
          <Link
            key={view}
            href={calendarHref({ ...selected, view, page: 0 })}
            aria-current={selected.view === view ? "page" : undefined}
            className="inline-flex min-h-11 items-center underline aria-[current=page]:font-bold"
          >
            {view === "day" ? "Tag" : "Woche"}
          </Link>
        ))}
      </nav>
      <form method="get" className="space-y-3">
        <input type="hidden" name="view" value={selected.view} />
        <label htmlFor="calendar-day" className="block text-sm font-medium">
          Tag auswählen
        </label>
        <input
          id="calendar-day"
          name="day"
          type="date"
          min="1999-12-30"
          max="2101-01-02"
          defaultValue={selected.day}
          required
          className="min-h-12 w-full min-w-0 rounded-xl border bg-background px-3 text-base"
        />
        <button className="min-h-11 rounded-xl border px-4 text-sm">
          Zeitraum anzeigen
        </button>
      </form>
      <p className="text-sm">
        {taskDateLabel(days[0]!.day)}
        {selected.view === "week"
          ? ` – ${taskDateLabel(days.at(-1)!.day)} · Montag bis Sonntag`
          : ""}
      </p>
      <p role="status" className="text-sm">
        {data.total} {data.total === 1 ? "Termin" : "Termine"} im Zeitraum ·{" "}
        {data.items.length} auf dieser Seite
      </p>
      <p className="text-xs text-muted-foreground">
        Mehrtägige Termine erscheinen an jedem betroffenen Tag. Ein Termin, der
        um Mitternacht endet, gehört nicht zum folgenden Tag.
      </p>
      {data.items.length ? (
        days.map((day) => {
          const events = data.items.filter((event) =>
            calendarOverlaps(event, day),
          );
          return (
            <section
              key={day.day}
              aria-label={`Termine am ${taskDateLabel(day.day)}`}
              className="space-y-3"
            >
              <h2 className="text-lg font-semibold">
                {taskDateLabel(day.day)}
              </h2>
              {events.length ? (
                <ul className="space-y-4">
                  {events.map((event) => (
                    <li
                      key={event.id}
                      className="space-y-2 rounded-xl border p-4"
                    >
                      <h3 className="break-words font-semibold">
                        {event.title}
                      </h3>
                      <p className="text-sm">
                        Beginn: {calendarStamp(event.starts_at, zone)}
                      </p>
                      <p className="text-sm">
                        Ende: {calendarStamp(event.ends_at, zone)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Terminzeitzone: {event.time_zone}
                      </p>
                      <div className="flex flex-wrap gap-5 text-sm">
                        <Link
                          href={`/account/plan/calendar/${event.id}${suffix}`}
                          aria-label={`${event.title} bearbeiten`}
                          className="inline-flex min-h-11 items-center underline"
                        >
                          Bearbeiten
                        </Link>
                        <Link
                          href={`/account/plan/calendar/${event.id}${suffix}&action=remove`}
                          aria-label={`${event.title} löschen`}
                          className="inline-flex min-h-11 items-center underline"
                        >
                          Löschen
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Keine Termine auf dieser Seite für diesen Tag.
                </p>
              )}
            </section>
          );
        })
      ) : (
        <p className="rounded-xl border p-5 text-sm">
          {data.total
            ? "Auf dieser Seite gibt es keine Termine. Gehe zur vorherigen Seite."
            : "Keine Termine in diesem Zeitraum. Lege einen Termin an oder wähle einen anderen Zeitraum."}
        </p>
      )}
      {(data.total > 25 || selected.page > 0) && (
        <nav
          aria-label="Kalenderseiten"
          className="flex flex-wrap gap-5 text-sm"
        >
          {selected.page > 0 && (
            <Link
              href={calendarHref({ ...selected, page: selected.page - 1 })}
              className="inline-flex min-h-11 items-center underline"
            >
              Vorherige Seite
            </Link>
          )}
          <span className="py-3">
            Seite {selected.page + 1} · {data.total} Termine
          </span>
          {(selected.page + 1) * 25 < data.total && (
            <Link
              href={calendarHref({ ...selected, page: selected.page + 1 })}
              className="inline-flex min-h-11 items-center underline"
            >
              Nächste Seite
            </Link>
          )}
        </nav>
      )}
      <Link
        href="/account/plan"
        className="inline-flex min-h-11 items-center text-sm underline"
      >
        Zu deinen Aufgaben
      </Link>
    </div>
  );
}

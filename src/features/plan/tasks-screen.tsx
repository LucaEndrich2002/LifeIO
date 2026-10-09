import Link from "next/link";
import { notFound } from "next/navigation";
import {
  taskQuerySchema,
  taskViews,
  taskPriorities,
  taskListHref,
  taskWeek,
  taskDateLabel,
  taskIsOverdue,
} from "@/domain/tasks";
import { dateInZone } from "@/domain/transactions";
import { TaskForm } from "@/features/plan/task-form";
import { requireMoneyAccount } from "@/server/money";
import { loadTasks } from "@/server/tasks";

export type TaskSearch = {
  view?: string;
  status?: string;
  day?: string;
  page?: string;
};
export async function TasksScreen({ query }: { query: TaskSearch }) {
  const account = await requireMoneyAccount();
  const today = dateInZone(new Date(), account.profile.time_zone);
  const parsed = taskQuerySchema.safeParse({
    ...query,
    day: query.day ?? today,
  });
  if (!parsed.success) notFound();
  const selected = parsed.data;
  const data = await loadTasks(account, selected);
  const week = taskWeek(selected.day);
  const suffix = taskListHref(selected).slice("/account/plan".length);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Deine Aufgaben</h1>
      <Link
        href="/account/plan/calendar"
        className="inline-flex min-h-11 items-center text-sm underline"
      >
        Kalender öffnen
      </Link>
      <Link
        href="/account/ai/plan"
        className="ml-4 inline-flex min-h-11 items-center text-sm underline"
      >
        Diese Woche mit Life AI einordnen
      </Link>
      <p className="text-sm text-muted-foreground">
        Ein nächster Schritt nach dem anderen. Heute ist der{" "}
        {taskDateLabel(today)} in deiner Profilzeitzone{" "}
        {account.profile.time_zone}.
      </p>
      <Link
        href={`/account/plan/new${suffix}`}
        className="inline-flex min-h-12 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground"
      >
        Aufgabe anlegen
      </Link>
      <nav aria-label="Aufgabenstatus" className="flex flex-wrap gap-5 text-sm">
        {(["open", "completed"] as const).map((status) => (
          <Link
            key={status}
            href={taskListHref({ ...selected, status, page: 0 })}
            aria-current={selected.status === status ? "page" : undefined}
            className="inline-flex min-h-11 items-center underline aria-[current=page]:font-bold"
          >
            {status === "open" ? "Offen" : "Erledigt"}
          </Link>
        ))}
      </nav>
      <nav
        aria-label="Aufgabenansicht"
        className="flex flex-wrap gap-5 text-sm"
      >
        {(Object.keys(taskViews) as (keyof typeof taskViews)[]).map((view) => (
          <Link
            key={view}
            href={taskListHref({ ...selected, view, page: 0 })}
            aria-current={selected.view === view ? "page" : undefined}
            className="inline-flex min-h-11 items-center underline aria-[current=page]:font-bold"
          >
            {taskViews[view]}
          </Link>
        ))}
      </nav>
      {(selected.view === "day" || selected.view === "week") && (
        <form method="get" className="space-y-3">
          <input type="hidden" name="view" value={selected.view} />
          <input type="hidden" name="status" value={selected.status} />
          <label htmlFor="task-day" className="block text-sm font-medium">
            {selected.view === "week"
              ? "Tag in der gewünschten Woche"
              : "Tag auswählen"}
          </label>
          <input
            id="task-day"
            type="date"
            name="day"
            defaultValue={selected.day}
            required
            min="2000-01-01"
            max="2100-12-31"
            className="min-h-12 w-full min-w-0 rounded-xl border bg-background px-3 text-base"
          />
          <button className="min-h-11 rounded-xl border px-4 text-sm">
            Zeitraum anzeigen
          </button>
          <p className="text-sm">
            {selected.view === "week"
              ? `${taskDateLabel(week.start)} – ${taskDateLabel(week.end)} · Montag bis Sonntag`
              : taskDateLabel(selected.day)}
          </p>
        </form>
      )}
      <p role="status" className="text-sm">
        {data.total} {selected.status === "open" ? "offene" : "erledigte"}{" "}
        Aufgaben in dieser Ansicht
      </p>
      <p className="text-xs text-muted-foreground">
        Nach Fälligkeit, dann Priorität sortiert. Aufgaben ohne Datum stehen am
        Ende.
      </p>
      {data.items.length ? (
        <ul className="space-y-4">
          {data.items.map((task) => (
            <li key={task.id} className="space-y-3 rounded-xl border p-4">
              <h2 className="break-words font-semibold">{task.title}</h2>
              <p className="text-sm">
                Priorität: {taskPriorities[task.priority]} ·{" "}
                {task.completed_at ? "Erledigt" : "Offen"}
              </p>
              <p className="text-sm">
                {task.due_on
                  ? `Fällig am ${taskDateLabel(task.due_on)}`
                  : "Ohne Fälligkeitsdatum"}
                {taskIsOverdue(task, today) && (
                  <span className="ml-2 font-semibold">· Überfällig</span>
                )}
              </p>
              <TaskForm
                initial={{
                  ...selected,
                  ...task,
                  due_on: task.due_on ?? "",
                  operation: task.completed_at ? "reopen" : "complete",
                }}
              />
              <div className="flex flex-wrap gap-5 text-sm">
                <Link
                  href={`/account/plan/${task.id}${suffix}`}
                  aria-label={`${task.title} bearbeiten`}
                  className="inline-flex min-h-11 items-center underline"
                >
                  Bearbeiten
                </Link>
                <Link
                  href={`/account/plan/${task.id}${suffix}&action=remove`}
                  aria-label={`${task.title} löschen`}
                  className="inline-flex min-h-11 items-center underline"
                >
                  Löschen
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border p-5 text-sm">
          {data.total
            ? "Auf dieser Seite gibt es keine Aufgaben. Gehe zur vorherigen Seite."
            : "In dieser Ansicht gibt es noch keine Aufgaben. Lege eine Aufgabe an oder wähle einen anderen Filter."}
        </p>
      )}
      {(data.total > 25 || selected.page > 0) && (
        <nav
          aria-label="Aufgabenseiten"
          className="flex flex-wrap gap-5 text-sm"
        >
          {selected.page > 0 && (
            <Link
              href={taskListHref({ ...selected, page: selected.page - 1 })}
              className="inline-flex min-h-11 items-center underline"
            >
              Vorherige Seite
            </Link>
          )}
          <span className="py-3">
            Seite {selected.page + 1} · {data.total} Aufgaben
          </span>
          {(selected.page + 1) * 25 < data.total && (
            <Link
              href={taskListHref({ ...selected, page: selected.page + 1 })}
              className="inline-flex min-h-11 items-center underline"
            >
              Nächste Seite
            </Link>
          )}
        </nav>
      )}
      <div className="flex flex-wrap gap-5 text-sm">
        <Link
          href="/account/goals"
          className="inline-flex min-h-11 items-center underline"
        >
          Zu deinen Zielen
        </Link>
        <Link
          href="/account/money"
          className="inline-flex min-h-11 items-center underline"
        >
          Zur Finanzübersicht
        </Link>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { formatEuro, monthLabel } from "@/domain/money";
import { budgetStatus } from "@/domain/plans";
import { goalProgress } from "@/domain/goals";
import { milestoneProgress } from "@/domain/milestones";
import { taskDateLabel, taskPriorities } from "@/domain/tasks";
import { calendarStamp } from "@/domain/calendar-time";
import {
  reviewDays,
  weeklyInsights,
  type WeeklySnapshot,
} from "@/domain/weekly-review";

const panel = "space-y-4 rounded-2xl border bg-card p-5 sm:p-6";
const link = "inline-flex min-h-11 items-center break-words text-sm underline";
export function ReviewDetails({ data }: { data: WeeklySnapshot }) {
  const days = reviewDays(data.week_start),
    insights = weeklyInsights(data);
  return (
    <div className="space-y-6">
      <section
        aria-labelledby="review-insights"
        className={`${panel} border-primary/20 bg-accent/40`}
      >
        <h2 id="review-insights" className="text-xl font-semibold">
          Was sich aus deinen Angaben ergibt
        </h2>
        {insights.length ? (
          <ul className="space-y-4">
            {insights.map((hint) => (
              <li key={hint.id}>
                <Link href={hint.href} className={`${link} font-medium`}>
                  {hint.title}
                </Link>
                <p className="text-sm text-muted-foreground">{hint.detail}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Noch keine ausreichende Datengrundlage für einen Hinweis. Erfasse
            deine Angaben in Money, Goals oder Plan und aktualisiere den
            Rückblick.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Aus deinen gespeicherten Angaben berechnet. Fehlende oder später
          korrigierte Einträge können den Vergleich verändern.
        </p>
      </section>
      <section aria-labelledby="review-money" className={panel}>
        <h2 id="review-money" className="text-xl font-semibold">
          Geld in dieser Woche
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">
              Variable Ausgaben · {data.expenses.current_count} Einträge
            </dt>
            <dd
              data-testid="review-week-spent"
              className="mt-1 text-2xl font-semibold tabular-nums"
            >
              {data.expenses.current_count
                ? formatEuro(data.expenses.current_minor)
                : "Keine erfasst"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">
              Vorwoche ab {taskDateLabel(days.previous)} ·{" "}
              {data.expenses.previous_count} Einträge
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">
              {data.expenses.previous_count
                ? formatEuro(data.expenses.previous_minor)
                : "Keine erfasst"}
            </dd>
          </div>
        </dl>
        <p className="text-sm">
          Spar-Einzahlungen mit Buchungsdatum in dieser Woche:{" "}
          <strong>
            {data.goals.contribution_count
              ? formatEuro(data.goals.contributions_minor)
              : "Keine erfasst"}
          </strong>
          .
        </p>
        <p className="text-xs text-muted-foreground">
          Nicht stornierte Einzahlungen; keine geplanten Sparraten. Einnahmen
          und Fixkosten sind nur Monaten zugeordnet und werden nicht künstlich
          auf Wochen aufgeteilt.
        </p>
        <h3 className="border-t pt-4 font-semibold">
          Monatskontext und Budgets
        </h3>
        <p className="text-sm text-muted-foreground">
          Volle Monatswerte zum Datenstand, einschließlich Angaben außerhalb der
          gewählten Woche.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {data.months.map((month) => (
            <section
              key={month.month}
              className="space-y-3 rounded-xl border p-4"
            >
              <h4 className="font-semibold">{monthLabel(month.month)}</h4>
              <dl className="space-y-2 text-sm">
                {[
                  [
                    "Einnahmen",
                    month.totals.income_count
                      ? formatEuro(month.totals.income)
                      : "Keine erfasst",
                  ],
                  [
                    "Fixkosten",
                    month.fixed_known
                      ? formatEuro(month.totals.fixed)
                      : "Nicht angegeben",
                  ],
                  [
                    "Variable Ausgaben",
                    month.totals.expense_count
                      ? formatEuro(month.totals.variable)
                      : "Keine erfasst",
                  ],
                  ["Geplante Sparraten", formatEuro(month.totals.savings)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex flex-wrap justify-between gap-2"
                  >
                    <dt>{label}</dt>
                    <dd className="font-medium tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
              {month.budget ? (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-sm">
                    {month.budget.name}: {formatEuro(month.totals.variable)} von{" "}
                    {formatEuro(month.budget.amount_minor)}
                  </p>
                  <Progress
                    value={
                      budgetStatus(
                        month.budget.amount_minor,
                        month.totals.variable,
                      ).progress
                    }
                    label={`Budgetnutzung ${monthLabel(month.month)}`}
                  />
                  <p className="text-xs text-muted-foreground">
                    {
                      budgetStatus(
                        month.budget.amount_minor,
                        month.totals.variable,
                      ).percent
                    }{" "}
                    % genutzt ·{" "}
                    {formatEuro(
                      month.budget.amount_minor - month.totals.variable,
                    )}{" "}
                    verbleibend
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Kein Monatsbudget angegeben.
                </p>
              )}
              <Link
                href={`/account/money?month=${month.month}`}
                className={link}
              >
                Monat in Money öffnen
              </Link>
            </section>
          ))}
        </div>
      </section>
      <section aria-labelledby="review-goals" className={panel}>
        <h2 id="review-goals" className="text-xl font-semibold">
          Deine Ziele zum Datenstand
        </h2>
        <p className="text-sm">
          {data.goals.total} Ziele · {data.goals.milestones_completed} aktuell
          noch erledigte Meilensteine mit Abschluss in dieser Woche.
        </p>
        {!data.goals.total ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Ziele erfasst. Ein Fortschritt wird nicht angenommen.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {data.goals.items.map((goal) => {
              const progress =
                goal.kind === "financial"
                  ? goalProgress(goal.target_minor!, goal.balance!).progress
                  : milestoneProgress(
                      goal.milestone_total,
                      goal.milestone_completed,
                    );
              return (
                <li key={goal.id} className="space-y-2 rounded-xl border p-4">
                  <Link
                    href={`/account/goals/${goal.id}`}
                    className={`${link} font-medium`}
                  >
                    {goal.name}
                  </Link>
                  <p className="text-sm">
                    {goal.kind === "financial"
                      ? `${formatEuro(goal.balance!)} von ${formatEuro(goal.target_minor!)}`
                      : `${goal.milestone_completed} von ${goal.milestone_total} Meilensteinen erledigt`}
                  </p>
                  {progress !== null ? (
                    <Progress
                      value={progress}
                      label={`Zielfortschritt ${goal.name}`}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Ohne Meilensteine ist kein Fortschritt ableitbar.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Bis zu sechs Ziele, offene zuerst und dann nach Zieldatum. Der Stand
          stammt vom Erstellen oder Aktualisieren dieses Rückblicks; er
          rekonstruiert keinen früheren Zielstand.
        </p>
        <Link href="/account/goals" className={link}>
          Alle aktuellen Ziele öffnen
        </Link>
      </section>
      <section aria-labelledby="review-tasks" className={panel}>
        <h2 id="review-tasks" className="text-xl font-semibold">
          Aufgaben zum Datenstand
        </h2>
        <p className="text-sm">
          {data.tasks.open} offen · {data.tasks.undated} ohne Datum ·{" "}
          {data.tasks.due_by_end} bis zum Ende der gewählten Woche fällig.
        </p>
        <p className="text-sm">
          {data.tasks.completed} aktuell noch erledigte Aufgaben mit Abschluss
          in dieser Woche.
        </p>
        {!data.tasks.open ? (
          <p className="text-sm text-muted-foreground">
            Zum Datenstand sind keine offenen Aufgaben vorhanden.
          </p>
        ) : (
          <ul className="space-y-3">
            {data.tasks.items.map((task) => (
              <li key={task.id}>
                <Link
                  href={`/account/plan/${task.id}`}
                  className={`${link} font-medium`}
                >
                  {task.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  Priorität: {taskPriorities[task.priority]} ·{" "}
                  {task.due_on
                    ? `Fällig am ${taskDateLabel(task.due_on)}`
                    : "Ohne Datum"}
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Die drei frühesten Fälligkeiten, danach Priorität. Wieder geöffnete
          oder entfernte Aufgaben und Meilensteine zählen nicht als erledigt.
          Dies ist keine vollständige Änderungshistorie.
        </p>
        <Link href="/account/plan?view=all&status=open" className={link}>
          Alle aktuellen offenen Aufgaben
        </Link>
      </section>
      <section aria-labelledby="review-next" className={panel}>
        <h2 id="review-next" className="text-xl font-semibold">
          Ausblick auf die Folgewoche
        </h2>
        <p className="text-sm">
          {taskDateLabel(days.next)} bis {taskDateLabel(days.nextEnd)} ·{" "}
          {data.time_zone}
        </p>
        <p className="text-sm">
          {data.tasks.next_due} offene Aufgaben werden fällig ·{" "}
          {data.goals.next_count} offene Ziele haben ihr Zieldatum ·{" "}
          {data.events.next_count} Termine überschneiden diese Woche.
        </p>
        <ul className="space-y-3">
          {data.goals.next_items.map((goal) => (
            <li key={goal.id}>
              <Link href={`/account/goals/${goal.id}`} className={link}>
                {goal.name} · Zieltermin {taskDateLabel(goal.deadline)}
              </Link>
            </li>
          ))}
        </ul>
        <ul className="space-y-3">
          {data.events.items.map((event) => (
            <li key={event.id}>
              <Link
                href={`/account/plan/calendar/${event.id}`}
                className={link}
              >
                {event.title}
              </Link>
              <p className="text-xs text-muted-foreground">
                {calendarStamp(event.starts_at, data.time_zone)} bis{" "}
                {calendarStamp(event.ends_at, data.time_zone)}
              </p>
            </li>
          ))}
        </ul>
        {!data.tasks.next_due &&
          !data.goals.next_count &&
          !data.events.next_count && (
            <p className="text-sm text-muted-foreground">
              Für diese Folgewoche sind zum Datenstand keine offenen Fristen
              oder Termine erfasst.
            </p>
          )}
        <p className="text-xs text-muted-foreground">
          Bis zu drei Zieltermine und drei Kalendereinträge. Die Zahlen umfassen
          alle passenden eigenen Einträge. Bei älteren Rückblicken liegt auch
          dieser Ausblick in der Vergangenheit.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href={`/account/plan?view=week&status=open&day=${days.next}`}
            className={link}
          >
            Aufgaben der Folgewoche öffnen
          </Link>
          <Link
            href={`/account/plan/calendar?view=week&day=${days.next}`}
            className={link}
          >
            Kalender der Folgewoche öffnen
          </Link>
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { budgetAttention, homeGoalStatus } from "@/domain/home";
import { formatEuro, monthLabel } from "@/domain/money";
import { taskDateLabel } from "@/domain/tasks";
import type { loadHome } from "@/server/home";
export function HomeAttention({
  data,
}: {
  data: Awaited<ReturnType<typeof loadHome>>;
}) {
  const budget = budgetAttention(data.money);
  const late = data.goals.items.filter(
    (goal) =>
      homeGoalStatus(goal, data.day).forecast?.deadlineStatus === "late",
  );
  const hasHints =
    budget || data.overdue.total || data.goals.overdue || late.length;
  return (
    <section
      aria-labelledby="home-attention-title"
      className="space-y-4 rounded-2xl border border-primary/20 bg-accent/40 p-6"
    >
      <h2 id="home-attention-title" className="text-xl font-semibold">
        Ein Blick lohnt sich
      </h2>
      {!hasHints && (
        <p className="text-sm text-muted-foreground">
          Aktuell keine Hinweise zu deinem Monatsbudget, überfälligen Aufgaben
          oder den angezeigten Zielen. Hinweise beruhen nur auf deinen
          gespeicherten Angaben.
        </p>
      )}
      <ul className="space-y-4 text-sm">
        {budget && (
          <li>
            <Link
              href={`/account/money?month=${data.month}#budget`}
              className="inline-flex min-h-11 items-center font-medium underline"
            >
              {budget === "over"
                ? "Monatsbudget überschritten"
                : "Mindestens 90 % deines Monatsbudgets genutzt"}
            </Link>
            <p>
              {monthLabel(data.month)}: {formatEuro(data.money.totals.variable)}{" "}
              variable Ausgaben bei{" "}
              {formatEuro(data.money.budget!.amount_minor)} Budget.
            </p>
          </li>
        )}
        {data.overdue.total > 0 && (
          <li>
            <p className="font-medium">
              {data.overdue.total}{" "}
              {data.overdue.total === 1
                ? "überfällige Aufgabe"
                : "überfällige Aufgaben"}
            </p>
            <ul className="mt-2 space-y-1">
              {data.overdue.items.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/account/plan/${task.id}`}
                    className="inline-flex min-h-11 items-center break-words underline"
                  >
                    {task.title} · fällig {taskDateLabel(task.due_on!)}
                  </Link>
                </li>
              ))}
            </ul>
            {data.overdue.total > 3 && (
              <Link
                href="/account/plan?view=all&status=open"
                className="inline-flex min-h-11 items-center underline"
              >
                Alle offenen Aufgaben ansehen
              </Link>
            )}
          </li>
        )}
        {data.goals.overdue > 0 && (
          <li>
            <Link
              href={`/account/home?month=${data.month}#home-goals`}
              className="inline-flex min-h-11 items-center font-medium underline"
            >
              {data.goals.overdue}{" "}
              {data.goals.overdue === 1
                ? "offenes Ziel hat sein Zieldatum überschritten"
                : "offene Ziele haben ihr Zieldatum überschritten"}
            </Link>
            <p>
              Die frühesten offenen Zieldaten stehen auf der ersten Zielseite.
            </p>
          </li>
        )}
        {late.map((goal) => (
          <li key={goal.id}>
            <Link
              href={`/account/goals/${goal.id}`}
              className="inline-flex min-h-11 items-center break-words font-medium underline"
            >
              {goal.name}: Prognose nach dem Zieldatum
            </Link>
            <p>
              Der tatsächliche Sparstand und die geplanten Raten reichen
              voraussichtlich nicht bis {taskDateLabel(goal.deadline!)}.
            </p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Budget: gewählter Monat. Fristen: heute. Sparprognose-Hinweise: Ziele
        auf dieser Seite.
      </p>
    </section>
  );
}

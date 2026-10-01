import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { formatEuro } from "@/domain/money";
import { taskDateLabel } from "@/domain/tasks";
import { homeGoalStatus } from "@/domain/home";
import type { loadHome } from "@/server/home";
export function HomeGoals({
  data,
  page,
}: {
  data: Awaited<ReturnType<typeof loadHome>>;
  page: number;
}) {
  const href = (value: number) =>
    `/account/home?month=${data.month}&goal_page=${value}#home-goals`;
  return (
    <section
      id="home-goals"
      aria-labelledby="home-goals-title"
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="home-goals-title" className="text-xl font-semibold">
          Deine Ziele
        </h2>
        <Link
          href="/account/goals"
          className="inline-flex min-h-11 items-center text-sm underline"
        >
          Ziele verwalten
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        {data.goals.total} Ziele · Offene Ziele zuerst, nach Zieldatum.
        Fortschritt und Prognosen zeigen den aktuellen Stand.
      </p>
      {!data.goals.items.length ? (
        <div className="rounded-2xl border bg-card p-6 text-sm">
          <p>
            {data.goals.total
              ? "Auf dieser Seite gibt es keine Ziele. Gehe zur vorherigen Seite."
              : "Was möchtest du erreichen? Lege dein erstes Ziel an."}
          </p>
          {!data.goals.total && (
            <Link
              href="/account/goals/new?kind=personal"
              className="inline-flex min-h-11 items-center underline"
            >
              Erstes Ziel anlegen
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.goals.items.map((goal) => {
            const status = homeGoalStatus(goal, data.day);
            return (
              <li
                key={goal.id}
                className="space-y-3 rounded-2xl border bg-card p-6"
              >
                <p className="text-xs text-muted-foreground">
                  {goal.kind === "financial" ? "Sparziel" : "Persönliches Ziel"}
                </p>
                <h3 className="break-words font-semibold">
                  <Link
                    href={`/account/goals/${goal.id}`}
                    className="inline-flex min-h-11 items-center underline"
                  >
                    {goal.name}
                  </Link>
                </h3>
                {status.progress !== null ? (
                  <>
                    <p className="text-2xl font-semibold tabular-nums">
                      {status.percent} %
                    </p>
                    <Progress
                      label={`Fortschritt: ${goal.name}`}
                      value={status.progress}
                    />
                  </>
                ) : (
                  <p className="text-sm">
                    Noch keine Meilensteine – Fortschritt offen.
                  </p>
                )}
                <p className="text-sm tabular-nums">
                  {goal.kind === "financial"
                    ? `${formatEuro(goal.balance)} von ${formatEuro(goal.target_minor)}`
                    : `${goal.milestone_completed} von ${goal.milestone_total} Meilensteinen erledigt`}
                </p>
                <p className="text-sm">
                  {status.reached
                    ? "Ziel erreicht"
                    : goal.deadline
                      ? `Zieldatum: ${taskDateLabel(goal.deadline)}`
                      : "Ohne Zieldatum"}
                </p>
                {!status.reached &&
                  goal.deadline &&
                  goal.deadline < data.day && (
                    <p className="text-sm font-medium text-destructive">
                      Zieldatum überschritten
                    </p>
                  )}
                {status.forecast?.status === "projected" && (
                  <p className="text-sm">
                    Voraussichtlich {taskDateLabel(status.forecast.date)}
                    {status.forecast.deadlineStatus === "late"
                      ? " · nach deinem Zieldatum"
                      : ""}
                  </p>
                )}
                {status.forecast &&
                  ["unplanned", "beyond_range"].includes(
                    status.forecast.status,
                  ) && (
                    <p className="text-sm">
                      Mit dem aktuellen Sparplan ist kein Erreichungsdatum
                      berechenbar.
                    </p>
                  )}
              </li>
            );
          })}
        </ul>
      )}
      {(data.goals.total > 6 || page > 0) && (
        <nav
          aria-label="Dashboard-Zielseiten"
          className="flex flex-wrap items-center gap-5 text-sm"
        >
          {page > 0 && (
            <a
              href={href(page - 1)}
              className="inline-flex min-h-11 items-center underline"
            >
              Vorherige Zielseite
            </a>
          )}
          <span>
            Seite {page + 1} · {data.goals.total} Ziele
          </span>
          {(page + 1) * 6 < data.goals.total && (
            <a
              href={href(page + 1)}
              className="inline-flex min-h-11 items-center underline"
            >
              Nächste Zielseite
            </a>
          )}
        </nav>
      )}
      {data.goals.items.some((goal) => goal.kind === "financial") && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Prognosen verwenden den tatsächlichen Sparstand und die geplanten
          Raten. Der nächste mögliche Beitrag ist am Ende des nächsten Monats;
          geplante Beiträge sind noch keine Einzahlungen. Details und Annahmen
          findest du im Ziel.
        </p>
      )}
    </section>
  );
}

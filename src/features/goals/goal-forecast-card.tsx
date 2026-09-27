import { Card, CardContent } from "@/components/ui/card";
import { forecastGoal } from "@/domain/goal-forecast";
import type { GoalSnapshot } from "@/domain/goals";
import { formatEuro } from "@/domain/money";

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function GoalForecastCard({
  data,
  today,
  timeZone,
}: {
  data: GoalSnapshot;
  today: string;
  timeZone: string;
}) {
  const forecast = forecastGoal({
    targetMinor: data.goal.target_minor,
    balanceMinor: data.balance,
    rates: data.rates,
    deadline: data.goal.deadline,
    today,
  });
  return (
    <Card>
      <CardContent className="space-y-4">
        <h2 className="font-semibold">Deine Sparprognose</h2>
        <p className="text-xs text-muted-foreground">
          Stand: {dateLabel(today)} · {timeZone}
        </p>
        <div data-testid="goal-forecast" className="space-y-3">
          {forecast.status === "reached" ? (
            <>
              <p className="text-lg font-semibold">Bereits angespart</p>
              <p className="text-sm">
                Du brauchst keine weiteren Beiträge für dieses Ziel.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm">
                Noch offen: {formatEuro(forecast.remainingMinor)}
              </p>
              {forecast.status === "projected" ? (
                <>
                  <p className="text-lg font-semibold">
                    Voraussichtlich am {dateLabel(forecast.date)}
                  </p>
                  <p className="text-sm">
                    {forecast.contributions === 1
                      ? "Noch 1 geplanter Beitrag."
                      : `Noch ${forecast.contributions} geplante Beiträge.`}{" "}
                    Nächster angenommener Beitrag:{" "}
                    {dateLabel(forecast.nextContributionDate)}.
                  </p>
                </>
              ) : forecast.status === "unplanned" ? (
                <p className="text-sm">
                  Mit den gespeicherten Sparraten ist noch kein Erreichungsdatum
                  berechenbar. Plane eine positive Rate oder erhöhe deine
                  Beiträge.
                </p>
              ) : (
                <p className="text-sm">
                  Mit diesen Sparraten wird das Ziel bis Ende 2100 nicht
                  erreicht. Die Berechnung endet dort; ein späteres Datum wird
                  nicht geschätzt.
                </p>
              )}
            </>
          )}
        </div>
        {data.goal.deadline && (
          <p
            data-testid="goal-deadline"
            className="rounded-xl border p-3 text-sm"
          >
            Dein Zieldatum: {dateLabel(data.goal.deadline)}.{" "}
            {forecast.status === "reached"
              ? "Dein Ziel ist bereits erreicht; wann es erstmals erreicht wurde, wird hier nicht abgeleitet."
              : forecast.deadlineStatus === "overdue"
                ? "Dein Zieldatum ist überschritten, der Zielbetrag noch nicht erreicht."
                : forecast.deadlineStatus === "late"
                  ? "Nach diesem Plan erreichst du das Ziel erst nach deinem Zieldatum."
                  : forecast.deadlineStatus === "on_time"
                    ? "Nach diesem Plan erreichst du das Ziel bis zu deinem Zieldatum."
                    : "Ohne berechenbaren Termin lässt sich die Einhaltung deines Zieldatums nicht bestätigen."}
          </p>
        )}
        <details className="text-sm">
          <summary className="min-h-11 cursor-pointer py-3 underline">
            So wird die Prognose berechnet
          </summary>
          <div className="space-y-3 leading-relaxed text-muted-foreground">
            <p>
              Ausgangspunkt ist dein tatsächlicher Sparstand. Ab dem Folgemonat
              nehmen wir jeweils am Monatsende die dann gültige Sparrate an.
              Spätere Änderungen und Pausen zählen mit; Monate ohne positiven
              Beitrag zählen nicht als Einzahlung.
            </p>
            <p>
              Vergangene und laufende Monate werden nicht automatisch
              aufgefüllt. Die letzte gespeicherte Rate gilt weiter, bis eine
              neue beginnt. Die letzte nötige Einzahlung kann kleiner sein als
              die geplante Rate.
            </p>
            <p>
              Die Schätzung gilt ohne Zinsen oder Rendite und setzt voraus, dass
              du die geplanten Beträge tatsächlich sparst. Sie prüft nicht, ob
              dein Monatsbudget dafür ausreicht. Es wird kein Geld gebucht. Nach
              Änderungen oder einem Monatswechsel aktualisiert sich die Prognose
              beim erneuten Öffnen.
            </p>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

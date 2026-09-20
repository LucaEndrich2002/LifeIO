import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatEuro, monthLabel, sumMinor } from "@/domain/money";
import type { OnboardingData } from "@/server/onboarding";

export function FinancialSummary({ data }: { data: OnboardingData }) {
  const fixed = sumMinor(data.expenses.map((item) => item.amount_minor));
  const monthly = data.goal?.monthly_minor ?? 0;
  const completeBasis =
    data.state?.income_status === "saved" &&
    data.state.expenses_status === "saved" &&
    data.income;
  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-5">
          <div>
            <h2 className="font-semibold">Dein Monatsplan</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.state && monthLabel(data.state.month)} · EUR
            </p>
          </div>
          <dl className="space-y-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <dt>Einkommen</dt>
              <dd className="font-medium tabular-nums">
                {data.income
                  ? formatEuro(data.income.amount_minor)
                  : "Nicht angegeben"}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt>Monatliche Fixkosten</dt>
              <dd className="font-medium tabular-nums">
                {data.state?.expenses_status === "saved"
                  ? formatEuro(fixed)
                  : "Nicht angegeben"}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt>Geplante Sparrate</dt>
              <dd className="font-medium tabular-nums">
                {data.goal ? formatEuro(monthly) : "Kein Sparziel angegeben"}
              </dd>
            </div>
            <div className="border-t pt-4">
              <dt className="text-muted-foreground">
                Verbleibend vor variablen Ausgaben
              </dt>
              <dd className="mt-2 break-words text-2xl font-semibold tracking-tight tabular-nums">
                {completeBasis
                  ? formatEuro(
                      sumMinor([data.income!.amount_minor, -fixed, -monthly]),
                    )
                  : "Noch unvollständig"}
              </dd>
            </div>
          </dl>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {completeBasis
              ? "Einkommen minus Fixkosten und geplante Sparrate. Variable Ausgaben sind noch nicht erfasst. Dies ist ein Planwert, kein Kontostand und kein Restbudget."
              : "Ohne Angaben zu Einkommen und Fixkosten lässt sich kein vollständiger Planwert berechnen. Ausgelassene Angaben werden nicht als 0 € dargestellt."}
          </p>
        </CardContent>
      </Card>
      {data.income && (
        <section className="rounded-xl border p-5">
          <h2 className="mb-2 text-sm font-semibold">Dein Einkommen</h2>
          <p className="break-words text-sm text-muted-foreground">
            {data.income.name} · {formatEuro(data.income.amount_minor)}
          </p>
        </section>
      )}
      {data.expenses.length > 0 && (
        <section className="rounded-xl border p-5">
          <h2 className="mb-3 text-sm font-semibold">Deine Fixkosten</h2>
          <ul className="space-y-3 text-sm">
            {data.expenses.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap justify-between gap-2"
              >
                <span className="min-w-0 break-words">{item.name}</span>
                <span className="font-medium tabular-nums">
                  {formatEuro(item.amount_minor)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Monatlich geplant ab {data.state && monthLabel(data.state.month)}.
            Keine zusätzlichen Ausgabenbuchungen.
          </p>
        </section>
      )}
      <Card>
        <CardContent className="space-y-3">
          <h2 className="font-semibold">Dein Sparziel</h2>
          {data.goal ? (
            <>
              <p className="break-words text-lg font-medium">
                {data.goal.name}
              </p>
              <p className="text-sm tabular-nums">
                {formatEuro(data.goal.current_minor)} von{" "}
                {formatEuro(data.goal.target_minor)}
              </p>
              <Progress
                value={Math.min(
                  100,
                  (data.goal.current_minor / data.goal.target_minor) * 100,
                )}
                label={`Fortschritt für ${data.goal.name}`}
              />
              <p className="text-xs text-muted-foreground">
                {data.goal.current_minor >= data.goal.target_minor
                  ? "Dein angegebener Sparstand erreicht den Zielbetrag."
                  : "Der Sparstand stammt aus deiner Angabe. Die geplante Sparrate wird nicht automatisch hinzugezählt."}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Du hast noch kein Sparziel angegeben. Es wurde kein Beispielziel
              angelegt.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

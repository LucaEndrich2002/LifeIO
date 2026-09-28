import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatEuro } from "@/domain/money";
import { budgetStatus } from "@/domain/plans";
import type { MoneySnapshot } from "@/domain/transactions";

export function BudgetCard({
  data,
  month,
}: {
  data: MoneySnapshot;
  month: string;
}) {
  const budget = data.budget;
  const status = budget
    ? budgetStatus(budget.amount_minor, data.totals.variable)
    : null;
  return (
    <Card id="budget">
      <CardContent className="space-y-4">
        <h2 className="text-lg font-semibold">Dein Monatsbudget</h2>
        {budget && status ? (
          <>
            <p className="break-words font-medium">{budget.name}</p>
            <p className="text-sm">
              {formatEuro(data.totals.variable)} von{" "}
              {formatEuro(budget.amount_minor)} ausgegeben
            </p>
            <Progress
              label="Monatsbudget ausgeschöpft"
              value={status.progress}
            />
            <p className="text-sm" data-testid="budget-usage">
              {BigInt(status.percent).toLocaleString("de-DE")} % genutzt
            </p>
            <p
              className="text-2xl font-semibold tabular-nums"
              data-testid="budget-remaining"
            >
              {formatEuro(status.remaining)} verbleibend
            </p>
            {status.remaining < 0 && (
              <p className="text-sm font-medium text-destructive">
                Budget überschritten
              </p>
            )}
            <div className="flex flex-wrap gap-5 text-sm">
              <Link
                href={`/account/money/budget/${budget.id}/goals`}
                className="inline-flex min-h-11 items-center underline"
              >
                Verknüpfte Ziele ansehen
              </Link>
              <Link
                href={`/account/money/budget/${budget.id}?month=${month}`}
                className="inline-flex min-h-11 items-center underline"
              >
                Budget bearbeiten
              </Link>
              <Link
                href={`/account/money/budget/${budget.id}?month=${month}&delete=1`}
                className="inline-flex min-h-11 items-center underline"
              >
                Budget entfernen
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Für diesen Monat ist noch kein Budget festgelegt.
            </p>
            <Link
              href={`/account/money/budget/new?month=${month}`}
              className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Monatsbudget anlegen
            </Link>
          </>
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">
          Alle erfassten variablen Ausgaben dieses Monats zählen dazu,
          unabhängig von der Kategorie. Fixkosten und Sparraten zählen separat.
          Das Budgetlimit ist kein zusätzlicher Abzug. Fehlende Ausgaben können
          den Restbetrag verändern; Prozentwerte sind gerundet.
        </p>
      </CardContent>
    </Card>
  );
}

import Link from "next/link";
import {
  aiMonthRows,
  aiMonthSources,
  type AiMonthFacts,
} from "@/domain/ai-month";
import { monthLabel } from "@/domain/money";

export function MonthFacts({ facts }: { facts: AiMonthFacts }) {
  const sources = aiMonthSources(facts.month);
  return (
    <section
      aria-label="Verwendete Monatsdaten"
      className="space-y-4 rounded-2xl border bg-card p-5"
    >
      <h2 className="text-lg font-semibold">
        Deine Daten für {monthLabel(facts.month)}
      </h2>
      <p className="text-sm text-muted-foreground">
        {facts.time_zone} · EUR · {facts.income_count} erfasste Einnahmen und{" "}
        {facts.expense_count} variable Ausgaben
      </p>
      <dl className="space-y-2">
        {aiMonthRows(facts).map(([label, value]) => (
          <div
            key={label}
            className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm"
          >
            <dt>{label}</dt>
            <dd className="font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {facts.missing.length > 0 && (
        <p className="rounded-lg bg-muted p-3 text-sm">
          Für einen verlässlichen Planwert fehlen{" "}
          {facts.missing
            .map((item) =>
              item === "income"
                ? "Einnahmen für diesen Monat"
                : "Angaben zu Fixkosten",
            )
            .join(" und ")}
          .
        </p>
      )}
      {facts.budget.status === "set" && facts.budget.attention && (
        <p className="text-sm font-medium">
          {facts.budget.attention === "over"
            ? "Monatsbudget überschritten."
            : "Mindestens 90 % des Monatsbudgets sind verbraucht."}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Der verfügbare Betrag ist ein Planwert aus deinen erfassten Angaben,
        kein Kontostand. Geplantes Sparen ist keine Einzahlung. Fehlende
        Buchungen können die Aussage verändern.
      </p>
      <div className="flex flex-wrap gap-4 text-sm">
        {Object.values(sources).map((source) => (
          <Link
            key={source.href}
            href={source.href}
            className="inline-flex min-h-11 items-center underline"
          >
            {source.label} prüfen
          </Link>
        ))}
      </div>
    </section>
  );
}

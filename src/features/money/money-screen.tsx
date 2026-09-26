import Link from "next/link";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  formatEuro,
  monthInZone,
  monthLabel,
  monthSchema,
} from "@/domain/money";
import { availableMinor, categories } from "@/domain/transactions";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { BudgetCard } from "@/features/money/budget-card";
import { loadMoneyMonth, requireMoneyAccount } from "@/server/money";

export type MoneyQuery = {
  month?: string;
  income_page?: string;
  expense_page?: string;
};
const pageSchema = z
  .string()
  .regex(/^\d{1,7}$/)
  .transform(Number)
  .refine((value) => value <= 1000000);
function Pages({
  month,
  page,
  otherPage,
  count,
  kind,
}: {
  month: string;
  page: number;
  otherPage: number;
  count: number;
  kind: "income" | "expense";
}) {
  const href = (next: number) =>
    `/account/money?month=${month}&${kind}_page=${next}&${kind === "income" ? "expense" : "income"}_page=${otherPage}#${kind}-entries`;
  return (
    <nav
      aria-label={kind === "income" ? "Einnahmen Seiten" : "Ausgaben Seiten"}
      className="flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      {page > 0 && (
        <Link
          className="inline-flex min-h-11 items-center underline"
          href={href(page - 1)}
        >
          Vorherige Seite
        </Link>
      )}
      <span className="text-xs text-muted-foreground">
        Seite {page + 1} · {count} Einträge insgesamt
      </span>
      {(page + 1) * 25 < count && (
        <Link
          className="inline-flex min-h-11 items-center underline"
          href={href(page + 1)}
        >
          Nächste Seite
        </Link>
      )}
    </nav>
  );
}
export async function MoneyScreen({ query }: { query: MoneyQuery }) {
  const { supabase, profile } = await requireMoneyAccount();
  const month = monthSchema.safeParse(
    query.month ?? monthInZone(new Date(), profile.time_zone),
  );
  const incomePage = pageSchema.safeParse(query.income_page ?? "0");
  const expensePage = pageSchema.safeParse(query.expense_page ?? "0");
  if (!month.success || !incomePage.success || !expensePage.success)
    return (
      <div className="space-y-5">
        <h1 className="text-3xl font-semibold">Deine Monatsübersicht</h1>
        <p role="alert">Der angeforderte Monat oder die Seite ist ungültig.</p>
        <Link
          href="/account/money"
          className="inline-flex min-h-11 items-center underline"
        >
          Aktuellen Monat öffnen
        </Link>
      </div>
    );
  const data = await loadMoneyMonth(
    supabase,
    month.data,
    incomePage.data,
    expensePage.data,
  );
  const goal = profile.goals[0];
  const value = availableMinor(data.totals);
  const completeBasis = data.totals.income_count > 0 && data.fixed_known;
  const entries = [
    {
      kind: "income" as const,
      title: "Einnahmen",
      rows: data.incomes,
      count: data.totals.income_count,
      page: incomePage.data,
      otherPage: expensePage.data,
    },
    {
      kind: "expense" as const,
      title: "Variable Ausgaben",
      rows: data.expenses,
      count: data.totals.expense_count,
      page: expensePage.data,
      otherPage: incomePage.data,
    },
  ];
  return (
    <div className="space-y-7">
      <div>
        <p className="mb-3 text-xs font-medium tracking-widest text-primary uppercase">
          Money · {profile.display_name}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Dein Geld im Überblick.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Deine erfassten Einnahmen, Ausgaben und monatlichen Pläne.
        </p>
      </div>
      <form action="/account/money" className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="selected-month"
            className="mb-2 block text-sm font-medium"
          >
            Monat auswählen
          </label>
          <input
            id="selected-month"
            type="month"
            name="month"
            defaultValue={month.data}
            min="2000-01"
            max="2100-12"
            required
            className="min-h-12 w-full rounded-xl border bg-background px-3"
          />
        </div>
        <button className="min-h-12 rounded-xl border px-5 text-sm font-medium">
          Monat anzeigen
        </button>
      </form>
      <Card>
        <CardContent className="space-y-5">
          <h2 className="font-semibold">{monthLabel(month.data)} · EUR</h2>
          <dl className="space-y-4 text-sm">
            {[
              [
                "Erfasste Einnahmen",
                data.totals.income_count
                  ? formatEuro(data.totals.income)
                  : "Keine erfasst",
              ],
              [
                "Monatliche Fixkosten",
                data.fixed_known
                  ? formatEuro(data.totals.fixed)
                  : "Nicht angegeben",
              ],
              [
                "Erfasste variable Ausgaben",
                data.totals.expense_count
                  ? formatEuro(data.totals.variable)
                  : "Keine erfasst",
              ],
              [
                "Geplante Sparrate",
                goal
                  ? formatEuro(data.totals.savings)
                  : "Kein Sparziel angegeben",
              ],
            ].map(([label, amount]) => (
              <div key={label} className="flex flex-wrap justify-between gap-2">
                <dt>{label}</dt>
                <dd className="font-medium tabular-nums">{amount}</dd>
              </div>
            ))}
            <div className="border-t pt-4">
              <dt>Verbleibend nach erfassten Angaben</dt>
              <dd
                data-testid="month-available"
                className="mt-2 break-words text-2xl font-semibold tabular-nums"
              >
                {completeBasis ? formatEuro(value) : "Noch unvollständig"}
              </dd>
            </div>
          </dl>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Einnahmen − Fixkosten − variable Ausgaben − geplante Sparrate. Nur
            gespeicherte Angaben fließen ein; fehlende Einträge können den
            Planwert verändern. Kein Kontostand.{" "}
            {completeBasis
              ? ""
              : "Für einen vollständigen Planwert fehlen Einnahmen oder Angaben zu Fixkosten."}
          </p>
        </CardContent>
      </Card>
      <BudgetCard data={data} month={month.data} />
      {entries.map((section) => (
        <section
          key={section.kind}
          id={`${section.kind}-entries`}
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <Link
              href={`/account/money/${section.kind}/new?month=${month.data}`}
              className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              {section.kind === "income"
                ? "Einnahme hinzufügen"
                : "Ausgabe hinzufügen"}
            </Link>
          </div>
          {section.rows.length === 0 ? (
            <p className="rounded-xl border p-5 text-sm text-muted-foreground">
              {section.count
                ? "Auf dieser Seite gibt es keine Einträge."
                : section.kind === "income"
                  ? "Für diesen Monat sind noch keine Einnahmen erfasst."
                  : "Für diesen Monat sind noch keine variablen Ausgaben erfasst."}
            </p>
          ) : (
            <ul className="space-y-3">
              {section.rows.map((row) => (
                <li key={row.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="min-w-0 break-words text-sm font-medium">
                      {row.name}
                    </h3>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatEuro(row.amount_minor)}
                    </p>
                  </div>
                  {"spent_on" in row && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("de-DE", {
                        timeZone: "UTC",
                      }).format(new Date(`${row.spent_on}T12:00:00Z`))}{" "}
                      · {categories[row.category]}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-5 text-xs">
                    <Link
                      href={`/account/money/${section.kind}/${row.id}?month=${month.data}`}
                      className="inline-flex min-h-11 items-center text-primary underline"
                      aria-label={`${row.name} bearbeiten`}
                    >
                      Bearbeiten
                    </Link>
                    <Link
                      href={`/account/money/${section.kind}/${row.id}?month=${month.data}&delete=1`}
                      className="inline-flex min-h-11 items-center text-muted-foreground underline"
                      aria-label={`${row.name} löschen`}
                    >
                      Löschen
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {(section.count > 25 || section.page > 0) && (
            <Pages
              month={month.data}
              kind={section.kind}
              page={section.page}
              otherPage={section.otherPage}
              count={section.count}
            />
          )}
        </section>
      ))}
      <section className="space-y-3 rounded-xl border p-5">
        <h2 className="font-semibold">Eingeplante Fixkosten</h2>
        <Link
          href={`/account/money/fixed?month=${month.data}`}
          className="inline-flex min-h-11 items-center text-sm underline"
        >
          Fixkosten verwalten
        </Link>
        {data.fixed.length ? (
          <ul className="space-y-3 text-sm">
            {data.fixed.map((item) => (
              <li key={item.id} className="space-y-2 border-t pt-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="min-w-0 break-words">{item.name}</span>
                  <span className="tabular-nums">
                    {formatEuro(item.amount_minor)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ab {monthLabel(item.start_month)}
                  {item.end_month
                    ? ` bis einschließlich ${monthLabel(item.end_month)}`
                    : " · ohne Endmonat"}
                </p>
                <Link
                  href={`/account/money/fixed/${item.id}?month=${month.data}`}
                  className="inline-flex min-h-11 items-center text-xs underline"
                  aria-label={`${item.name} ${item.superseded_by ? "Verlauf öffnen" : "ändern"}`}
                >
                  {item.superseded_by
                    ? "Verlauf öffnen"
                    : "Ab späterem Monat ändern"}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Für diesen Monat sind keine Fixkostenpositionen hinterlegt.
          </p>
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">
          In jedem gültigen Monat einmal berücksichtigt, einschließlich des
          letzten Monats. Frühere Beträge bleiben bei einer Änderung erhalten.
        </p>
      </section>
      <section className="space-y-3 rounded-xl border p-5">
        <h2 className="font-semibold">Dein Sparziel</h2>
        {goal ? (
          <>
            <p className="break-words font-medium">{goal.name}</p>
            <p className="text-sm">
              {formatEuro(goal.current_minor)} von{" "}
              {formatEuro(goal.target_minor)}
            </p>
            <Progress
              label={`Fortschritt für ${goal.name}`}
              value={Math.min(
                100,
                (goal.current_minor / goal.target_minor) * 100,
              )}
            />
            <p className="text-xs text-muted-foreground">
              Die monatliche Sparrate ist ab deinem Startmonat eingeplant und
              wird nicht als tatsächliche Einzahlung gezählt.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Du hast noch kein Sparziel angegeben.
          </p>
        )}
      </section>
      <Link
        href="/account"
        className="inline-flex min-h-11 items-center text-sm underline"
      >
        Profil bearbeiten
      </Link>
      <SignOutButton />
    </div>
  );
}

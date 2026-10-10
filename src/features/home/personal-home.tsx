import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { homeQuerySchema, homePeriod, type HomeSearch } from "@/domain/home";
import { formatEuro, monthLabel } from "@/domain/money";
import { availableMinor } from "@/domain/transactions";
import { taskDateLabel, taskPriorities } from "@/domain/tasks";
import { calendarStamp } from "@/domain/calendar-time";
import { requireMoneyAccount } from "@/server/money";
import { loadHome } from "@/server/home";
import { HomeGoals } from "@/features/home/personal-goals";
import { HomeAttention } from "@/features/home/attention";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { HomeAiInsight } from "@/features/home/ai-insight";
export async function PersonalHome({ query }: { query: HomeSearch }) {
  const account = await requireMoneyAccount(),
    now = new Date();
  const parsed = homeQuerySchema.safeParse({
    ...query,
    month: query.month ?? homePeriod(now, account.profile.time_zone).month,
  });
  if (!parsed.success) notFound();
  const data = await loadHome(
    account,
    parsed.data.month,
    parsed.data.goal_page,
    now,
  );
  const complete = data.money.totals.income_count > 0 && data.money.fixed_known;
  const moneyHref = `/account/money?month=${data.month}`;
  return (
    <div className="home-dashboard space-y-7">
      <header className="space-y-3">
        <p className="text-xs font-medium tracking-widest text-primary uppercase">
          Dein persönliches Home
        </p>
        <h1 className="break-words text-3xl font-semibold tracking-tight sm:text-4xl">
          Hallo, {account.profile.display_name}.
        </h1>
        <p className="text-sm text-muted-foreground">
          Heute ist der {taskDateLabel(data.day)} · {account.profile.time_zone}
        </p>
        <p className="text-sm">Dein Tag, dein Geld und deine nächsten Ziele.</p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="home-today-title"
          className="space-y-4 rounded-2xl border bg-card p-6"
        >
          <h2 id="home-today-title" className="text-xl font-semibold">
            Heute
          </h2>
          <div className="space-y-3">
            <h3 className="font-medium">
              {data.tasks.total}{" "}
              {data.tasks.total === 1 ? "offene Aufgabe" : "offene Aufgaben"}{" "}
              für heute
            </h3>
            {!data.tasks.total ? (
              <p className="text-sm text-muted-foreground">
                Für heute sind keine offenen Aufgaben fällig.
              </p>
            ) : (
              <ul className="divide-y">
                {data.tasks.items.slice(0, 3).map((task) => (
                  <li key={task.id} className="py-2">
                    <Link
                      href={`/account/plan/${task.id}`}
                      className="inline-flex min-h-11 items-center break-words text-sm font-medium underline"
                    >
                      {task.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Priorität: {taskPriorities[task.priority]}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-4 text-sm">
              <Link
                href={`/account/plan?view=day&status=open&day=${data.day}`}
                className="inline-flex min-h-11 items-center underline"
              >
                Alle heutigen Aufgaben
              </Link>
              <Link
                href="/account/plan/new"
                className="inline-flex min-h-11 items-center underline"
              >
                Aufgabe anlegen
              </Link>
            </div>
          </div>
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-medium">
              {data.events.total}{" "}
              {data.events.total === 1 ? "Termin" : "Termine"} heute
            </h3>
            {!data.events.total ? (
              <p className="text-sm text-muted-foreground">
                Für heute sind keine Termine eingetragen.
              </p>
            ) : (
              <ul className="divide-y">
                {data.events.items.slice(0, 3).map((event) => (
                  <li key={event.id} className="py-2">
                    <Link
                      href={`/account/plan/calendar/${event.id}`}
                      className="inline-flex min-h-11 items-center break-words text-sm font-medium underline"
                    >
                      {event.title}
                    </Link>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {calendarStamp(
                        event.starts_at,
                        account.profile.time_zone,
                      )}{" "}
                      bis{" "}
                      {calendarStamp(event.ends_at, account.profile.time_zone)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-4 text-sm">
              <Link
                href={`/account/plan/calendar?view=day&day=${data.day}`}
                className="inline-flex min-h-11 items-center underline"
              >
                Heutigen Kalender öffnen
              </Link>
              <Link
                href="/account/plan/calendar/new"
                className="inline-flex min-h-11 items-center underline"
              >
                Termin anlegen
              </Link>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Bis zu drei Aufgaben nach Priorität und drei Termine nach Beginn.
            Die Gesamtzahlen umfassen alle heutigen Einträge.
          </p>
        </section>
        <section aria-labelledby="home-money-title" className="space-y-4">
          <Card>
            <CardContent className="space-y-4">
              <h2 id="home-money-title" className="text-xl font-semibold">
                Dein Monat
              </h2>
              <form
                action="/account/home"
                className="flex flex-wrap items-end gap-3"
              >
                <div className="w-full min-w-0 sm:w-auto sm:flex-1">
                  <label htmlFor="home-month" className="mb-2 block text-sm">
                    Monat auswählen
                  </label>
                  <input
                    id="home-month"
                    name="month"
                    type="month"
                    defaultValue={data.month}
                    min="2000-01"
                    max="2100-12"
                    required
                    className="min-h-12 w-full rounded-xl border bg-background px-3"
                  />
                </div>
                <button className="min-h-12 w-full rounded-xl border px-4 text-sm font-medium sm:w-auto">
                  Monat anzeigen
                </button>
              </form>
              <p className="text-sm font-medium">
                {monthLabel(data.month)} · EUR
              </p>
              <dl className="space-y-3 text-sm">
                {[
                  [
                    "Erfasste Einnahmen",
                    data.money.totals.income_count
                      ? formatEuro(data.money.totals.income)
                      : "Keine erfasst",
                  ],
                  [
                    "Monatliche Fixkosten",
                    data.money.fixed_known
                      ? formatEuro(data.money.totals.fixed)
                      : "Nicht angegeben",
                  ],
                  [
                    "Variable Ausgaben",
                    data.money.totals.expense_count
                      ? formatEuro(data.money.totals.variable)
                      : "Keine erfasst",
                  ],
                  [
                    "Geplante Sparrate",
                    data.money.goal_count
                      ? formatEuro(data.money.totals.savings)
                      : "Kein Sparziel angegeben",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex flex-wrap justify-between gap-2"
                  >
                    <dt>{label}</dt>
                    <dd className="font-medium tabular-nums">{value}</dd>
                  </div>
                ))}
                <div className="border-t pt-4">
                  <dt>Verbleibend nach erfassten Angaben</dt>
                  <dd
                    data-testid="home-available"
                    className="mt-2 break-words text-3xl font-semibold tabular-nums"
                  >
                    {complete
                      ? formatEuro(availableMinor(data.money.totals))
                      : "Noch unvollständig"}
                  </dd>
                </div>
              </dl>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Einnahmen − Fixkosten − variable Ausgaben − geplante Sparrate.
                Kein Kontostand.{" "}
                {complete
                  ? "Fehlende Einträge können den Planwert verändern."
                  : "Es fehlen Einnahmen oder Angaben zu Fixkosten."}
              </p>
              <Link
                href={moneyHref}
                className="inline-flex min-h-11 items-center text-sm font-medium underline"
              >
                Monatsdetails in Money
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>
      <HomeAttention data={data} />
      <HomeGoals data={data} page={parsed.data.goal_page} />
      <HomeAiInsight client={account.supabase} query={parsed.data} now={now} />
      <p className="text-xs text-muted-foreground">
        Deine gespeicherten Angaben · Stand beim Laden dieser Seite. Öffne die
        Übersicht erneut, um Änderungen aus anderen Fenstern zu sehen.
      </p>
      <SignOutButton />
    </div>
  );
}

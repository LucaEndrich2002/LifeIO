import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatEuro,
  monthInZone,
  monthLabel,
  monthSchema,
} from "@/domain/money";
import { requireMoneyAccount } from "@/server/money";

export async function FixedCostsScreen({
  query,
}: {
  query: { month?: string; page?: string };
}) {
  const { supabase, user, profile } = await requireMoneyAccount();
  const month = monthSchema.safeParse(
    query.month ?? monthInZone(new Date(), profile.time_zone),
  );
  if (
    !month.success ||
    !/^\d{1,7}$/.test(query.page ?? "0") ||
    Number(query.page ?? 0) > 1000000
  )
    notFound();
  const page = Number(query.page ?? 0);
  const { data, count, error } = await supabase
    .from("expenses")
    .select("id,name,amount_minor,start_month,end_month", { count: "exact" })
    .eq("user_id", user.id)
    .eq("recurrence", "monthly")
    .is("superseded_by", null)
    .order("start_month", { ascending: false })
    .order("id")
    .range(page * 25, page * 25 + 24);
  if (error) throw new Error("Fixed costs unavailable.");
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Fixkosten verwalten</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Die jeweils letzte Fassung deiner Fixkosten, einschließlich künftig
        geplanter und beendeter Einträge. Frühere Beträge findest du im
        jeweiligen Monat der Finanzübersicht.
      </p>
      <Link
        className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
        href={`/account/money/fixed/new?month=${month.data}`}
      >
        Fixkosten hinzufügen
      </Link>
      {!data?.length ? (
        <p className="rounded-xl border p-5 text-sm">
          {count
            ? "Auf dieser Seite gibt es keine Einträge."
            : "Du hast noch keine Fixkosten erfasst."}
        </p>
      ) : (
        <ul className="space-y-4">
          {data.map((row) => (
            <li key={row.id} className="space-y-2 rounded-xl border p-4">
              <h2 className="break-words font-medium">{row.name}</h2>
              <p className="tabular-nums">
                {formatEuro(row.amount_minor)} monatlich
              </p>
              <p className="text-sm text-muted-foreground">
                Ab {monthLabel(row.start_month!)}
                {row.end_month
                  ? ` bis einschließlich ${monthLabel(row.end_month)}`
                  : " · ohne Endmonat"}
              </p>
              <div className="flex flex-wrap gap-5 text-sm">
                <Link
                  className="inline-flex min-h-11 items-center underline"
                  href={`/account/money/fixed/${row.id}?month=${month.data}`}
                  aria-label={`${row.name} ändern`}
                >
                  Ändern
                </Link>
                <Link
                  className="inline-flex min-h-11 items-center underline"
                  href={`/account/money/fixed/${row.id}?month=${month.data}&delete=1`}
                  aria-label={`${row.name} Endmonat festlegen`}
                >
                  Endmonat festlegen
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      {((count ?? 0) > 25 || page > 0) && (
        <nav
          aria-label="Fixkosten Seiten"
          className="flex flex-wrap gap-5 text-sm"
        >
          {page > 0 && (
            <Link
              className="inline-flex min-h-11 items-center underline"
              href={`/account/money/fixed?month=${month.data}&page=${page - 1}`}
            >
              Vorherige Seite
            </Link>
          )}
          <span className="py-3">
            Seite {page + 1} · {count} Einträge
          </span>
          {(page + 1) * 25 < (count ?? 0) && (
            <Link
              className="inline-flex min-h-11 items-center underline"
              href={`/account/money/fixed?month=${month.data}&page=${page + 1}`}
            >
              Nächste Seite
            </Link>
          )}
        </nav>
      )}
      <Link
        className="inline-flex min-h-11 items-center text-sm underline"
        href={`/account/money?month=${month.data}`}
      >
        Zur Monatsübersicht
      </Link>
    </div>
  );
}

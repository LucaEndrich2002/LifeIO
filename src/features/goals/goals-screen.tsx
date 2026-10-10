import Link from "next/link";
import { notFound } from "next/navigation";
import { formatEuro } from "@/domain/money";
import { requireMoneyAccount } from "@/server/money";
import { goalKindSchema, personalDeadlineLabel } from "@/domain/personal-goals";

export async function GoalsScreen({
  query,
}: {
  query: { page?: string; kind?: string };
}) {
  const { supabase, user } = await requireMoneyAccount();
  const kind = goalKindSchema.safeParse(query.kind ?? "financial");
  if (!kind.success) notFound();
  const personal = kind.data === "personal";
  const pageUrl = (value: number) =>
    `/account/goals?page=${value}${personal ? "&kind=personal" : ""}`;
  if (!/^\d{1,7}$/.test(query.page ?? "0") || Number(query.page ?? 0) > 1000000)
    notFound();
  const page = Number(query.page ?? 0);
  const { data, error, count } = await supabase
    .from("goals")
    .select("id,name,target_minor,deadline", { count: "exact" })
    .eq("user_id", user.id)
    .eq("kind", kind.data)
    .order("created_at", { ascending: false })
    .order("id")
    .range(page * 25, page * 25 + 24);
  if (error) throw new Error("Goals unavailable.");
  if (!personal && data?.some((goal) => goal.target_minor === null))
    throw new Error("Missing financial goal amount.");
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-xs font-medium tracking-widest text-primary uppercase">
          {personal ? "Goals · Persönlich" : "Goals · EUR"}
        </p>
        <h1 className="text-3xl font-semibold">
          {personal ? "Deine persönlichen Ziele" : "Deine Sparziele"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {personal
            ? "Plane, was dir wichtig ist, und verfolge deine nächsten Schritte mit Meilensteinen."
            : "Öffne ein Ziel für deinen tatsächlichen Sparstand, Einzahlungen und geplante Sparraten."}
        </p>
      </div>
      <Link
        href="/account/ai/goals"
        className="inline-flex min-h-11 items-center text-sm underline"
      >
        Ziele gemeinsam mit Life AI betrachten
      </Link>
      <nav aria-label="Zielarten" className="flex flex-wrap gap-4 text-sm">
        <Link
          href="/account/goals"
          aria-current={!personal ? "page" : undefined}
          className="inline-flex min-h-11 items-center rounded-xl border px-4 aria-[current=page]:bg-accent"
        >
          Sparziele
        </Link>
        <Link
          href="/account/goals?kind=personal"
          aria-current={personal ? "page" : undefined}
          className="inline-flex min-h-11 items-center rounded-xl border px-4 aria-[current=page]:bg-accent"
        >
          Persönliche Ziele
        </Link>
      </nav>
      <Link
        href={
          personal ? "/account/goals/new?kind=personal" : "/account/goals/new"
        }
        className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        {personal ? "Persönliches Ziel anlegen" : "Sparziel anlegen"}
      </Link>
      {!data?.length ? (
        <p className="rounded-xl border p-5 text-sm">
          {count
            ? "Auf dieser Seite gibt es keine Ziele."
            : personal
              ? "Du hast noch kein persönliches Ziel angelegt."
              : "Du hast noch kein Sparziel angegeben."}
        </p>
      ) : (
        <ul className="space-y-4">
          {data.map((goal) => (
            <li key={goal.id} className="space-y-2 rounded-xl border p-4">
              <h2 className="break-words font-medium">{goal.name}</h2>
              <p className="text-sm tabular-nums">
                {personal
                  ? personalDeadlineLabel(goal.deadline)
                  : `Zielbetrag ${formatEuro(goal.target_minor!)}`}
              </p>
              <Link
                href={`/account/goals/${goal.id}`}
                aria-label={`${goal.name} öffnen`}
                className="inline-flex min-h-11 items-center text-sm underline"
              >
                {personal ? "Persönliches Ziel öffnen" : "Sparziel öffnen"}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {((count ?? 0) > 25 || page > 0) && (
        <nav
          aria-label={
            personal ? "Persönliche Ziele Seiten" : "Sparziele Seiten"
          }
          className="flex flex-wrap gap-5 text-sm"
        >
          {page > 0 && (
            <Link
              className="inline-flex min-h-11 items-center underline"
              href={pageUrl(page - 1)}
            >
              Vorherige Seite
            </Link>
          )}
          <span className="py-3">
            Seite {page + 1} · {count} Ziele
          </span>
          {(page + 1) * 25 < (count ?? 0) && (
            <Link
              className="inline-flex min-h-11 items-center underline"
              href={pageUrl(page + 1)}
            >
              Nächste Seite
            </Link>
          )}
        </nav>
      )}
      <Link
        href="/account/money"
        className="inline-flex min-h-11 items-center text-sm underline"
      >
        Zur Finanzübersicht
      </Link>
      <Link
        href="/account/plan"
        className="ml-5 inline-flex min-h-11 items-center text-sm underline"
      >
        Zu deinen Aufgaben
      </Link>
    </div>
  );
}

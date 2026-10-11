import Link from "next/link";
import { notFound } from "next/navigation";
import {
  notificationContent,
  notificationHref,
  notificationQuerySchema,
} from "@/domain/notifications";
import { calendarStamp } from "@/domain/calendar-time";
import { requireMoneyAccount } from "@/server/money";
import { loadNotifications } from "@/server/notifications";
import { NotificationForm } from "@/features/notifications/notification-form";

export async function NotificationsScreen({
  search,
}: {
  search: { filter?: string; page?: string };
}) {
  const account = await requireMoneyAccount();
  const parsed = notificationQuerySchema.safeParse(search);
  if (!parsed.success) notFound();
  const query = parsed.data,
    data = await loadNotifications(account, query);
  return (
    <div className="space-y-7">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Deine Benachrichtigungen
        </h1>
        <p className="text-sm text-muted-foreground">
          Gespeicherte Hinweise zu deinem Budget, Aufgaben, Zielen und
          Wochenrückblicken. Du bestimmst, was gelesen ist.
        </p>
        <Link
          href="/account/home"
          className="inline-flex min-h-11 items-center text-sm underline"
        >
          Zurück zu Home
        </Link>
      </header>
      <section
        aria-label="Neue Hinweise prüfen"
        className="space-y-4 rounded-2xl border p-5"
      >
        <p className="text-sm">
          „Hinweise prüfen“ sucht nach mindestens 90 % Nutzung deines aktuellen
          Monatsbudgets, überfälligen offenen Aufgaben und Zielen sowie
          gespeicherten Wochenrückblicken. Maßgeblich ist deine Profilzeitzone{" "}
          {account.profile.time_zone}.
        </p>
        <NotificationForm query={query} />
        <p className="text-xs text-muted-foreground">
          Die Prüfung läuft auf deinen Klick. Pro Aufgabe, Ziel, Monatsbudget
          oder Rückblick entsteht höchstens ein Hinweis. Erneutes Prüfen ändert
          seinen Lesestatus nicht.
        </p>
      </section>
      <p role="status" className="text-sm font-medium">
        {data.unread} ungelesen · {data.total}{" "}
        {query.filter === "unread" ? "in dieser Ansicht" : "insgesamt"}
      </p>
      <nav aria-label="Hinweise filtern" className="flex flex-wrap gap-3">
        {(["all", "unread"] as const).map((filter) => (
          <Link
            key={filter}
            href={notificationHref({ filter, page: 0 })}
            aria-current={query.filter === filter ? "page" : undefined}
            className="inline-flex min-h-11 items-center rounded-xl border px-4 text-sm aria-[current=page]:bg-accent"
          >
            {filter === "all" ? "Alle Hinweise" : "Nur ungelesene"}
          </Link>
        ))}
      </nav>
      {!data.items.length ? (
        <section className="space-y-3 rounded-2xl border p-5">
          <h2 className="text-xl font-semibold">
            {query.page
              ? "Keine Hinweise auf dieser Seite"
              : query.filter === "unread"
                ? "Keine ungelesenen Hinweise"
                : "Noch keine Hinweise gespeichert"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {query.page
              ? "Gehe zur ersten Seite, um den aktuellen Stand zu sehen."
              : "Mit „Hinweise prüfen“ wertest du deine Angaben aus. Ohne passende Auslöser bleibt diese Liste leer."}
          </p>
          {query.page > 0 && (
            <Link
              href={notificationHref({ ...query, page: 0 })}
              className="inline-flex min-h-11 items-center text-sm underline"
            >
              Zur ersten Seite
            </Link>
          )}
        </section>
      ) : (
        <ul className="space-y-4">
          {data.items.map((item) => {
            const content = notificationContent(item);
            return (
              <li key={item.id}>
                <article
                  aria-labelledby={`notice-${item.id}`}
                  className="space-y-3 rounded-2xl border bg-card p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2
                      id={`notice-${item.id}`}
                      className="text-lg font-semibold"
                    >
                      {content.title}
                    </h2>
                    <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium">
                      {item.read_at ? "Gelesen" : "Ungelesen"}
                    </span>
                  </div>
                  <p className="break-words text-sm">{content.detail}</p>
                  <p className="text-xs text-muted-foreground">
                    Erstmals festgestellt:{" "}
                    {calendarStamp(item.created_at, item.time_zone)} ·{" "}
                    {item.time_zone}
                  </p>
                  <Link
                    href={content.href}
                    className="inline-flex min-h-11 items-center text-sm underline"
                  >
                    {item.kind === "review"
                      ? "Wochenrückblick öffnen"
                      : "Originaleintrag öffnen"}
                  </Link>
                  <NotificationForm
                    key={`${item.id}-${item.revision}`}
                    query={query}
                    item={{
                      id: item.id,
                      revision: item.revision,
                      read: item.read_at !== null,
                    }}
                  />
                </article>
              </li>
            );
          })}
        </ul>
      )}
      {(query.page > 0 || (query.page + 1) * 25 < data.total) && (
        <nav
          aria-label="Hinweisseiten"
          className="flex flex-wrap items-center justify-between gap-3 text-sm"
        >
          {query.page > 0 && (
            <Link
              href={notificationHref({ ...query, page: query.page - 1 })}
              className="inline-flex min-h-11 items-center underline"
            >
              Vorherige Seite
            </Link>
          )}
          <span>Seite {query.page + 1}</span>
          {(query.page + 1) * 25 < data.total && (
            <Link
              href={notificationHref({ ...query, page: query.page + 1 })}
              className="inline-flex min-h-11 items-center underline"
            >
              Nächste Seite
            </Link>
          )}
        </nav>
      )}
      <p className="text-xs text-muted-foreground">
        Der Anlass bleibt mit seinem ursprünglichen Datenstand gespeichert.
        Originaleinträge können inzwischen geändert oder erledigt sein.
        Entfernst du einen Originaleintrag, verschwindet auch sein Hinweis. Das
        Öffnen eines Links markiert einen Hinweis nicht automatisch als gelesen.
      </p>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { dateSchema } from "@/domain/transactions";
import {
  firstReviewWeek,
  latestReviewWeek,
  reviewDays,
  reviewWeek,
  reviewWeekSchema,
} from "@/domain/weekly-review";
import { taskDateLabel } from "@/domain/tasks";
import { calendarStamp } from "@/domain/calendar-time";
import { requireMoneyAccount } from "@/server/money";
import { loadWeeklyReview } from "@/server/weekly-review";
import { ReviewForm } from "@/features/review/review-form";
import { ReviewDetails } from "@/features/review/review-details";

export async function ReviewScreen({ week }: { week?: string }) {
  const account = await requireMoneyAccount();
  const latest = latestReviewWeek(new Date(), account.profile.time_zone);
  const day = dateSchema.safeParse(week ?? latest);
  if (!day.success) notFound();
  const parsed = reviewWeekSchema.safeParse(reviewWeek(day.data));
  if (!parsed.success) notFound();
  const selected = parsed.data,
    days = reviewDays(selected);
  const { review, history } = await loadWeeklyReview(account, selected);
  const future = selected > latest && !review;
  return (
    <div className="space-y-7">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Dein Wochenrückblick
        </h1>
        <p className="text-sm text-muted-foreground">
          Montag, {taskDateLabel(days.start)} bis Sonntag,{" "}
          {taskDateLabel(days.end)}
        </p>
        <p className="text-sm">
          Ein gespeicherter Blick auf Geld, Ziele und nächste Schritte. Du
          bestimmst, wann du ihn erstellst oder aktualisierst.
        </p>
        <Link
          href="/account/home"
          className="inline-flex min-h-11 items-center text-sm underline"
        >
          Zurück zu Home
        </Link>
      </header>
      <form action="/account/review" className="flex flex-wrap items-end gap-3">
        <div className="w-full min-w-0 sm:w-auto">
          <label htmlFor="review-week" className="mb-2 block text-sm">
            Tag in der gewünschten Woche
          </label>
          <input
            id="review-week"
            name="week"
            type="date"
            min={firstReviewWeek}
            max={reviewDays(latest).end}
            defaultValue={selected}
            required
            className="min-h-12 w-full min-w-0 rounded-xl border bg-background px-3"
          />
        </div>
        <button className="min-h-12 rounded-xl border px-4 text-sm font-medium">
          Woche anzeigen
        </button>
      </form>
      {history.length > 0 && (
        <details className="rounded-xl border p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Zuletzt gespeicherte Wochen
          </summary>
          <nav
            aria-label="Gespeicherte Rückblicke"
            className="mt-3 flex flex-wrap gap-x-5"
          >
            {history.map((item) => (
              <Link
                key={item}
                href={`/account/review?week=${item}`}
                className="inline-flex min-h-11 items-center text-sm underline"
              >
                Woche ab {taskDateLabel(item)}
              </Link>
            ))}
          </nav>
          <p className="mt-2 text-xs text-muted-foreground">
            Die zwölf neuesten gespeicherten Wochen. Ältere Wochen kannst du
            über das Datum öffnen.
          </p>
        </details>
      )}
      {review ? (
        <>
          <section
            aria-label="Datenstand"
            className="space-y-3 rounded-xl border p-5"
          >
            <p className="text-sm font-medium">
              Gespeicherte Fassung {review.revision + 1} · Datenstand{" "}
              {calendarStamp(review.updated_at, review.time_zone)}
            </p>
            <p className="text-xs text-muted-foreground">
              Erstellt am {calendarStamp(review.created_at, review.time_zone)} ·
              Wochenzeitzone {review.time_zone} · Berechnungsversion{" "}
              {review.rule_version}
            </p>
            <p className="text-sm text-muted-foreground">
              Beim Öffnen bleibt dieser Stand erhalten. Aktualisieren ersetzt
              ihn durch deine derzeit gespeicherten Angaben. Links führen zu den
              aktuellen Originaleinträgen.
            </p>
            {review.time_zone !== account.profile.time_zone && (
              <p className="text-sm">
                Dieser Rückblick behält seine ursprüngliche Wochenzeitzone{" "}
                {review.time_zone}, auch wenn dein Profil inzwischen eine andere
                Zeitzone verwendet.
              </p>
            )}
            <ReviewForm
              key={`${selected}-${review.revision}`}
              week={selected}
              revision={review.revision}
            />
          </section>
          <ReviewDetails data={review.snapshot} />
        </>
      ) : (
        <section className="space-y-4 rounded-2xl border p-6">
          <h2 className="text-xl font-semibold">
            {future
              ? "Diese Woche ist noch nicht abgeschlossen"
              : "Noch kein Rückblick für diese Woche"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {future
              ? "Wähle eine vergangene Woche. Ein Rückblick kann ab dem folgenden Montag erstellt werden."
              : `Erstelle einen Rückblick aus deinen eigenen Angaben. Wochenzeitzone: ${account.profile.time_zone}. Es werden keine Beispieldaten oder KI-Antworten ergänzt.`}
          </p>
          {!future && (
            <ReviewForm key={selected} week={selected} revision={-1} />
          )}
        </section>
      )}
    </div>
  );
}

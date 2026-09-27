import Link from "next/link";
import type { z } from "zod";
import { Progress } from "@/components/ui/progress";
import {
  milestoneProgress,
  type milestoneSnapshotSchema,
} from "@/domain/milestones";
import { MilestoneForm } from "@/features/goals/milestone-form";

export function MilestonesSection({
  goalId,
  data,
  page,
}: {
  goalId: string;
  data: z.output<typeof milestoneSnapshotSchema>;
  page: number;
}) {
  const progress = milestoneProgress(data.total, data.completed);
  const base = `/account/goals/${goalId}`;
  return (
    <section
      id="milestones"
      aria-labelledby="milestones-heading"
      className="space-y-4 rounded-xl border p-5"
    >
      <h2 id="milestones-heading" className="text-lg font-semibold">
        Deine Meilensteine
      </h2>
      <p className="text-sm text-muted-foreground">
        Halte die Schritte zu deinem Ziel fest. Abhaken verändert weder deinen
        Sparstand noch die Sparprognose.
      </p>
      {progress !== null ? (
        <div className="space-y-3">
          <p data-testid="milestone-count" className="text-sm">
            {data.completed} von {data.total} Meilensteinen erledigt
          </p>
          <Progress label="Fortschritt deiner Meilensteine" value={progress} />
          <p className="text-xs text-muted-foreground">
            Alle Meilensteine zählen gleich; der Balken ist gerundet. Dein
            Sparfortschritt steht separat oben.
          </p>
        </div>
      ) : (
        <p className="text-sm">Du hast noch keine Meilensteine angelegt.</p>
      )}
      <Link
        href={`${base}/milestones/new`}
        className="inline-flex min-h-11 items-center text-sm underline"
      >
        Meilenstein anlegen
      </Link>
      {data.items.length ? (
        <ul className="space-y-4">
          {data.items.map((item) => (
            <li key={item.id} className="space-y-3 rounded-xl border p-4">
              <h3 className="break-words font-medium">{item.title}</h3>
              <p className="text-sm text-muted-foreground">
                {item.completed_at ? "Erledigt" : "Offen"}
              </p>
              <MilestoneForm
                key={`${item.id}-${item.revision}`}
                initial={{
                  goal_id: goalId,
                  id: item.id,
                  title: item.title,
                  revision: item.revision,
                  return_page: page,
                  operation: item.completed_at ? "reopen" : "complete",
                }}
              />
              <div className="flex flex-wrap gap-4 text-sm">
                <Link
                  href={`${base}/milestones/${item.id}?page=${page}`}
                  aria-label={`${item.title} bearbeiten`}
                  className="inline-flex min-h-11 items-center underline"
                >
                  Bearbeiten
                </Link>
                <Link
                  href={`${base}/milestones/${item.id}?action=remove&page=${page}`}
                  aria-label={`${item.title} entfernen`}
                  className="inline-flex min-h-11 items-center underline"
                >
                  Entfernen
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        data.total > 0 && (
          <p className="text-sm">
            Auf dieser Seite gibt es keine Meilensteine.
          </p>
        )
      )}
      {(data.total > 25 || page > 0) && (
        <nav
          aria-label="Meilensteine Seiten"
          className="flex flex-wrap gap-5 text-sm"
        >
          {page > 0 && (
            <Link
              className="inline-flex min-h-11 items-center underline"
              href={`${base}?milestone_page=${page - 1}#milestones`}
            >
              Vorherige Seite
            </Link>
          )}
          <span className="py-3">
            Seite {page + 1} · {data.total} Meilensteine
          </span>
          {(page + 1) * 25 < data.total && (
            <Link
              className="inline-flex min-h-11 items-center underline"
              href={`${base}?milestone_page=${page + 1}#milestones`}
            >
              Nächste Seite
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}

import Link from "next/link";
import { goalPlanHref } from "@/domain/goal-plan-links";
export function GoalPlanEntry({ goalId }: { goalId: string }) {
  return (
    <section
      className="space-y-3 rounded-xl border p-5"
      aria-label="Aufgaben und Termine zum Ziel"
    >
      <h2 className="text-lg font-semibold">Aufgaben und Termine</h2>
      <p className="text-sm text-muted-foreground">
        Verbinde dieses Ziel mit deinen nächsten Schritten und passenden
        Terminen. Der Ziel-Fortschritt wird weiterhin über Meilensteine
        beziehungsweise Einzahlungen erfasst.
      </p>
      <div className="flex flex-wrap gap-5 text-sm">
        <Link
          className="inline-flex min-h-11 items-center underline"
          href={goalPlanHref(goalId, "task")}
        >
          Verknüpfte Aufgaben
        </Link>
        <Link
          className="inline-flex min-h-11 items-center underline"
          href={goalPlanHref(goalId, "event")}
        >
          Verknüpfte Termine
        </Link>
      </div>
    </section>
  );
}

import { type PlanTarget } from "@/domain/goal-plan-links";
import { taskDateLabel, taskPriorities } from "@/domain/tasks";
import { calendarStamp } from "@/domain/calendar-time";
export function PlanTargetSummary({
  target,
  zone,
}: {
  target: PlanTarget;
  zone: string;
}) {
  return (
    <div className="space-y-2 text-sm">
      <h2 className="break-words font-semibold">{target.item.title}</h2>
      {target.kind === "task" ? (
        <>
          <p>
            {target.item.completed_at ? "Erledigt" : "Offen"} · Priorität:{" "}
            {taskPriorities[target.item.priority]}
          </p>
          <p>
            {target.item.due_on
              ? `Fällig am ${taskDateLabel(target.item.due_on)}`
              : "Ohne Fälligkeitsdatum"}
          </p>
        </>
      ) : (
        <>
          <p>Beginn: {calendarStamp(target.item.starts_at, zone)}</p>
          <p>Ende: {calendarStamp(target.item.ends_at, zone)}</p>
          <p className="text-muted-foreground">
            Anzeige: {zone} · Terminzeitzone: {target.item.time_zone}
          </p>
        </>
      )}
    </div>
  );
}

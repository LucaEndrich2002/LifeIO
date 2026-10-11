import {
  taskDateLabel,
  taskPriorities,
  taskPrioritySchema,
} from "@/domain/tasks";
import type { OnboardingData } from "@/server/onboarding";

export function OnboardingTasksSummary({
  tasks,
}: {
  tasks: OnboardingData["tasks"];
}) {
  return (
    <section className="space-y-3 rounded-xl border p-5">
      <h2 className="font-semibold">Deine ersten Aufgaben</h2>
      {tasks.length ? (
        <>
          <ul className="space-y-3 text-sm">
            {tasks.map((task) => (
              <li key={task.id} className="space-y-1">
                <p className="break-words font-medium">{task.title}</p>
                <p className="text-muted-foreground">
                  Priorität:{" "}
                  {taskPriorities[taskPrioritySchema.parse(task.priority)]} ·{" "}
                  {task.due_on
                    ? `Fällig am ${taskDateLabel(task.due_on)}`
                    : "Ohne Datum"}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Nach dem Abschluss kannst du diese Aufgaben in Plan bearbeiten und
            abhaken.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Du startest ohne erste Aufgaben. In Plan kannst du später jederzeit
          eigene Aufgaben anlegen.
        </p>
      )}
    </section>
  );
}

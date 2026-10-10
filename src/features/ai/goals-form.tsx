"use client";
import Link from "next/link";
import {
  aiGoalsHref,
  aiGoalsSource,
  aiGoalAssessment,
  aiGoalAssessmentLabels,
  aiOverviewGoalRows,
  type AiGoalsFacts,
  type AiGoalsAnswerState,
} from "@/domain/ai-goals";
import { taskDateLabel } from "@/domain/tasks";
import { askAiGoals } from "@/server/ai-actions";
import { ExplanationForm } from "@/features/ai/explanation-form";

export function GoalsExplanationForm({
  facts,
  names,
  fingerprint,
  configured,
  reloadHref,
}: {
  facts: AiGoalsFacts;
  names: { id: string; name: string }[];
  fingerprint: string;
  configured: boolean;
  reloadHref?: string;
}) {
  return (
    <ExplanationForm<AiGoalsAnswerState>
      subject="goals"
      configured={configured}
      fingerprint={fingerprint}
      hiddenFields={{ page: String(facts.page) }}
      sources={{ goals: aiGoalsSource(facts.page) }}
      reloadHref={reloadHref ?? aiGoalsHref(facts.page)}
      initialState={{ status: "idle" }}
      submit={askAiGoals}
    >
      <section
        aria-label="Verwendete Zieldaten"
        className="space-y-4 rounded-2xl border bg-card p-5"
      >
        <h2 className="text-lg font-semibold">Deine Ziele auf dieser Seite</h2>
        <p className="text-sm">
          Stand: {taskDateLabel(facts.as_of)} · {facts.time_zone} · Sparbeträge
          in EUR
        </p>
        <p className="text-sm">
          Seite {facts.page + 1} · {facts.goals.length} von {facts.total}{" "}
          Zielen. Offene Ziele zuerst, nach Zieldatum.
        </p>
        {facts.total > facts.goals.length && (
          <p className="rounded-xl border p-3 text-sm">
            Ausschnitt: Die Erklärung umfasst nur die Ziele dieser Seite.
            Wechsle die Seite, um weitere Ziele zu prüfen und neu freizugeben.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Die Namen dienen hier zur Zuordnung. OpenAI erhält nur die Kürzel Ziel
          A bis Ziel F; auf jeder Seite beginnen diese neu.
        </p>
        <ul className="space-y-4">
          {facts.goals.map((goal, index) => {
            const entry = names[index]!;
            const assessment = aiGoalAssessment(goal, facts.as_of);
            return (
              <li key={goal.label} className="space-y-3 rounded-xl border p-4">
                <h3 className="font-semibold [overflow-wrap:anywhere]">
                  Ziel {goal.label}: {entry.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {goal.kind === "financial" ? "Sparziel" : "Persönliches Ziel"}
                </p>
                <p
                  className={`text-sm font-medium ${assessment === "overdue" || assessment === "late" ? "text-destructive" : ""}`}
                >
                  {aiGoalAssessmentLabels[assessment]}
                </p>
                <dl className="space-y-2">
                  {aiOverviewGoalRows(goal).map(([label, value]) => (
                    <div
                      key={label}
                      className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm"
                    >
                      <dt>{label}</dt>
                      <dd className="font-medium tabular-nums [overflow-wrap:anywhere]">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <Link
                  href={`/account/goals/${entry.id}`}
                  className="inline-flex min-h-11 items-center text-sm underline"
                >
                  Ziel {goal.label} prüfen
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-muted-foreground">
          Sparprognosen nehmen Beiträge am Monatsende ab dem Folgemonat an;
          geplante Ratenänderungen und Pausen gelten weiter. Keine automatisch
          nachgeholten Beiträge, Zinsen oder Renditen. Geplantes Sparen ist
          keine Einzahlung. Gemeinsame Finanzierbarkeit und Zielverknüpfungen
          werden hier nicht geprüft.
        </p>
        <p className="text-sm text-muted-foreground">
          Persönliche Ziele zeigen den Stand erfasster Meilensteine. Ohne Dauer
          und Zeitplan lässt sich kein zukünftiger Abschluss vorhersagen. Ein
          erreichtes Ziel belegt nicht, wann es erreicht wurde.
        </p>
        <Link
          href={aiGoalsSource(facts.page).href}
          className="inline-flex min-h-11 items-center text-sm underline"
        >
          Ziele und Fortschritt im Dashboard prüfen
        </Link>
      </section>
    </ExplanationForm>
  );
}

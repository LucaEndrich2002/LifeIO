"use client";
import Link from "next/link";
import {
  aiGoalRows,
  aiGoalSource,
  type AiGoalFacts,
  type AiGoalAnswerState,
} from "@/domain/ai-goal";
import { askAiGoal } from "@/server/ai-actions";
import { ExplanationForm } from "@/features/ai/explanation-form";

export function GoalExplanationForm({
  id,
  facts,
  fingerprint,
  configured,
}: {
  id: string;
  facts: AiGoalFacts;
  fingerprint: string;
  configured: boolean;
}) {
  const source = aiGoalSource(id);
  return (
    <ExplanationForm<AiGoalAnswerState>
      subject="goal"
      configured={configured}
      fingerprint={fingerprint}
      hiddenFields={{ goal_id: id }}
      sources={{ projection: source }}
      reloadHref={`/account/ai/goals/${id}`}
      initialState={{ status: "idle" }}
      submit={askAiGoal}
    >
      <section
        aria-label="Verwendete Prognosedaten"
        className="space-y-4 rounded-2xl border bg-card p-5"
      >
        <h2 className="text-lg font-semibold">Deine berechnete Sparprognose</h2>
        <p className="text-sm text-muted-foreground">{facts.time_zone} · EUR</p>
        <dl className="space-y-3">
          {aiGoalRows(facts).map(([label, value]) => (
            <div
              key={label}
              className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm"
            >
              <dt>{label}</dt>
              <dd className="font-semibold tabular-nums [overflow-wrap:anywhere]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Die Prognose startet beim tatsächlichen Sparstand. Geplante Beiträge
          zählen am Monatsende ab dem Folgemonat; gespeicherte Ratenänderungen
          und Pausen sind berücksichtigt. Vergangene oder laufende Monate werden
          nicht aufgefüllt. Die letzte Rate gilt bis zur nächsten Änderung. Die
          letzte nötige Einzahlung kann kleiner sein.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Ohne Zinsen oder Rendite. Die Prognose setzt tatsächliches Sparen
          voraus und prüft nicht, ob dein Monatsbudget ausreicht. Es wird kein
          Geld gebucht. Der Zielname bleibt in LifeOS, sofern du ihn nicht
          selbst in die Frage schreibst.
        </p>
        <Link
          href={source.href}
          className="inline-flex min-h-11 items-center text-sm underline"
        >
          Sparziel und Prognose prüfen
        </Link>
      </section>
    </ExplanationForm>
  );
}

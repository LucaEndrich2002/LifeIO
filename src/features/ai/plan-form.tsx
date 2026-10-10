"use client";
import Link from "next/link";
import {
  aiPlanSources,
  type AiPlanAnswerState,
  type AiPlanFacts,
} from "@/domain/ai-plan";
import { taskDateLabel, taskPriorities } from "@/domain/tasks";
import { calendarStamp } from "@/domain/calendar-time";
import { askAiPlan } from "@/server/ai-actions";
import { ExplanationForm } from "@/features/ai/explanation-form";

export function PlanExplanationForm({
  facts,
  fingerprint,
  configured,
  reloadHref,
}: {
  facts: AiPlanFacts;
  fingerprint: string;
  configured: boolean;
  reloadHref?: string;
}) {
  const sources = aiPlanSources(facts.as_of);
  return (
    <ExplanationForm<AiPlanAnswerState>
      subject="plan"
      configured={configured}
      fingerprint={fingerprint}
      hiddenFields={{}}
      sources={sources}
      reloadHref={reloadHref ?? "/account/ai/plan"}
      initialState={{ status: "idle" }}
      submit={askAiPlan}
    >
      <section
        aria-label="Verwendete Aufgaben und Termine"
        className="space-y-4 rounded-2xl border bg-card p-5"
      >
        <h2 className="text-lg font-semibold">Deine Daten für diese Woche</h2>
        <p className="text-sm">
          {taskDateLabel(facts.week_start)} bis {taskDateLabel(facts.week_end)}{" "}
          · {facts.time_zone}
        </p>
        <p className="text-sm text-muted-foreground">
          Heute: {taskDateLabel(facts.as_of)}. Aufgaben: alle offenen
          Fälligkeiten dieser Woche. Termine: beim Laden noch laufende und
          bevorstehende bis einschließlich Sonntag. Alle Terminzeiten werden in
          deiner Profilzeitzone angezeigt.
        </p>
        <div className="grid gap-6 lg:grid-cols-2">
          <section
            aria-label="Aufgabenausschnitt"
            className="min-w-0 space-y-3"
          >
            <h3 className="font-semibold">
              Offene Aufgaben · {facts.tasks.length} von {facts.tasks_total}
            </h3>
            {facts.tasks_total > facts.tasks.length && (
              <p className="rounded-xl border p-3 text-sm">
                Unvollständiger Ausschnitt: Nur die ersten 25 Aufgaben werden
                angezeigt und gesendet. Weitere findest du in der Aufgabenliste.
              </p>
            )}
            {facts.tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Keine offenen Aufgaben mit Fälligkeit in dieser Woche erfasst.
              </p>
            ) : (
              <ul className="space-y-3">
                {facts.tasks.map((task, index) => (
                  <li
                    key={index}
                    className="space-y-1 rounded-xl border p-3 text-sm [overflow-wrap:anywhere]"
                  >
                    <p className="font-medium">{task.title}</p>
                    <p>
                      Priorität: {taskPriorities[task.priority]} · Fällig:{" "}
                      {taskDateLabel(task.due_on)}
                    </p>
                    <p className="text-muted-foreground">
                      {task.overdue ? "Überfällig" : "Noch nicht überfällig"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={sources.tasks.href}
              className="inline-flex min-h-11 items-center text-sm underline"
            >
              Alle Aufgaben dieser Woche prüfen
            </Link>
          </section>
          <section aria-label="Terminausschnitt" className="min-w-0 space-y-3">
            <h3 className="font-semibold">
              Anstehende Termine · {facts.events.length} von{" "}
              {facts.events_total}
            </h3>
            {facts.events_total > facts.events.length && (
              <p className="rounded-xl border p-3 text-sm">
                Unvollständiger Ausschnitt: Nur die ersten 25 Termine werden
                angezeigt und gesendet. Weitere findest du im Kalender.
              </p>
            )}
            {facts.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Keine laufenden oder bevorstehenden Termine bis Sonntag erfasst.
              </p>
            ) : (
              <ul className="space-y-3">
                {facts.events.map((event, index) => (
                  <li
                    key={index}
                    className="space-y-1 rounded-xl border p-3 text-sm [overflow-wrap:anywhere]"
                  >
                    <p className="font-medium">{event.title}</p>
                    <p>
                      Beginn: {calendarStamp(event.starts_at, facts.time_zone)}
                    </p>
                    <p>Ende: {calendarStamp(event.ends_at, facts.time_zone)}</p>
                    <p className="text-muted-foreground">
                      {event.ongoing ? "Läuft bereits" : "Bevorstehend"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={sources.events.href}
              className="inline-flex min-h-11 items-center text-sm underline"
            >
              Kalender dieser Woche prüfen
            </Link>
            <p className="text-xs text-muted-foreground">
              Der Kalender zeigt auch bereits beendete Termine der Woche.
            </p>
          </section>
        </div>
        <p className="text-sm text-muted-foreground">
          Aufgaben ohne Datum, Fälligkeiten aus anderen Wochen und erledigte
          Aufgaben fehlen hier. Leere Listen bedeuten deshalb nicht, dass nichts
          zu tun ist. Die Einordnung kennt weder die Dauer deiner Aufgaben noch
          deine freie Zeit.
        </p>
        <Link
          href="/account/plan"
          className="inline-flex min-h-11 items-center text-sm underline"
        >
          Alle offenen Aufgaben prüfen
        </Link>
      </section>
    </ExplanationForm>
  );
}

"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { askAiMonth } from "@/server/ai-actions";
import {
  aiMonthSources,
  type AiAnswerState,
  type AiMonthFacts,
} from "@/domain/ai-month";
import { MonthFacts } from "@/features/ai/month-facts";

export function MonthForm({
  facts,
  fingerprint,
  configured,
}: {
  facts: AiMonthFacts;
  fingerprint: string;
  configured: boolean;
}) {
  const [state, action, pending] = useActionState(askAiMonth, {
    status: "idle",
  } as AiAnswerState);
  const [question, setQuestion] = useState("");
  const [consent, setConsent] = useState(false);
  const result = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status !== "idle") {
      result.current?.focus();
    }
  }, [state]);
  const sources = aiMonthSources(facts.month);
  return (
    <div className="space-y-6">
      <MonthFacts facts={facts} />
      {!configured && (
        <p
          role="status"
          className="rounded-xl border border-dashed p-4 text-sm"
        >
          Die KI-Verbindung ist noch nicht eingerichtet. Du kannst deine
          Monatsdaten prüfen; das Senden an OpenAI ist noch nicht verfügbar.
        </p>
      )}
      <form action={action} className="space-y-4">
        <input type="hidden" name="month" value={facts.month} />
        <input type="hidden" name="fingerprint" value={fingerprint} />
        <fieldset
          disabled={pending || !configured}
          className="min-w-0 space-y-4 disabled:opacity-60"
        >
          <legend className="mb-3 text-lg font-semibold">
            Deinen Monat erklären lassen
          </legend>
          <p id="ai-data-info" className="text-sm text-muted-foreground">
            An OpenAI werden nur die oben angezeigten Monatssummen,
            Buchungsanzahlen, Budget- und Fehlangaben, Monat, Zeitzone sowie
            deine Frage gesendet. Namen einzelner Buchungen, Kontodaten, Ziele
            und Termine bleiben außerhalb dieser Anfrage.
          </p>
          <div>
            <label
              htmlFor="ai-question"
              className="mb-2 block text-sm font-medium"
            >
              Deine Frage zum Monat (optional)
            </label>
            <textarea
              id="ai-question"
              name="question"
              value={question}
              onChange={(event) => {
                setQuestion(event.target.value);
                setConsent(false);
              }}
              rows={3}
              maxLength={600}
              placeholder="Wie läuft mein Monat?"
              aria-describedby="ai-question-help"
              className="w-full rounded-xl border bg-background p-3"
            />
            <p id="ai-question-help" className="text-xs text-muted-foreground">
              Höchstens 600 Zeichen. Gib hier keine Zugangsdaten ein. Andere
              Monate und Datenbereiche werden nicht zusätzlich abgerufen.
            </p>
          </div>
          <label className="flex min-h-11 items-start gap-3 rounded-xl border p-4 text-sm">
            <input
              type="checkbox"
              name="consent"
              value="yes"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 size-4 shrink-0"
              aria-describedby="ai-data-info"
            />
            <span>
              Ich möchte die angezeigten Daten und meine Frage zur Erklärung an
              OpenAI senden.
            </span>
          </label>
          <p className="text-xs leading-relaxed text-muted-foreground">
            LifeOS speichert keinen Chatverlauf. OpenAI kann Inhalte für
            Missbrauchsschutz verarbeiten und aufbewahren.{" "}
            <a
              href="https://developers.openai.com/api/docs/guides/your-data"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Datennutzung bei OpenAI
            </a>
          </p>
          <button
            disabled={!consent || pending}
            className="min-h-12 w-full rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50"
          >
            {pending ? "Erklärung wird erstellt …" : "Mit OpenAI erklären"}
          </button>
        </fieldset>
        {pending && (
          <p role="status" className="text-sm">
            Deine freigegebenen Monatsdaten werden geprüft und erklärt …
          </p>
        )}
      </form>
      <div
        ref={result}
        tabIndex={-1}
        className="outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-live="polite"
      >
        {!pending && state.status === "error" && (
          <div role="alert" className="space-y-2 rounded-xl border p-4">
            <p>{state.message}</p>
            <a
              href={`/account/ai?month=${facts.month}`}
              className="inline-flex min-h-11 items-center text-sm underline"
            >
              Monatsdaten neu laden
            </a>
          </div>
        )}
        {!pending && state.status === "success" && (
          <section
            aria-label="KI-Erklärung"
            className="space-y-4 rounded-2xl border bg-card p-5"
          >
            <h2 className="text-lg font-semibold">KI-Einordnung</h2>
            <p className="text-xs text-muted-foreground">
              Datenstand:{" "}
              {new Intl.DateTimeFormat("de-DE", {
                dateStyle: "short",
                timeStyle: "short",
                timeZone: state.facts.time_zone,
              }).format(new Date(state.observedAt))}{" "}
              · {state.facts.time_zone}
            </p>
            {state.answer.paragraphs.map((text, index) => (
              <p
                key={index}
                className="text-sm leading-relaxed [overflow-wrap:anywhere]"
              >
                {text}
              </p>
            ))}
            <p className="text-xs text-muted-foreground">
              KI-Texte können sich irren. Prüfe die Einordnung anhand deiner
              oben angezeigten Originalwerte. Diese Erklärung bezieht sich nur
              auf den ausgewählten Finanzmonat.
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              {state.answer.sources.map((key) => (
                <Link
                  key={key}
                  className="inline-flex min-h-11 items-center underline"
                  href={sources[key].href}
                >
                  Quelle: {sources[key].label}
                </Link>
              ))}
            </div>
          </section>
        )}
        {!pending && state.status === "idle" && (
          <p className="text-sm text-muted-foreground">
            Noch keine KI-Erklärung. Prüfe zuerst die Daten und entscheide dann,
            ob du sie senden möchtest.
          </p>
        )}
      </div>
    </div>
  );
}

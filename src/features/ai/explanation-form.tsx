"use client";
import Link from "next/link";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ExplanationState } from "@/domain/ai-explanation";

type State = ExplanationState<
  { time_zone: string },
  { paragraphs: string[]; sources: string[] }
>;
const copy = {
  plan: {
    legend: "Deine Woche einordnen lassen",
    label: "Deine Frage zu Aufgaben und Terminen (optional)",
    placeholder: "Was sollte ich diese Woche erledigen?",
    unavailable: "Aufgaben und Termine",
    reload: "Aufgaben und Termine neu laden",
    disclosure:
      "An OpenAI werden nur die oben angezeigten Titel, Prioritäten, Fälligkeiten, Terminzeiten, Überfällig-/Läuft-Status, Gesamtanzahlen, Zeitraum und Profilzeitzone sowie deine Frage gesendet. Die Titel können persönliche Informationen enthalten. Interne Kennungen, Finanzen und Ziele werden nicht mitgesendet.",
    help: "Andere Wochen und Datenbereiche werden nicht zusätzlich abgerufen.",
    scope:
      "Die Einordnung betrifft ausschließlich die angezeigten Aufgaben und Termine. Sie ist kein vollständiger Wochenplan.",
  },
  month: {
    legend: "Deinen Monat erklären lassen",
    label: "Deine Frage zum Monat (optional)",
    placeholder: "Wie läuft mein Monat?",
    unavailable: "Monatsdaten",
    reload: "Monatsdaten neu laden",
    disclosure:
      "An OpenAI werden nur die oben angezeigten Monatssummen, Buchungsanzahlen, Budget- und Fehlangaben, Monat, Zeitzone sowie deine Frage gesendet. Namen einzelner Buchungen, Kontodaten, Ziele und Termine bleiben außerhalb dieser Anfrage.",
    help: "Andere Monate und Datenbereiche werden nicht zusätzlich abgerufen.",
    scope: "Diese Erklärung bezieht sich nur auf den ausgewählten Finanzmonat.",
  },
  goal: {
    legend: "Deine Sparprognose erklären lassen",
    label: "Deine Frage zum Sparziel (optional)",
    placeholder: "Wann erreiche ich mein Sparziel?",
    unavailable: "Prognosedaten",
    reload: "Prognosedaten neu laden",
    disclosure:
      "An OpenAI werden nur die oben angezeigten Beträge, berechneten Termine, Beitragsanzahl, Prognose- und Terminstatus, Datenstand und Zeitzone sowie deine Frage gesendet. Zielname, Einzahlungsnotizen, andere Ziele, Monatsbudget und Kontodaten bleiben außerhalb dieser Anfrage.",
    help: "Andere Ziele und Datenbereiche werden nicht zusätzlich abgerufen.",
    scope:
      "Diese Erklärung bezieht sich nur auf die ausgewählte Sparprognose. Ob dein Monatsbudget dafür ausreicht, wird hier nicht geprüft.",
  },
};
export function ExplanationForm<S extends State>({
  configured,
  fingerprint,
  hiddenFields,
  subject,
  sources,
  reloadHref,
  initialState,
  submit,
  children,
}: {
  configured: boolean;
  fingerprint: string;
  hiddenFields: Record<string, string>;
  subject: keyof typeof copy;
  sources: Record<string, { href: string; label: string }>;
  reloadHref: string;
  initialState: Awaited<S>;
  submit: (previous: S, form: FormData) => Promise<S>;
  children: ReactNode;
}) {
  const [state, action, pending] = useActionState(submit, initialState);
  const text = copy[subject];
  const [question, setQuestion] = useState("");
  const [consent, setConsent] = useState(false);
  const result = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status !== "idle") {
      result.current?.focus();
    }
  }, [state]);
  return (
    <div className="space-y-6">
      {children}
      {!configured && (
        <p
          role="status"
          className="rounded-xl border border-dashed p-4 text-sm"
        >
          Die KI-Verbindung ist noch nicht eingerichtet. Du kannst deine{" "}
          {text.unavailable} prüfen; das Senden an OpenAI ist noch nicht
          verfügbar.
        </p>
      )}
      <form action={action} className="space-y-4">
        {Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <input type="hidden" name="fingerprint" value={fingerprint} />
        <fieldset
          disabled={pending || !configured}
          className="min-w-0 space-y-4 disabled:opacity-60"
        >
          <legend className="mb-3 text-lg font-semibold">{text.legend}</legend>
          <p id="ai-data-info" className="text-sm text-muted-foreground">
            {text.disclosure}
          </p>
          <div>
            <label
              htmlFor="ai-question"
              className="mb-2 block text-sm font-medium"
            >
              {text.label}
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
              placeholder={text.placeholder}
              aria-describedby="ai-question-help"
              className="w-full rounded-xl border bg-background p-3"
            />
            <p id="ai-question-help" className="text-xs text-muted-foreground">
              Höchstens 600 Zeichen. Gib hier keine Zugangsdaten ein.{" "}
              {text.help}
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
            Deine freigegebenen {text.unavailable} werden geprüft und erklärt …
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
              href={reloadHref}
              className="inline-flex min-h-11 items-center text-sm underline"
            >
              {text.reload}
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
              oben angezeigten Originalwerte. {text.scope}
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              {state.answer.sources
                .filter((key) => sources[key])
                .map((key) => (
                  <Link
                    key={key}
                    className="inline-flex min-h-11 items-center underline"
                    href={sources[key]!.href}
                  >
                    Quelle: {sources[key]!.label}
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

# LifeOS – Roadmap

Aktuell (11.10.2026): Der gespeicherte Wochenrückblick nach R13 ergänzt Geld, Ziele, Aufgaben und Fristen mit nachvollziehbaren Hinweisen, unverändertem Datenstand beim Öffnen und ausdrücklicher Aktualisierung. Umfang und Prüfstand: [WEEKLY_REVIEW_STATUS.md](../WEEKLY_REVIEW_STATUS.md). R14 bleibt offen; Phase 9 ist nicht insgesamt abgeschlossen. Der verbleibende V1-Umfang steht in [V1_STATUS.md](V1_STATUS.md).

Stand: 11.10.2026

Quellen: [README](../../README.md), Abschnitte 9, 10 und 21, sowie [PRD](PRD.md). Diese Roadmap beschreibt die Reihenfolge und Abnahmebedingungen, keine bereits implementierten Funktionen.

## Aktueller Stand

- Optionale erste Aufgaben ergänzen den Einstieg nach R02/J01 einschließlich Überspringen, Wiederaufnahme und Übergang in Plan. Bereits abgeschlossene Einrichtungen bleiben erhalten. Umfang und Prüfstand: [ONBOARDING_TASKS_STATUS.md](../ONBOARDING_TASKS_STATUS.md).

- Das sechste Life-AI-Inkrement ergänzt direkt auf Home eine auswählbare KI-Vorschau und Erklärung für den gewählten Finanzmonat, die aktuelle Woche oder die angezeigte Zielseite. Vorhandene Freigabe-/Datengrenzen werden wiederverwendet; Öffnen und Wechseln senden nichts an OpenAI. Umfang, lokale Speichergrenze und Prüfstand: [HOME_AI_STATUS.md](../HOME_AI_STATUS.md). Die ausgesetzte Abnahme echter Antworten bleibt offen.

- Das fünfte Life-AI-Inkrement ergänzt eine paginierte Einordnung mehrerer eigener Sparziele und persönlicher Ziele mit Originalwerten, berechneten Termin-Hinweisen und expliziter Freigabe. Namen bleiben lokal; der Provider erhält die Kürzel A bis F für die angezeigte Seite. Umfang und Prüfstand: [AI_GOALS_STATUS.md](../AI_GOALS_STATUS.md). Der Home-KI-Insight und die ausgesetzte Live-Abnahme bleiben offen.

- Das vierte Life-AI-Inkrement ergänzt die freizugebende Einordnung eigener offener Aufgaben und anstehender Termine dieser Woche, mit sichtbarem Ausschnitt und festen Quellen. [AI_PLAN_STATUS.md](../AI_PLAN_STATUS.md) beschreibt Umfang und Prüfstand. Die verbleibende V1-Arbeit ist in [V1_STATUS.md](V1_STATUS.md) zusammengefasst; das ist keine Zählung gleich großer Tickets. KI-Live-Tests bleiben auf Nutzerwunsch ausgesetzt.

- Das dritte Life-AI-Inkrement ergänzt die Vorschau und freigegebene Erklärung der Prognose eines ausgewählten eigenen Sparziels. Es verwendet ausschließlich `get_goal_projection` und teilt die vorhandenen Anfragegrenzen mit der Monatserklärung. Umfang und Prüfstand: [AI_GOAL_STATUS.md](../AI_GOAL_STATUS.md). KI-Live-Tests werden auf Nutzerwunsch ausgelassen; echte Antwortqualität und die übrigen R12-Datenbereiche bleiben offen.

- Das zweite Life-AI-Inkrement ergänzt eine private Monatsansicht mit Originalwerten, expliziter Datenfreigabe, begrenzter OpenAI-Anbindung und festen Quellen. Ein kontoübergreifend isolierter Zähler begrenzt Provideranfragen. Ohne Zugangsdaten bleibt die Monatsansicht nutzbar; echte Modellantworten sind noch nicht abgenommen. [AI_MONTH_STATUS.md](../AI_MONTH_STATUS.md) beschreibt Umfang und offene Punkte. R12 bleibt offen.

- Das erste Life-AI-Inkrement ergänzt die sechs autorisierten, ausschließlich lesenden Anwendungstools aus R12. Strikte Argumente, aktuelle Anmeldung, Nutzerrechte und reduzierte Ergebnisse mit Zeitraum/Herkunft bilden die Grundlage. Es gibt noch keine Modellanbindung oder echten KI-Antworten; R12 bleibt offen. Umfang und Prüfstand: [AI_READ_TOOLS_STATUS.md](../AI_READ_TOOLS_STATUS.md).

- Das erste Home-Inkrement ergänzt einen privaten Überblick über heute, den gewählten Finanzmonat, beide Zielarten und begründete Hinweise. Es verwendet echte eigene Daten und bestehende Fachberechnungen. Umfang, Grenzen und Prüfstand: [HOME_STATUS.md](../HOME_STATUS.md). Die Verständlichkeitsprüfung J05 mit fünf Personen bleibt offen; Phase 7 ist noch nicht insgesamt abgenommen.

- Der dritte Plan-Schritt verbindet Sparziele und persönliche Ziele mit eigenen Aufgaben (`requires`) und Terminen (`scheduled_as`). Auswahl, vollständige Seiten, beidseitige Navigation und bestätigtes Entfernen sind enthalten. Mit den vorhandenen Budget-Links sind R08–R10 und der funktionale Umfang von Phase 6 umgesetzt. Regeln und Abnahme: [GOAL_PLAN_LINKS_STATUS.md](../GOAL_PLAN_LINKS_STATUS.md). Phase 7 – Home folgt als eigener Produktabschnitt; optionale Onboarding-Aufgaben bleiben außerhalb dieses Plan-Inkrements offen.

- Der zweite Plan-Schritt ergänzt eigene Kalendertermine mit Bearbeiten, bestätigtem Löschen und Tages-/Wochenansicht. Profil- und Terminzeitzone, mehrtägige Intervalle sowie fehlende/doppelte Uhrzeiten sind explizit behandelt. [CALENDAR_STATUS.md](../CALENDAR_STATUS.md) beschreibt R09.

- Der erste Plan-Schritt verwaltet eigene Aufgaben mit Priorität, optionaler Fälligkeit, Status und bestätigtem Löschen. Tages-/Wochenfilter, Aufgaben ohne Datum und vollständige Folgeseiten sind enthalten. [TASKS_STATUS.md](../TASKS_STATUS.md) beschreibt R08; die Aufgaben-Ergänzung im Onboarding bleibt ein weiterer Schritt.

- Ziele und Monatsbudgets lassen sich mit beidseitiger Navigation und bestätigtem Entfernen verbinden. Diese Zuordnung reserviert kein Geld und verändert keine Finanzberechnung. [GOAL_BUDGET_LINKS_STATUS.md](../GOAL_BUDGET_LINKS_STATUS.md) beschreibt den ersten typisierten Life-Core-Link und seine Isolation; der Plan-Schritt ergänzt die beiden weiteren R10-Beziehungen.

- Persönliche Ziele ohne Geldbetrag lassen sich neben Sparzielen anlegen und bearbeiten. Ein optionales Zieldatum und die gemeinsame Meilenstein-Verwaltung machen ihren Fortschritt sichtbar; finanzielle Berechnungen bleiben unverändert. [PERSONAL_GOALS_STATUS.md](../PERSONAL_GOALS_STATUS.md) beschreibt Regeln, Trennung und Abnahme.

- Bestehende Sparziele haben eine eigene Meilenstein-Verwaltung mit getrenntem Fortschritt, Wiederöffnen und bestätigtem Entfernen. [GOAL_MILESTONES_STATUS.md](../GOAL_MILESTONES_STATUS.md) beschreibt das ursprüngliche Inkrement; persönliche Ziele nutzen diese Verwaltung inzwischen ebenfalls.

- Die Sparziel-Prognose berechnet künftige Beiträge aus dem tatsächlichen Stand und dem Ratenverlauf, zeigt Annahmen und vergleicht den Termin taggenau mit dem Zieldatum. [GOAL_FORECAST_STATUS.md](../GOAL_FORECAST_STATUS.md) beschreibt die Beitragskonvention nach O03 und die Abnahme.

- Die laufende Sparzielverwaltung ergänzt mehrere finanzielle Ziele, tatsächliche Einzahlungen mit bestätigter Stornierung und historische Sparraten für die gemeinsame Money-Monatsrechnung. [SAVINGS_GOALS_STATUS.md](../SAVINGS_GOALS_STATUS.md) beschreibt Umfang und Abnahme. Phase 5 ist nicht insgesamt abgeschlossen.

- Das zweite Money-Inkrement ergänzt Fixkosten mit Gültigkeitszeiträumen und erhaltenen früheren Beträgen sowie ein Monatsbudget für alle variablen Ausgaben. Regeln, Grenzen und Abnahme stehen in [FIXED_COSTS_BUDGET_STATUS.md](../FIXED_COSTS_BUDGET_STATUS.md). Das persönliche Home-Dashboard bleibt ein weiterer Schritt.

- Der erste begrenzte Money-Core-Schritt ergänzt mehrere Einnahmen, variable Ausgaben mit Datum/Kategorie, bestätigtes Löschen und eine paginierte Monatsübersicht mit vollständigen Summen. Die persönliche Startübersicht führt jetzt nach Money. [MONEY_TRANSACTIONS_STATUS.md](../MONEY_TRANSACTIONS_STATUS.md) beschreibt Regeln und Abnahme. Phase 4 ist nicht insgesamt abgeschlossen.

- Das zweite Inkrement von Phase 3 ergänzt die finanzielle Einrichtung: Einkommen, monatliche Fixkosten und ein Sparziel mit Auslassentscheidungen, Wiederaufnahme, atomarem Speichern und persönlicher Startübersicht. Umfang, Regeln und Abnahme stehen in [FINANCIAL_ONBOARDING_STATUS.md](../FINANCIAL_ONBOARDING_STATUS.md). Optionale Aufgaben und die vollständige laufende Verwaltung bleiben spätere Inkremente; R02/J01 sind noch nicht insgesamt erfüllt.
- Kontozugang, E-Mail-Codes, Passwortwiederherstellung und privates Profil mit RLS sind implementiert und geprüft: [AUTH_PROFILE_STATUS.md](../AUTH_PROFILE_STATUS.md).

- Die bereitgestellte README wurde unverändert in den Projektordner übernommen.
- Phase 0 ist als PRD-Entwurf mit fünf Kernjourneys, Anforderungen R01–R14, Erfolgskriterien und gekennzeichneten offenen Entscheidungen ausgearbeitet.
- Das lokale Projektfundament ist implementiert: Next.js-App, pnpm-Lockfile, Lint/Typecheck/Tests/Build, Formatter und GitHub-Actions-Workflow. Der Foundation-Commit liegt im vom Nutzer vorgegebenen GitHub-Repository auf `main`; der Dashboard-Task verwendet `codex/dashboard-and-ci`.
- Die responsive Shell für Home, Money, Plan, Goals und AI mit Light/Dark Mode enthält den statischen Dashboard-Prototyp aus Phase 2. Alle dortigen Beispieldaten sind sichtbar als fiktiv gekennzeichnet. Echte persönliche Daten befinden sich im geschützten Kontobereich einschließlich der finanziellen Startübersicht.
- `AGENTS.md` und `CLAUDE.md` wurden aus der README abgeleitet; Architektur, Datenmodell, Designgrundlage und lokale Einrichtung sind dokumentiert.
- Die lokale Supabase-Umgebung läuft unter Docker Desktop und WSL 2. Dienstzustand, Wiederanlauf, öffentliche Verbindungskonfiguration und ausschließlich lokale Ports sind geprüft. Ein Docker-Desktop-Startfehler samt angewendetem Workaround ist dokumentiert.
- GitHub ist angebunden und Actions wurde ausgelöst; der konkrete Prüfstand steht in [DASHBOARD_STATUS.md](../DASHBOARD_STATUS.md). Supabase Cloud bleibt offen. Details zur lokalen Einrichtung stehen in [DEVELOPMENT.md](../DEVELOPMENT.md) und [LOCAL_SUPABASE.md](../LOCAL_SUPABASE.md).

## Entwicklungsphasen

| Phase                             | Ziel und begrenzter Umfang                                                                                                                                     | Abschlusskriterium                                                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0 – Produktdefinition             | Zielgruppe, Problem, V1-Scope, Nicht-Ziele, fünf Journeys, messbare Acceptance Criteria                                                                        | Alle V1-Funktionen sind im PRD zugeordnet; produktrelevante Annahmen sind sichtbar und vor der betroffenen Implementierung geklärt.              |
| 1 – Projektfundament              | Git, Repository-Regeln, Next.js/TypeScript, pnpm, Tailwind/shadcn, ESLint/Formatter, Vitest/RTL, Playwright, Supabase-Konfiguration, Umgebungsvariablen und CI | `pnpm lint`, `pnpm typecheck`, `pnpm test` und `pnpm build` laufen lokal und in CI; lokale Datenbankeinrichtung ist reproduzierbar dokumentiert. |
| 2 – Designsystem und App Shell    | Layout, Navigation, Cards/KPIs/Progress, Empty/Loading/Error States, Light/Dark Mode, responsive Darstellung                                                   | Statischer Dashboard-Prototyp funktioniert auf Desktop und Smartphone und ist per Tastatur bedienbar.                                            |
| 3 – Authentication und Onboarding | Konto, Profil, Einkommen/Fixkosten/erstes Sparziel als Einstieg                                                                                                | J01 erfüllt; neuer Nutzer erreicht sein Dashboard ohne manuelle Datenbankeingriffe; Zugriffsschutz und Isolation sind getestet.                  |
| 4 – Money Core                    | Einkommen, manuelle Ausgaben, Kategorien, Fixkosten, Budget, Sparrate und Monatsübersicht                                                                      | J02–J03 und R03–R06 erfüllt; Beträge und Monatsgrenzen sind durch Unit- und Integrationstests abgesichert.                                       |
| 5 – Goals                         | Ziele, Fortschritt, Beiträge, Projektion und Milestones; erste Verbindung zu Budget                                                                            | J04 und finanzielle Teile von R07/R10 erfüllt; Money und Goals teilen eine konsistente Datenbasis.                                               |
| 6 – Plan                          | Aufgaben, einfache Kalenderereignisse, Tages-/Wochenansicht, Goal-Links                                                                                        | R08–R10 erfüllt; Ziele sind mit konkreten Aufgaben und Terminen verbunden.                                                                       |
| 7 – Home                          | Today, Money, Goals, Attention und Vorbereitung des Insight-Bereichs                                                                                           | R11 und J05 erfüllt; fünf Testpersonen verstehen die drei Dashboard-Kernaussagen in zehn Sekunden.                                               |
| 8 – Life AI, zuerst lesend        | Definierte Read-Tools, autorisierte Datenbeschaffung, verständliche Antworten und Datenherkunft                                                                | R12 erfüllt; KI hat keinen beliebigen Datenbankzugriff und kann keine Daten verändern.                                                           |
| 9 – Weekly Review und Insights    | Wochenzusammenfassung, deterministische Hinweise, grundlegende In-App-Notifications                                                                            | R13–R14 erfüllt; Kennzahlen sind reproduzierbar, Hinweise werden nicht unkontrolliert dupliziert.                                                |
| 10 – Security, Privacy und Beta   | RLS-/Auth-Prüfung, Rate Limits, Datenflüsse, Logs, Secrets, Validierung, Backups/Migrationen; Beta mit 10–30 Personen                                          | Keine bekannten kritischen Sicherheitsfehler; dokumentierte Tests und Nutzersignale ermöglichen die nächste Produktentscheidung.                 |
| 11 – Monetarisierung              | Free/Pro-Angebot anhand tatsächlicher Nutzung ausarbeiten                                                                                                      | Wiederkehrender Produktnutzen ist belegt, bevor Zahlungsintegration umgesetzt wird.                                                              |

Security, Typprüfung, Validierung und Isolation beginnen bei der ersten Implementierung. Phase 10 prüft den Gesamtablauf vor der Beta; sie verschiebt diese Pflichten nicht ans Projektende.

## Referenz: Scope des technischen Projektfundaments

**Ausgangsproblem:** Der Projektordner enthielt nur Produktdokumentation und keine ausführbare Anwendung. Die folgenden Kriterien beschreiben den Umfang des inzwischen lokal angelegten Fundaments; externe Voraussetzungen bleiben wie oben beschrieben offen.

**Ziel:** Ein kleiner modularer Monolith lässt sich reproduzierbar starten, prüfen und schrittweise erweitern.

**Scope:**

- Lokales Git-Repository mit eigenem Task-Branch und gezielten Ignore-Regeln; GitHub-Ziel vor Veröffentlichung festlegen.
- `AGENTS.md` und `CLAUDE.md` mit Stack, Architekturgrenzen, Sicherheitsregeln, vorgesehenen Commands und Definition of Done.
- Next.js/React mit TypeScript Strict Mode und pnpm; Tailwind, shadcn/ui, ESLint und Formatter.
- `docs/architecture/SYSTEM.md`, `DATA_MODEL.md` und `docs/design/DESIGN_SYSTEM.md` aus der README ableiten. Life-Core-Entitäten und `EntityLink` zunächst beschreiben.
- Supabase-Clientgrenzen, `.env.example` mit Platzhaltern, lokale Konfiguration und dokumentierter Start mit Docker. Ein Cloud-Projekt und Secrets werden nur in der vorgesehenen Umgebung eingerichtet.
- Vitest/React Testing Library für sinnvolle erste Prüfungen sowie Playwright für einen Navigations-Smoke-Test.
- GitHub Actions mit Installation aus dem Lockfile, Lint, Typecheck, Tests und Build.
- Eine minimale Shell für Home, Money, Plan, Goals und AI gemäß Projektprompt. Sie ist der begrenzte Vorgriff auf Phase 2; das vollständige Designsystem bleibt ein späterer Task.

**Nicht im Scope:** Vollständige Auth-/Onboarding-Flows, Money-/Goal-Funktionen, ein vollständiges Life-Core-Schema, KI-Anbindung, Integrationen oder Deployment einer produktiven App.

**Acceptance Criteria und Validierung:**

- Installation und Start sind anhand der Dokumentation reproduzierbar; notwendige Umgebungsvariablen sind erklärt und echte Secrets ausgeschlossen.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` und der vorbereitete `pnpm test:e2e` laufen erfolgreich. CI verwendet pnpm und einen eingefrorenen Lockfile.
- Die Shell zeigt die fünf Navigationsziele und unterscheidet Platzhalter von tatsächlich verfügbaren Funktionen.
- Tests prüfen reales Verhalten, beispielsweise ungültige Konfiguration und erreichbare Navigation. Datenbanktests werden mit den ersten persistierten Nutzerdaten um RLS-/Isolationstests ergänzt.
- Supabase lässt sich lokal mit dokumentierten Schritten starten. Falls eine externe Voraussetzung fehlt, wird der verbleibende Teil ausdrücklich als offen ausgewiesen; Phase 1 wird nicht pauschal als abgeschlossen bezeichnet.
- Abschließender Diff-Review prüft Scope, Typen, Imports, Konfiguration, Secrets, unnötige Abhängigkeiten und Sicherheitsgrenzen.

**Bekannte Voraussetzungen:** Bei der Bestandsaufnahme waren Node.js 24.13.1, npm 11.8.0 über `npm.cmd` und Git 2.51.0 verfügbar. pnpm, Docker, Supabase CLI und GitHub CLI waren nicht im PATH. Diese Angaben sind eine lokale Momentaufnahme, keine Versionsempfehlung; Versionen und Kompatibilität werden beim Setup geprüft. Die Supabase CLI kann als Projektwerkzeug bereitgestellt werden. Für die lokale Datenbank wird eine laufende Docker-Umgebung benötigt.

## Reihenfolge innerhalb des V1-Core

Die nummerierten Entwicklungsphasen der README bestimmen die Reihenfolge. Ihre erste Issue-Liste ist eine Sammlung von Tasks, keine zusätzliche widersprechende Reihenfolge.

- Die Shell aus Phase 2 ist zunächst statisch; das datengetriebene Home Dashboard folgt in Phase 7.
- Onboarding benötigt in Phase 3 minimale, autorisierte Persistenz für Profil, Einkommen, Fixkosten und Ziel. Die vollständigen Fachregeln und Verwaltungsoberflächen folgen in Phasen 4/5; sie werden dabei erweitert, nicht als zweites Datenmodell neu angelegt.
- Goal → Budget wird eingeführt, sobald beide Module existieren. Links zu Tasks und Events folgen mit Phase 6.
- Die fünf Kernjourneys stehen vor der echten KI-Schicht. Schreibende KI-Aktionen bleiben ein separater späterer Task mit sichtbarer Bestätigung jeder konkreten Aktion.

## Nach V1

| Stufe                    | Vision aus der README, außerhalb des aktuellen Fundaments                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| V1.5 – Connected Life    | Externe Kalender, weitergehende Wiederholungen/Subscriptions, verbesserte Notifications; Abgrenzung monatlicher V1-Fixkosten gemäß PRD O02. |
| V2 – AI Life Assistant   | Bestätigte AI Actions, Planung, Szenarien, Daily Brief und Goal Generation.                                                                 |
| V3 – Life Admin          | Dokumente, Verträge, Fristen und Life Events.                                                                                               |
| V4 – Financial Ecosystem | Open Banking über geeignete Partner, automatische Transaktionen, Assets, Net Worth und Forecasts.                                           |
| V5 – Ecosystem           | Health, Habits, weitere Integrationen, Automationen und Templates.                                                                          |

Es gibt noch keine zugesagten Termine. Jede Stufe benötigt einen begrenzten Task mit Problem, Scope, Nicht-Zielen, Acceptance Criteria und Tests.

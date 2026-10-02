# LifeOS – Systemarchitektur

Stand: 01.10.2026, einschließlich persönlichem Home-Dashboard. Produktumfang: [PRD](../product/PRD.md).

## Aktuell implementiert

Eine Next.js-App mit App Router, React und TypeScript Strict Mode. Die fünf öffentlichen Vorschauseiten sind statisch und verwenden keine Nutzerdaten. Home zeigt einen ausdrücklich gekennzeichneten Dashboard-Prototyp mit fiktiven Beispieldaten und einer umschaltbaren Ansicht ohne Einträge. Tailwind und lokale shadcn/ui-Bausteine bilden die Oberfläche. Die Shell funktioniert ohne Konto, Datenbank oder KI-Schlüssel.

Die Dashboard-Inhalte bleiben Server Components. Nur `PreviewSwitcher` ist für die Umschaltung interaktiv; er erhält die beiden serverseitig gerenderten Ansichten als React-Nodes. Die Auswahl lebt ausschließlich im Komponentenstatus, ohne Speicherung oder Netzwerkaufruf. Beispielbeträge sind fertige Anzeigetexte, Fortschrittswerte feste Prozentangaben; es gibt hier keine Finanzberechnung oder persistierten Geldwerte. Der Beispieltag ist ausdrücklich der 19.09.2026, kein dynamisch ermitteltes persönliches „Heute“.

`/auth/[mode]` bietet Anmeldung, Registrierung, Codebestätigung und Passwortwiederherstellung. Der gesamte `/account`-Bereich verlangt eine verifizierte Identität. Neben Profil und Passwort gibt es `/account/onboarding/[step]` für den finanziellen Einstieg und `/account/overview` für dessen persönliche Startübersicht. Die öffentliche Vorschau liegt in der Routengruppe `(preview)` und bleibt statisch; Konto und Auth verwenden ein eigenes Layout. Details: [AUTH_PROFILE_STATUS.md](../AUTH_PROFILE_STATUS.md) und [FINANCIAL_ONBOARDING_STATUS.md](../FINANCIAL_ONBOARDING_STATUS.md).

## Modularer Monolith

Das persönliche Home unter `/account/home` kombiniert bestehende autorisierte Money-, Aufgaben- und Kalenderabfragen mit einer begrenzten Abfrage überfälliger Aufgaben und der stabilen RLS-Lesefunktion `read_home_goals`. Reine Zeitraum-/Hinweisregeln liegen in `src/domain/home.ts`, die Lesezusammenstellung in `src/server/home.ts` und die Serveransichten in `src/features/home`. Die öffentliche Vorschau bleibt getrennt. Es gibt keine neuen Schreibrechte oder Abhängigkeiten. Umfang, Snapshot-Grenzen, Fortschritt und offene Nutzerabnahme: [HOME_STATUS.md](../HOME_STATUS.md).

Ziel–Aufgaben-/Termin-Verknüpfungen ergänzen den vorhandenen Life Core mit typisierten Referenzen. Reine Schemas und lokale Rückkehradressen liegen in `src/domain/goal-plan-links.ts`; autorisierte Lese- und Schreibpfade in `src/server/goal-plan-links.ts`/`goal-plan-link-actions.ts`. Listen verbinden RLS-geschützte Endpunkte und zählen vollständig. Featureansichten unter Goals/Plan nutzen gemeinsame Endpunktdarstellung und Seitennavigation; nur das Bestätigungsformular ist interaktiv. Der bestehende Budgetpfad ist ausdrücklich auf `funded_by` begrenzt. Architektur und Löschregeln: [GOAL_PLAN_LINKS_STATUS.md](../GOAL_PLAN_LINKS_STATUS.md).

Plan-Aufgaben nutzen reine Regeln in `src/domain/tasks.ts`, autorisierte Lese- und Schreibzugriffe in `src/server/tasks.ts`/`task-actions.ts` sowie Featureansichten unter `src/features/plan`. Listen und vollständige Zählungen entstehen gemeinsam im RLS-geschützten Snapshot. Details: [TASKS_STATUS.md](../TASKS_STATUS.md).

Der Kalender verwendet `src/domain/calendar.ts` für Eingaben und `calendar-time.ts` für reine Intervall- und Zeitzonenregeln. Die tatsächlich verwendete Abhängigkeit `@js-temporal/polyfill` 0.5.1 liefert IANA-Umrechnung und Tagesanfänge mit Sommerzeitregeln; nur Serveransichten, Server Actions und Tests importieren die Zeitlogik. Das Clientformular erhält bereits aufgelöste lokale Werte. Autorisierte Zugriffe liegen in `src/server/calendar.ts`/`calendar-actions.ts`; dünne Routen und Featureansichten folgen der bestehenden Plan-Struktur. Ziel-Verknüpfungen verwenden die oben beschriebene Life-Core-Ergänzung. Details zum Kalender: [CALENDAR_STATUS.md](../CALENDAR_STATUS.md).

Der erste Life-Core-Link verbindet eigene Ziele und Monatsbudgets. Reine Eingaberegeln liegen in `src/domain/goal-budget-links.ts`, autorisierte Zugriffe und Mutationen in `src/server/goal-budget-links.ts` und `goal-budget-link-actions.ts`. Goal- und Money-Ansichten verwenden dieselben typisierten Beziehungen mit beidseitiger Navigation; finanzielle Berechnungen bleiben unabhängig davon. Details: [GOAL_BUDGET_LINKS_STATUS.md](../GOAL_BUDGET_LINKS_STATUS.md).

Persönliche Ziele nutzen dieselben privaten Zielrouten und Meilensteine. `src/domain/personal-goals.ts` validiert Namen, Datum und Zielart; `src/server/personal-goal-actions.ts` autorisiert ihre Erfassung und Bearbeitung. Server Components wählen anhand des eigenen gespeicherten Zieltyps die passende Ansicht. Money und die Finanzprognose bleiben auf Sparziele begrenzt. Details: [PERSONAL_GOALS_STATUS.md](../PERSONAL_GOALS_STATUS.md).

Der Meilensteinbereich in der Zielansicht liest eigene Liste und Gesamtzählungen in einem SQL-Snapshot. `src/domain/milestones.ts` enthält reine Regeln, die Servermodule `milestones.ts` und `milestone-actions.ts` den autorisierten Zugriff. Featurekomponenten bleiben in `src/features/goals`; Meilensteine ändern keine Finanzdaten. Details: [GOAL_MILESTONES_STATUS.md](../GOAL_MILESTONES_STATUS.md).

Die Zielansicht berechnet ihre rein lesende Prognose mit `src/domain/goal-forecast.ts` aus demselben autorisierten Snapshot wie den tatsächlichen Fortschritt. `GoalForecastCard` bleibt eine Server Component; zusätzliche Datenzugriffe, gespeicherte Prognosen und neue Berechtigungen sind nicht nötig. Kalenderkonvention und Grenzen: [GOAL_FORECAST_STATUS.md](../GOAL_FORECAST_STATUS.md).

`/account/goals` und `/account/goals/[id]` ergänzen die laufende Sparzielverwaltung. Featurekomponenten liegen in `src/features/goals`, reine Regeln in `src/domain/goals.ts`, privater Zugriff und Server Actions in `src/server/goals.ts` bzw. `goal-actions.ts`. Die Money-Übersicht liest Sparraten für denselben gewählten Monat aus deren Verlauf; tatsächlicher Fortschritt erscheint in der Zielansicht. Details: [SAVINGS_GOALS_STATUS.md](../SAVINGS_GOALS_STATUS.md).

Die Fixkostenverwaltung unter `/account/money/fixed` und Planformulare für `fixed`/`budget` ergänzen Money. `src/domain/plans.ts` enthält reine Validierung und Budgetarithmetik, `src/server/plan-actions.ts` die autorisierten Mutationen. Die Tabellen und RPCs sind in [FIXED_COSTS_BUDGET_STATUS.md](../FIXED_COSTS_BUDGET_STATUS.md) beschrieben. Die übrigen Modulgrenzen bleiben gleich.

`/account/money` ergänzt die laufende Monatsübersicht; `/account/money/[kind]/[id]` enthält Erfassung, Bearbeitung und Löschbestätigung. Die Übersicht nach dem Onboarding verwendet nun diese aktuelle Datenbasis. `src/features/money`, `src/domain/transactions.ts` und die Money-Servermodule folgen denselben Schichtgrenzen. Die öffentliche Money-Seite ist ein statischer Einstieg in den privaten Bereich. Umfang und Datenbank-RPCs stehen in [MONEY_TRANSACTIONS_STATUS.md](../MONEY_TRANSACTIONS_STATUS.md).

```text
UI / Next.js-Routen
        ↓
Anwendungsfälle je Feature
        ↓
Reine Domain-Regeln + autorisierter Datenzugriff
        ↓
Supabase Auth / PostgreSQL mit RLS
```

| Ort                 | Verantwortung                                                                           |
| ------------------- | --------------------------------------------------------------------------------------- |
| `src/app`           | Routen, Layout, Metadaten, globale Fehler-/Ladezustände; keine Fachberechnungen         |
| `src/components/ui` | Lokale Card nach shadcn/ui und nativer HTML-Fortschrittsbalken                          |
| `src/components`    | Gemeinsame Shell, Navigation, Darstellung und Theme                                     |
| `src/features/home` | Dashboard-Prototyp mit Beispieldaten, Leerzustand und lokalem Ansichtswechsel           |
| `src/lib`           | Konfiguration, Browserclient und allgemeine UI-Hilfen                                   |
| `src/server`        | Durch `server-only` geschützte Infrastruktur; später autorisierte Repository-Funktionen |
| `supabase`          | Lokale Konfiguration, Auth-Mailtemplates und Profilmigration mit RLS                    |
| `tests/e2e`         | Playwright-Flows gegen den Produktionsbuild                                             |

Die Featureordner `auth`, `profile` und `onboarding` enthalten die Kontooberfläche; `src/domain` validiert Eingaben und definiert exakte EUR-/Monatsregeln. `src/types` enthält generierte Datenbanktypen. `tests/integration` prüft Profil- und Finanzrechte sowie atomare Einrichtungsschritte. Die Finanzmutation verwendet ein begrenztes Datenbank-RPC mit eigener Eigentümerprüfung, leerem `search_path`, expliziten Funktionsrechten und Revisionsvergleich. Die Anwendung bleibt beim normalen sitzungsgebundenen Supabase-Client. Weitere Module entstehen bei tatsächlichem Bedarf.

Eine Route ruft einen konkreten Anwendungsfall auf. Dieser validiert Eingaben und Identität, nutzt reine Domain-Funktionen und führt autorisierte Datenzugriffe aus. Domain-Funktionen importieren weder React noch Next.js noch Supabase. Module teilen definierte Services und `EntityLink`, nicht beliebige interne Implementierungen. Kein Event-Bus, keine Microservices und kein generisches Repository-Framework im Fundament.

## Supabase- und Auth-Grenzen

- Der Browserclient verwendet ausschließlich Projekt-URL und Publishable Key; ein alter lokaler `anon`-Key wird zur Kompatibilität ebenfalls akzeptiert. Private Schlüssel werden von der Konfigurationsprüfung abgewiesen.
- `src/server/supabase.ts` erzeugt einen neuen Client pro Aufruf mit den Cookies der aktuellen Anfrage. Keine globalen, zwischen Nutzern geteilten Serverclients.
- Die schreibfähige Serverfabrik wird in Server Actions verwendet. Für Server Components gibt es einen separaten Read-Client ohne Cookie-Setter. Fehler beim Cookie-Schreiben werden nicht verschluckt.
- Der Proxy erneuert Sitzungen über `getClaims()` und überträgt die aktualisierten Cookies in Anfrage und Antwort. `requireIdentity()` ruft für geschützte Seiten und Profilmutationen zusätzlich `getUser()` auf. Ein aus Cookies gelesenes `getSession()` wird nicht als Autorisierungsnachweis verwendet.
- Jede Fachoperation prüft Identität und Eigentümerschaft serverseitig. RLS ist eine zusätzliche Datenbankgrenze; die Clientfabriken sind kein Ersatz dafür.
- Personalisierte Antworten dürfen nicht in einen nutzerübergreifenden Cache gelangen. Der heute statische Home-Einstieg ist davon klar getrennt.
- Die lokale API-Konfiguration deaktiviert die automatische Freigabe neuer Tabellen. Jede künftige Migration benötigt explizite Grants, aktivierte RLS und passende Policies; diese müssen auch in Cloud-Projekten eingerichtet werden.

## Umgebungsvariablen

Öffentlich sind nur `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Next.js bindet diese beim Build ein; Änderungen erfordern einen neuen Build. Sie sind keine Nutzer-Authentifizierung. Ein Publishable Key ist zusammen mit korrekt gesetzten Datenrechten vorgesehen.

Die Validierung erfolgt beim Erzeugen eines Clients. Ohne Supabase-Nutzung bleiben Build und Vorschau vollständig unabhängig. Fehlermeldungen nennen Variablennamen, niemals deren Werte. `.env.local` und sonstige echte Env-Dateien werden ignoriert; `.env.example` enthält nur Platzhalter.

Service-Role-/Secret-Schlüssel und OpenAI-Zugangsdaten werden für das Fundament nicht benötigt. Wenn spätere privilegierte Hintergrundprozesse sie benötigen, erhalten sie eigene serverseitige Module und getrennte Deployment-Secrets. Sie dürfen weder als `NEXT_PUBLIC_*` noch in Logs oder Commit-Inhalten auftauchen.

## Geld und Zeit

Die fachliche Strategie steht in [DATA_MODEL.md](DATA_MODEL.md). Geld wird als ganzzahlige Minor Units plus Währung behandelt. JSON-Beträge, Datenbankgrenzen, Rundungsregeln und sichere Integer-Bereiche werden mit dem Money Core gemeinsam validiert. Finanzlogik wird mit echten Grenzfällen geprüft, bevor sie UI oder KI verwenden.

Absolute Zeitpunkte werden als UTC-Zeitpunkte gespeichert, die Profilzeitzone bestimmt die Anzeige. Ein Kalendertag, eine Monatszuordnung und ein Zeitpunkt sind unterschiedliche Fachbegriffe. Keine implizite Serverzeitzone für Monatsberechnungen.

## Lesende KI-Grundlage

Der erste private Antwortablauf unter `/account/ai` nutzt ausschließlich Monatsübersicht und Budget. Server Action, Rechte-/Freigabeprüfung, Fingerabdruck der Vorschau und Providertransport liegen getrennt in `src/server/ai-actions.ts` und `src/server/ai/`. Das Modell erhält keine ausführbaren Werkzeuge; die Anwendung wählt beide benötigten Lesewerkzeuge vorab. Der feste HTTPS-Aufruf ist zeitlich und mengenmäßig begrenzt und wird nicht wiederholt. Ein atomarer Datenbankzähler schützt das Kontolimit über App-Prozesse hinweg. Verträge, Konfiguration und verbleibende Grenzen: [AI_MONTH_STATUS.md](../AI_MONTH_STATUS.md).

```text
Nutzeranfrage
  → serverseitige Identitätsprüfung
  → explizit erlaubte Anwendungstools
  → validierte Argumente + Fachservices + RLS
  → auf die Anfrage begrenztes Ergebnis
  → Erklärung mit Zeitraum und Datenherkunft
```

Zuerst nur lesend: `get_financial_summary`, `get_budget_status`, `get_goals`, `get_goal_projection`, `get_tasks`, `get_upcoming_events`. Finanzwerte werden berechnet, nicht vom Modell erfunden. Inhalte aus Datenbankfeldern sind Daten, keine Rechte oder Anweisungen für die Tool-Schicht.

Diese sechs Werkzeuge sind in `src/server/ai-tools.ts` über einen Sitzungsclient erreichbar. Der Serverkern in `src/server/ai/read-tools.ts` verlangt eine separat vom vertrauenswürdigen Aufrufer gelieferte Freigabeliste, strikt validierte Argumente, aktuelle Identität und abgeschlossene Einrichtung. Er verwendet bestehende lesende Fachzugriffe mit RLS und gibt reduzierte Ergebnisse mit Zeitraum und Herkunft aus. Geldbeträge verlassen die Schicht als ganzzahlige Minor-Unit-Zeichenfolgen mit Währung. Verträge und Terminzeiträume liegen rein in `src/domain/ai-read-tools.ts` und `ai-event-range.ts`. Es gibt keine öffentliche API zur freien Ausführung beliebiger Tools. Die Monatsoberfläche wählt nur ihre beiden festen Werkzeuge; weitere Antwortbereiche bleiben offen. Ursprüngliches Leseinkrement: [AI_READ_TOOLS_STATUS.md](../AI_READ_TOOLS_STATUS.md).

Spätere Schreibaktionen wie `create_task`, `create_goal`, `update_goal` und `create_event` benötigen validierte Argumente, serverseitige Autorisierung, Fachlogik und vor Ausführung eine sichtbare Bestätigung der konkreten Aktion. Bestätigung ist an Nutzer und Argumente zu binden; Wiederholung darf keine unbeabsichtigten Duplikate erzeugen. Kein beliebiges SQL und keine Service-Role-Zugangsdaten für das Modell. Ein KI-Ausfall darf den übrigen Core nicht blockieren.

## Qualität und Betrieb

Vitest/RTL prüfen Konfiguration, Auth-/Profilvalidierung und Navigation. Die separate Integrationssuite prüft die Profilrechte gegen lokale Supabase mit zwei Nutzern und anonymem Zugriff. Playwright deckt die öffentliche Vorschau sowie Registrierung, Codes, Anmeldung, Profilspeicherung, Sitzungserneuerung, Passwortwiederherstellung und Abmeldung auf Desktop/Mobil ab. Auth-Traces mit möglichen Zugangsdaten werden nicht gespeichert.

GitHub Actions installiert aus dem Lockfile und führt Formatterprüfung, Lint, Typecheck, Tests, Build und Browser-Smoke-Tests ohne Cloud-Secrets aus. Der Workflow läuft bei Push, Pull Request oder manueller Auslösung. Browserberichte und Screenshots werden als Artefakt für sieben Tage aufbewahrt. Der Workflow benötigt nur `contents: read` und führt keine Deployments aus. Hosting bleibt gemäß README für später Vercel plus Supabase Cloud.

Vor Beta fehlen unter anderem umfassende Auth-/RLS-Tests, Datenflüsse und Löschkonzept, Backup-/Restore-Prüfung, Rate Limits, eine zur Auth-Architektur passende CSP und produktive Secret-Verwaltung. Die jetzigen Basis-HTTP-Header ersetzen diese Arbeiten nicht.

## Technische Referenzen

- [Next.js: Installation](https://nextjs.org/docs/app/getting-started/installation)
- [Supabase: SSR-Clients, Session-Verifikation und Caching](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase: API-Schlüssel](https://supabase.com/docs/guides/getting-started/api-keys)
- [shadcn/ui mit Tailwind 4](https://ui.shadcn.com/docs/tailwind-v4)

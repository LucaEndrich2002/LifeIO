# LifeOS – Systemarchitektur

Stand: Projektfundament, Dashboard-Prototyp und erstes Auth-/Profil-Inkrement, 20.09.2026. Produktumfang: [PRD](../product/PRD.md).

## Aktuell implementiert

Eine Next.js-App mit App Router, React und TypeScript Strict Mode. Die fünf öffentlichen Vorschauseiten sind statisch und verwenden keine Nutzerdaten. Home zeigt einen ausdrücklich gekennzeichneten Dashboard-Prototyp mit fiktiven Beispieldaten und einer umschaltbaren Ansicht ohne Einträge. Tailwind und lokale shadcn/ui-Bausteine bilden die Oberfläche. Die Shell funktioniert ohne Konto, Datenbank oder KI-Schlüssel.

Die Dashboard-Inhalte bleiben Server Components. Nur `PreviewSwitcher` ist für die Umschaltung interaktiv; er erhält die beiden serverseitig gerenderten Ansichten als React-Nodes. Die Auswahl lebt ausschließlich im Komponentenstatus, ohne Speicherung oder Netzwerkaufruf. Beispielbeträge sind fertige Anzeigetexte, Fortschrittswerte feste Prozentangaben; es gibt hier keine Finanzberechnung oder persistierten Geldwerte. Der Beispieltag ist ausdrücklich der 19.09.2026, kein dynamisch ermitteltes persönliches „Heute“.

`/auth/[mode]` bietet Anmeldung, Registrierung, Codebestätigung und Passwortwiederherstellung. Der gesamte `/account`-Bereich verlangt eine verifizierte Identität. Neben Profil und Passwort gibt es `/account/onboarding/[step]` für den finanziellen Einstieg und `/account/overview` für dessen persönliche Startübersicht. Die öffentliche Vorschau liegt in der Routengruppe `(preview)` und bleibt statisch; Konto und Auth verwenden ein eigenes Layout. Details: [AUTH_PROFILE_STATUS.md](../AUTH_PROFILE_STATUS.md) und [FINANCIAL_ONBOARDING_STATUS.md](../FINANCIAL_ONBOARDING_STATUS.md).

## Modularer Monolith

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

## Künftige KI-Schicht

```text
Nutzeranfrage
  → serverseitige Identitätsprüfung
  → explizit erlaubte Anwendungstools
  → validierte Argumente + Fachservices + RLS
  → auf die Anfrage begrenztes Ergebnis
  → Erklärung mit Zeitraum und Datenherkunft
```

Zuerst nur lesend: `get_financial_summary`, `get_budget_status`, `get_goals`, `get_goal_projection`, `get_tasks`, `get_upcoming_events`. Finanzwerte werden berechnet, nicht vom Modell erfunden. Inhalte aus Datenbankfeldern sind Daten, keine Rechte oder Anweisungen für die Tool-Schicht.

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

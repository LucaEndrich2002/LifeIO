# LifeOS – Systemarchitektur

Stand: Projektfundament und Dashboard-Prototyp, 19.09.2026. Produktumfang: [PRD](../product/PRD.md).

## Aktuell implementiert

Eine Next.js-App mit App Router, React und TypeScript Strict Mode. Die fünf öffentlichen Vorschauseiten sind statisch und verwenden keine Nutzerdaten. Home zeigt einen ausdrücklich gekennzeichneten Dashboard-Prototyp mit fiktiven Beispieldaten und einer umschaltbaren Ansicht ohne Einträge. Tailwind und lokale shadcn/ui-Bausteine bilden die Oberfläche. Die Shell funktioniert ohne Konto, Datenbank oder KI-Schlüssel.

Die Dashboard-Inhalte bleiben Server Components. Nur `PreviewSwitcher` ist für die Umschaltung interaktiv; er erhält die beiden serverseitig gerenderten Ansichten als React-Nodes. Die Auswahl lebt ausschließlich im Komponentenstatus, ohne Speicherung oder Netzwerkaufruf. Beispielbeträge sind fertige Anzeigetexte, Fortschrittswerte feste Prozentangaben; es gibt hier keine Finanzberechnung oder persistierten Geldwerte. Der Beispieltag ist ausdrücklich der 19.09.2026, kein dynamisch ermitteltes persönliches „Heute“.

Supabase-Clientfabriken und Konfigurationsvalidierung sind vorbereitet, aber in keiner Seite eingebunden. Es gibt keine Authentifizierung, geschützten Fachrouten, Datenbanktabellen oder KI-Aufrufe. Die öffentliche Vorschau darf erst mit Zugriffsschutz um persönliche Inhalte erweitert werden.

## Modularer Monolith

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
| `supabase`          | Versionierte lokale Konfiguration; Migrationen und Seeds kommen mit den ersten Tabellen |
| `tests/e2e`         | Playwright-Flows gegen den Produktionsbuild                                             |

Die Module `auth`, `onboarding`, `money`, `goals`, `plan` und `ai` werden in `src/features` angelegt, sobald sie Fachcode enthalten. Reine Regeln kommen nach `src/domain`, Datenbanktypen nach `src/types` und Integrationstests nach `tests/integration`. Dafür werden keine leeren Verzeichnisse oder unnötigen Interfaces erzeugt.

Eine Route ruft einen konkreten Anwendungsfall auf. Dieser validiert Eingaben und Identität, nutzt reine Domain-Funktionen und führt autorisierte Datenzugriffe aus. Domain-Funktionen importieren weder React noch Next.js noch Supabase. Module teilen definierte Services und `EntityLink`, nicht beliebige interne Implementierungen. Kein Event-Bus, keine Microservices und kein generisches Repository-Framework im Fundament.

## Supabase- und Auth-Grenzen

- Der Browserclient verwendet ausschließlich Projekt-URL und Publishable Key; ein alter lokaler `anon`-Key wird zur Kompatibilität ebenfalls akzeptiert. Private Schlüssel werden von der Konfigurationsprüfung abgewiesen.
- `src/server/supabase.ts` erzeugt einen neuen Client pro Aufruf mit den Cookies der aktuellen Anfrage. Keine globalen, zwischen Nutzern geteilten Serverclients.
- Diese Serverfabrik ist ausdrücklich für Route Handlers und Server Actions vorgesehen, in denen Cookies geschrieben werden dürfen. Fehler beim Cookie-Schreiben werden nicht verschluckt.
- Mit Authentication sind eine Session-Refresh-Proxy, ein geeigneter Read-Client für Server Components und die Prüfung verifizierter Claims bzw. des Nutzers einzuführen. Ein aus Cookies gelesenes `getSession()` allein ist kein Autorisierungsnachweis.
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

Vitest/RTL prüfen die Konfigurationsgrenze und zugängliche Navigation. Playwright prüft Navigation, direkte Routen, Theme-Persistenz, Tastaturzugang und 404 auf Desktop und Mobilgerät. Mit Datenpersistenz folgen Integrationstests gegen lokale Supabase mit mindestens zwei Nutzern und anonymem Zugriff.

GitHub Actions installiert aus dem Lockfile und führt Formatterprüfung, Lint, Typecheck, Tests, Build und Browser-Smoke-Tests ohne Cloud-Secrets aus. Der Workflow läuft bei Push, Pull Request oder manueller Auslösung. Browserberichte und Screenshots werden als Artefakt für sieben Tage aufbewahrt. Der Workflow benötigt nur `contents: read` und führt keine Deployments aus. Hosting bleibt gemäß README für später Vercel plus Supabase Cloud.

Vor Beta fehlen unter anderem umfassende Auth-/RLS-Tests, Datenflüsse und Löschkonzept, Backup-/Restore-Prüfung, Rate Limits, eine zur Auth-Architektur passende CSP und produktive Secret-Verwaltung. Die jetzigen Basis-HTTP-Header ersetzen diese Arbeiten nicht.

## Technische Referenzen

- [Next.js: Installation](https://nextjs.org/docs/app/getting-started/installation)
- [Supabase: SSR-Clients, Session-Verifikation und Caching](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase: API-Schlüssel](https://supabase.com/docs/guides/getting-started/api-keys)
- [shadcn/ui mit Tailwind 4](https://ui.shadcn.com/docs/tailwind-v4)

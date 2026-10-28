# LifeOS lokal entwickeln

## Voraussetzungen und Start

Node.js 24 und pnpm 10.34.5; die verwendeten Pakete sind in `package.json` und `pnpm-lock.yaml` festgeschrieben. In diesem Setup wurde Node 24.13.1 verwendet. Das Projekt bleibt beim unterstützten Node-24-Major; aktuelle Sicherheitsupdates sind beim Betrieb einzuspielen.

```sh
npm install --global pnpm@10.34.5
pnpm install --frozen-lockfile
pnpm dev
```

Die Vorschau läuft auf `http://127.0.0.1:3000`. Für Windows PowerShell mit gesperrten `.ps1`-Launchern können die Befehle als `npm.cmd` bzw. `pnpm.cmd` aufgerufen werden; eine Änderung der Execution Policy ist nicht nötig.

Die Shell benötigt keine `.env.local`, keine Cloud-Verbindung und keinen Login. Sie speichert keine persönlichen Daten. Nur die Farbschema-Präferenz wird im Browser gespeichert. Auf Home kann zwischen fiktiven Beispieldaten und einer Vorschau ohne Einträge umgeschaltet werden; dieser Ansichtswechsel ist nicht persistent.

Der Kontobereich ist separat: `/auth/login` und `/account` benötigen die lokale Supabase-Konfiguration und speichern nach Anmeldung ein echtes privates Profil. „Mein Konto“ führt von der Vorschau dorthin. Vom gespeicherten Profil führt ein Link zur finanziellen Einrichtung; `/account/onboarding` setzt diese fort, `/account/overview` zeigt nach Abschluss die persönliche Startübersicht. Vor dem Start alle Migrationen mit `pnpm exec supabase migration up --local` anwenden. Details: [AUTH_PROFILE_STATUS.md](AUTH_PROFILE_STATUS.md) und [FINANCIAL_ONBOARDING_STATUS.md](FINANCIAL_ONBOARDING_STATUS.md). E-Mails landen im lokalen Testpostfach auf Port 54324.

## Qualitätsprüfungen

Der KI-Bereich auf `/account/home` benötigt keine weitere Migration. `insight=month|plan|goals` öffnet die jeweilige Vorschau direkt auf Home und erhält Monat und Zielseite. Vor einer tatsächlichen Anfrage bleiben Prüfung und Zustimmung erforderlich. Verhalten und Prüfstand: [HOME_AI_STATUS.md](HOME_AI_STATUS.md).

Die Zielübersicht unter `/account/ai/goals` benötigt keine weitere Migration. Sie nutzt den vorhandenen Ziel-Snapshot und die gemeinsame Sparprognose; Quellen führen zur gewählten Dashboard-Zielseite und zu eigenen Details. Regeln und Prüfstand: [AI_GOALS_STATUS.md](AI_GOALS_STATUS.md). Einzelprognosen unter `/account/ai/goals/[id]` bleiben bestehen.

Die Aufgaben-/Termin-Erklärung unter `/account/ai/plan` benötigt keine weitere Migration. Sie ist über Life AI und die Aufgabenliste erreichbar. Vorschau, Zustimmung, Quellen und Grenzen sind in [AI_PLAN_STATUS.md](AI_PLAN_STATUS.md) dokumentiert. Automatische Prüfungen verwenden weiterhin keine echte Providerverbindung.

Das persönliche Dashboard unter `/account/home` benötigt die additive Lese-Erweiterung `20261001090000_home_goals.sql`. Mit `pnpm exec supabase migration up --local` anwenden. `/account/overview` führt nach abgeschlossener Einrichtung zum Dashboard mit dem Startmonat; der normale Home-Link verwendet den aktuellen Monat der Profilzeitzone. Regeln und offene Verständlichkeitsprüfung: [HOME_STATUS.md](HOME_STATUS.md).

Ziele können unter `/account/goals/[id]/plan` mit Aufgaben oder Terminen verbunden werden. Voraussetzung ist die additive Migration `20260930190000_goal_plan_links.sql`, anzuwenden mit `pnpm exec supabase migration up --local`. Bestehende Budget-Links bleiben erhalten; ein Reset oder neue Abhängigkeiten sind nicht nötig. Aufgaben-/Terminansichten bieten mit „Verknüpfte Ziele“ die Gegenrichtung. Regeln und Abnahme: [GOAL_PLAN_LINKS_STATUS.md](GOAL_PLAN_LINKS_STATUS.md).

Der private Kalender unter `/account/plan/calendar` benötigt `20260929090000_calendar_events.sql`. Mit `pnpm exec supabase migration up --local` additiv anwenden; kein Reset erforderlich. Nach Anmeldung und abgeschlossener Einrichtung führen die öffentliche Plan-Seite und die Aufgabenliste zum Kalender. `pnpm install --frozen-lockfile` installiert zusätzlich die verwendete Temporal-Zeitlogik. Regeln und Abnahme: [CALENDAR_STATUS.md](CALENDAR_STATUS.md).

Die private Aufgabenverwaltung unter `/account/plan` benötigt `20260928120000_tasks.sql`. Mit `pnpm exec supabase migration up --local` additiv anwenden; kein Reset erforderlich. Nach Anmeldung und abgeschlossener Einrichtung führt auch die öffentliche Plan-Seite zur Aufgabenliste. Regeln und Abnahme: [TASKS_STATUS.md](TASKS_STATUS.md).

Die Ziel-Budget-Verknüpfung benötigt `20260928090000_goal_budget_links.sql`. Mit `pnpm exec supabase migration up --local` anwenden; vorhandene Ziele, Budgets und Beträge bleiben erhalten. Danach bietet jede Zielansicht „Monatsbudget verknüpfen“ und jedes vorhandene Monatsbudget die Gegenrichtung. Details: [GOAL_BUDGET_LINKS_STATUS.md](GOAL_BUDGET_LINKS_STATUS.md).

Persönliche Ziele ohne Geldbetrag benötigen zusätzlich `20260927120000_personal_goals.sql`. Die additive Migration erhält vorhandene Sparziele und nutzt die bestehende Meilenstein-Verwaltung. Nach `pnpm exec supabase migration up --local` steht unter `/account/goals` der Bereich „Persönliche Ziele“ bereit. Regeln und Abnahme: [PERSONAL_GOALS_STATUS.md](PERSONAL_GOALS_STATUS.md).

Meilensteine für vorhandene Sparziele benötigen die additive Migration `20260927090000_goal_milestones.sql`. Mit `pnpm exec supabase migration up --local` anwenden; bestehende Finanzdaten bleiben erhalten. Regeln und Abnahme: [GOAL_MILESTONES_STATUS.md](GOAL_MILESTONES_STATUS.md).

Die Sparziel-Prognose benötigt keine weitere Migration oder Konfiguration. Sie verwendet vorhandene Ziele, Sparraten und tatsächliche Einzahlungen. Regeln und Abnahme: [GOAL_FORECAST_STATUS.md](GOAL_FORECAST_STATUS.md).

Die laufende Sparzielverwaltung benötigt außerdem `20260926160000_savings_goals.sql` und `20260926161000_goal_currency.sql`. Alle Migrationen mit `pnpm exec supabase migration up --local` anwenden; ein Datenbankreset ist dafür nicht nötig. Bestehende Ziele bleiben erhalten und erhalten ihren bisherigen Startmonat als erste Sparrate. Details: [SAVINGS_GOALS_STATUS.md](SAVINGS_GOALS_STATUS.md).

Fixkostenpflege und Monatsbudgets benötigen zusätzlich `20260921150000_fixed_costs_and_budgets.sql`; ebenfalls mit `pnpm exec supabase migration up --local` anwenden. Bestehende Nutzerdaten bleiben dabei erhalten. Die gemeinsame Monatsübersicht zeigt anschließend gültige Fixkosten und das Budget. Details: [FIXED_COSTS_BUDGET_STATUS.md](FIXED_COSTS_BUDGET_STATUS.md).

Die laufende Finanzverwaltung unter `/account/money` benötigt auch die Migration `20260921120000_money_transactions.sql`. Sie verwendet dieselben Einkommen-/Ausgabentabellen wie die Einrichtung und bietet Einnahmen- und Ausgaben-CRUD mit Monatsübersicht. Das Home-Dashboard führt mit dem gewählten Monat nach Money. Details: [MONEY_TRANSACTIONS_STATUS.md](MONEY_TRANSACTIONS_STATUS.md).

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install --only-shell chromium
pnpm test:e2e
# Zusätzlich mit laufender lokaler Supabase:
pnpm test:integration
pnpm test:restore
pnpm test:auth
```

`typecheck` erzeugt zuerst Next.js-Routentypen und funktioniert deshalb auch vor dem ersten Build. `test:e2e` startet selbst den bereits gebauten Produktionsserver auf Port 3100 und beendet ihn danach. Zuerst `pnpm build` ausführen. Ein bereits belegter Port wird absichtlich nicht wiederverwendet, damit nicht versehentlich eine andere Anwendung getestet wird.

Playwright benötigt beim ersten Setup einen Browserdownload; Linux-CI verwendet zusätzlich `--with-deps`. `--only-shell` lädt nur den für diese Headless-Tests benötigten Browser. Unter Windows kann bei Problemen mit `pnpm exec` der lokale Launcher direkt aufgerufen werden: `.\node_modules\.bin\playwright.CMD install --only-shell chromium`. Bei knappem Speicher oder begrenzten Ressourcen kann `pnpm test:e2e --workers=1` verwendet werden; alle Tests bleiben aktiv.

Bei privaten Seiten können während des React-Streamings zusätzliche unsichtbare Inhaltsknoten außerhalb des sichtbaren Hauptbereichs bestehen. Anzeigeprüfungen mit `getByTestId` deshalb über `page.getByRole("main")` auf den dargestellten Inhalt begrenzen. Abwesenheits- und Datenschutzprüfungen behalten ihren globalen Suchbereich, damit auch versteckte unerlaubte Daten auffallen. Keine beliebige Auswahl mit `.first()` und keine Wiederholungsversuche verwenden, um mehrdeutige Treffer zu übergehen.

Vitest prüft Konfigurationsvalidierung und zugängliche Navigation. Playwright prüft alle fünf Bereiche, direkte Routen, Farbschema-Persistenz, mobilen Überlauf, Tastaturzugang und 404 sowie die Kennzeichnung der Beispieldaten, Zielfortschritte, Dashboard-Links und den Wechsel zum Leerzustand. Berichte und Screenshots stehen lokal unter `playwright-report` bzw. `test-results` und werden nicht versioniert.

`pnpm format` formatiert bearbeitbare Projektdateien. Die unverändert übernommene Produkt-README ist davon ausgenommen. `pnpm test:watch` startet den interaktiven Testmodus.

## Supabase lokal

Die In-App-Benachrichtigungen unter `/account/notifications` benötigen `20261012090000_notifications.sql`. Mit `pnpm exec supabase migration up --local` additiv anwenden; kein Reset. „Hinweise“ in der privaten Navigation öffnet die Liste, „Hinweise prüfen“ wertet die vier V1-Auslöser aus. Kein Hintergrunddienst oder Providerzugang erforderlich. Regeln und Prüfstand: [NOTIFICATIONS_STATUS.md](NOTIFICATIONS_STATUS.md).

Der Einstieg mit optionalen ersten Aufgaben benötigt `20261011090000_onboarding_tasks.sql`. Mit `pnpm exec supabase migration up --local` additiv anwenden; kein Reset. Bereits abgeschlossene Einrichtungen bleiben abgeschlossen, offene Einrichtungen erhalten den zusätzlichen Aufgaben-Schritt. Details: [ONBOARDING_TASKS_STATUS.md](ONBOARDING_TASKS_STATUS.md).

Der gespeicherte Wochenrückblick unter `/account/review` benötigt `20261011130000_weekly_reviews.sql`. Mit `pnpm exec supabase migration up --local` additiv anwenden; kein Reset und keine Providerkonfiguration nötig. Der Einstieg befindet sich auf dem persönlichen Home. Wochen werden erst auf ausdrücklichen Klick gespeichert. Umfang und Prüfstand: [WEEKLY_REVIEW_STATUS.md](WEEKLY_REVIEW_STATUS.md).

Die konkrete Windows-Einrichtung und der aktuelle Stand sind in [LOCAL_SUPABASE.md](LOCAL_SUPABASE.md) beschrieben. `pnpm db:doctor` prüft die Voraussetzungen für die Erstinstallation ohne Datenänderungen. Nach vollständiger Einrichtung prüft `pnpm db:doctor --runtime` dieselben Komponenten mit 5 GiB verbleibender Betriebsreserve statt der 20 GiB Installationsreserve. Die Standardprüfung bleibt unverändert streng; vor größeren neuen Downloads erneut die Installationsreserve prüfen.

Voraussetzung ist eine laufende Docker-Umgebung für Linux-Container. Die Supabase CLI ist als Projektabhängigkeit festgeschrieben; `supabase/config.toml` wurde mit ihr initialisiert und auf den benötigten lokalen Umfang reduziert.

```sh
pnpm db:start
pnpm db:status
```

Beim ersten Start werden Containerimages heruntergeladen. `db:start` erstellt bzw. prüft zuvor das lokale Docker-Netzwerk `lifeos-local` und weist entfernte Docker-Endpunkte zurück. Unter Docker Desktop ist zusätzlich die dokumentierte Einstellung für standardmäßige localhost-Portbindung erforderlich. API: `http://127.0.0.1:54321`, Studio: `http://127.0.0.1:54323`, lokales Mail-Postfach: `http://127.0.0.1:54324`. Die CLI kann bei Start und `db:status` Schlüssel anzeigen; Ausgabe nicht ungeprüft teilen oder committen.

Erst bei tatsächlicher Verbindung `.env.example` nach `.env.local` kopieren und Projekt-URL sowie den öffentlichen Publishable Key aus der lokalen Ausgabe eintragen. Falls die lokale Ausgabe nur einen Legacy-`anon`-Key bereitstellt, wird dieser im selben Variablennamen akzeptiert. Niemals Secret-/Service-Role-Schlüssel verwenden. Cloud-Schlüssel können später aus dem jeweiligen Projekt übernommen werden; der Client verwendet weiter die Nutzerrechte.

```sh
pnpm db:stop
# Nur für die lokale Entwicklungsdatenbank; entfernt deren Anwendungsdaten:
pnpm db:reset
```

Die erste Migration erzeugt `public.profiles` samt Constraints, Grants, RLS und Isolationstests. Nach einem Checkout `pnpm exec supabase migration up --local` ausführen. Neue Tabellen werden nicht automatisch für die Data API freigegeben. Die Tests erzeugen und entfernen ihre eigenen lokalen Fixtures; globale Seeds bleiben deaktiviert. Ein Cloud-Projekt muss dieselben Grenzen separat erhalten.

Die Integrationssuite prüft zusätzlich das vollständige Anwendungsschema auf RLS, Rollen, wirksame Tabellen-/Spaltenrechte, Eigentümer-Policies und freigegebene Funktionssignaturen. Der lokale Katalogleser verwendet ausschließlich eine feste READ-ONLY-Abfrage ohne Anwendungsdaten. Neue Objekte und Rechte brauchen eine ausdrückliche Prüfung im Testinventar: [DATABASE_SECURITY_STATUS.md](DATABASE_SECURITY_STATUS.md).

`pnpm test:restore` benötigt ausschließlich lokalen Docker und das vorhandene PostgreSQL-Image. Es erzeugt eine eigene Umgebung ohne Netzwerk, sichert fiktive Daten aller Anwendungstabellen und prüft deren tatsächliche Wiederherstellung einschließlich Rechten und Eigentümerzugriffen. Bestehende Datenbanken werden nicht zurückgesetzt. Voraussetzungen, Bereinigung und Grenzen: [BACKUP_RESTORE_STATUS.md](BACKUP_RESTORE_STATUS.md).

`pnpm test:migrations` verwendet dieselbe isolierte Umgebung für drei tatsächlich vor der Sparziel-Migration erzeugte fiktive Konten. Es prüft Datenübernahme, historische Raten, späteren Einrichtungsabschluss und Eigentümerrechte bis zum aktuellen V1-Schema. Der SQL-Dateilauf ersetzt keine Prüfung des Supabase-CLI-Migrationsablaufs: [MIGRATION_EXISTING_DATA_STATUS.md](MIGRATION_EXISTING_DATA_STATUS.md).

`pnpm test:tooling` prüft die Fehlergrenze des lokalen Supabase-Teststarters mit ausschließlich fiktiven Werten und Unterprozess-Attrappen, ohne Datenbank oder Netzwerk. Ungültige CLI-Konfigurationen werden vor dem Teststart ohne Rohwerte abgewiesen. Inventar vorhandener Grenzen und offene Betriebsfragen: [LOGS_SECRETS_LIMITS_STATUS.md](LOGS_SECRETS_LIMITS_STATUS.md).

Die lokale Auth-Konfiguration verwendet bestätigte E-Mail-Adressen, sechsstellige Codes und sichere Passwortänderungen. Templates liegen unter `supabase/templates`; Supabase-Stop/Start aktiviert Änderungen bei erhaltenen Volumes. Codebestätigung und Wiederherstellung verwenden Server Actions mit festen Weiterleitungen. Der Proxy erneuert Sitzungen; Server Components und Server Actions verwenden getrennte Cookie-Adapter.

## Projektstruktur und Grenzen

Der gemeinsame Proxy setzt eine durchgesetzte Content Security Policy mit einer neuen Nonce je Seitenanfrage. Auch die öffentliche Vorschau wird deshalb dynamisch gerendert; sie benötigt weiterhin keine Datenbank. `next dev` besitzt begrenzte Freigaben für lokale Entwicklungswerkzeuge, `pnpm build`/`pnpm start` verwenden die strengere Produktionsrichtlinie. Neue externe Browserressourcen brauchen eine gezielte Richtlinienprüfung. Tests und Architekturentscheidung: [CONTENT_SECURITY_POLICY_STATUS.md](CONTENT_SECURITY_POLICY_STATUS.md).

Die Sparziel-Erklärung unter `/account/ai/goals/[id]` nutzt dieselbe optionale Providerkonfiguration wie die Monatserklärung und benötigt keine zusätzliche Migration. Einstieg über ein eigenes Sparziel; Datenvorschau, autorisierte Prognose, gemeinsame Anfragegrenzen und Prüfungen: [AI_GOAL_STATUS.md](AI_GOAL_STATUS.md). KI-Live-Tests sind auf Nutzerwunsch ausgesetzt. Automatische Tests verwenden ausschließlich Testantworten oder deaktivieren den Provider.

Die private Monats-KI unter `/account/ai` benötigt optional `OPENAI_API_KEY` und `OPENAI_MODEL` in der ignorierten `.env.local` und einen Neustart des App-Prozesses. Keine öffentlichen Schlüsselvariablen verwenden. Ohne Konfiguration funktioniert die Datenvorschau weiter. Die Migration `20261001190000_ai_request_limits.sql` ergänzt ausschließlich einen begrenzten Anfragezähler; lokale Tests erzwingen eine leere Providerkonfiguration und senden keine Modellanfragen. Einrichtung und Grenzen: [AI_MONTH_STATUS.md](AI_MONTH_STATUS.md).

Die sechs serverseitigen KI-Lesewerkzeuge werden durch `pnpm test` und `pnpm test:integration` geprüft. Sie verwenden den bestehenden lokalen Datenbestand und normale Nutzerrechte; es sind keine zusätzliche Migration, Modellanfrage, Abhängigkeit oder KI-Zugangsdaten nötig. Funktionsumfang und noch offene Modellanbindung: [AI_READ_TOOLS_STATUS.md](AI_READ_TOOLS_STATUS.md).

Siehe [SYSTEM.md](architecture/SYSTEM.md), [DATA_MODEL.md](architecture/DATA_MODEL.md) und [DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md). Reine Domain-Regeln, weitere Featuremodule, Datenbanktypen und Integrationstests entstehen erst mit ihren tatsächlichen Funktionen.

Kein Service-Role-Key und kein OpenAI-Key sind für normale App-Anfragen nötig. Nur der lokale Test-Runner liest einen privilegierten Schlüssel im Speicher für die Erzeugung und Bereinigung eigener Testkonten. Die Rechteprüfungen verwenden normale Nutzerrechte. `.env*` ist bis auf `.env.example` ignoriert; Konfigurationsfehler zeigen nur Variablennamen. Öffentliche Next.js-Konfiguration erfordert nach Änderungen einen neuen Build.

## CI und Veröffentlichung

Das vom Nutzer vorgegebene Repository ist [LucaEndrich2002/LifeIO](https://github.com/LucaEndrich2002/LifeIO). `origin` verweist auf dessen HTTPS-URL. Das lokale Fundament wurde als erster Commit auf `main` übertragen; der Dashboard-Ausbau erfolgt auf `codex/dashboard-and-ci` und wird als Pull Request bereitgestellt.

`.github/workflows/ci.yml` läuft bei Pushes, Pull Requests und manueller Auslösung: Installation mit Lockfile, Formatterprüfung, Lint, Typecheck, Unit-/Komponententests, Build und Playwright auf Desktop/Mobil. Kein Deployment und keine Cloud-Secrets sind dafür erforderlich. [GitHub Actions](https://github.com/LucaEndrich2002/LifeIO/actions) zeigt die tatsächlichen Läufe. Browserberichte und Screenshots werden für sieben Tage als Artefakt gespeichert. Der aktuelle Prüfstand steht in [DASHBOARD_STATUS.md](DASHBOARD_STATUS.md).

Vercel und Supabase Cloud bleiben die vorgesehenen späteren Hosting-Ziele. Das GitHub-Repository existierte bereits und wurde auf ausdrücklichen Nutzerwunsch angebunden. Ein Cloud-Projekt oder öffentliches App-Deployment ist noch nicht eingerichtet. Die Repository-Sichtbarkeit wurde nicht verändert.

## Bekannte Voraussetzungen und Versionsentscheidungen

Für die manuelle Home-Abnahme erzeugt `pnpm test:home:prepare` nach einem aktuellen `pnpm build` ein isoliertes, fiktives Testpaket unter `.cache/home-study/`. Es nutzt dieselbe lokale Supabase-Absicherung wie `test:auth` und sendet keine KI-Anfragen. Ablauf, Grenzen und Bewertung: [HOME_COMPREHENSION_TEST.md](HOME_COMPREHENSION_TEST.md). Ein erfolgreicher Vorbereitungslauf zählt nicht als bestandener Test mit Menschen.

Der Auth-Task vom 20.09.2026 ergänzt Profilmigration, RLS und lokale Mailtemplates. CI startet Supabase, führt `test:integration` und `test:auth` aus und stoppt die Testdatenbank. Der Start-Wrapper gibt keine CLI-Schlüssel aus. Auth-Berichte liegen unter `playwright-auth-report` und `test-results-auth`; Traces sind zum Schutz von Passwörtern, Codes und Cookies ausgeschaltet. Der private Fixture-Schlüssel wird nicht an den App-Testserver weitergegeben. Aktueller Prüfstand: [AUTH_PROFILE_STATUS.md](AUTH_PROFILE_STATUS.md).

- Docker Desktop 4.91.0 mit WSL 2.7.13 und der lokale Supabase-Stack sind eingerichtet. Dienstzustand, ausschließlich lokale Ports und Wiederanlauf wurden am 19.09.2026 geprüft; `.env.local` enthält nur öffentliche Verbindungskonfiguration. Ein beim Docker-Desktop-Neustart beobachteter Socket-Fehler wurde mit einem reversiblen Workaround behoben und bleibt als externe Einschränkung dokumentiert: [LOCAL_SUPABASE.md](LOCAL_SUPABASE.md). Die erste Profilmigration und RLS sind inzwischen implementiert und geprüft.
- GitHub ist angebunden; ein Supabase-Cloud-Projekt ist noch nicht konfiguriert. Die GitHub CLI 2.101.0 liegt auf diesem Rechner portabel unter dem ignorierten Pfad `.tools/gh/2.101.0/bin/gh.exe`; sie ist kein Projekt-Buildwerkzeug und keine Voraussetzung für CI. Die Anmeldung erfolgt über den GitHub-Browserflow, keine Tokens gehören in Projektdateien.
- `jsdom` 29 ist auf die vorhandene Node-Patchversion abgestimmt. Version 30 verlangt eine neuere Patchversion; die Engine-Prüfung bleibt aktiv.
- ESLint 9.39.5 wird von den derzeitigen Plugins in `eslint-config-next` unterstützt; ESLint 10 erzeugte inkompatible Peer-Abhängigkeiten. ESLint 9 ist bereits als nicht mehr unterstützt markiert. Die gemeinsame Aktualisierung von Next-Lint-Plugins und ESLint ist nach verfügbarer Kompatibilität erforderlich; es wurden keine Peer-Prüfungen oder Regeln unterdrückt.
- TypeScript 5.9.3 ist für dieses Fundament geprüft. Versionssprünge werden gemeinsam mit Next.js und dem Testtooling validiert, nicht automatisch übernommen.

## Quellen

- [Next.js: ESLint-Konfiguration](https://nextjs.org/docs/app/api-reference/config/eslint)
- [Supabase: lokale Entwicklung](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Vitest: Einrichtung](https://vitest.dev/guide/)
- [GitHub: Checkout](https://github.com/actions/checkout), [Node-Setup](https://github.com/actions/setup-node), [pnpm-Setup](https://github.com/pnpm/action-setup)

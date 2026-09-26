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

Die laufende Sparzielverwaltung benötigt außerdem `20260926160000_savings_goals.sql` und `20260926161000_goal_currency.sql`. Alle Migrationen mit `pnpm exec supabase migration up --local` anwenden; ein Datenbankreset ist dafür nicht nötig. Bestehende Ziele bleiben erhalten und erhalten ihren bisherigen Startmonat als erste Sparrate. Details: [SAVINGS_GOALS_STATUS.md](SAVINGS_GOALS_STATUS.md).

Fixkostenpflege und Monatsbudgets benötigen zusätzlich `20260921150000_fixed_costs_and_budgets.sql`; ebenfalls mit `pnpm exec supabase migration up --local` anwenden. Bestehende Nutzerdaten bleiben dabei erhalten. Die gemeinsame Monatsübersicht zeigt anschließend gültige Fixkosten und das Budget. Details: [FIXED_COSTS_BUDGET_STATUS.md](FIXED_COSTS_BUDGET_STATUS.md).

Die laufende Finanzverwaltung unter `/account/money` benötigt auch die Migration `20260921120000_money_transactions.sql`. Sie verwendet dieselben Einkommen-/Ausgabentabellen wie die Einrichtung und bietet Einnahmen- und Ausgaben-CRUD mit Monatsübersicht. `/account/overview` führt inzwischen nach Money für den Startmonat. Details: [MONEY_TRANSACTIONS_STATUS.md](MONEY_TRANSACTIONS_STATUS.md).

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
pnpm test:auth
```

`typecheck` erzeugt zuerst Next.js-Routentypen und funktioniert deshalb auch vor dem ersten Build. `test:e2e` startet selbst den bereits gebauten Produktionsserver auf Port 3100 und beendet ihn danach. Zuerst `pnpm build` ausführen. Ein bereits belegter Port wird absichtlich nicht wiederverwendet, damit nicht versehentlich eine andere Anwendung getestet wird.

Playwright benötigt beim ersten Setup einen Browserdownload; Linux-CI verwendet zusätzlich `--with-deps`. `--only-shell` lädt nur den für diese Headless-Tests benötigten Browser. Unter Windows kann bei Problemen mit `pnpm exec` der lokale Launcher direkt aufgerufen werden: `.\node_modules\.bin\playwright.CMD install --only-shell chromium`. Bei knappem Speicher oder begrenzten Ressourcen kann `pnpm test:e2e --workers=1` verwendet werden; alle Tests bleiben aktiv.

Vitest prüft Konfigurationsvalidierung und zugängliche Navigation. Playwright prüft alle fünf Bereiche, direkte Routen, Farbschema-Persistenz, mobilen Überlauf, Tastaturzugang und 404 sowie die Kennzeichnung der Beispieldaten, Zielfortschritte, Dashboard-Links und den Wechsel zum Leerzustand. Berichte und Screenshots stehen lokal unter `playwright-report` bzw. `test-results` und werden nicht versioniert.

`pnpm format` formatiert bearbeitbare Projektdateien. Die unverändert übernommene Produkt-README ist davon ausgenommen. `pnpm test:watch` startet den interaktiven Testmodus.

## Supabase lokal

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

Die lokale Auth-Konfiguration verwendet bestätigte E-Mail-Adressen, sechsstellige Codes und sichere Passwortänderungen. Templates liegen unter `supabase/templates`; Supabase-Stop/Start aktiviert Änderungen bei erhaltenen Volumes. Codebestätigung und Wiederherstellung verwenden Server Actions mit festen Weiterleitungen. Der Proxy erneuert Sitzungen; Server Components und Server Actions verwenden getrennte Cookie-Adapter.

## Projektstruktur und Grenzen

Siehe [SYSTEM.md](architecture/SYSTEM.md), [DATA_MODEL.md](architecture/DATA_MODEL.md) und [DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md). Reine Domain-Regeln, weitere Featuremodule, Datenbanktypen und Integrationstests entstehen erst mit ihren tatsächlichen Funktionen.

Kein Service-Role-Key und kein OpenAI-Key sind für normale App-Anfragen nötig. Nur der lokale Test-Runner liest einen privilegierten Schlüssel im Speicher für die Erzeugung und Bereinigung eigener Testkonten. Die Rechteprüfungen verwenden normale Nutzerrechte. `.env*` ist bis auf `.env.example` ignoriert; Konfigurationsfehler zeigen nur Variablennamen. Öffentliche Next.js-Konfiguration erfordert nach Änderungen einen neuen Build.

## CI und Veröffentlichung

Das vom Nutzer vorgegebene Repository ist [LucaEndrich2002/LifeIO](https://github.com/LucaEndrich2002/LifeIO). `origin` verweist auf dessen HTTPS-URL. Das lokale Fundament wurde als erster Commit auf `main` übertragen; der Dashboard-Ausbau erfolgt auf `codex/dashboard-and-ci` und wird als Pull Request bereitgestellt.

`.github/workflows/ci.yml` läuft bei Pushes, Pull Requests und manueller Auslösung: Installation mit Lockfile, Formatterprüfung, Lint, Typecheck, Unit-/Komponententests, Build und Playwright auf Desktop/Mobil. Kein Deployment und keine Cloud-Secrets sind dafür erforderlich. [GitHub Actions](https://github.com/LucaEndrich2002/LifeIO/actions) zeigt die tatsächlichen Läufe. Browserberichte und Screenshots werden für sieben Tage als Artefakt gespeichert. Der aktuelle Prüfstand steht in [DASHBOARD_STATUS.md](DASHBOARD_STATUS.md).

Vercel und Supabase Cloud bleiben die vorgesehenen späteren Hosting-Ziele. Das GitHub-Repository existierte bereits und wurde auf ausdrücklichen Nutzerwunsch angebunden. Ein Cloud-Projekt oder öffentliches App-Deployment ist noch nicht eingerichtet. Die Repository-Sichtbarkeit wurde nicht verändert.

## Bekannte Voraussetzungen und Versionsentscheidungen

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

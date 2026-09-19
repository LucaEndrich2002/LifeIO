# LifeOS lokal entwickeln

## Voraussetzungen und Start

Node.js 24 und pnpm 10.34.5; die verwendeten Pakete sind in `package.json` und `pnpm-lock.yaml` festgeschrieben. In diesem Setup wurde Node 24.13.1 verwendet. Das Projekt bleibt beim unterstützten Node-24-Major; aktuelle Sicherheitsupdates sind beim Betrieb einzuspielen.

```sh
npm install --global pnpm@10.34.5
pnpm install --frozen-lockfile
pnpm dev
```

Die Vorschau läuft auf `http://127.0.0.1:3000`. Für Windows PowerShell mit gesperrten `.ps1`-Launchern können die Befehle als `npm.cmd` bzw. `pnpm.cmd` aufgerufen werden; eine Änderung der Execution Policy ist nicht nötig.

Die Shell benötigt keine `.env.local`, keine Cloud-Verbindung und keinen Login. Sie speichert keine persönlichen Daten. Nur die Farbschema-Präferenz wird im Browser gespeichert.

## Qualitätsprüfungen

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install --only-shell chromium
pnpm test:e2e
```

`typecheck` erzeugt zuerst Next.js-Routentypen und funktioniert deshalb auch vor dem ersten Build. `test:e2e` startet selbst den bereits gebauten Produktionsserver auf Port 3100 und beendet ihn danach. Zuerst `pnpm build` ausführen. Ein bereits belegter Port wird absichtlich nicht wiederverwendet, damit nicht versehentlich eine andere Anwendung getestet wird.

Playwright benötigt beim ersten Setup einen Browserdownload; Linux-CI verwendet zusätzlich `--with-deps`. `--only-shell` lädt nur den für diese Headless-Tests benötigten Browser. Unter Windows kann bei Problemen mit `pnpm exec` der lokale Launcher direkt aufgerufen werden: `.\node_modules\.bin\playwright.CMD install --only-shell chromium`. Bei knappem Speicher oder begrenzten Ressourcen kann `pnpm test:e2e --workers=1` verwendet werden; alle Tests bleiben aktiv.

Vitest prüft Konfigurationsvalidierung und zugängliche Navigation. Playwright prüft alle fünf Bereiche, direkte Routen, Farbschema-Persistenz, mobilen Überlauf, Tastaturzugang und 404. Berichte und Screenshots stehen lokal unter `playwright-report` bzw. `test-results` und werden nicht versioniert.

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

Noch gibt es kein Anwendungsschema. Neue Tabellen werden nicht automatisch für die Data API freigegeben. Die erste Fachmigration muss Constraints, Grants, RLS und Isolationstests gemeinsam einführen. Seeds sind deaktiviert, bis es sinnvolle fiktive Fixtures gibt. Ein Cloud-Projekt muss dieselben Grenzen separat erhalten; die lokale Konfiguration setzt keine Cloud-Einstellungen.

Die lokale Auth-Konfiguration bereitet bestätigte E-Mail-Adressen und sichere Passwortänderungen vor. Noch existieren weder Login-Seiten noch Callback-Routen; der Auth-Task ergänzt die genaue Redirect-Allowlist, Refresh-Proxy, RSC-Client und Autorisierung. Der vorhandene Serverclient darf nur in Route Handlers/Server Actions mit beschreibbaren Cookies verwendet werden.

## Projektstruktur und Grenzen

Siehe [SYSTEM.md](architecture/SYSTEM.md), [DATA_MODEL.md](architecture/DATA_MODEL.md) und [DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md). Reine Domain-Regeln, weitere Featuremodule, Datenbanktypen und Integrationstests entstehen erst mit ihren tatsächlichen Funktionen.

Kein Supabase-Service-Role-Key und kein OpenAI-Key sind zum Entwickeln des Fundaments nötig. `.env*` ist bis auf `.env.example` ignoriert. Fehlermeldungen der Konfigurationsprüfung zeigen nur Variablennamen. Publizierbare Projektkonfiguration wird von Next.js beim Build eingebunden; nach Änderungen neu bauen.

## CI und Veröffentlichung

`.github/workflows/ci.yml` läuft bei Pushes und Pull Requests: Installation mit Lockfile, Formatterprüfung, Lint, Typecheck, Unit-/Komponententests, Build und Playwright auf Desktop/Mobil. Kein Deployment und keine Cloud-Secrets sind dafür erforderlich. Erst nach Anbindung eines GitHub-Repositories kann ein tatsächlicher Actions-Lauf bestätigt werden.

Vercel und Supabase Cloud bleiben die vorgesehenen späteren Hosting-Ziele. Es wurde kein externes Repository, kein Cloud-Projekt und kein öffentliches Deployment automatisch angelegt.

## Bekannte Voraussetzungen und Versionsentscheidungen

- Docker Desktop 4.91.0 mit WSL 2.7.13 und der lokale Supabase-Stack sind eingerichtet. Dienstzustand, ausschließlich lokale Ports und Wiederanlauf wurden am 19.09.2026 geprüft; `.env.local` enthält nur öffentliche Verbindungskonfiguration. Ein beim Docker-Desktop-Neustart beobachteter Socket-Fehler wurde mit einem reversiblen Workaround behoben und bleibt als externe Einschränkung dokumentiert: [LOCAL_SUPABASE.md](LOCAL_SUPABASE.md). Anwendungsmigrationen und RLS folgen erst mit dem ersten Schema.
- Ein GitHub-Ziel und ein Supabase-Cloud-Projekt sind noch nicht konfiguriert.
- `jsdom` 29 ist auf die vorhandene Node-Patchversion abgestimmt. Version 30 verlangt eine neuere Patchversion; die Engine-Prüfung bleibt aktiv.
- ESLint 9.39.5 wird von den derzeitigen Plugins in `eslint-config-next` unterstützt; ESLint 10 erzeugte inkompatible Peer-Abhängigkeiten. ESLint 9 ist bereits als nicht mehr unterstützt markiert. Die gemeinsame Aktualisierung von Next-Lint-Plugins und ESLint ist nach verfügbarer Kompatibilität erforderlich; es wurden keine Peer-Prüfungen oder Regeln unterdrückt.
- TypeScript 5.9.3 ist für dieses Fundament geprüft. Versionssprünge werden gemeinsam mit Next.js und dem Testtooling validiert, nicht automatisch übernommen.

## Quellen

- [Next.js: ESLint-Konfiguration](https://nextjs.org/docs/app/api-reference/config/eslint)
- [Supabase: lokale Entwicklung](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Vitest: Einrichtung](https://vitest.dev/guide/)
- [GitHub: Checkout](https://github.com/actions/checkout), [Node-Setup](https://github.com/actions/setup-node), [pnpm-Setup](https://github.com/pnpm/action-setup)

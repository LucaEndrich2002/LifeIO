# Projektfundament – Prüfbericht

Stand: 19.09.2026. Dieser Bericht beschreibt den ursprünglichen Foundation-Commit `9c20b8c` auf `feat/project-foundation`, inzwischen auch auf GitHub `main`. Den anschließend vom Nutzer beauftragten Dashboard-Ausbau und die GitHub-Anbindung beschreibt [DASHBOARD_STATUS.md](DASHBOARD_STATUS.md).

## Implementiert

- Next.js 16.3.5, React 19.3, TypeScript Strict Mode und pnpm 10.34.5; Abhängigkeiten exakt festgeschrieben, Lockfile vorhanden.
- Tailwind 4, lokale shadcn/ui-Card, Lucide-Icons und Theme-Umschaltung.
- Statische, responsive Vorschau für Home, Money, Plan, Goals und AI mit Navigation, Leerzuständen, Lade-/Fehleransichten und 404.
- Zod-Validierung öffentlicher Supabase-Konfiguration, getrennte Browser-/Server-Clientfabriken, `.env.example`, Ignore-Regeln und Basis-HTTP-Header.
- Supabase-CLI und reduzierte lokale Konfiguration für PostgreSQL 17, Auth, Studio und lokales Testpostfach. Noch keine Fachtabellen oder RLS-Policies, da noch keine persönlichen Daten gespeichert werden.
- Vitest/React Testing Library, Playwright, ESLint/Prettier und GitHub-Actions-Workflow.
- Gemeinsame Repository-Regeln und Dokumentation für Architektur, geplanten Life Core, Geldwerte, EntityLink, KI-Grenzen, Design und Einrichtung.

## Validierung

Die Befehle wurden unter Windows mit `pnpm.cmd` ausgeführt; in üblichen Shells entspricht das `pnpm`.

| Befehl / Prüfung                           | Ergebnis                                                                                                                                                   |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile --offline` | Erfolgreich; Lockfile unverändert nutzbar, alle Pakete vorhanden                                                                                           |
| `pnpm format:check`                        | Erfolgreich                                                                                                                                                |
| `pnpm lint`                                | Erfolgreich; keine Warnungen oder Fehler im Projektcode                                                                                                    |
| `pnpm typecheck`                           | Erfolgreich, inklusive generierter Next.js-Routentypen                                                                                                     |
| `pnpm test`                                | 16 Tests in zwei Dateien erfolgreich                                                                                                                       |
| `pnpm build`                               | Erfolgreicher Produktionsbuild; alle fünf Bereiche statisch erzeugt                                                                                        |
| `pnpm test:e2e --workers=1`                | 8 Tests erfolgreich, Exit-Code 0: vier Abläufe je Desktop und Mobilgerät                                                                                   |
| Screenshot-Review                          | Desktop Light und Mobile Dark geprüft; Navigation, Hierarchie und Leerzustände sichtbar                                                                    |
| Dokumentprüfung                            | UTF-8, lokale Links und bytegleiche Übernahme der ursprünglichen README geprüft                                                                            |
| Git-/Ignore-Prüfung                        | Echte Env-Dateien, Abhängigkeiten und Test-/Supabase-Artefakte ausgeschlossen; keine neu eingeführten Whitespace-Fehler außerhalb der unveränderten README |
| `pnpm db:start`                            | Erfolgreich, ebenso Stop/Start mit erhaltenem Datenbankvolume; Dienste gesund, API/Studio/Mailpit HTTP 200, Host-Ports ausschließlich Loopback             |
| `pnpm db:doctor --runtime`                 | Erfolgreich: WSL, Docker, lokale Linux-Engine und Betriebsreserve geprüft; Installationsprüfung bleibt separat bei 20 GiB                                  |
| GitHub Actions                             | Workflow erstellt; ohne Remote noch kein tatsächlicher CI-Lauf                                                                                             |

Die Tests decken Konfigurationsfehler einschließlich privater Schlüssel, aktive und verschachtelte Navigation, direkte Seitenaufrufe, Light/Dark-Persistenz, mobilen Überlauf, Skip-Link und echte 404-Antworten ab. Noch keine Aussage über spätere Auth-/RLS- oder Finanzfunktionen.

Beim ersten Browserlauf fehlte Speicherplatz. Die ausschließlich in diesem Task geladene vollständige Chromium-Kopie wurde entfernt; der benötigte Headless-Browser blieb installiert. Alle Tests wurden unverändert mit einem Worker wiederholt. Der abschließende erfolgreiche Lauf fand außerhalb der Sandbox statt, weil die Sandbox das Beenden des Testservers hängen ließ. Es wurden keine Tests deaktiviert.

## Offene Punkte

1. Ein Socket-Fehler von Docker Desktop unter Windows trat beim Desktop-Neustart auf. Die lokale Umgebung läuft nach einem reversiblen Workaround; spätere Desktop-Neustarts können erneut betroffen sein. Befund, Sicherungen und Betriebsablauf stehen in [LOCAL_SUPABASE.md](LOCAL_SUPABASE.md). Anwendungsmigrationen, Seeds und Nutzer-Isolationstests folgen erst mit dem ersten Schema.
2. Das GitHub-Ziel wurde im Folgetask auf Nutzervorgabe angebunden; CI-Ergebnisse stehen im separaten Dashboard-Prüfbericht. Supabase Cloud und ein öffentliches App-Deployment bleiben offen.
3. Die derzeitigen Next.js-Lint-Plugins unterstützen ESLint 10 noch nicht durchgehend. ESLint 9.39.5 funktioniert, ist aber als nicht mehr unterstützt markiert. Diese gemeinsame Werkzeugaktualisierung bleibt offen; Details in [DEVELOPMENT.md](DEVELOPMENT.md).
4. Die bestehenden offenen Produktentscheidungen im [PRD](product/PRD.md) sind vor den jeweiligen Fachfeatures zu klären. Authentication und persönliche Daten sind noch nicht implementiert.
5. Git wurde in der Sandbox initialisiert. Bei einem Zugriff über ein anderes Windows-Benutzerkonto kann Git einen Eigentümerhinweis melden. Für die Prüfung wurde nur pro Befehl der konkrete Projektordner über `-c safe.directory=C:/Users/lucae/LifeIO` freigegeben; keine globale Git-Sicherheitsregel wurde geändert.

Phase 1 ist damit lokal weitgehend umgesetzt, aber wegen der externen Voraussetzungen nicht vollständig abgeschlossen. Die App Shell ist nur der vereinbarte begrenzte Vorgriff auf Phase 2.

## Empfohlener nächster Task

Der Nutzer hat den Dashboard-Prototyp und GitHub/CI gemeinsam als Folgetask beauftragt; siehe [DASHBOARD_STATUS.md](DASHBOARD_STATUS.md). Die lokale Supabase-Grundlage für spätere Authentifizierung und Datenpersistenz ist eingerichtet; ein Supabase-Cloud-Projekt und weitere Produktphasen bleiben separate Tasks.

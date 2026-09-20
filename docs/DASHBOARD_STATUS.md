# Dashboard-Prototyp und GitHub-Anbindung

Stand: 20.09.2026. Vom Nutzer beauftragter Umfang: Oberfläche ausbauen und GitHub mit automatischen Prüfungen anbinden.

## Ergebnis

- Home enthält den statischen Prototyp aus Phase 2: Monatssaldo mit Berechnungsbasis als Anzeigetext, Today mit zwei Aufgaben und einem Termin, zwei Ziele mit benannten Fortschrittsbalken sowie einen konkreten Budgethinweis mit Link zu Money.
- Fiktive Daten sind oberhalb der Kennzahlen ausdrücklich gekennzeichnet. Der Beispieltag bleibt der 19.09.2026; es wird keine persönliche aktuelle Tageslage suggeriert.
- Die Umschaltung „Ohne Einträge“ entfernt die Beispielwerte vollständig aus der sichtbaren Ansicht und zeigt passende nächste Schritte zu den vorhandenen Modulvorschauen. Die Auswahl wird nicht gespeichert.
- KPI-, Progress- und Empty-State-Bausteine sind mehrfach verwendet. Der Home-Inhalt bleibt serverseitig gerendert, nur der Ansichtswechsel ist ein kleiner Client-Baustein. Es gibt keine neuen Paketabhängigkeiten.
- Ladezustand, globale Fehleransicht mit Retry, Light/Dark Mode, responsive Navigation und Tastaturfokus stehen zur Verfügung. Authentifizierung, persönliche Persistenz, Aufgabenbearbeitung und Finanzberechnungen gehören weiterhin zu späteren Phasen.

## Lokale Prüfung

| Prüfung                     | Ergebnis                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `pnpm lint`                 | Erfolgreich, keine Warnungen                                                                |
| `pnpm typecheck`            | Erfolgreich                                                                                 |
| `pnpm test`                 | 16 Tests erfolgreich                                                                        |
| `pnpm build`                | Erfolgreich; alle fünf Bereiche statisch erzeugt                                            |
| `pnpm test:e2e --workers=1` | 12 Tests erfolgreich, Exit-Code 0                                                           |
| Visuelle Prüfung            | Desktop Hell, Mobil Dunkel und Desktop-Leerzustand anhand der erzeugten Screenshots geprüft |

Die Browserprüfungen laufen gegen einen eigenen Produktionsserver und prüfen neben Navigation, Theme-Persistenz, 404 und Skip-Link insbesondere Datenkennzeichnung, Fortschrittswerte, echte Dashboard-Links sowie den per Enter/Leertaste bedienbaren Ansichtswechsel. Im Leerzustand werden weder Beispielbeträge noch falsche Nullwerte angezeigt. Beide Ansichten sind bei 375 px ohne horizontalen Überlauf bedienbar. Die Prüfung ersetzt weder eine vollständige Accessibility-Abnahme noch die Nutzerstudie aus PRD J05.

## GitHub und CI

Das vom Nutzer vorgegebene, zuvor leere Repository ist [LucaEndrich2002/LifeIO](https://github.com/LucaEndrich2002/LifeIO). Seine bestehende öffentliche Sichtbarkeit wurde beibehalten. Der Foundation-Commit `9c20b8c` liegt auf `main`; der Dashboard-Ausbau erfolgt auf `codex/dashboard-and-ci`.

Der [erste Foundation-CI-Lauf](https://github.com/LucaEndrich2002/LifeIO/actions/runs/35450306753) war erfolgreich, einschließlich Installation aus dem Lockfile, Formatierung, Lint, Typprüfung, Tests, Build und Browsertests unter Linux. Ergebnisse des Dashboard-Branches stehen in [GitHub Actions](https://github.com/LucaEndrich2002/LifeIO/actions) und bei den Prüfungen des zugehörigen Pull Requests; ein älterer erfolgreicher Lauf gilt nicht automatisch für neuere Commits.

Der Workflow startet bei Pushes und Pull Requests und kann manuell ausgelöst werden. Playwright-Berichte und Screenshots werden sieben Tage als Artefakt aufbewahrt. CI benötigt nur Leserechte auf den Quellcode und keine Cloud-Secrets. Lokale `.env`-Dateien, GitHub-Werkzeuge und Zugangsdaten werden nicht versioniert.

## Verbleibender Umfang

Der Prototyp erfüllt den begrenzten Oberflächenumfang von Phase 2. Ein datengetriebenes Dashboard, Onboarding, Supabase Cloud, Deployment und die weiteren Produktphasen wurden nicht begonnen. Für den nächsten Fachschritt sind die zugehörigen offenen Produktentscheidungen im [PRD](product/PRD.md) zu klären. Der bekannte Docker-Desktop-Startfehler bleibt in [LOCAL_SUPABASE.md](LOCAL_SUPABASE.md) dokumentiert; dieser Task verändert die Datenbankumgebung nicht.

# LifeOS – Browser am wiederhergestellten Ziel

Stand: 31.10.2026. Begrenzte lokale V1-Betriebsprüfung aufbauend auf dem [Auth-Restore](AUTH_RECOVERY_ACCEPTANCE.md). Ergänzt eine CSP-konforme Initialisierung der Browser-Validierung. Keine neue Produktfunktion, Migration oder Abhängigkeit; kein Cloud-Wiederanlauf.

## Ausführung und Umfang

`pnpm test:recovery:browser` verwendet dieselbe unabhängige Quell-/Ziel-Wiederherstellung wie `pnpm test:auth:restore`. Der gemeinsame Ablauf liegt in `scripts/auth-restore-scenario.mjs`; alle bisherigen Archiv-, Daten-, Rechte-, Anmelde- und Neustartprüfungen bleiben aktiv. Zusätzlich startet das Ziel einen minimalen Kong-Gateway für `/auth/v1/` und `/rest/v1/`. Fehlende/falsche API-Schlüssel werden abgewiesen; der öffentliche Schlüssel allein darf keine Profile lesen.

Benötigt werden Node/pnpm samt installierten Projektabhängigkeiten, Playwright Chromium, lokaler Docker Engine ab 28 und die bereits vorhandenen Images PostgreSQL `17.6.1.167`, GoTrue `v2.196.0`, Mailpit `v1.30.2`, PostgREST `v16.2` und Kong `2.8.1` aus `public.ecr.aws/supabase/`. Der lokale Befehl lädt keine Images nach. Mindestens 2 GiB freier temporärer Build-Speicher werden vorausgesetzt; dies ersetzt nicht die größere Reserve für die gesamte Entwicklungsumgebung. CI lädt das zusätzliche Kong-Image ausdrücklich.

Die Probe baut eine eigene Produktions-App unter `.cache/recovery-app-*`. Sie kopiert ausschließlich Quellcode, Tests, Werkzeuge und erforderliche Konfigurationen; bestehende Umgebungsdateien und Build-Artefakte werden nicht übernommen. Ein Abhängigkeitslink verwendet die vorhandene Installation. Der Turbopack-Auflösungsroot wird an diese lokale Verzeichnisstruktur angepasst; die Seiten-Build-Arbeiter werden in dieser Kopie auf zwei begrenzt, um die lokale Speicherspitze zu reduzieren. Die vollständige Typprüfung bleibt aktiv. Der neue Build erhält ausschließlich die eigene Gateway-Adresse und einen kurzlebigen öffentlichen Testschlüssel; OpenAI-Konfiguration bleibt leer. Ein zufälliger Marker prüft vor dem Browserstart, dass der gestartete Server tatsächlich die eigene Kopie ausliefert.

Auf Desktop und einem mobilen Chromium-Viewport werden geprüft:

- Falsches Passwort und unbestätigtes Konto bleiben ausgeschlossen; private Routen führen zur Anmeldung.
- Beide wiederhergestellten Konten können sich mit ihren ursprünglichen Zugangsdaten anmelden.
- Die gespeicherten Profile erscheinen. Eine Änderung über die Oberfläche bleibt nach Neuladen erhalten und wird direkt in der eigenen Ziel-Datenbank bestätigt.
- Das ursprüngliche Einkommen mit 280001 Cent erscheint unverändert als `2800,01` Euro im Einrichtungsformular.
- Abmeldung entfernt die Auth-Cookies und sperrt den erneuten privaten Aufruf.
- Produktions-CSP ohne `unsafe-inline`/`unsafe-eval`, private Cache-Sperre, geladene Formularstile, kein horizontaler Überlauf und keine beobachteten CSP-Verstöße.

## Grenzen und Bereinigung

Es werden nur fiktive Konten und Daten erzeugt. Browseranfragen an andere Ursprünge werden blockiert und lassen die Probe scheitern. Die App erhält keine echte Providerkonfiguration. Das ist keine allgemeine Netzwerksperre für den Hostprozess. Der Gateway ist ein bewusst begrenzter Testaufbau mit Auth/Data API und API-Key-Prüfung; Admin, Studio, Storage und Realtime sind nicht enthalten. Die Konfiguration wird im Speicher übergeben; Gateway-Zugriffslogs und anonyme Kong-Berichte sind abgeschaltet. [Kong DB-less](https://developer.konghq.com/gateway/db-less-mode/), [Konfigurationsoptionen für 2.8.1](https://github.com/Kong/kong/blob/2.8.1/kong.conf.default).

Eigene Dienste veröffentlichen ausschließlich geprüfte Loopback-Ports und tragen die bestehenden UUID-Kennzeichnungen. Erfolg und Fehler schließen den eigenen Browser/App-Prozess und entfernen die eigene temporäre Kopie sowie Probecontainer und Netzwerke. Vor rekursivem Entfernen wird der App-Pfad geprüft und zuerst der Abhängigkeitslink selbst entfernt. Abbruchbereinigung ist an die verschachtelten Proben angeschlossen. Nach hartem Prozess-/Rechnerabbruch ausschließlich eigene `lifeos-auth-source-*`, `lifeos-browser-target-*` und `.cache/recovery-app-*` prüfen; kein allgemeines Docker-Prune und keine Bereinigung fremder Prozesse. Keine Screenshots, Traces, Sitzungsexporte oder Rohantworten werden gespeichert. Fehler nennen nur die Phase und gegebenenfalls einen kontrollierten Prüftext.

Die Probe umfasst Anmeldung, Profil, vorhandenes Einkommen und Abmeldung. Die vollständigen Money-/Plan-/Goals-/Home-Journeys auf einem restaurierten Ziel, produktive Auth-URL-/Mail-Konfiguration, Schlüsselrotation und alte Refresh-Sitzungen bleiben getrennte Abnahmen. Ebenso offen: vollständige Supabase-/Cloud-Infrastruktur, externe Backups und Aufbewahrung, Wiederanlaufzeiten und Löschprozesse. Die reguläre private Browsersuite zählt nicht automatisch als Nachweis am Restore-Ziel.

## Prüfstand

Der korrigierte lokale Lauf besteht vollständig auf Desktop und Mobil einschließlich aller zugrunde liegenden Auth-Restore-Prüfungen (Exit 0). Für die neue Browser-Initialisierung bestehen lokal erneut Lint, Typprüfung, 196 Unit-, 19 Werkzeugtests, Produktionsbuild und 16 öffentliche Browserfälle. Der vollständige GitHub-Nachweis für die Korrektur steht noch aus.

Historischer Fehlerstand von [Entwurf #35](https://github.com/LucaEndrich2002/LifeIO/pull/35), Code `b05f77d36acaa24c569ea64f547345be3cb26d82`: [Push 41191960214](https://github.com/LucaEndrich2002/LifeIO/actions/runs/41191960214) und [PR-Lauf 41191970044](https://github.com/LucaEndrich2002/LifeIO/actions/runs/41191970044) bestehen alle vorherigen Schritte, scheitern aber in der neuen Browserprobe. Beide melden vier POST-Anfragen und ein CSP-Ereignis in der noch groben Phase `desktop restored login form submission`; 46 bzw. 36 Browseranfragen schlugen fehl. Die nachfolgende private Standardsuite und das Home-Testpaket wurden übersprungen. Diese Läufe bleiben fehlgeschlagen; sie sind kein Nachweis für die nachfolgende Korrektur.

Die ersten drei neuen Probeläufe schlugen vor dem Browserstart fehl und zählen nicht als bestanden: Der erste Kopierer setzte einen nicht vorhandenen `public`-Ordner voraus; danach fehlten Test-Fixtures/Konfigurationen und schließlich die gemeinsam importierte Docker-Typdefinition. Der Kopierer berücksichtigt den optionalen Asset-Ordner und übernimmt jetzt die benötigten Tests und Werkzeuge. Kein Typfehler wurde ausgeblendet und keine Browseranforderung entfernt.

Die folgenden vier Läufe erreichten den Browser, scheiterten aber an der globalen Auswahl einer Fehlermeldung bei der Anmeldung. Datenfreie Diagnose: Formular abgesendet, keine ungültigen Felder, keine beobachteten CSP-/Seiten-/Serverfehler. Die Auswahl wurde wie in der vorhandenen Auth-Suite auf den Hauptinhalt begrenzt; Next.js erzeugt zusätzlich einen Screenreader-Announcer mit der Rolle `alert`. Dies ist eine begründete Korrektur, noch kein bestandener Lauf. Der anschließende achte Lauf stoppte vor dem Build an der unveränderten Speichergrenze: Auf C: waren nur etwa 160 MiB frei. Alle eigenen temporären App-Kopien sind entfernt; `.cache` enthält keine verbliebene Build-Kopie. Keine fremden Dateien, vorhandenen Datenbanken oder allgemeinen Docker-Ressourcen wurden zur Platzgewinnung gelöscht. Weiterer lokaler Build erst nach ausreichendem freien Speicher; CI prüft den korrigierten Stand unabhängig.

### Fortsetzung nach den fehlgeschlagenen CI-Läufen

Bei wieder ausreichendem Speicher wurde ein weiterer Fehler im Ablauf gefunden: Die Einkommensseite hat keinen Abmeldeknopf. Die Probe öffnet dafür jetzt wieder das Profil. Der neunte Lauf führte beide Desktop-Konten einschließlich Schreiben, Neuladen, Einkommen und Abmeldung aus, scheiterte aber weiterhin an der unveränderten CSP-Prüfung. Der zehnte Lauf ordnete den verbleibenden Verstoß eindeutig `script-src` / `eval` auf `/account/onboarding/income` zu. Eine separate fiktive HTML-Gegenprobe erzeugte durch die verwendete Playwright-Messung keinen CSP-Verstoß.

Die installierte Zod-Version 4.6.5 prüft in `v4/core/util.js` mit `Function()`, ob dynamische Code-Erzeugung verfügbar ist. Der abgefangene Versuch erzeugt unter strikter CSP dennoch ein Ereignis; dieselbe Implementierung überspringt ihn bei `jitless`. `src/instrumentation-client.ts` aktiviert deshalb vor der Browser-Initialisierung `z.config({ jitless: true })`. Validierungsregeln und CSP bleiben unverändert; serverseitige Validierung bleibt bestehen. Das neue Browser-Inkrement prüft auch den erstmaligen Aufruf des bereits befüllten Einkommensformulars. Der elfte lokale Lauf besteht vollständig auf Desktop und Mobil ohne CSP-Verstöße. Frühere Fehler werden weder ausgefiltert noch durch Wiederholungsversuche im Test verdeckt.

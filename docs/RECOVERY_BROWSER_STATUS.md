# LifeOS – Browser am wiederhergestellten Ziel

Stand: 31.10.2026. Begrenzte lokale V1-Betriebsprüfung aufbauend auf dem [Auth-Restore](AUTH_RECOVERY_ACCEPTANCE.md). Keine Änderung an Produktfunktionen, Migrationen oder Abhängigkeiten; kein Cloud-Wiederanlauf.

## Ausführung und Umfang

`pnpm test:recovery:browser` verwendet dieselbe unabhängige Quell-/Ziel-Wiederherstellung wie `pnpm test:auth:restore`. Der gemeinsame Ablauf liegt in `scripts/auth-restore-scenario.mjs`; alle bisherigen Archiv-, Daten-, Rechte-, Anmelde- und Neustartprüfungen bleiben aktiv. Zusätzlich startet das Ziel einen minimalen Kong-Gateway für `/auth/v1/` und `/rest/v1/`. Fehlende/falsche API-Schlüssel werden abgewiesen; der öffentliche Schlüssel allein darf keine Profile lesen.

Benötigt werden Node/pnpm samt installierten Projektabhängigkeiten, Playwright Chromium, lokaler Docker Engine ab 28 und die bereits vorhandenen Images PostgreSQL `17.6.1.167`, GoTrue `v2.196.0`, Mailpit `v1.30.2`, PostgREST `v16.2` und Kong `2.8.1` aus `public.ecr.aws/supabase/`. Der lokale Befehl lädt keine Images nach. Mindestens 2 GiB freier temporärer Build-Speicher werden vorausgesetzt; dies ersetzt nicht die größere Reserve für die gesamte Entwicklungsumgebung. CI lädt das zusätzliche Kong-Image ausdrücklich.

Die Probe baut eine eigene Produktions-App unter `.cache/recovery-app-*`. Sie kopiert ausschließlich Quellcode, Tests, Werkzeuge und erforderliche Konfigurationen; bestehende Umgebungsdateien und Build-Artefakte werden nicht übernommen. Ein Abhängigkeitslink verwendet die vorhandene Installation. Nur der Turbopack-Auflösungsroot wird an diese lokale Verzeichnisstruktur angepasst. Die vollständige Typprüfung bleibt aktiv. Der neue Build erhält ausschließlich die eigene Gateway-Adresse und einen kurzlebigen öffentlichen Testschlüssel; OpenAI-Konfiguration bleibt leer. Ein zufälliger Marker prüft vor dem Browserstart, dass der gestartete Server tatsächlich die eigene Kopie ausliefert.

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

In Bearbeitung. Bisherige lokale Nachweise: regulärer Build und Typprüfung, 196 Unit-, 19 Werkzeug- und 16 öffentliche Browserfälle sowie alle fünf bisherigen Datenbank-/Auth-Proben bestanden. Die neue vollständige Browserprobe ist noch nicht bestätigt. Der GitHub-Nachweis wird am Pull Request geprüft.

Die ersten drei neuen Probeläufe schlugen vor dem Browserstart fehl und zählen nicht als bestanden: Der erste Kopierer setzte einen nicht vorhandenen `public`-Ordner voraus; danach fehlten Test-Fixtures/Konfigurationen und schließlich die gemeinsam importierte Docker-Typdefinition. Der Kopierer berücksichtigt den optionalen Asset-Ordner und übernimmt jetzt die benötigten Tests und Werkzeuge. Kein Typfehler wurde ausgeblendet und keine Browseranforderung entfernt.

Die folgenden vier Läufe erreichten den Browser, scheiterten aber an der globalen Auswahl einer Fehlermeldung bei der Anmeldung. Datenfreie Diagnose: Formular abgesendet, keine ungültigen Felder, keine beobachteten CSP-/Seiten-/Serverfehler. Die Auswahl wurde wie in der vorhandenen Auth-Suite auf den Hauptinhalt begrenzt; Next.js erzeugt zusätzlich einen Screenreader-Announcer mit der Rolle `alert`. Dies ist eine begründete Korrektur, noch kein bestandener Lauf. Der anschließende achte Lauf stoppte vor dem Build an der unveränderten Speichergrenze: Auf C: waren nur etwa 160 MiB frei. Alle eigenen temporären App-Kopien sind entfernt; `.cache` enthält keine verbliebene Build-Kopie. Keine fremden Dateien, vorhandenen Datenbanken oder allgemeinen Docker-Ressourcen wurden zur Platzgewinnung gelöscht. Weiterer lokaler Build erst nach ausreichendem freien Speicher; CI prüft den korrigierten Stand unabhängig.

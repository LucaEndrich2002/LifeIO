# LifeOS – Money nach Wiederherstellung

Stand: 31.10.2026. Begrenzte V1-Betriebsprüfung auf `codex/recovery-journeys-assessment`, aufbauend auf dem vollständig geprüften [Browsernachweis #35](https://github.com/LucaEndrich2002/LifeIO/pull/35). Keine Produktänderung, Migration oder neue Abhängigkeit.

## Umfang

`pnpm test:recovery:money` verwendet den gemeinsamen Ablauf in `scripts/recovery-browser-scenario.mjs`. Der bisherige Befehl `pnpm test:recovery:browser` behält seine Prüfung des befüllten Einkommensformulars bei unvollständiger Einrichtung. Die neue Probe richtet eigene fiktive Konten vollständig ein, bevor die Sicherung entsteht: Einkommen, monatliche Miete und jeweils eine unterschiedliche variable Ausgabe. Sparziel und Aufgaben werden ausdrücklich übersprungen.

Die Sicherung wird in einen unabhängigen PostgreSQL-Cluster eingespielt. Daten-, Schema-, Rechte-, Auth-, Gateway- und Produktions-CSP-Prüfungen bleiben aktiv. Auf Desktop und Mobil prüft die neue Probe für beide Konten:

- Die gesicherte Ausgabe und der korrekte Oktober-Planwert erscheinen.
- Eine neue Ausgabe über 1099 Cent wird über das echte Formular gespeichert. Neuladen erhält sie genau einmal; der Planwert sinkt um genau diesen Betrag.
- Direkte Zielabfragen bestätigen Eigentümer, Centbetrag, Währung, Datum und Kategorie. Bestehende Zeilen bleiben unverändert.
- Fremde Ausgaben erscheinen nicht im Dokument; die direkte Bearbeitungsadresse eines fremden Datensatzes bleibt gesperrt. Das andere Konto wird nicht verändert.
- Die Quelldatenbank bleibt unverändert. Anmeldung, Profiländerung, Abmeldung, private Routensperre, CSP und mobiler Überlauf werden zusätzlich durch den gemeinsamen Ablauf geprüft.

Es gelten dieselben [Voraussetzungen, Umgebungsgrenzen und Bereinigungsregeln](RECOVERY_BROWSER_STATUS.md) wie für die bisherige Browserprobe. Keine echten Finanzdaten, Provideranfragen, Sitzungsexporte oder Rohfehlerausgaben. CI führt beide Browserproben getrennt aus.

## Prüfstand und Grenzen

Der erste lokale Money-Lauf besteht vollständig (Exit 0): beide Konten auf Desktop/Mobil einschließlich gemeinsamer Auth-Restore-, Gateway-, Profil-, Abmelde- und CSP-Prüfungen. Log: `.cache/recovery-money-first-20261031.log`. Lint, Typprüfung, 196 Unit-/19 Werkzeugtests sowie Format-/Diffprüfung sind ebenfalls bestanden. Der erste Unit-Testprozess konnte temporäre Windows-Dateien nicht lesen (`ENOENT`, 29 Testdateien fehlgeschlagen); der unveränderte vollständige Lauf mit normalem Dateizugriff besteht. Beide Ergebnisse bleiben in getrennten lokalen Logs erhalten.

Auch die ursprüngliche Browserprobe nach Extraktion, der reguläre Produktionsbuild und alle 16 öffentlichen Browserfälle bestehen (Exit 0, `.cache/recovery-money-regression-20261031.log`). Die gemeinsame Basis bleibt damit für die unvollständige Einrichtung geprüft. Der Kontrollbuild begrenzt seine Arbeiter nur vorübergehend über `CIRCLE_NODE_TOTAL=3`; anschließend wird der vorherige Umgebungswert wiederhergestellt.

[Pull Request #36](https://github.com/LucaEndrich2002/LifeIO/pull/36) gegen `codex/recovery-browser-assessment` besteht am veröffentlichten Kopf `bb487e333ade921b864859d3c44733a846880213` beide vollständigen CI-Läufe: [Push 41239480006](https://github.com/LucaEndrich2002/LifeIO/actions/runs/41239480006) und [PR-Lauf 41239483880](https://github.com/LucaEndrich2002/LifeIO/actions/runs/41239483880). Alle Schritte erfolgreich, einschließlich Datenbankintegration, beider Restore-Browserproben, weiterer Wiederherstellungsproben, regulärer privater Browsersuite und Home-Testpaket. Der begrenzte Schritt ist abgeschlossen und zur Durchsicht freigegeben; kein Main-Merge. Lokal geprüfte Implementierung: `eba051462be538fac80ea71efa454da478213017`. Deren erste CI-Läufe 41239258908 und 41239263633 wurden durch die nachfolgende Dokumentationsaktualisierung abgebrochen und zählen nicht als bestanden.

PR #36 umfasst Monatsansicht und Ausgabe-Erstellen nach Restore. Der nachfolgende Erweiterungsschritt hat einen eigenen Prüfstand; die erfolgreichen Läufe von #36 belegen ihn nicht.

## Erweiterung: Korrigieren, Monatswechsel und Löschen

Stand: 01.11.2026, Branch `codex/recovery-money-mutations`. Der bestehende Befehl wird erweitert, ohne zusätzliche CI-Builds oder Produktänderungen. Für beide Konten und beide Ansichten wird die neu erstellte Ausgabe nach dem bisherigen Persistenznachweis auf 2501 Cent und die Kategorie „Sonstiges“ korrigiert und auf den 1. November verschoben. Die Probe prüft die unveränderte Datensatz-ID, die genau einmal erhöhte Revision und den gespeicherten Monat. Oktober erhält seinen ursprünglichen Planwert zurück; November zeigt exakt 25,01 Euro variable Ausgaben. Da für November kein Einkommen erfasst wurde, muss der Gesamtplan ausdrücklich „Noch unvollständig“ bleiben.

Ein Löschversuch ohne Bestätigung muss abgewiesen werden und die vollständige Datenbankzeile erhalten. Auch Abbrechen und Neuladen erhalten die Ausgabe. Erst die sichtbare Bestätigung erlaubt das Löschen. Danach fehlen Datensatz und Anzeige, November enthält keine variablen Ausgaben und Oktober bleibt unverändert. Vorhandene andere Zeilen, das fremde Konto und die Quelldatenbank werden weiterhin verglichen. Desktop und Mobil führen je einen vollständigen Lebenszyklus aus; der bestehende Erstellen-/Neuladen-Nachweis bleibt vor jeder Änderung aktiv.

Prüfstand: Lint, Typprüfung, 196 Unit-/19 Werkzeugtests, regulärer Build, 16 öffentliche Browserfälle und Formatprüfung bestanden. Die ersten beiden erweiterten Restore-Läufe scheiterten nach dem Abbrechen des Löschformulars: Der Test lud vor bestätigtem Abschluss der Navigation neu. Der zweite Lauf grenzt die Phase auf `cancelled delete persistence` ein; unbestätigte Löschung und unveränderte Daten wurden zuvor bereits bestätigt. Der Test wartet jetzt ausdrücklich auf die November-Übersicht vor dem Neuladen. Der dritte vollständige Lauf besteht für beide Konten auf Desktop/Mobil einschließlich Auth-Restore, Gateway, Profil, Abmeldung und CSP (Exit 0; `.cache/recovery-money-mutations-third-20261101.log`). Die ersten beiden bleiben fehlgeschlagen. Ein neuer Pull-Request-Entwurf gegen PR #36 wird veröffentlicht; vollständige CI noch ausstehend. Eine automatische Freigabe verwechselte beim ersten Startversuch Verbrauch und Restkontingent. Nach erneuter Abfrage (86 % / 19 % Rest, reguläre Nutzung erlaubt) wurde derselbe autorisierte Testlauf freigegeben; keine Kontingentgrenze umgangen und kein Reset verwendet.

Budgets, Sparziele und weitere Money-/Plan-/Goals-/Home-Journeys am Restore-Ziel bleiben getrennte Abnahmen. Produktive Schlüsselrotation und alte Refresh-Sitzungen, externe Sicherung/Aufbewahrung, ausführbare Löschprozesse und Cloud-Betrieb bleiben gesonderte Arbeiten beziehungsweise Entscheidungen. Keine automatische Integration in den Hauptbranch.

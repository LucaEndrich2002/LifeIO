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

Die ursprüngliche Browserprobe nach Extraktion, regulärer Produktionsbuild und öffentliche Browserfälle laufen noch. Pull Request und CI-Nachweis stehen noch aus. Frühere grüne CI-Ergebnisse von PR #35 gelten nicht automatisch für diesen neuen Code.

Der Umfang umfasst Monatsansicht und Ausgabe-Erstellen nach Restore. Bearbeiten, Löschen, Monatswechsel, Budgets, Sparziele sowie Plan-/Goals-/Home-Journeys am Restore-Ziel sind damit nicht vollständig abgenommen. Produktive Schlüsselrotation und alte Refresh-Sitzungen, externe Sicherung/Aufbewahrung, ausführbare Löschprozesse und Cloud-Betrieb bleiben gesonderte Arbeiten beziehungsweise Entscheidungen. Keine automatische Integration in den Hauptbranch.

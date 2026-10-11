# LifeOS – Erste Aufgaben im Einstieg

Stand: 11.10.2026. Begrenzte Ergänzung von R02/J01; kein Beginn von Phase 9.

## Verhalten

Nach Einkommen, Fixkosten und Sparziel folgt der optionale Schritt „Aufgaben“. Nutzer können ein bis drei Aufgaben mit Titel, Priorität und optionalem Fälligkeitsdatum erfassen oder ausdrücklich überspringen. Die abschließende Übersicht zeigt die gespeicherten Aufgaben. Der Einstieg endet auf dem persönlichen Home.

Fälligkeiten sind Kalendertage von 2000-01-01 bis 2100-12-31 ohne Uhrzeit oder Zeitzonenumrechnung. Titel werden getrimmt und auf 80 Unicode-Zeichen begrenzt; Prioritäten sind Hoch, Normal oder Niedrig. Es werden keine Beispielaufgaben angelegt. Aufgaben ohne Datum bleiben in Plan verfügbar.

Gespeicherte Schritte lassen sich wieder aufnehmen und vor dem Abschluss korrigieren. Wiederholtes Speichern behält die IDs der jeweiligen Position; entfernte Positionen verschwinden. Ein späteres ausdrückliches Überspringen entfernt die zuvor in diesem Schritt gespeicherten Aufgaben. Die Oberfläche erklärt dies vor dem Speichern. Ein bloßer Wechsel der Auswahl verwirft noch keine Eingaben. Nach Abschluss werden dieselben Aufgaben über die bestehende Plan-Verwaltung bearbeitet oder erledigt.

Validierungsfehler und Konflikte mit anderen Tabs erhalten den eigenen Formularentwurf. Die aktuelle Fassung kann sichtbar neu geladen werden. Das Formular ist während des Speicherns gesperrt. Die bestehenden Lade- und Fehlerseiten gelten auch für diesen Schritt.

## Daten und Sicherheit

`20261011090000_onboarding_tasks.sql` ergänzt `onboarding.tasks_status` und optionale `tasks.onboarding_slot`-Werte 0–2. Normale Plan-Aufgaben haben weiterhin keinen Slot. Es gibt keine zweite Aufgabenliste.

Die additive Migration läuft in einer Transaktion. Bereits abgeschlossene Einrichtungen erhalten den Status `not_offered`: Die Funktion war damals nicht angeboten, eine ausdrückliche Überspringentscheidung wird nicht erfunden. Abschlusszeit und Revision sowie bestehende Aufgaben bleiben erhalten. Offene Einrichtungen erhalten `pending` und setzen beim ersten noch offenen Schritt fort. Ein Datenbankreset ist nicht nötig.

`save_onboarding_step` validiert Aufgaben erneut in PostgreSQL und schreibt atomar. Eigentümer stammen ausschließlich aus `auth.uid()`; fremde IDs oder zusätzliche Eigentümerfelder werden im Aufgaben-Payload abgewiesen. Profil- und Einrichtungssperren sowie die gemeinsame Revision verhindern konkurrierende Änderungen. Fehler an späteren Aufgaben rollen auch vorherige Änderungen derselben Anfrage zurück. Abschluss erfordert alle vier Entscheidungen; abgeschlossene Einrichtungen lassen sich nicht wieder öffnen.

Bestehende RLS und ausschließlich lesende Tabellenrechte bleiben erhalten. Normale Plan-Mutationen sind erst nach dem Abschluss möglich. Anwendungsanfragen verwenden die Nutzersitzung; privilegierte Schlüssel kommen nur bei der lokalen Testkonto-Verwaltung zum Einsatz. Der Onboarding-Lesezugriff begrenzt eingebettete Aufgaben auf die initialen Slots.

## Prüfung

- Unit: Grenzen, Unicode, echte Kalenderdaten, explizite Entscheidungen und Wiederaufnahme.
- Datenbank: stabile IDs, Korrekturen, Übergang in Plan, vollständiger Rollback, Grenzen, direkte Schreibverbote, Nutzertrennung, konkurrierende Revisionen und Abschlussbedingungen.
- Browser: vollständiger und ausgelassener Einstieg, drei Aufgaben und Entfernen einer mittleren Position, erhaltene Eingaben beim Auswahlwechsel, Tastaturspeicherung, Neuladen, Wiederaufnahme, Konflikt und anschließende Bearbeitung/Erledigung in Plan; Desktop und Mobilgerät.
- Lokaler Übergangstest: abgeschlossene und offene Testkonten sowie eine vorhandene Plan-Aufgabe vor der Migration angelegt; nach Anwendung unveränderte Bestandsdaten und korrekte neue Statuswerte bestätigt. Testkonten anschließend entfernt.

Lokaler Prüfstand: Lint, Typprüfung, Formatprüfung und Produktionsbuild erfolgreich. 178 Unit-/Komponententests, 113 Datenbanktests, 14 betroffene private Browserfälle und 12 öffentliche Browserfälle bestanden (317 insgesamt). Die Desktopansicht im hellen und die mobile Ansicht im dunklen Farbschema wurden zusätzlich visuell geprüft. Die privaten Browsertests warten vor Neuladen und Datenbankabgleich auf den abgeschlossenen Seitenwechsel beziehungsweise die sichtbare Speicherbestätigung. Echte KI-Anfragen bleiben auf Nutzerwunsch ausgesetzt.

Der funktionale Einstieg nach R02/J01 ist damit implementiert. Wochenrückblick, Benachrichtigungen und externe Abnahmen stehen weiterhin in [V1_STATUS.md](product/V1_STATUS.md).

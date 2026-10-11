# LifeOS – Gespeicherter Wochenrückblick

Stand: 11.10.2026. Begrenztes R13-Inkrement in Phase 9. Benachrichtigungen nach R14 und echte KI-Antworten sind nicht Teil dieses Schritts.

## Verhalten und Zeitraum

Home verlinkt auf `/account/review`. Standard ist die letzte abgeschlossene Montag–Sonntag-Woche der Profilzeitzone. Ein beliebiger Tag wählt seine zugehörige Woche; unterstützt werden Wochenanfänge von 2000-01-03 bis 2100-12-13. Die letzte Grenze hält auch die folgende Woche im unterstützten Kalenderbereich.

Öffnen liest ausschließlich einen vorhandenen Rückblick. Erst „Wochenrückblick erstellen“ speichert ihn. Pro Konto und Woche gibt es genau einen Datensatz. Doppelte Erstellungsanfragen behalten dessen ursprünglichen Inhalt. „Rückblick aktualisieren“ ersetzt bewusst den gespeicherten Stand, erhöht die sichtbare Fassung und zeigt den neuen Datenstand. Das ursprüngliche Erstellungsdatum und die Wochenzeitzone bleiben erhalten, auch nach einem Profilwechsel. Veraltete Formulare überschreiben keine neuere Fassung und bieten einen Link zum Neuladen.

Die zwölf neuesten gespeicherten Wochen sind direkt verlinkt; ältere bleiben über das Datum erreichbar. Laufende und zukünftige Wochen können noch nicht erstellt werden. Lade- und Fehlerseiten stammen aus dem privaten Kontobereich; Formularfehler, leere Daten und ausstehendes Speichern werden sichtbar dargestellt.

## Berechnungsregeln, Version 1

- Variable Ausgaben: vollständige EUR-Centsummen nach Buchungstag in der gewählten Woche und Vorwoche. Ohne Einträge in beiden Wochen wird keine Veränderung behauptet.
- Spar-Einzahlungen: nicht stornierte Beiträge nach Buchungstag in der gewählten Woche. Geplante Sparraten sind davon getrennt.
- Monatskontext: ganze Monatswerte und Budgets für die ein oder zwei berührten Monate, aus derselben Money-Berechnung. Einnahmen, Fixkosten und geplante Sparraten haben keine Wochenzuordnung und werden nicht anteilig erfunden. Auch Einträge außerhalb der gewählten Woche gehen in diese ausdrücklich bezeichneten Monatswerte ein.
- Ziele: tatsächlicher Stand beim Erstellen/Aktualisieren; bis zu sechs Ziele, offene zuerst, dann Zieldatum und stabile ID. Finanzielle und persönliche Fortschritte verwenden die vorhandenen Fachregeln.
- Aufgaben und Meilensteine: vollständige Zahl der derzeit offenen Aufgaben sowie noch vorhandene, aktuell erledigte Einträge mit Abschlusszeitpunkt innerhalb der gewählten Woche. Entfernte oder wieder geöffnete Einträge zählen nicht als erledigt. Drei offene Aufgaben werden nach Fälligkeit, Priorität und ID gezeigt.
- Folgewoche: offene Aufgaben mit Fälligkeit, noch offene Zieltermine und überlappende Kalenderereignisse. Bis zu drei Ziele und drei Termine erscheinen als Details; die Zählungen umfassen alle passenden Einträge. Bei älteren Rückblicken liegt auch diese Folgewoche in der Vergangenheit.

Zeitpunkte verwenden das halboffene Intervall vom lokalen Montag 00:00 bis zum folgenden Montag 00:00. Dadurch sind Wochen mit Zeitumstellung korrekt 167 beziehungsweise 169 Stunden lang. Reine Buchungs- und Fälligkeitstage werden nicht in UTC umgedeutet.

Hinweise sind ohne Modellaufruf deterministisch aus dem gespeicherten Datenstand abgeleitet. Reihenfolge: Monatsbudget ab exakt 90 % Nutzung, bis Wochenabschluss fällige offene Aufgaben, Ausgabenvergleich, tatsächliche Einzahlungen und erledigte Aufgaben. Höchstens drei Hinweise erscheinen. Bei vorhandenen Angaben ohne passenden Auslöser wird die begrenzte Vergleichsbasis benannt; ohne Datengrundlage gibt es keinen erfundenen Insight. Künftige Regeländerungen benötigen eine neue Version und müssen alte Fassungen weiterhin gleich interpretieren.

Der Rückblick rekonstruiert keine historische Änderungshistorie von Aufgaben oder Zielen. Später erstellte, korrigierte oder entfernte Originaleinträge können eine ausdrückliche Aktualisierung verändern. Links öffnen den aktuellen Originaldatensatz; ein inzwischen entfernter Eintrag kann dort nicht mehr verfügbar sein.

## Persistenz und Sicherheit

Die additive Migration `20261011130000_weekly_reviews.sql` ergänzt `weekly_reviews` mit Primärschlüssel `(user_id, week_start)`, Zeitzone, Regelversion, Revision, Zeitstempeln und einem versionierten JSON-Snapshot mit expliziter Währung EUR. Geldsummen werden als ganzzahlige Centwerte transportiert; unsichere Summen werden vor Speicherung abgewiesen. Ein Datenbankreset ist nicht erforderlich.

RLS erlaubt nur das Lesen eigener Rückblicke. Direkte Schreibrechte fehlen. Die eng begrenzte Funktion `generate_weekly_review` übernimmt weder Eigentümer noch Kennzahlen, Texte, Uhrzeit oder Zeitzone vom Aufrufer. Sie prüft Identität, abgeschlossenes Onboarding, Zeitraum und Revision; Profil-, Onboarding- und Rückblicksperren serialisieren konkurrierende Änderungen. Alle Quellabfragen binden den Eigentümer ausdrücklich; Aggregate und Detailausschnitte entstehen in einem gemeinsamen SQL-Lesesnapshot. Kontolöschung entfernt die zugehörigen Rückblicke über das Profil.

Die Anwendung verwendet ausschließlich den normalen Nutzerclient. Privilegierte Testvorbereitung ist auf synthetische lokale Konten begrenzt: Für Abschlussgrenzen setzt ein validierter Fixture-Helfer historische Zeitpunkte direkt in der lokalen Testdatenbank. Dafür werden keine Anwendungsrechte erweitert. Alle geprüften Anwendungsoperationen laufen weiterhin mit normalen Nutzerrechten.

## Prüfung

Unit-Prüfungen decken Wochen-/Jahresgrenzen, Profilzeitzonen, ungültige Tage, Centgrenzen, fehlende Vergleichsdaten und deterministische Priorisierung ab. Datenbanktests prüfen vollständige Summen über Monatsgrenzen und Detailgrenzen hinaus, Stornierungen, stabile Wiederöffnung, doppelte Erstellung, konkurrierende Aktualisierung, Sommer-/Winterzeit, exakte Zeitgrenzen und eigene/fremde/anonyme Zugriffe. Browserfälle prüfen Erstellung per Tastatur, erhaltenen Datenstand, sichtbare Aktualisierung, Konfliktbehandlung, Original- und Verlaufslinks sowie leere, zukünftige und ungültige Wochen auf Desktop und Mobilgerät.

Lokaler Prüfstand: Lint, Typprüfung, Formatprüfung und Produktionsbuild erfolgreich. 183 Unit-/Komponententests, 120 Datenbanktests, zwölf betroffene private Browserfälle (Home und Wochenrückblick) sowie zwölf öffentliche Browserfälle bestanden, insgesamt 327. Die helle Desktopansicht und die dunkle mobile Ansicht wurden zusätzlich visuell geprüft. Ungültige Datumsadressen zeigen die vorhandene Nicht-gefunden-Seite; bei bereits begonnener Antwortübertragung kann der HTTP-Status dabei 200 bleiben. Die Tests prüfen die tatsächliche Fehleransicht und dass kein zusätzlicher Rückblick entsteht. Echte KI-Anfragen bleiben auf Nutzerwunsch ausgesetzt. Der verbleibende Umfang steht in [V1_STATUS.md](product/V1_STATUS.md).

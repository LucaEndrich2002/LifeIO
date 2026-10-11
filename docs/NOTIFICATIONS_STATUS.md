# LifeOS – In-App-Benachrichtigungen

Stand: 12.10.2026. Begrenztes Inkrement für R14 und Entscheidung O05. Der Wochenrückblick R13 bleibt unverändert; KI-Anfragen, E-Mail-/Push-Versand, Hintergrundjobs und Onlinebetrieb sind nicht Teil dieses Schritts.

## Bedienung und Auslöser

Die private Seite `/account/notifications` ist über „Hinweise“ in der Kontonavigation und „Benachrichtigungen öffnen“ auf Home erreichbar. „Hinweise prüfen“ wertet die eigenen Angaben ausdrücklich auf Klick aus. Öffnen, Vorladen, Filterwechsel und Neuladen lesen ausschließlich bereits gespeicherte Hinweise. Eine leere Liste bedeutet deshalb nicht, dass die aktuellen Angaben schon geprüft wurden.

O05 ist für diese V1-Ausprägung konkretisiert:

| Auslöser        | Regel und Ursprungsdatensatz                                                                                                                                                                                                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Budget          | Mindestens exakt 90 % Nutzung des eigenen Budgets im aktuellen Monat der Profilzeitzone. Variable Ausgaben und Budget stammen aus der gemeinsamen Money-Berechnung; keine Aufteilung in Wochen. Verweis auf diesen Finanzmonat.                                                                          |
| Aufgabe         | Vor dem aktuellen Profiltag fällig, noch offen und nicht entfernt. Aufgaben ohne Datum und erst heute fällige Aufgaben lösen nichts aus. Verweis auf die eigene Aufgabe.                                                                                                                                 |
| Ziel            | Zieltermin liegt vor dem aktuellen Profiltag und das Ziel ist noch nicht erreicht. Sparziele verwenden Startguthaben plus nicht stornierte Einzahlungen; persönliche Ziele benötigen mindestens einen und ausschließlich erledigte Meilensteine, um als erreicht zu gelten. Verweis auf das eigene Ziel. |
| Wochenrückblick | Für das eigene Konto gespeicherter Rückblick, auch aus früheren Wochen. Ein möglicher, aber noch nicht erstellter Rückblick ist kein Auslöser. Verweis auf die gespeicherte Woche.                                                                                                                       |

Sparprognosen vor Ablauf eines Zieltermins bleiben Hinweise auf Home. Die Benachrichtigungen erzeugen dafür keinen weiteren Auslöser.

Jeder eigene Ursprungsdatensatz erzeugt höchstens einen Hinweis. Dieser bewahrt Anlass, ursprüngliche Bezeichnung, Bewertungsdatum, Zeitzone und gegebenenfalls ganze EUR-Centwerte. Spätere Datenänderungen, erneute Fälligkeit, Budgetüberschreitung oder Aktualisierung eines Rückblicks erzeugen keinen zweiten Hinweis zu derselben Quelle und setzen ihn nicht wieder auf ungelesen. Eine spätere erneute Benachrichtigung würde eine eigene, hier nicht eingeführte Auslöseregel benötigen.

Die Oberfläche kennzeichnet den ursprünglichen Prüfzeitpunkt. Der Anlass ist keine Behauptung über den heutigen Zustand; Links führen zum aktuellen Original. Gelesen/ungelesen wird nur durch den jeweiligen Button gesetzt, nicht durch das Öffnen eines Links. Der Zustand bleibt nach Neuladen und erneuter Auswertung erhalten. Veraltete gegensätzliche Änderungen aus einem anderen Tab werden zurückgewiesen; gleichlautende Wiederholungen sind wirkungslos.

„Alle Hinweise“ und „Nur ungelesene“ haben vollständige Zählungen sowie stabile Seiten zu je 25 Einträgen, neueste zuerst. Ein Filterwechsel startet auf Seite 1; eine durch Statusänderung leere Folgeseite bietet die Rückkehr zur ersten Seite. Ausstehendes Speichern, Konflikte, Verbindungsfehler und leere Listen haben sichtbare Zustände. Bestehende Lade- und Fehlerseiten gelten weiter. Auf Desktop und Smartphone sind die Links und Aktionen per Tastatur erreichbar.

## Daten und Sicherheit

Die additive Migration `20261012090000_notifications.sql` ergänzt `notifications`. Ein Hinweis hat eine UUID, Eigentümer, einen von vier festen Typen, genau eine passende Quellenreferenz, versionierten Kontext, Bewertungs-/Erstellungszeit und Lesestatus mit Revision. Zusammengesetzte Fremdschlüssel erzwingen denselben Eigentümer für Aufgabe, Ziel, Budget beziehungsweise Wochenrückblick; eindeutige Indizes verhindern Duplikate auch bei parallelen Prüfungen.

RLS erlaubt ausschließlich eigenes Lesen, direkte Schreibrechte fehlen. `synchronize_notifications()` nimmt keine Eingaben entgegen: Identität, Datum und Zeitzone stammen aus Sitzung und Profil. `set_notification_read` validiert ID, gewünschte Leserichtung und Revision und verlangt den eigenen Datensatz. Beide prüfen abgeschlossenes Onboarding und verwenden dieselbe Profil-/Onboarding-Sperrreihenfolge wie Quelländerungen. `read_notifications` liest eigene Seite und Zählungen in einem gemeinsamen Snapshot. Keine Funktion nimmt freie Ziele, Texte, SQL oder Eigentümer vom Nutzer entgegen. Normale Anfragen verwenden keine privilegierten Schlüssel.

Entfernte Aufgaben löschen ihren Hinweis in derselben Transaktion über einen eng begrenzten Trigger. Physisches Löschen von Quellen oder des Kontos entfernt abhängige Hinweise über Fremdschlüssel. Die vorhandene Anwendung bietet derzeit insbesondere Aufgaben- und Budgetlöschung; dieses Inkrement führt keine neue Ziel- oder Rückblicklöschung ein. Es gibt keine automatische zeitliche Aufbewahrungsfrist; das gesamte Aufbewahrungs-/Löschkonzept bleibt Teil der Beta-Vorbereitung.

Es gibt keine neuen Abhängigkeiten, automatischen KI-Anfragen, Hintergrunddienste oder Benachrichtigungs-E-Mails. Die Migration benötigt keinen Datenbankreset.

## Prüfung

Unit-Prüfungen sichern gültige Filter/Seiten, explizite Leserichtung, typisierte lokale Links trotz fremder Inhalte, sichere EUR-Centgrenzen, die exakte 90-%-Schwelle und Wochen über Jahresgrenzen. Datenbanktests decken alle vier Auslöser, unveränderten Kontext, parallele Wiederholungen, dauerhaftes Lesen, gegensätzliche veraltete Formulare, vollständige Folgeseiten, Profilzeitzone, ausgeschlossene Quellen, Sparziel-Einzahlungen/Stornierung, Löschkaskaden und eigene/fremde/anonyme/unvollständige Konten ab. Browserfälle prüfen dieselben sichtbaren Abläufe und Quellenlinks mit Desktop und Mobilgerät.

Lokaler Prüfstand: Lint, Typprüfung, Formatprüfung und Produktionsbuild erfolgreich. 187 Unit-/Komponententests, 127 Datenbanktests, 20 betroffene private Browserfälle (Hinweise, Home und Wochenrückblick) und zwölf öffentliche Browserfälle bestanden, insgesamt 346. Die abschließend angepasste Home-Linkanordnung wurde erneut mit den sechs Home-Browserfällen geprüft. Die helle Desktopansicht und die dunkle mobile Hinweisliste wurden zusätzlich visuell geprüft. Lokale Vorschau erreichbar, synthetische Testkonten entfernt. Echte KI-Anfragen bleiben auf Nutzerwunsch ausgesetzt. Restumfang: [V1_STATUS.md](product/V1_STATUS.md).

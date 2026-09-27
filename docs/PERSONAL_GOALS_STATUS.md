# Persönliche Ziele ohne Geldbetrag

## Umfang und Abnahme

Das persönliche Goals-Inkrement setzt den nichtfinanziellen Teil von R07 um. Unter `/account/goals` wechseln Nutzer zwischen Sparzielen und persönlichen Zielen. Persönliche Ziele lassen sich mit Namen und optionalem Zieldatum anlegen und bearbeiten. Die vorhandene Meilenstein-Verwaltung liefert ihren Fortschritt einschließlich Erledigen, Wiederöffnen und bestätigtem Entfernen einzelner Schritte.

- Namen enthalten nach Trimmen 1–80 Unicode-Zeichen. Ein Zieldatum ist optional und muss ein realer Kalendertag zwischen 2000 und 2100 sein. Es wird ohne Zeitzonenverschiebung dargestellt; ein vergangenes Datum ist zulässig. Ohne Datum erscheint kein erfundener Termin.
- Persönliche Ziele enthalten weder Zielbetrag noch Startguthaben, Sparrate oder Währung. Sie besitzen keine Finanzprognose oder Einzahlungen. Geldfelder sind auch in der Datenbank `NULL`, keine künstlichen Null-Euro-Beträge.
- Der Fortschritt ergibt sich ausschließlich aus den vorhandenen, gleich gewichteten Meilensteinen. Ohne Meilensteine erscheint keine Prozentzahl. Vollständige Meilensteine bedeuten 100 % dieser Schritte; es gibt keinen zusätzlichen automatisch gesetzten Zielstatus.
- Beide Zielarten haben getrennte Listen mit jeweils 25 Einträgen pro Seite, neuesten zuerst und ID als stabilem Gleichstandsmerkmal. Der gewählte Bereich bleibt beim Blättern erhalten. Neue persönliche Ziele führen direkt in ihre Detailansicht.
- Wiederholtes Anlegen mit derselben Formular-ID erzeugt keinen doppelten Eintrag. Gleichzeitige Änderungen werden mit einer Revision erkannt; bei Konflikten bleiben Formulareingaben erhalten. Die Zielrevision bleibt unabhängig von Meilensteinänderungen.
- Die Oberfläche enthält Lade-, Fehler- und Leerzustände, beschriftete Eingaben, Tastaturbedienung sowie mobile Ansichten. Eine bestehende Anmeldung und abgeschlossene Einrichtung bleiben Voraussetzung; die finanziellen Angaben können in der Einrichtung ausgelassen werden.

Zielarten lassen sich nicht nachträglich ineinander umwandeln. Löschen/Archivieren ganzer Ziele, eigenständige Aufgaben, Kalender, Erinnerungen, Modulverknüpfungen und KI bleiben eigene Schritte. Phase 5 ist damit nicht insgesamt abgeschlossen.

## Daten und Zugriffsgrenzen

Die additive Migration `20260927120000_personal_goals.sql` erweitert die bestehende Tabelle `goals` um `kind`. Alle vorhandenen Ziele behalten den Typ `financial` und ihre Beträge. Ein Constraint verlangt vollständige Geldfelder bei Sparzielen und ausschließlich fehlende Geldfelder sowie keinen Onboarding-Slot bei persönlichen Zielen. Ein Index unterstützt die gefilterten Listen. Ein Datenbankreset ist nicht nötig.

`mutate_personal_goal` prüft Anmeldung, abgeschlossenes Onboarding, Eigentümer, Zielart, Namen, Kalenderdatum und Revision. Die Sperrreihenfolge Profil → Onboarding → Ziel entspricht den bestehenden Operationen. Die Funktion hat einen leeren Suchpfad und explizite Ausführungsrechte nur für angemeldete Nutzer. Direkte Tabellen-Schreibrechte bleiben gesperrt; bestehende Eigentümer-RLS gilt unverändert. Normale App-Anfragen nutzen ausschließlich den sitzungsgebundenen Client.

Die finanziellen Mutationen verweigern persönliche Ziele einschließlich manipuliertem Erfassungsaufruf mit einer vorhandenen persönlichen ID. `read_goal` liefert nur finanzielle Ziele. Die Money-Abfrage zählt und plant ausschließlich finanzielle Ziele; persönliche Ziele erzeugen keine Sparrate. Die Onboarding-Ansicht wählt ausdrücklich ihren ursprünglichen finanziellen Slot. Bereits veröffentlichte Migrationen wurden nicht verändert.

Persönliche Ziele verwenden dieselben Meilensteintabellen, Eigentümer-Fremdschlüssel, Rechte und Zählregeln. Dadurch existiert kein zweites Fortschrittsmodell. Nur die Erläuterungen der Oberfläche richten sich nach der Zielart. Serverseitige Routen bestimmen die Zielart aus dem eigenen gespeicherten Datensatz; ein Query-Parameter kann sie nicht ersetzen. Finanzformulare werden für persönliche Ziele abgewiesen.

## Prüfung

Vier neue Unit-Tests prüfen Unicode-Namen, reale optionale Daten, Mutationseingaben und die unveränderte Darstellung von Kalendertagen an Sommerzeitgrenzen. Sechs neue Integrationstests decken fehlende Geldwerte, unveränderte vollständige Money-Snapshots, verbotene Finanzoperationen, Wiederholungen, konkurrierende Bearbeitungen, gemeinsame Meilensteine, fremde Nutzer, direkte/anonyme Schreibversuche, unvollständige Einrichtung, Eingabegrenzen und Seitennavigation ab.

Drei neue Browserabläufe laufen jeweils auf Desktop und Smartphone: Anlage und Bearbeitung ohne Geldfelder mit persistentem Meilenstein-Fortschritt; Konflikte und Zugriffsschutz; getrennte Zielarten und Seitennavigation. Die öffentlichen Navigationstests prüfen die aktualisierte Bezeichnung „Private Ziele öffnen“. Alle bisherigen Finanz-, Prognose- und Meilenstein-Tests bleiben aktiv.

Stand 27.09.2026: Alle 207 lokalen Tests sind erfolgreich (108 Unit-, 43 Integrations-, 44 private und 12 öffentliche Browsertests). Lint, Typprüfung, Produktionsbuild, Formatprüfung und Diff-Prüfung sind ebenfalls erfolgreich. Die Zielansicht wurde am Desktop im hellen und am Smartphone im dunklen Design visuell geprüft. Nach den privaten Tests waren keine Testkonten mehr vorhanden. Der Review umfasst Umfang, Zugriffsrechte, Finanztrennung, Typen und unveränderte Abhängigkeiten. GitHub führt dieselben Prüfungen mit einer frisch migrierten Datenbank aus.

Beim ersten öffentlichen Windows-Testlauf blieb der separate Testserver nach zwölf erfolgreichen Fällen beim Beenden hängen. Nach gezieltem Beenden dieses Prozesses schloss der Runner erfolgreich ab. Ein vollständiger erneuter Lauf außerhalb der eingeschränkten Ausführungsumgebung beendete sich einschließlich automatischem Aufräumen erfolgreich in 11,5 Sekunden; Prüfungen und Konfiguration wurden nicht abgeschwächt.

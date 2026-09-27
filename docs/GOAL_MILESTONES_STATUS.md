# Meilensteine für Sparziele

## Begrenzter Umfang

Bestehende finanzielle Ziele erhalten unter `/account/goals/[id]` eigene Meilensteine. Nutzer können benannte Schritte anlegen, umbenennen, als erledigt markieren, wieder öffnen und nach sichtbarer Bestätigung entfernen. Persönliche Ziele ohne Geldbetrag, eigenständige Tasks, Terminplanung, Reihenfolge per Drag-and-drop und Verknüpfungen zwischen Modulen bleiben eigene Schritte. R07 und Phase 5 sind nicht insgesamt abgeschlossen.

## Regeln und Abnahme

- Ein Meilenstein gehört genau einem Ziel desselben Eigentümers und besitzt einen Namen mit 1–80 Unicode-Zeichen. Oberfläche und Datenbank trimmen dieselben Leerzeichen; leere Namen, ungültige IDs und Revisionen werden abgewiesen.
- Alle aktiven Meilensteine zählen gleich. Die Anzeige nennt erledigte und gesamte Anzahl sowie einen gerundeten Fortschrittsbalken. Ohne Meilensteine erscheint ein Leerzustand ohne erfundene Prozentzahl. Zählungen umfassen alle Seiten.
- Dieser Fortschritt ist ausdrücklich von tatsächlichem Sparstand und Prognose getrennt. Meilensteine erzeugen keine Einzahlung, verändern keine Sparrate, Finanzrevision oder Monatsrechnung und markieren das finanzielle Ziel nicht automatisch als erreicht.
- Neueste Meilensteine stehen zuerst; bei gleichen Erstellungszeitpunkten entscheidet die ID. Seiten enthalten höchstens 25 Einträge. Statusänderungen behalten die gewählte Seite. Nach Entfernen des letzten Eintrags einer Folgeseite bleibt ein Rückweg zur vorherigen Seite sichtbar. Neue Einträge sind auf der ersten Seite direkt erreichbar.
- Umbenennen erhält den Erledigt-Status. Erledigen und Wiederöffnen senden einen gewünschten Zustand statt eines blinden Umschaltens. Wiederholte Erfassung mit derselben Formular-ID erzeugt keinen zweiten Eintrag. Veraltete konkurrierende Änderungen werden abgewiesen und die Formulareingaben bleiben erhalten.
- Entfernen verlangt eine Checkbox-Bestätigung auf einer eigenen Ansicht mit dem konkreten Namen. Der Eintrag verschwindet aus Liste und Zählung. Intern bleibt eine `removed_at`-Markierung erhalten, damit verspätete Wiederholungen alter Erfassungsanfragen den entfernten Eintrag nicht wiederherstellen. Es gibt in diesem Inkrement keine Wiederherstellungsfunktion. Beim Löschen des zugehörigen Nutzers greift die bestehende Löschkaskade einschließlich entfernter Einträge.
- Formulare zeigen Lade- und Fehlerzustände, deaktivieren doppelte Abgaben während des Speicherns und bieten Abbrechen bzw. einen Link zum aktuellen Stand. Beschriftete Buttons, Tastaturbedienung und Smartphone-Ansichten gehören zur Abnahme.

## Daten und Sicherheit

Die additive Migration `20260927090000_goal_milestones.sql` erstellt `goal_milestones` mit zusammengesetztem Eigentümer-/Ziel-Fremdschlüssel, Revision und Erstellungs-, Erledigungs- und Entfernungszeitpunkten. Bestehende Ziele und Finanzdaten werden nicht geändert; ein Reset ist nicht nötig.

RLS erlaubt nur das Lesen eigener, nicht entfernter Meilensteine. Direkte Schreibrechte und anonymer Zugriff sind gesperrt. `mutate_goal_milestone` hat einen leeren Suchpfad, verlangt verifizierte Nutzerrechte, abgeschlossenes Onboarding und ein eigenes Ziel, validiert Namen/Operation/Revision und schreibt atomar. Die Sperrreihenfolge Profil → Onboarding → Ziel → Meilenstein entspricht den bestehenden Mutationen. Eigene Meilensteinrevisionen verhindern unnötige Konflikte mit Finanzformularen. Benutzerwerte bestimmen niemals den Eigentümer.

`read_goal_milestones` verwendet Invoker-Rechte und einen gemeinsamen SQL-Snapshot für Liste und Gesamtzählungen. Eine fremde Ziel-ID liefert keine Daten. Die neue Formularroute prüft Ziel und Meilenstein gemeinsam; Query-Parameter können diese Route-IDs nicht ersetzen. Server Actions verwenden ausschließlich den normalen sitzungsgebundenen Client und prüfen die Entfernen-Bestätigung. Sensible Inhalte werden nicht geloggt.

Reine Regeln liegen in `src/domain/milestones.ts`, Zugriff und Aktionen in `src/server/milestones.ts` und `milestone-actions.ts`, Oberfläche in `src/features/goals`. Routen bleiben dünn. Statusknöpfe und Formulare benötigen Client-Interaktion; Zielansicht, Zusammenfassung und Listen bleiben Server Components. Der private Kontobereich stellt die übrigen Lade-/Fehlerzustände und Cache-Grenzen bereit. Neue Abhängigkeiten sind nicht erforderlich.

## Prüfung

Fünf neue Unit-Fälle prüfen Namen einschließlich Unicode, echte Leerzustände, Rundung, gültige Formularmetadaten und vollständige Zählungen. Sechs Integrationstests prüfen CRUD, Wiederholungen, Konkurrenz, entfernte Einträge, 28 Einträge über zwei Seiten, fremde Nutzer/Ziele, direkte Schreibversuche, anonyme Zugriffe und unveränderte Finanzdaten. Drei neue Browserabläufe laufen jeweils auf Desktop und Smartphone: Verwaltung und bestätigtes Entfernen, Konflikte/Zugriffsschutz sowie Folgeseiten und neue Einträge. Bestehende Sparziel- und Prognosefälle bleiben aktiv.

Stand 27.09.2026: Alle 191 lokalen Tests sind erfolgreich (104 Unit-, 37 Integrations-, 38 private und 12 öffentliche Browsertests). Lint, Typprüfung, Produktionsbuild und Formatprüfung sind ebenfalls erfolgreich. Die Meilensteinansicht wurde am Desktop im hellen und am Smartphone im dunklen Design visuell geprüft. Der Diff wurde auf Umfang, Zugriffsrechte, Typen, Abhängigkeiten und Konfiguration geprüft; nach den privaten Browsertests waren keine Testkonten mehr vorhanden. Der bestehende GitHub-Prüflauf führt dieselben Tests mit einer frisch migrierten Datenbank aus.

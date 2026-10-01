# Ziele mit Aufgaben und Terminen verbinden

## Begrenzter Umfang

Dieses Inkrement ergänzt R10 um Goal → Task (`requires`) und Goal → CalendarEvent (`scheduled_as`). Sparziele und persönliche Ziele können vorhandene eigene Aufgaben und Termine zuordnen. Zusammen mit `funded_by` sind die drei vorgesehenen V1-Beziehungen umgesetzt; Aufgaben, Kalender und Goal-Links decken den funktionalen Umfang von Phase 6 ab. Home, KI, Erinnerungen und optionale Onboarding-Aufgaben werden in diesem Schritt nicht begonnen.

## Regeln und Abnahme

- Jedes bestehende Ziel bietet getrennte Aufgaben- und Terminlisten. Die Auswahl zeigt eigene aktive Einträge mit aktuellem Titel, Aufgabenstatus/Priorität/Fälligkeit beziehungsweise Terminen in der Profilzeitzone. Aufgaben ohne Datum und erledigte Aufgaben bleiben auffindbar; vergangene Termine sind ebenfalls zuordenbar. Die Sortierung ist jeweils neueste Erfassung zuerst mit ID als Gleichstandsmerkmal.
- Vor dem Verknüpfen werden Ziel und konkreter Endpunkt angezeigt. Bereits zugeordnete Paare zeigen ihren Status statt eines zweiten Erfassungsbuttons. Keine automatische Erzeugung von Aufgaben oder Terminen; leere Auswahllisten führen zur jeweiligen Anlage.
- Sowohl Auswahl als auch beide Listenrichtungen zeigen maximal 25 Einträge je Seite, mit vollständiger Anzahl aus derselben Listenabfrage. Aufgaben-/Terminansichten führen über „Verknüpfte Ziele“ zurück zu den aktuellen Zieldetails. Umbenennungen, Erledigen/Wiederöffnen und Terminänderungen werden aus den Endpunkten gelesen, nicht in Links kopiert.
- Die Beziehung dient als Planungskontext. Weder Zuordnen noch Erledigen einer verknüpften Aufgabe verändert automatisch Ziel-Fortschritt, Sparstand, Meilensteine oder Geldbeträge. Fortschritt wird weiterhin über die bestehenden Meilensteine beziehungsweise Einzahlungen erfasst.
- Entfernen benötigt eine konkrete Zusammenfassung und eine serverseitig geprüfte Checkbox. Nur die Zuordnung wird entfernt; beide Endpunkte bleiben bestehen. Der Rückweg bewahrt die aufrufende Seite (Ziel oder Aufgabe/Termin) und deren Seitenzahl. Leere Folgeseiten behalten eine Zurück-Navigation. Nach Erfassung erscheint die erste Verknüpfungsseite des Ziels; Abbrechen der Auswahlbestätigung kehrt zur gewählten Auswahlliste zurück.
- Identische Wiederholungen mit derselben ID sind idempotent. Unterschiedliche gleichzeitige IDs für dasselbe Paar erzeugen höchstens eine aktive Zuordnung. Entfernte IDs werden nicht wiederverwendet. Eine bewusste erneute Zuordnung erhält eine neue ID; verspätete alte Entfernen-Anfragen können sie nicht lösen.
- Das Entfernen einer Aufgabe oder eines Termins markiert alle zugehörigen Links in derselben Transaktion als entfernt. Physisches Löschen von Endpunkten oder Konten räumt Links per Fremdschlüssel auf. Gleichzeitige Erfassung und Endpunktlöschung können keinen aktiven verwaisten Link hinterlassen.
- Anmeldung, abgeschlossene Einrichtung, eigene Endpunkte und gültige Typen/IDs sind erforderlich. Routen übernehmen IDs und Beziehungstyp ausdrücklich aus Pfadparametern. Fremde, entfernte und ungültige Endpunkte geben keine persönlichen Inhalte zurück. Loading-/Error-Grenzen des Kontobereichs, konkrete Leerzustände, korrigierbare Formularfehler, Tastaturbedienung und responsive Darstellung bleiben erhalten.

## Datenmodell und Sicherheit

`20260930190000_goal_plan_links.sql` erweitert die bestehende Tabelle `entity_links` additiv. `budget_id` wird optional; `task_id` und `calendar_event_id` kommen hinzu. Der CHECK verlangt genau die zum Beziehungstyp passende Referenz. Alle Endpunkte sind durch zusammengesetzte Fremdschlüssel mit demselben Eigentümer verbunden. Eigene partielle Unique-Indizes verhindern aktive doppelte Aufgaben-/Terminpaare. Vorherige Budget-Links, Tabellenrechte und RLS bleiben erhalten.

`mutate_goal_plan_link` verwendet einen leeren Suchpfad und explizite Ausführungsrechte, prüft Identität, Einrichtung, Eigentümerschaft, Typ und unveränderliche Endpunkte. Die Sperrreihenfolge Profil → Onboarding → Ziel → Aufgabe/Termin → Link verwendet denselben Onboarding-Mutex wie die Endpunktmutationen. Zwei eng begrenzte Trigger verbergen Links beim Soft-Delete; ihre Funktion hat keine Ausführungsrechte für normale Benutzer. Physische Löschkaskaden zeigen ausschließlich auf Links.

Der bestehende Budget-RPC prüft jetzt zusätzlich `funded_by` und vergleicht Endpunkte NULL-sicher. Auch die Budget-Entfernungsseite filtert den Beziehungstyp. Ein Budgetformular kann dadurch keine Aufgaben-/Terminzuordnung verändern und umgekehrt. Normale Anfragen verwenden den sitzungsgebundenen Supabase-Client, niemals einen Service-Schlüssel. Die neuen Servermodule sind mit `server-only` markiert; Domain-Regeln bleiben unabhängig von Framework und Datenbank.

Die Umsetzung ergänzt dünne Routen und Featureansichten, verwendet bestehende Aufgaben-/Terminregeln und gemeinsame Seitennavigation. Neue Abhängigkeiten oder Konfigurationsänderungen sind nicht nötig. Finanzberechnungen und frühere Migrationen werden nicht verändert.

## Prüfung

Drei neue Unit-Tests prüfen typisierte Eingaben, begrenzte Seiten, erlaubte lokale Rückkehrpfade und konsistente Endpunkt-/Seitenmodelle. Neun neue Integrationstests prüfen beide Endpunkttypen und Zielarten, unveränderte Daten/Finanzwerte, Duplikate, Wiederholungen, erneute Zuordnung, fremde/anonyme/unvollständige Zugriffe, falsch zugeordnete Link-IDs, paralleles Löschen sowie mehr als 25 Einträge in beiden Richtungen.

Fünf neue Browserabläufe laufen auf Desktop und Smartphone: beide Endpunkttypen verknüpfen, beidseitig navigieren und bestätigt entfernen; Auswahl und beide Listen vollständig durchblättern; veraltete Formulare, gelöschte/fremde Endpunkte, manipulierte Pfad-/Query-Kombinationen und anonyme Zugriffe abweisen.

Lokale Abnahme am 01.10.2026: Lint, Typecheck, Formatprüfung und Produktionsbuild erfolgreich; 127 Unit- und 72 Integrationstests bestanden. Der vollständige private Browserlauf bestand 72 von 74 Fällen, einschließlich aller zehn neuen Fälle; der vorhandene Kalender-Anlage-/Löschablauf erreichte auf beiden Bildschirmgrößen das Zeitlimit. Die gezielte Wiederholung aller Kalender- und neuen Verknüpfungsabläufe bestand anschließend 18 von 18 Fällen ohne Änderungen an Assertions oder Zeitlimits. Alle zwölf öffentlichen Browsertests bestanden im abschließenden Lauf; ein zuvor fehlgeschlagener mobiler Tastaturtest ließ sich dabei nicht reproduzieren. Ein anfänglicher paralleler Datenbanklauf hatte drei Zeitüberschreitungen in bestehenden Meilensteintests; der vollständige sequenzielle Lauf bestand alle 72 Fälle.

Desktopansichten im hellen Design und Smartphoneansichten im dunklen Design wurden anhand der Browseraufnahmen geprüft, einschließlich schmaler Listen und horizontalem Überlauf. Die additive Migration ist lokal angewandt, ohne vorhandene Daten zurückzusetzen. Die CI führt insgesamt 285 Tests auf einer frisch eingerichteten Datenbank aus; ihr Ergebnis wird im zugehörigen Pull Request dokumentiert.

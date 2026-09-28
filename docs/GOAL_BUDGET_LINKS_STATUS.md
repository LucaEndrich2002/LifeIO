# Ziele mit Monatsbudgets verknüpfen

## Begrenzter Umfang

Dieser Schritt ergänzt den Goal → Budget-Teil von R10 in Phase 5. Sowohl Sparziele als auch persönliche Ziele können mit vorhandenen eigenen Monatsbudgets verknüpft werden. Die Zielansicht zeigt die zugeordneten Budgets und führt zur passenden Money-Monatsübersicht. Ein Monatsbudget bietet umgekehrt eine Liste seiner verknüpften Ziele. Aufgaben, Kalender und weitere Beziehungstypen folgen in eigenen Schritten; R10 und Phase 5 werden nicht insgesamt als abgeschlossen bezeichnet.

## Regeln und Abnahme

- Nutzer wählen einen Budgetmonat zwischen Januar 2000 und Dezember 2100. Ohne Budget erscheint ein echter Leerzustand mit Weg zur Budgetanlage; es wird kein Budget automatisch erstellt. Die Voreinstellung folgt der Profilzeitzone.
- Die Oberfläche zeigt vor dem Verknüpfen Ziel, Budgetname, Monat und aktuelles Monatslimit. Bereits bestehende Zuordnungen bieten keinen zweiten Erfassungsbutton. Wiederholte Abgabe derselben Formular-ID ist sicher; konkurrierende neue IDs für dieselben Endpunkte erzeugen höchstens eine aktive Verknüpfung.
- Das bestehende Monatsbudget umfasst alle variablen Ausgaben. Die Beziehung `funded_by` ist in diesem Inkrement ausschließlich Planungskontext: Sie reserviert keinen Teilbetrag, erzeugt keine Einzahlung und verändert weder Zielstand noch Sparrate, Monatsrechnung, Budgetlimit oder Budgetverbrauch. Diese Bedeutung steht sichtbar in Auswahl und Übersichten.
- Beide Richtungen zeigen jeweils 25 Verknüpfungen pro Seite, neueste zuerst mit ID als Gleichstandsmerkmal, und eine vollständige Anzahl. Aktuelle Namen und Budgetlimits stammen aus den Endpunkten, nicht aus kopierten Werten.
- Entfernen erfolgt auf einer Ansicht mit den konkreten Endpunkten und einer serverseitig geprüften Checkbox. Ziel und Budget bleiben erhalten. Die zuletzt gewählte Seite bleibt geöffnet; nach Entfernen ihres letzten Eintrags führt die Navigation zurück zur vorherigen Seite.
- Entfernte Verknüpfungen sind unsichtbar und behalten intern ihre ID, damit verspätete Wiederholungen alter Erfassungsanfragen sie nicht wiederherstellen. Eine bewusst neu angelegte Zuordnung erhält eine neue ID; eine alte Entfernen-Anfrage kann sie nicht lösen.
- Beim Löschen eines Budgets werden ausschließlich seine Verknüpfungen mit entfernt. Ziele bleiben bestehen. Das Löschen eines Ziels oder Nutzerkontos räumt zugehörige Verknüpfungen ebenfalls auf. Es bleiben keine nutzbaren Verweise auf gelöschte Endpunkte zurück.
- Normale Nutzer benötigen Anmeldung und abgeschlossene Einrichtung. Fremde Endpunkte und Verknüpfungen sowie ungültige IDs, Monate und Seiten sind nicht zugänglich. Lade-, Fehler- und Leerzustände, Tastaturzugang und Smartphone-Darstellung gehören zur Abnahme.

## Datenmodell und Sicherheit

`20260928090000_goal_budget_links.sql` ergänzt `budgets_owner_id` und die erste konkrete `entity_links`-Tabelle. Sie verwendet typisierte `goal_id`-/`budget_id`-Referenzen statt freier polymorpher IDs. Zusammengesetzte Fremdschlüssel auf `(user_id,id)` erzwingen vorhandene Endpunkte desselben Eigentümers. `relationship` erlaubt ausschließlich `funded_by`; zukünftige Typen werden erst bei tatsächlicher Implementierung ergänzt. Der eindeutige Index über aktive Eigentümer-/Endpunkt-/Beziehungspaare verhindert Duplikate. Zwei weitere Indizes unterstützen die beidseitigen Listen.

Eigentümer-RLS erlaubt nur das Lesen aktiver eigener Verknüpfungen. Direkte Schreibrechte sowie anonymer Zugriff sind entzogen. `mutate_goal_budget_link` verwendet einen leeren Suchpfad, explizite Ausführungsrechte, `auth.uid()` und prüft Ziel und Budget erneut. Seine Sperrreihenfolge Profil → abgeschlossenes Onboarding → Ziel → Budget → Verknüpfung serialisiert insbesondere Verknüpfung und Budgetlöschung über dieselbe Onboarding-Zeile. Löschkaskaden zeigen von Endpunkten ausschließlich auf Verknüpfungen, niemals umgekehrt.

Server Actions nutzen den normalen sitzungsgebundenen Client, validieren feste Operationen und IDs und prüfen die Entfernen-Bestätigung. Routen übernehmen IDs ausdrücklich aus den Pfadparametern; Query-Parameter können sie nicht ersetzen. Die serverseitigen Lesezugriffe verbinden beide RLS-geschützten Tabellen und lesen genaue Zählungen. Endpunkt-Bearbeitungsrevisionen werden durch Verknüpfungen nicht verändert. Migrationen aus früheren Schritten, Abhängigkeiten und Konfiguration bleiben unverändert; ein Datenbankreset ist nicht nötig.

## Prüfung

Drei neue Unit-Tests prüfen Mutationseingaben, begrenzte Rückkehrseiten, typisierte Budgetwerte und konsistente Seitenzählungen. Sechs neue Integrationstests prüfen beide Zielarten, unveränderte Finanz-Snapshots, Wiederholungen, konkurrierende Duplikate, sichere Entfernung und erneute Zuordnung, Nutzertrennung, direkte und anonyme Zugriffe, unvollständige Einrichtung, parallele Budgetlöschung sowie 26 Einträge in jeder Listenrichtung.

Drei neue Browserabläufe laufen jeweils auf Desktop und Smartphone: Auswahl/Leerzustand, Verknüpfung beider Zielarten, Navigation in beide Richtungen, bestätigtes Entfernen und Budgetlöschung; veraltete Formulare und Zugriffsschutz; beidseitige Folgeseiten mit Rückweg nach Entfernen des letzten Eintrags. Alle bisherigen Finanz-, Ziel- und Meilensteinprüfungen bleiben aktiv.

Stand 28.09.2026: Alle 222 lokalen Tests sind erfolgreich (111 Unit-, 49 Integrations-, 50 private und 12 öffentliche Browsertests). Lint, Typprüfung, Produktionsbuild, Formatprüfung und Diff-Prüfung sind ebenfalls erfolgreich. Die Verknüpfungsansicht wurde am Desktop im hellen und am Smartphone im dunklen Design visuell geprüft; der Browsercheck prüft zusätzlich fehlenden horizontalen Überlauf und Tastaturbedienung. Die aktualisierte lokale Vorschau antwortet erfolgreich.

Die Browserabnahme hat einen doppelten URL-Anker beim Zurücknavigieren zu einer bereits besuchten Zielseite aufgedeckt. Die neuen Verweise auf Ziel- und Budgetabschnitte verwenden deshalb reguläre Seitennavigation; die Tests prüfen weiterhin die exakte Zieladresse. Ein veraltetes Formular wird erst nach vollständig geladener Budgetauswahl simuliert, damit die Prüfung tatsächlich die spätere Löschung und nicht einen noch laufenden Seitenaufruf trifft. Der vollständige erneute Browserlauf war erfolgreich. Zwei Restkonten des abgebrochenen ersten Formularchecks wurden anhand ihrer IDs und Testdaten gezielt entfernt; anschließend waren keine Testkonten mehr vorhanden.

Der Review umfasst Umfang, Eigentümerprüfung, RLS, konkurrierende Änderungen, unveränderte Finanzwerte, Typen und unveränderte Abhängigkeiten. GitHub führt dieselben Prüfungen mit einer frisch migrierten Datenbank aus.

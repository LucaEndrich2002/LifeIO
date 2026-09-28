# Aufgabenverwaltung – erster Plan-Schritt

## Begrenzter Umfang

Dieses Inkrement setzt R08 um: eigene Aufgaben mit Titel, Priorität, optionaler Fälligkeit, Erledigen, Wiederöffnen, Bearbeiten und bestätigtem Löschen. `/account/plan` bietet offene und erledigte Listen mit den Ansichten Alle, Tag, Woche und Ohne Datum. Die öffentliche Plan-Seite führt zur privaten Verwaltung; auch Money und Goals bieten einen Einstieg.

Kalenderereignisse, Goal–Task-Verknüpfungen, wiederkehrende Aufgaben, Erinnerungen und der optionale Aufgaben-Schritt im Onboarding bleiben eigene Inkremente. Phase 6 und R10 sind deshalb nicht insgesamt abgeschlossen. Es gibt keine KI-Anbindung oder Änderungen an Finanzberechnungen.

## Regeln und Abnahme

- Titel werden wie bei persönlichen Zielen um Unicode-Leerzeichen bereinigt und auf 1–80 Unicode-Zeichen begrenzt. Prioritäten sind Hoch, Normal und Niedrig; Normal ist die Voreinstellung.
- Eine Fälligkeit ist ein optionaler Kalendertag zwischen 2000 und 2100 ohne Uhrzeit. Eine Änderung der Profilzeitzone verschiebt gespeicherte Tage nicht. „Heute“ und die voreingestellte Tages-/Wochenansicht folgen der Profilzeitzone. Wochen beginnen montags und enden einschließlich Sonntag; Jahreswechsel und Sommerzeit ändern diese Regel nicht.
- Alle zeigt auch Aufgaben ohne Datum. Ohne Datum findet sie gesondert; Tag und Woche enthalten ausschließlich passende Fälligkeiten. Offene Aufgaben vor dem tatsächlichen heutigen Profiltag erhalten zusätzlich den Text „Überfällig“. Erledigte Aufgaben sind ausschließlich in der erledigten Liste sichtbar und können wieder geöffnet werden.
- Listen sind nach Fälligkeit aufsteigend, danach Priorität und stabiler ID sortiert. Aufgaben ohne Datum stehen am Ende. Je Seite erscheinen maximal 25 Aufgaben; die Anzahl umfasst den vollständigen gewählten Filter. Liste und Anzahl werden in einem Datenbanksnapshot gelesen.
- Bearbeiten, Statuswechsel und Löschen erhalten Filter, Bezugstag und Seite. Wenn der letzte Eintrag einer Folgeseite verschwindet, bleibt der Rückweg erhalten. Nach Erfassung öffnet sich die erste Seite aller offenen Aufgaben. Filterwechsel setzen die Seite zurück; Aufgaben ohne Datum erhalten keine künstliche Fälligkeit.
- Parallele Änderungen werden über Revisionen erkannt. Ein veraltetes Formular behält seine Eingaben und bietet den aktuellen Stand an. Wiederholtes Erledigen und Wiederöffnen setzt einen gewünschten Zustand und schaltet ihn nicht blind um. Eine alte Statusänderung darf eine spätere gegenteilige Entscheidung nicht überschreiben.
- Löschen benötigt in der Oberfläche eine konkrete Aufgabe und eine serverseitig geprüfte Bestätigung. Die Aufgabe ist danach aus Listen und Detailzugriffen entfernt. Ihre interne ID bleibt als Löschmarkierung erhalten, damit eine verspätete Erfassungsanfrage sie nicht wiederherstellt; eine Wiederherstellung ist hier nicht vorgesehen. Kontolöschung entfernt diese Datensätze über den Eigentümer-Fremdschlüssel.
- Anmeldung und abgeschlossene Einrichtung sind für die Oberfläche und die Anwendungs-RPCs erforderlich. Fremde oder entfernte IDs sowie ungültige Filter, Tage und Seiten zeigen keine persönlichen Inhalte. Lade-, Fehler- und Leerzustände verwenden die vorhandenen Kontobereichsgrenzen und konkrete Formularmeldungen.

## Daten und Architektur

Die additive Migration `20260928120000_tasks.sql` ergänzt ausschließlich `tasks`, Eigentümer-RLS, Listenindex und die Funktionen `mutate_task`/`read_tasks`. Frühere Migrationen und bestehende Nutzerdaten bleiben unverändert. Direkte Schreibrechte und anonyme Zugriffe sind gesperrt. Der Security-Definer-Mutationspfad hat einen leeren Suchpfad, explizite Ausführungsrechte und prüft Identität, Einrichtung, Eigentümer, Eingaben und Revision. Er verwendet die vorhandene Sperrreihenfolge Profil → Onboarding → eigener Datensatz. `read_tasks` ist Security Invoker; sowohl Liste als auch Zählung unterliegen RLS.

Reine Regeln und Datumsdarstellung liegen in `src/domain/tasks.ts`, autorisierte Zugriffe in `src/server/tasks.ts` und `task-actions.ts`. Die dünnen Routen übernehmen IDs ausdrücklich aus Pfadparametern. Featureansichten liegen in `src/features/plan`, nur interaktive Formulare sind Client Components. Der bestehende Kontozugriff wird wiederverwendet; normale Nutzeranfragen verwenden keinen Service-Schlüssel. Abhängigkeiten und Konfiguration bleiben unverändert.

## Prüfung

Sechs neue Unit-Tests decken Unicode-Titel, Eingabegrenzen, Mutations- und Filterregeln, Wochen über Jahreswechsel/Schaltjahr/Sommerzeit, Profilzeitzonen, Überfälligkeit, lokale Rückkehradressen und Seitenzählungen ab. Sieben neue Integrationstests prüfen vollständige Mutationen, unveränderte Finanzwerte, Wiederholungen, konkurrierende Bearbeitungen, veraltete Status-/Löschanfragen, direkte und anonyme Zugriffe, fremde Nutzer, unvollständige Einrichtung, serverseitige Validierung, Wochen-/Tagesgrenzen, Sortierung und mehr als 25 Aufgaben.

Drei neue Browserabläufe laufen auf Desktop und Smartphone: Tastaturerfassung mit Validierung, Bearbeiten, Erledigen, Wiederöffnen und bestätigtes Löschen; veraltete Formulare und Zugriffsschutz; Filter, vollständige Folgeseiten und Profilzeitzone. Der öffentliche Navigationstest prüft den neuen Plan-Einstieg.

Stand 28.09.2026: Die Suite umfasst 241 erfolgreich geprüfte Fälle: 117 Unit-, 56 Integrations-, 56 private und 12 öffentliche Browsertests. Lint, Typprüfung, Produktionsbuild, Format- und Diff-Prüfung sind erfolgreich. Desktop im hellen und Smartphone im dunklen Design wurden visuell geprüft; Tastaturbedienung und fehlender horizontaler Überlauf sind zusätzlich Teil der Browserprüfung. Nach den Tests sind keine Testkonten mehr vorhanden, die aktualisierte lokale Vorschau antwortet erfolgreich.

Im vollständigen privaten Browserlauf bestanden alle 50 bisherigen Abläufe; der neue Filtertest klickte auf den zweiten Filter, bevor der erste Ansichtswechsel abgeschlossen war. Nach einer zusätzlichen Prüfung des aktiven Filters wurden alle sechs neuen Aufgabenabläufe gezielt erfolgreich wiederholt. Die öffentliche Abnahme erwartete im Dashboardtest noch den früheren Plan-Platzhalter; beide Einstiegstests prüfen jetzt den tatsächlich verfügbaren privaten Aufgabenlink. Der vollständige erneute öffentliche Lauf war erfolgreich. Fachliche Erwartungen, Wartezeitgrenzen und bestehende Tests wurden nicht abgeschwächt.

Der Diff-Review umfasst Scope, Nutzertrennung, Revisionen, Eingabe- und Datumstypen, unveränderte Finanzberechnungen und unveränderte Abhängigkeiten. GitHub führt die vollständige Suite mit einer frisch migrierten Datenbank aus.

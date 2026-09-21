# Money – Einnahmen, variable Ausgaben und Monatsübersicht

Stand: 21.09.2026. Branch: `codex/money-transactions`, aufgebaut auf der finanziellen Einrichtung.

## Dieses Inkrement

Nach abgeschlossenem Onboarding ist `/account/money` die private Finanzübersicht. Ein Monat ist wählbar; die Voreinstellung folgt der Profilzeitzone. `/account/overview` bleibt als Einstieg erhalten und führt zum Startmonat in Money. Damit gibt es keine zweite, nach Änderungen veraltete Finanzübersicht. Die öffentliche `/money`-Seite verlinkt den privaten Bereich ohne persönliche Daten zu laden.

Nutzer können mehrere Einnahmen mit Bezeichnung, positivem EUR-Betrag und Monat sowie variable Ausgaben mit Bezeichnung, Betrag, Kalendertag und fester Kategorie erfassen, bearbeiten und löschen. Auch das bereits im Onboarding gespeicherte Einkommen wird im selben Datensatz bearbeitet. Es wird kein Schatten-Datenmodell angelegt. Eine Ausgabe zählt ausschließlich in den Monat ihres Datums; eine Datumsänderung über die Monatsgrenze verschiebt sie entsprechend.

Die Kategorien sind Lebensmittel, Mobilität, Gesundheit, Freizeit, Einkäufe und Sonstiges. Ein Kategorieeditor und Budgets gehören zu späteren Inkrementen. Null/negative Beträge, zu viele Nachkommastellen, ungültige Kalendertage und unbekannte Kategorien werden serverseitig und in der Datenbank abgewiesen. Bestehende EUR- und Monatsgrenzen bleiben erhalten: maximal 99.999.999.999 Cent pro Eintrag und Kalenderjahre 2000–2100.

Eine Löschung zeigt den aktuellen Eintrag samt Betrag/Datum auf einer eigenen Bestätigungsseite. Die Server Action verlangt die aktiv gesetzte Bestätigung; Abbrechen verändert nichts. Die Operation entfernt genau den eigenen, angezeigten Datensatz. Veraltete Formulare können neuere Änderungen weder überschreiben noch löschen.

## Monatsrechnung und Grenzen

Der Rechenstand ist: Einnahmen − Fixkosten − erfasste variable Ausgaben − geplante Sparrate. Die Ansicht nennt explizit ihre Datenbasis und stellt diesen Wert nicht als Kontostand dar. Ohne Einnahmen oder ohne Angaben zu Fixkosten wird der Planwert als unvollständig angezeigt. Leere Listen nennen fehlende Einträge statt Beispiele zu erzeugen.

Fixkosten aus dem Onboarding werden ab ihrem Startmonat monatlich genau einmal eingerechnet. Sie erzeugen keine zusätzliche variable Ausgabe. Das Formular erklärt diese Trennung. Die gespeicherte geplante Sparrate wird ab dem Startmonat des Onboardings berücksichtigt; sie ist kein tatsächlicher Sparfortschritt. Einkommen gilt ausschließlich für seinen angegebenen Monat und wird nicht automatisch fortgeschrieben.

Die Monatsabfrage berechnet ihre Summen aus allen passenden Datensätzen in einer Datenbankabfrage. Listen sind deterministisch sortiert und umfassen je 25 Einträge pro Seite; ein Seitenwechsel beeinflusst die Summen nicht. PostgreSQL liefert aggregierte Centwerte als Dezimal-Integer-Strings, damit JSON nicht runden kann. Die Domain prüft den sicheren JavaScript-Integer-Bereich auch für Summen und Differenzen; bei einem nicht darstellbaren Gesamtwert wird ein Fehler statt einer gerundeten Zahl ausgegeben.

Bewusst außerhalb dieses Tasks: Anlegen/Ändern/Beenden laufender Fixkosten, historische Fixkostenkorrekturen nach O02, Budgetlimits und -zuordnung, Bearbeitung/Projektion von Sparzielen, wiederkehrende Einnahmen, Bankintegration, Cloud-Betrieb und Deployment. Phase 4 ist damit begonnen, nicht vollständig abgenommen. Die optionalen Aufgaben des ursprünglichen Onboardings bleiben ebenfalls offen.

## Datenbank und Zugriff

`20260921120000_money_transactions.sql` erweitert die vorhandenen Tabellen. Zusätzliche Einnahmen besitzen keinen Onboarding-Slot; die initiale ID bleibt unverändert. `expenses` unterscheidet monatliche Fixkosten und einmalige variable Ausgaben über einen Constraint: Fixkosten haben Startmonat, variable Ausgaben haben Datum und Kategorie. Jede bearbeitbare Zeile besitzt eine Revision. Indizes unterstützen Nutzer-/Monats- und Datumsabfragen.

Direkte Schreibrechte bleiben entzogen. `mutate_money` ist ein eng begrenztes RPC mit leerem `search_path`, festen Operationen und `auth.uid()` als einzigem Eigentümer. Es verlangt einen abgeschlossenen Einrichtungsstatus, prüft bei Updates/Deletes eigene ID und Revision und kann keine monatlichen Fixkosten verändern. Gleiche erneute Create-Anfragen mit derselben ID und denselben Angaben erzeugen keinen zweiten Datensatz. Der Nutzerstatus wird während einer Mutation gesperrt; parallele Änderungen derselben Revision führen zu einem sichtbaren Konflikt.

`read_money_month` verwendet ausdrücklich Invoker-Rechte und die bestehenden Eigentümer-RLS-Policies. Es nimmt keine Nutzer-ID entgegen. Die Anwendung nutzt ausschließlich ihren sitzungsgebundenen Supabase-Client mit öffentlichem Schlüssel. Es gibt keinen Service-Role-Client im normalen Anfragepfad, keine Finanzdaten-Logs und keine Speicherung von Formulardaten im Browser-Storage. Alle neuen Routen liegen unter dem privaten `/account`-Proxy. Generierte Datenbanktypen wurden aktualisiert.

## Abnahme und Prüfungen

- CRUD für Einkommen und variable Ausgaben mit unveränderten Werten nach Neuladen, exakter Monatsrechnung und bestätigtem Löschen.
- Einträge über Monats-/Jahresgrenzen verschieben; Fixkosten nicht vervielfachen; Summen über mehrere Listenseiten korrekt behalten.
- Ungültige Beträge, Kalenderdaten und Kategorien, doppelte Create-Anfragen und parallele Änderungen prüfen.
- Eigene/fremde IDs, direkte Tabellenmutationen, anonyme RPCs, manipulierte Eigentümerfelder und Zugriff vor dem Onboarding prüfen.
- Bestehende Auth-/Onboarding-Flows bleiben erhalten; ihr Abschluss führt jetzt zur aktuellen Money-Ansicht. Bestehende Tests prüfen entsprechend das neue Ziel, weiterhin einschließlich echter Werte und Leerzuständen.

Die unveränderten Prüfkommandos stehen in [DEVELOPMENT.md](DEVELOPMENT.md). GitHub Actions wendet das gesamte Schema in einer frischen lokalen Supabase an und prüft Unit-, Integrations- und Browserabläufe. Der tatsächliche CI-Stand gehört immer zum aktuellen Commit im Pull Request.

Lokaler Abschlussstand: 71 Unit-/Komponententests, 18 Datenbanktests, 18 Auth-/Onboarding-/Money-Browsertests und 12 Vorschau-/Navigationstests erfolgreich (119 insgesamt). Lint, Typecheck, Formatprüfung und Produktionsbuild sind erfolgreich. Die Monatsübersicht wurde zusätzlich auf Desktop im hellen und auf Mobil im dunklen Farbschema visuell geprüft. Testkonten wurden gezielt bereinigt.

# Sparziel-Prognose

## Problem und begrenzter Umfang

Die laufende Sparzielverwaltung zeigt tatsächlichen Fortschritt und geplante Raten, bisher jedoch keinen voraussichtlichen Zieltermin. Dieses Inkrement ergänzt eine rein lesende Prognose je finanziellem Ziel unter `/account/goals/[id]` und den Vergleich mit dem optionalen Zieldatum. Es konkretisiert die Beitragskonvention O03 als unten dokumentierte Arbeitsannahme.

Persönliche Ziele, Milestones, Budget-/Task-Verknüpfungen, Szenarien, Zinsen/Renditen, automatische Buchungen und Entnahmen gehören nicht zu diesem Task. R07 und Phase 5 sind damit nicht insgesamt abgeschlossen.

## Fachregeln und Abnahme

- Ausgangspunkt ist der vollständige tatsächliche Sparstand aus dem bestehenden autorisierten Snapshot: Startguthaben plus aktive Einzahlungen. Bereits erfasstes Geld wird nicht nochmals als geplanter Beitrag addiert.
- Der Stichtag ist der aktuelle Kalendertag in der gespeicherten Profilzeitzone. Der erste angenommene Beitrag fällt auf den letzten Kalendertag des Folgemonats. Weder laufende noch vergangene Monate werden automatisch aufgefüllt. Ohne erfasste Einzahlung verschiebt sich die Prognose beim nächsten Monatswechsel entsprechend.
- Für jeden zukünftigen Monat gilt die letzte Rate mit einem Startmonat kleiner oder gleich diesem Monat. Künftige Änderungen, verzögerter Beginn und Pausen werden berücksichtigt. Die letzte Fassung gilt bis zu einer weiteren Änderung. Eine Nullrate zählt nicht als Beitrag; bei einer späteren positiven Rate setzt die Prognose fort.
- Die Zahl verbleibender Beiträge zählt nur positive Beiträge, einschließlich des letzten gegebenenfalls kleineren Beitrags. Bei konstanter Rate entspricht sie der aufgerundeten Division des offenen Betrags durch die Rate. Das fiktive J04-Beispiel mit 10.000 EUR Ziel, 3.500 EUR Stand und 500 EUR Monatsrate ergibt 13 Beiträge. Bei Stichtag 26.09.2026 ist der nächste Beitrag am 31.10.2026 und der Zieltermin am 31.10.2027.
- Die Berechnung verwendet begrenzte ganze EUR-Cent-Beträge und `BigInt` für die zukünftige Restbetragsrechnung. Kalenderarithmetik berücksichtigt echte Monatsenden und Schaltjahre. UTC wird nur zum Rechnen mit Kalenderdaten verwendet; der heutige Tag kommt ausdrücklich aus der Profilzeitzone.
- Bereits erreichte oder überschrittene Ziele benötigen null weitere Beiträge. Es wird kein historisches Erreichungsdatum abgeleitet und nicht behauptet, ein vergangenes Zieldatum sei eingehalten worden.
- Reichen alle geplanten Beiträge bis zu einer dauerhaften Pause nicht aus oder fehlen positive Raten, erscheint kein erfundenes Datum. Bei positiver fortlaufender Rate, aber Zielerreichung jenseits des unterstützten Kalenders, nennt die Anzeige die Berechnungsgrenze Ende 2100. Dezember 2100 ist eingeschlossen.
- Der prognostizierte Kalendertag wird exakt mit dem Zieldatum verglichen. Ein Monatsende nach einer Deadline innerhalb desselben Monats wird als verspätet gekennzeichnet. Ein Zieldatum vor dem heutigen Tag ist bei unerreichtem Ziel überschritten; der heutige Tag selbst noch nicht. Ohne berechenbaren Termin wird keine Termineinhaltung zugesagt.
- Datum, Anzahl Beiträge, nächster angenommener Beitrag, offener Betrag und Stichtag sind direkt sichtbar. Die per Tastatur bedienbare Erläuterung nennt Folgemonat/Monatsende, Ratenverlauf, ausgebliebenes Sparen, Zinsfreiheit und die Annahme tatsächlicher künftiger Einzahlungen. Die Prognose prüft keine Tragfähigkeit des Monatsbudgets. Sie aktualisiert sich beim erneuten Öffnen und nach gespeicherten Änderungen.

## Architektur und Sicherheit

`src/domain/goal-forecast.ts` enthält reine, validierte Regeln. Die Server Component `src/features/goals/goal-forecast-card.tsx` stellt das Ergebnis im bestehenden geschützten Zielbereich dar. Sie erhält denselben einmalig geladenen `read_goal`-Snapshot wie die Fortschrittsanzeige; es entstehen keine zusätzlichen Datenzugriffe oder Mutationen. Profilzeitzone, Ziel und Daten bleiben durch die vorhandenen Auth-/Eigentumsprüfungen und RLS geschützt. Lade- und Fehlerzustände werden vom Kontobereich geerbt.

Keine Migration, neue Abhängigkeit oder Änderung von Berechtigungen ist erforderlich. Prognosen werden nicht als tatsächlicher Kontostand gespeichert. Money, Monatsbudgets und Einzahlungen bleiben durch diese reine Darstellung unverändert.

## Prüfung

18 neue Unit-Fälle prüfen J04, Cent-Rundung, erreicht/überschritten, Nullraten, spätere Starts, Ratenänderungen und Pausen, fehlende Einzahlungen, Monatsenden, Schaltjahre, Profilzeitzonen, taggenaue Deadlines, Höchstbeträge, Kalendergrenze und ungültige Eingaben. Die Browserabnahme prüft Prognose, Warnung, Pausierung und Wiederaufnahme auf Desktop und Smartphone sowie die Erklärung per Tastatur. Bestehende Einzahlungs-/Stornofälle prüfen zusätzlich die Neuberechnung.

Abschlussstand vom 27.09.2026: Alle 174 Tests bestehen (99 Unit-, 31 Supabase-Integrations-, 32 private und 12 öffentliche Browserfälle). `pnpm lint`, `pnpm typecheck`, `pnpm build` und `pnpm format:check` sind erfolgreich. Die Prognose wurde im hellen Desktop- und dunklen Smartphone-Layout visuell geprüft. Die abschließende Diff-Prüfung umfasst Scope, Rechengenauigkeit, Datumsgrenzen, Eigentumsschutz, Typen, Abhängigkeiten und Konfiguration. Temporäre Testkonten wurden vollständig entfernt. Der vorhandene GitHub-Workflow prüft dieselben Suites in einer frischen Umgebung.

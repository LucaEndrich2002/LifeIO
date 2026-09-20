# LifeOS – Product Requirements Document

Stand: 18.09.2026 · Version: 0.1 · Status: ausgearbeiteter Produktentwurf für Phase 0

Quelle: [README](../../README.md), insbesondere Abschnitte 1–6, 9, 18 und 19. Die README bleibt die Grundlage. Dieses Dokument übersetzt ihren V1-Scope in überprüfbare Anforderungen. Ergänzende Annahmen stehen ausdrücklich in Abschnitt 8; sie sind keine bereits bestätigten Produktentscheidungen. Die beschriebenen Funktionen sind noch nicht implementiert.

## 1. Problem und Produktziel

Berufstätige zwischen 20 und 35 Jahren verwalten Finanzen, Termine, Aufgaben und persönliche Ziele häufig in getrennten Apps, Tabellen oder Notizen. Dadurch fehlt der Zusammenhang: Ein Sparziel hat einen finanziellen Bedarf, eine Deadline und konkrete nächste Aufgaben, erscheint aber nicht als zusammenhängender Plan.

LifeOS verbindet Geld, Zeit und Ziele in einem persönlichen Cockpit. Ein Nutzer soll verstehen:

1. Wo stehe ich gerade?
2. Was steht als Nächstes an?
3. Bin ich bei meinen wichtigsten Zielen auf Kurs?

Der erste Produktnachweis ist ein nachvollziehbarer Monatsüberblick mit Einkommen, Fixkosten, Ausgaben, Budget und Sparziel. Aufgaben und Termine verbinden Ziele mit den nächsten Handlungen. KI ergänzt den stabilen Core später um kontrollierte Auswertungen.

## 2. V1-Scope und Grenzen

| Bereich                   | Enthalten                                                                                          | Anforderungen |
| ------------------------- | -------------------------------------------------------------------------------------------------- | ------------- |
| Konto und Einstieg        | Benutzerkonto, Profil, Onboarding                                                                  | R01–R02       |
| Money                     | Einkommen, manuelle Ausgaben, Kategorien, monatliche Fixkosten, Budgets, Sparrate, Monatsübersicht | R03–R06       |
| Goals                     | finanzielle und persönliche Ziele, Fortschritt, Deadline, Beiträge, Projektion, Milestones         | R07           |
| Plan                      | Aufgaben mit Priorität und Fälligkeit, einfache Kalenderereignisse, Tages- und Wochenübersicht     | R08–R09       |
| Life Core                 | Verknüpfungen zwischen Zielen, Budgets, Aufgaben und Ereignissen                                   | R10           |
| Home                      | Überblick über Heute, Geld, Ziele und Aufmerksamkeit                                               | R11           |
| AI                        | lesende Antworten und datenbasierte Insights über definierte Anwendungstools                       | R12           |
| Wiederkehrender Überblick | Weekly Review und grundlegende Notifications                                                       | R13–R14       |

Die Hauptnavigation besteht aus **Home, Money, Plan, Goals und AI**. Authentication und Onboarding sind vorgelagerte Abläufe.

### Nicht im Scope

- Bankanbindungen, automatischer Transaktionsimport, Zahlungen, Aktienhandel, Investment-Portfolios und Versicherungsvergleiche.
- Externe Kalender- und E-Mail-Integrationen, Dokumentenablage, Verträge und Life Admin.
- Health, Fitness, Social Features, Marketplace und native Mobile-Apps.
- Abrechnung, Abonnements als Geschäftsmodell, komplexe Automationen und komplexe KI-Agenten.
- Microservices und beliebiger Datenbankzugriff durch die KI.

Schreibende KI-Aktionen sind eine spätere Ausbaustufe nach dem lesenden Core. Auch der ursprüngliche Projektauftrag zum Fundament umfasst nur ihre Dokumentation, keine Implementierung.

## 3. Die fünf zentralen User Journeys

| Journey                       | Ablauf                                                                                                                  | Prüffähiges Ergebnis                                                                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| J01 – Account und Onboarding  | Konto erstellen → anmelden → Einkommen, Fixkosten und erstes Sparziel erfassen → optional Aufgaben ergänzen → Dashboard | Nutzer erreicht ohne manuelle Datenbankeingriffe sein personalisiertes Dashboard; erneutes Laden erhält den Stand. R01–R02 sind erfüllt.                                |
| J02 – Einkommen und Fixkosten | Money öffnen → Monat wählen → Einkommen und monatliche Fixkosten erfassen → Werte prüfen oder bearbeiten                | Gespeicherte Werte erscheinen nach erneutem Laden genau einmal und verändern die Monatsrechnung korrekt. R03 und R05 sind erfüllt.                                      |
| J03 – Budget erstellen        | Monatsbudget definieren → manuelle Ausgabe erfassen → Nutzung und Restbudget ansehen                                    | Ein Budget von 500,00 EUR und zugeordnete Ausgaben von 450,00 EUR ergeben 90 % Nutzung und 50,00 EUR Restbudget. R04 und R06 sind erfüllt.                              |
| J04 – Sparziel verfolgen      | Ziel anlegen → Zielbetrag, aktuellen Betrag und monatlichen Beitrag setzen → Fortschritt und Projektion ansehen         | 10.000,00 EUR Ziel, 3.500,00 EUR vorhanden und 500,00 EUR monatlich ergeben 35 % Fortschritt und 13 noch benötigte Beiträge. R07 ist erfüllt.                           |
| J05 – Monat verstehen         | Dashboard öffnen → Heute, Money, Goals und Attention überblicken → relevante Detailansicht öffnen                       | Fünf Testpersonen beantworten jeweils innerhalb von zehn Sekunden, was heute ansteht, wie der Monat aussieht und welches Ziel Aufmerksamkeit benötigt. R11 ist erfüllt. |

Testbeträge sind ausschließlich fiktive Abnahmebeispiele. Sie dürfen nicht als echte Nutzerdaten oder als vorausgefüllter Finanzstand erscheinen.

## 4. User Stories und Acceptance Criteria

Die Kriterien gelten zusätzlich zu den gemeinsamen Qualitäts- und Sicherheitsanforderungen in Abschnitt 6. Prüfarten: Unit für deterministische Regeln, Integration für Anwendung und Datenbank, E2E für vollständige Abläufe, manuell für Verständlichkeit und ergänzende Barrierefreiheitsprüfung.

### R01 – Benutzerkonto

Als Nutzer möchte ich mich registrieren, anmelden und abmelden, damit nur ich meinen persönlichen Bereich nutzen kann.

- Eine Registrierung und anschließende Anmeldung über Supabase Auth ermöglichen den Einstieg; ungültige Eingaben erzeugen eine verständliche Rückmeldung.
- Ohne gültige Sitzung geben geschützte Seiten und serverseitige Operationen keine persönlichen Daten zurück.
- Nach Abmeldung oder Sitzungsablauf ist ein erneuter geschützter Zugriff ohne Anmeldung ausgeschlossen.
- Nutzer A kann Daten von Nutzer B weder lesen noch verändern, auch nicht durch Austausch einer ID in einer direkten Anfrage.
- Prüfung: Auth-Integration, Zwei-Nutzer-Isolation und E2E für Registrierung, Anmeldung und Abmeldung.

### R02 – Profil und Onboarding

Als neuer Nutzer möchte ich meine Ausgangslage erfassen, damit das Dashboard direkt auf meinen Angaben beruht.

- Der Ablauf umfasst Welcome, Einkommen, Fixkosten, erstes Sparziel, optionale Aufgaben und den Abschluss im Dashboard.
- Nutzer ohne Einkommen, Fixkosten oder Sparziel können dies ausdrücklich angeben; das System erzeugt keine erfundenen Einträge, um den Ablauf abzuschließen.
- Gespeicherte Schritte bleiben nach Neuladen erhalten. Zurückgehen und erneutes Speichern derselben Angaben erzeugen keine zusätzlichen Datensätze.
- Der Abschlussstatus wird erst gespeichert, wenn die erforderlichen Angaben oder ausdrücklichen Überspringentscheidungen gültig gespeichert sind. Bei einem Fehler bleiben Eingaben korrigierbar.
- Währung und Zeitzone sind für Berechnungen eindeutig bestimmt; die vorgeschlagenen V1-Regeln dazu stehen in Abschnitt 8.
- Prüfung: E2E J01 mit vollständigen und bewusst ausgelassenen Angaben sowie fehlgeschlagener Speicherung.

### R03 – Einkommen

Als Nutzer möchte ich Einkommen für einen Monat anlegen, bearbeiten und löschen, damit mein Monatsüberblick stimmt.

- Ein Eintrag hat mindestens Bezeichnung, positiven Betrag, Währung und zugeordneten Monat. Der vorausgewählte Monat folgt der Profilzeitzone und ist änderbar.
- Null, negative Werte und Beträge mit unzulässigen Nachkommastellen werden serverseitig abgewiesen.
- Anlegen, Bearbeiten und Löschen aktualisieren die Summe ausschließlich im zugeordneten Monat; nach erneutem Laden ist das Ergebnis unverändert.
- 2.800,00 EUR und 200,00 EUR ergeben exakt 3.000,00 EUR. Das Ändern des zweiten Eintrags auf 250,00 EUR ergibt exakt 3.050,00 EUR.
- Prüfung: Unit für Betragsvalidierung und Summen, Integration für Persistenz und Isolation.

### R04 – Manuelle Ausgaben und Kategorien

Als Nutzer möchte ich eine Ausgabe mit Datum und Kategorie erfassen und korrigieren, damit mein Verbrauch nachvollziehbar ist.

- Eine Ausgabe besitzt Bezeichnung, positiven Betrag, Währung, Datum und Kategorie. Vordefinierte Kategorien reichen zunächst aus; ein eigener Kategorieeditor ist nicht Voraussetzung.
- Anlegen, Bearbeiten und Löschen verändern die Ausgaben des zugehörigen Monats und die davon betroffenen Budgetanzeigen.
- Eine Ausgabe zählt in der Monatsrechnung genau einmal. Das Zuordnen zu einem Budget oder Ziel erzeugt keine weitere Ausgabe.
- Ein Datumswechsel über eine Monatsgrenze entfernt den Betrag aus dem bisherigen und ergänzt ihn im neuen Monat.
- Prüfung: Unit für Beträge und Monatszuordnung, Integration für Änderungen, Kategorien und Nutzer-Isolation.

### R05 – Monatliche Fixkosten

Als Nutzer möchte ich wiederkehrende Fixkosten manuell pflegen, damit sie im Monatsplan berücksichtigt werden.

- Ein Eintrag besitzt Bezeichnung, positiven Monatsbetrag, Währung sowie einen ersten und optional letzten Gültigkeitsmonat.
- Er wird je gültigem Monat genau einmal als geplanter Fixkostenbetrag berücksichtigt. Mehrfaches Laden oder erneutes Speichern vervielfacht ihn nicht.
- Ein Ende der Gültigkeit entfernt den Betrag aus späteren Monaten, ohne frühere Monate zu verändern. Die Bearbeitung historischer Beträge erfordert vor Implementierung eine ausdrückliche Regel, siehe O02.
- Eine geplante Fixkostenposition wird nicht zugleich automatisch als zusätzliche manuelle Ausgabe angelegt. Die UI unterscheidet Fixkosten und variable Ausgaben.
- Prüfung: Unit für Gültigkeitsgrenzen und Summen sowie Integration für wiederholtes Speichern.

### R06 – Monatsbudget und finanzielle Übersicht

Als Nutzer möchte ich mein Ausgabenlimit und den verbleibenden monatlichen Spielraum sehen, damit ich Entscheidungen auf überprüfbare Zahlen stützen kann.

- Ein Budget besitzt Name, positiven Limitbetrag, Währung und Monat. Die Definition seiner zugeordneten Ausgaben muss sichtbar sein; der V1-Vorschlag steht in Abschnitt 8.
- Budgetnutzung und Restbudget werden aus den zugeordneten Ausgaben abgeleitet. Bei Überschreitung wird ein negativer Restbetrag angezeigt, nicht auf null gesetzt.
- Der verfügbare Monatsbetrag verwendet die Formel und Begriffe aus Abschnitt 5. Ein Budgetlimit wird nicht zusätzlich als Ausgabe abgezogen.
- Money und Home zeigen bei gleichem Monat und Datenstand dieselben Werte; fehlende Angaben werden als unvollständige Grundlage kenntlich gemacht.
- Prüfung: Unit für Summen, negative Restbeträge und Monatsgrenzen; Integration für Aktualisierung nach Änderungen; E2E J03.

### R07 – Ziele und Fortschritt

Als Nutzer möchte ich ein persönliches oder finanzielles Ziel mit Fortschritt sehen, damit ich meine nächsten Schritte daran ausrichten kann.

- Ein Ziel hat einen Namen und optional eine Deadline. Finanzielle Ziele benötigen zusätzlich einen positiven Zielbetrag und eine Währung; aktueller Betrag und monatlicher Beitrag dürfen null, aber nicht negativ sein.
- Ein Sparziel zeigt aktuellen Betrag, Zielbetrag und tatsächlichen Fortschritt. Ein visuell auf 100 % begrenzter Balken darf einen darüberliegenden Betrag nicht verbergen.
- Bei positiver Sparrate ergibt sich die Zahl verbleibender Beiträge aus der aufgerundeten Division des fehlenden Betrags durch die Sparrate. Bei bereits erreichtem Ziel sind es null Beiträge; bei fehlender Sparrate wird kein Erreichungsdatum erfunden.
- Ein projiziertes Datum nennt seine Annahme zum nächsten Beitrag. Liegt es nach der Deadline, wird diese Abweichung sichtbar. Die Beitragskonvention ist vor Implementierung festzulegen, siehe O03.
- Persönliche Ziele benötigen keinen künstlichen Geldbetrag. Milestones können als offen oder erledigt markiert werden; der daraus abgeleitete Fortschritt ist nachvollziehbar. Ohne Milestones erscheint keine erfundene Prozentzahl.
- Fortschrittsänderungen bleiben nach erneutem Laden erhalten. Ein geplanter Beitrag gilt nicht automatisch als tatsächlich gespartes Geld.
- Prüfung: Unit für Projektion mit null, erreichtem und überschrittenem Ziel sowie Rundung; Integration für Fortschritt; E2E J04.

### R08 – Aufgaben

Als Nutzer möchte ich Aufgaben mit Priorität und Fälligkeit verwalten, damit ich weiß, was als Nächstes ansteht.

- Aufgaben können mit Titel, Priorität, optionaler Fälligkeit und Status offen/erledigt angelegt, bearbeitet und gelöscht werden.
- Als erledigt markierte Aufgaben erscheinen nicht mehr als offene Aufgaben; nach Neuladen bleibt ihr Status erhalten.
- Tages- und Wochenübersicht verwenden die Profilzeitzone. Aufgaben ohne Fälligkeit bleiben auffindbar, ohne ein erfundenes Datum zu erhalten.
- Prüfung: Unit für Fälligkeit und Status, Integration für Speicherung und Isolation.

### R09 – Einfache Kalenderereignisse

Als Nutzer möchte ich eigene Termine sehen, damit meine verfügbare Zeit bei der Planung berücksichtigt werden kann.

- Ereignisse können mit Titel, Beginn und Ende angelegt, bearbeitet und gelöscht werden. Das Ende muss nach dem Beginn liegen.
- Die gewählte Zeitzone ist eindeutig; Anzeige und Tages-/Wochenzuordnung behandeln Datumswechsel und Sommerzeit konsistent.
- Ereignisse erscheinen in allen Tagesintervallen, mit denen sie sich überschneiden, einschließlich Terminen über Mitternacht.
- Externe Kalender, Wiederholungsserien und Einladungen sind für diesen Ablauf nicht erforderlich.
- Prüfung: Unit für Intervall- und Zeitzonengrenzen, Integration für Speicherung und Isolation.

### R10 – Verknüpfungen zwischen Modulen

Als Nutzer möchte ich ein Ziel mit Budget, Aufgaben und Terminen verbinden, damit ich Geldbedarf und nächste Schritte zusammen verstehe.

- Mindestens Goal → Budget (`funded_by`), Goal → Task (`requires`) und Goal → CalendarEvent (`scheduled_as`) sind abbildbar.
- Beide Endpunkte müssen existieren und dem angemeldeten Nutzer gehören. Nicht erlaubte Typ-/Beziehungskombinationen und identische doppelte Links werden abgewiesen.
- Ein Link bietet Zugang zur passenden Detailansicht. Das Entfernen des Links löscht nicht die verbundenen Datensätze.
- Ein Link verändert keine Geldbeträge. Das Löschen eines Endpunkts darf keine nutzbaren Verweise auf nicht mehr existierende Daten hinterlassen.
- Prüfung: Integration für gültige, doppelte, fehlende und fremde Endpunkte sowie Löschverhalten. Das polymorphe Datenmodell benötigt explizite Integritätsregeln.

### R11 – Home Dashboard

Als Nutzer möchte ich auf einen Blick meinen Tag, meinen Monat und meine Ziele verstehen, damit ich gezielt handeln kann.

- Die Ansicht enthält Begrüßung/Datum, Today, Money, Goals, Attention und nach Einführung von R12 einen AI-Insight-Bereich.
- Today zeigt heutige offene Aufgaben und relevante Termine. Money zeigt den ausgewählten Monat und dessen Berechnungsgrundlage. Goals zeigt Fortschritt und gegebenenfalls eine gefährdete Deadline.
- Attention nennt einen überprüfbaren Grund, beispielsweise eine Budgetüberschreitung, eine überfällige Aufgabe oder ein Ziel hinter seinem Plan, und verlinkt den betroffenen Bereich.
- Bei leerem Konto zeigen Empty States die passende erste Handlung. Während des Ladens oder bei Fehlern werden keine falschen Nullwerte als gültiges Ergebnis dargestellt.
- J05 wird mit fünf Personen anhand derselben fiktiven Ausgangslage geprüft. Jede Person muss die drei Fragen ohne Erklärung innerhalb von zehn Sekunden korrekt beantworten.
- Prüfung: Integrationsprüfung der gemeinsamen Datenbasis, E2E der Navigation und manueller Verständlichkeitstest.

### R12 – Lesende KI und Insights

Als Nutzer möchte ich meine Situation in verständlicher Sprache erklärt bekommen, damit ich Zusammenhänge zwischen Geld, Zielen und Aufgaben erkenne.

- Die KI verwendet ausschließlich freigegebene, serverseitig autorisierte Anwendungstools: `get_financial_summary`, `get_budget_status`, `get_goals`, `get_goal_projection`, `get_tasks` und `get_upcoming_events`.
- Finanzielle Zahlen kommen aus den getesteten Fachberechnungen. Die Antwort benennt betrachteten Zeitraum und verwendete Datenbereiche; fehlende oder unzureichende Daten werden ausdrücklich kenntlich gemacht.
- Die lesende V1 kann keine Daten erstellen, verändern oder löschen. Anweisungen in gespeicherten Titeln oder Beschreibungen erweitern weder Rechte noch verfügbare Tools.
- Nur für die aktuelle Anfrage erforderliche Daten werden übermittelt. Bei einem KI-Ausfall funktionieren Money, Goals, Plan und Home weiter.
- Deterministisch erkennbare Hinweise, beispielsweise mindestens 90 % Budgetnutzung, benötigen keinen LLM-Aufruf und nennen ihren überprüfbaren Auslöser.
- Prüfung: Tool-Integration mit Testantworten, Autorisierungs- und Datensparsamkeitsprüfung, adversariale Inhalte und Ausfallpfade. CI benötigt keine echten KI-Anfragen.

### R13 – Weekly Review

Als Nutzer möchte ich meine Woche zusammengefasst sehen, damit ich Entwicklung und nächste Prioritäten erkenne.

- Die Review nennt ihren Wochenzeitraum und umfasst finanzielle Entwicklung, Budgets, Zielfortschritt, offene Aufgaben und kommende Deadlines.
- Sie enthält bei ausreichender Datengrundlage ein bis drei begründete Insights; ohne Grundlage benennt sie fehlende Daten und erfindet keine Entwicklung.
- Identische Ausgangsdaten, Zeitgrenzen und Regelversionen ergeben identische berechnete Kennzahlen und deterministische Hinweise. Optional erzeugter Erklärungstext darf diese Werte nicht verändern.
- Wiederholtes Öffnen erzeugt keine doppelten Reviews oder Benachrichtigungen für denselben Nutzer und Zeitraum. Eine Aktualisierung muss als solche erkennbar sein.
- Prüfung: Unit für Wochen-/Zeitzonengrenzen, Integration für Aggregation, Wiederholung und Isolation.

### R14 – Grundlegende Notifications

Als Nutzer möchte ich relevante Hinweise wiederfinden und als gelesen markieren, damit Aufmerksamkeitshinweise nicht verloren gehen.

- Ein Hinweis nennt Anlass und betroffenen Bereich; Navigation führt ausschließlich zu eigenen Daten.
- Gelesen/ungelesen bleibt nach erneutem Laden erhalten. Wiederholte Auswertung desselben Auslösers erzeugt keinen identischen zusätzlichen Hinweis.
- Die kleinste V1-Ausprägung sind In-App-Hinweise, siehe Abschnitt 8. E-Mail- und Push-Versand sind nicht Voraussetzung.
- Prüfung: Integration für Eigentümerprüfung, Lesestatus und Deduplizierung.

## 5. Finanzielle Begriffe und Abnahmebeispiele

LifeOS zeigt einen **Monatsplan**, keinen live abgefragten Kontostand. Geplante Beträge und tatsächlicher Zielfortschritt müssen unterscheidbar bleiben.

```text
verfügbarer Monatsbetrag =
  Einkommen des Monats
  - gültige monatliche Fixkosten
  - manuell erfasste variable Ausgaben des Monats
  - geplante Sparbeiträge des Monats

Restbudget = Budgetlimit - dem Budget zugeordnete Ausgaben
```

Budgetlimits und Links verschieben kein Geld. Ein Sparbeitrag wird in der Monatsrechnung genau einmal berücksichtigt; seine Planung erhöht nicht den tatsächlichen Sparstand. Manuelle Ausgaben dürfen denselben Fixkostenposten nicht zusätzlich als variable Ausgabe abbilden. Erstattungen, Umbuchungen und mehrere Währungen brauchen eigene Regeln und gehören nicht zum ersten Money-Core-Inkrement.

Geldwerte werden als ganzzahlige Minor Units mit Währung behandelt. Beispielsweise sind 10,99 EUR exakt 1099 Cent. Werte außerhalb des unterstützten Bereichs werden abgewiesen; Rundung und Darstellung dürfen keine stillen Betragsänderungen verursachen. Die spätere technische Spezifikation muss einen sicheren Wertebereich für Datenbank, Transport und Anwendung festlegen.

| Fiktive Eingabe                                                                          | Erwartetes Ergebnis                     |
| ---------------------------------------------------------------------------------------- | --------------------------------------- |
| Einkommen 3.000,00; Fixkosten 1.200,00; variable Ausgaben 450,00; Sparbeitrag 300,00 EUR | Verfügbar: 1.050,00 EUR                 |
| Budget 500,00; zugeordnete Ausgaben 450,00 EUR                                           | Rest: 50,00 EUR; Nutzung: 90 %          |
| Budget 500,00; zugeordnete Ausgaben 550,00 EUR                                           | Rest: −50,00 EUR; Nutzung: 110 %        |
| Ausgaben 0,10 und 0,20 EUR                                                               | Summe: exakt 0,30 EUR                   |
| Sparziel 10.000,00; Stand 3.500,00; Beitrag 500,00 EUR                                   | 35 % erreicht; 13 verbleibende Beiträge |
| Unerreichtes Sparziel mit Beitrag 0,00 EUR                                               | Keine belastbare Zeitprognose           |

Die Kalenderzuordnung von Einnahmen, Ausgaben, Fixkosten und Sparbeiträgen muss vor Umsetzung des Money Core die offenen Punkte in Abschnitt 8 auflösen.

## 6. Gemeinsame Qualitäts- und Sicherheitsanforderungen

- **Nutzer-Isolation:** Jeder Zugriff auf persönliche Daten wird serverseitig autorisiert und durch Supabase RLS abgesichert. Integrationstests prüfen anonyme Zugriffe sowie Lesen, Anlegen, Ändern und Löschen mit einem zweiten Nutzer.
- **Validierung:** Externe Eingaben werden serverseitig validiert; eine umgangene Browserprüfung darf keine ungültigen Daten speichern. Nicht erfolgreiche Operationen dürfen keinen Erfolg anzeigen.
- **Secrets und Logs:** Private Schlüssel bleiben serverseitig und außerhalb von Git. Logs enthalten weder Zugangsdaten noch unnötige persönliche oder finanzielle Inhalte.
- **KI-Grenzen:** Kein beliebiges SQL, keine Umgehung der Fachlogik. Für spätere schreibende oder löschende KI-Aktionen gilt vor Ausführung eine sichtbare Bestätigung der konkreten Aktion, zusätzlich zu Validierung und Autorisierung.
- **Bedienbarkeit:** Zentrale Abläufe sind per Tastatur nutzbar, besitzen sichtbaren Fokus und beschriftete Eingaben; Fehlermeldungen sind dem Feld zugeordnet. Status wird nicht ausschließlich über Farbe vermittelt.
- **Darstellung:** Kernabläufe funktionieren bei 375 px und 1440 px Viewportbreite ohne abgeschnittene Bedienelemente sowie in Light und Dark Mode. Loading-, Error- und Empty States werden geprüft.
- **Zeit:** Monats- und Wochenzuordnung verwendet eine explizite Nutzerzeitzone. Tests decken Monatswechsel, Jahreswechsel und Sommerzeit ab.
- **Änderungsqualität:** Acceptance Criteria, relevante Tests, Lint, Typecheck und Build müssen vor Abschluss einer Implementierung erfolgreich sein. Tests werden nicht entfernt oder abgeschwächt, um Fehler zu verdecken.
- **Beta:** Datenflüsse, Aufbewahrungs-/Löschkonzept, Backups, Migrationen, Rate Limits und Fehlerbehandlung werden vor Freigabe echter Nutzerdaten geprüft. Ein reiner UI-Prototyp ist noch keine abgeschlossene Sicherheitsprüfung.

## 7. Erfolgskriterien und Abnahme

### Phase 0 – Dokumentation

- Jede enthaltene V1-Funktion ist einer User Story R01–R14 mit überprüfbaren Kriterien zugeordnet.
- Die fünf Kernjourneys, Nicht-Ziele, Berechnungsbegriffe und offenen Produktentscheidungen sind dokumentiert.
- Vorgeschlagene Ergänzungen sind von Aussagen der README unterscheidbar. Die betroffenen offenen Entscheidungen werden spätestens vor dem jeweiligen Feature geklärt; sie blockieren das rein technische Fundament nicht.

### Funktionale V1-Abnahme

- J01–J04 sind mit wiederholbaren Testdaten erfolgreich ausführbar; finanzielle Beispiele aus Abschnitt 5 stimmen exakt.
- Der Verständlichkeitstest J05 wird mit fünf Personen bestanden.
- Fremde Nutzerdaten sind in den vorgesehenen Negativtests nicht zugänglich; vor Beta sind keine bekannten kritischen Sicherheitsfehler offen.
- Die Beta umfasst gemäß README 10–30 Testpersonen. Ein Ergebnis darf erst nach Durchführung als erreicht markiert werden.

### Messplan für die Beta

| Kennzahl                | Messdefinition für den Entwurf                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Onboarding Completion   | Anteil neuer registrierter Nutzer, die innerhalb von sieben Tagen das Onboarding abschließen                                                      |
| Activation              | Anteil neuer Nutzer mit mindestens einem Einkommen, Fixkostenposten und Sparziel sowie anschließendem Dashboard-Aufruf innerhalb von sieben Tagen |
| Week-1 Retention        | Anteil aktivierter Nutzer mit mindestens einer erneuten Nutzung an Tag 7–13 nach Aktivierung                                                      |
| Goals Created           | Anzahl angelegter Ziele pro aktiviertem Nutzer im Beobachtungszeitraum                                                                            |
| Weekly Review Open Rate | Anteil verfügbarer Reviews, die im jeweiligen Beobachtungszeitraum geöffnet werden                                                                |
| AI Usage                | Anteil aktiver Nutzer mit mindestens einer erfolgreich beantworteten KI-Anfrage im Beobachtungszeitraum                                           |
| Bugs / Support          | Gemeldete Probleme nach Schweregrad und betroffenem Ablauf                                                                                        |

Dies sind vorgeschlagene Messdefinitionen, keine erfundenen Zielwerte. Geschäftliche Schwellenwerte sind vor der Beta festzulegen. Zunächst genügen Testprotokolle; dieses Dokument veranlasst weder Analytics-Integration noch die Übertragung von Nutzerdaten an einen Dienst.

## 8. Annahmen, Widersprüche und offene Entscheidungen

| ID  | Vorschlag bzw. offene Frage                                                                                                                                                                                                                                     | Grundlage / spätester Klärungszeitpunkt                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| O01 | Vorschlag: ein Währungsraum EUR pro Profil für V1; Profilzeitzone explizit speichern, Browserzeitzone nur als Vorschlag. Kein Währungswechsel mit vorhandenen Beträgen ohne Migrationsregel.                                                                    | Währungs- und Zeitzonenverhalten sind nicht vollständig spezifiziert; vor Authentication/Onboarding festlegen.                                  |
| O02 | Monatliche, manuell gepflegte Fixkosten gehören zu V1. Die erneute Nennung von „recurring expenses“ bei V1.5 wird als spätere Erweiterung behandelt. Regeln für Betragsänderungen ab einem bestimmten Monat und historische Korrekturen bleiben zu entscheiden. | README nennt Fixkosten in Phasen 3/4 und Wiederholungen nochmals unter V1.5; historische Regeln vor Money Core festlegen.                       |
| O03 | Vorschlag: Sparprojektion aus vollständigen monatlichen Beiträgen; nächster Beitrag ab dem Folgemonat. Ein konkretes Beitragsdatum sowie Verhalten bei verpassten Beiträgen sind noch offen.                                                                    | README verlangt Prognosen, definiert aber keinen Zahlungsrhythmus innerhalb des Monats; vor Goals-Projektion entscheiden.                       |
| O04 | Vorschlag für das erste Budget: monatliches Limit für variable Ausgaben; Kategorien ordnen Ausgaben, ohne mehrere überlappende Budgettöpfe einzuführen. Vor mehreren Budgets muss die eindeutige Zuordnung einer Ausgabe feststehen.                            | README nennt Budgets und Monatsbudget, aber keine Allokationsregel; vor Budgetmodell entscheiden.                                               |
| O05 | Vorschlag: grundlegende Notifications zunächst nur in der App; Auslöser sind bestehende Attention-Hinweise und verfügbare Weekly Reviews.                                                                                                                       | Versandkanäle und Auslösezeitpunkte sind nicht definiert; vor Notifications entscheiden.                                                        |
| O06 | Die erste KI-Version bleibt lesend. Schreibaktionen folgen als getrenntes, bestätigungspflichtiges Inkrement.                                                                                                                                                   | README Phase 8 beschreibt eine Reihenfolge und nennt AI Actions nochmals in V2; Freigabe der Schreibstufe ist eine spätere Produktentscheidung. |
| O07 | Vorschlag: deutschsprachige V1, Montag als Wochenbeginn; Datenschutzregion, Auth-Verfahren und Regeln für Wiederaufnahme/Überspringen des Onboardings müssen vor der jeweiligen Umsetzung konkretisiert werden.                                                 | In der README nicht abschließend definiert; vor den betreffenden Features und Cloud-Einrichtung festlegen.                                      |
| O08 | Technisch messbare Abnahmeziele sind definiert; geschäftliche Beta-Zielwerte und die vorgeschlagenen Messdefinitionen brauchen eine Produktentscheidung.                                                                                                        | Vor der Beta, mit ausreichender Grundlage für die kleine Stichprobe.                                                                            |

## 9. Übergang zur Entwicklung

Arbeitsannahmen für das erste Auth-/Profil-Inkrement vom 20.09.2026: EUR, deutschsprachige Oberfläche, Montag als Wochenbeginn und Europe/Berlin als änderbare Profilvoreinstellung; E-Mail und Passwort mit einmaligen Bestätigungs-/Wiederherstellungscodes. Diese Defaults wurden im Task vorgeschlagen und mangels abweichender Vorgabe verwendet. Die konkreten Abläufe und Grenzen stehen in [AUTH_PROFILE_STATUS.md](../AUTH_PROFILE_STATUS.md). O01 und der Auth-Teil von O07 sind damit für dieses Inkrement konkretisiert; Cloud-Datenschutzregion und die Regeln des finanziellen Onboardings bleiben vor ihrer Umsetzung offen.

Der nächste Entwicklungsschritt ist das technische Fundament aus [ROADMAP.md](ROADMAP.md), Phase 1. Dabei werden Repository-Regeln, Tooling, Tests, CI und Supabase vorbereitet. Fachfunktionen dieses PRD werden anschließend in begrenzten Tasks mit den hier referenzierten Acceptance Criteria umgesetzt.

Der Stack bleibt gemäß README Next.js, React, TypeScript Strict Mode, pnpm, Tailwind, shadcn/ui, Supabase/PostgreSQL, Zod, Vitest, React Testing Library und Playwright. Recharts und OpenAI folgen erst bei ihrem konkreten Einsatz. Die Architektur bleibt ein modularer Monolith mit separater UI, Anwendungslogik, Domain und Datenzugriff.

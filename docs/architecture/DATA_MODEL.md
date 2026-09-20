# LifeOS – beabsichtigtes V1-Datenmodell

Dieses Dokument beschreibt die Entitäten aus der README. Im ersten Auth-/Profil-Inkrement existiert `public.profiles`; die übrigen Entitäten bleiben Entwurf. Offene Produktregeln stehen im [PRD, Abschnitt 8](../product/PRD.md).

## Bereits implementiert

`profiles` verwendet `user_id` als Primär-/Fremdschlüssel zu `auth.users`, `display_name`, `time_zone`, `currency = EUR` sowie serverseitige Zeitstempel. Constraints, Eigentümer-RLS und explizite Spaltenrechte sind Teil derselben Migration. Die Löschung eines Auth-Nutzers entfernt sein Profil per Kaskade. Ein finanzieller Onboarding-Abschlussstatus wird erst mit dem entsprechenden Ablauf ergänzt; ein gespeichertes Profil bedeutet noch nicht abgeschlossenes Onboarding.

## Entitäten

| Entität         | Zweck und vorgesehene Kerndaten                                                                         | Einführung             |
| --------------- | ------------------------------------------------------------------------------------------------------- | ---------------------- |
| User            | Identität in Supabase `auth.users`; keine eigene Passworttabelle                                        | Authentication         |
| Profile         | `user_id` als Primär-/Fremdschlüssel, Anzeigename, Zeitzone, Währung, Onboarding-Status                 | Onboarding             |
| Income          | Eigentümer, Bezeichnung, `amount_minor`, Währung, zugeordneter Monat                                    | Onboarding, dann Money |
| Expense         | Eigentümer, Bezeichnung, Betrag, Währung, Kategorie; manuelle Ausgabe oder monatliche Fixkostenregel    | Onboarding, dann Money |
| ExpenseCategory | Vordefinierte Kategorien; eigene Kategorien erst bei entsprechendem Scope                               | Money                  |
| Budget          | Eigentümer, Name, Monatslimit in Minor Units, Währung und Zuordnungsregel                               | Money                  |
| Goal            | Eigentümer, Name, Zielart, optionale Deadline; bei Sparzielen Zielbetrag, Währung und geplanter Beitrag | Onboarding, dann Goals |
| GoalProgress    | Ziel und Eigentümer, dokumentierter Fortschrittswert/-änderung und Zeitpunkt; Quelle nachvollziehbar    | Goals                  |
| Task            | Eigentümer, Titel, Priorität, optionale Fälligkeit, Status                                              | Plan                   |
| CalendarEvent   | Eigentümer, Titel, Beginn und Ende als absolute Zeitpunkte, zugehörige Zeitzone                         | Plan                   |
| EntityLink      | Eigentümer, typisierte Quelle, typisiertes Ziel und erlaubte Beziehung                                  | Goals/Plan             |
| AIInsight       | Eigentümer, Zeitraum, referenzierte Daten, Auslöser/Regelversion, Erklärung                             | AI/Insights            |
| WeeklyReview    | Eigentümer, Wochenintervall, Datenstand, Kennzahlen und Insights                                        | Weekly Review          |
| Notification    | Eigentümer, Auslöser, Verweis, Lesestatus und Zeitpunkt                                                 | Notifications          |

Alle eigenen Datensätze erhalten eine stabile ID und erforderliche Zeitstempel. Standardmäßig bleiben private Daten einem einzelnen Nutzer zugeordnet; es gibt keine gemeinsamen Haushalte oder Teamkonten in diesem Scope. Milestones werden im Goals-Task konkret modelliert, ohne vorab ein zusätzliches generisches Tracking-System einzuführen.

## Eigentum und Integrität

- Authentifizierung ersetzt keine Eigentumsprüfung. `user_id` wird aus verifizierter Identität abgeleitet und nicht ungeprüft aus einer Nutzereingabe übernommen.
- Eigene Tabellen benötigen RLS mit `USING` für bestehende Zeilen und `WITH CHECK` für neue bzw. geänderte Zeilen, eingeschränkt auf den angemeldeten Eigentümer. Policies, Grants und Indizes gehören zur selben Migration wie die Tabelle.
- Bei Beziehungen zwischen eigenen Tabellen müssen Fremdschlüssel bzw. weitere Constraints auch übereinstimmende Eigentümer sichern, z. B. über zusammengesetzte Referenzen `(user_id, id)`. Eine gültige fremde ID darf nicht zu einer gültigen eigenen Beziehung werden.
- Globale vordefinierte Kategorien sind getrennt von privaten Einträgen zu behandeln: freigegebene Lesezugriffe bedeuten keine allgemeinen Schreibrechte.
- Löschregeln und Aufbewahrung werden explizit definiert. Keine pauschale Kaskade über alle Module, die unbemerkt Fachdatensätze löscht.
- Jeder Task mit Persistenz prüft eigene, fremde, anonyme und ungültige Zugriffe sowie den Wechsel von `user_id` in Updates.

## EntityLink

Beabsichtigte Form aus der README:

```text
id, user_id
source_type, source_id
target_type, target_id
relationship
created_at
```

Erste erlaubte Kombinationen:

| Quelle           | Beziehung      | Ziel                      |
| ---------------- | -------------- | ------------------------- |
| Goal: Japan 2027 | `funded_by`    | Budget: Japan             |
| Goal: Japan 2027 | `requires`     | Task: Flug buchen         |
| Goal: Japan 2027 | `scheduled_as` | CalendarEvent: Japanreise |

Die Kombination aus Eigentümer, Quelle, Ziel und Beziehung muss eindeutig sein. Typen und Beziehungen kommen aus einer Allowlist, nicht aus frei ausführbaren Modellangaben. Verknüpfen verändert keine Beträge und ersetzt keinen Zahlungs- oder Buchungsvorgang.

**Integritätsrisiko:** Polymorphe `source_id`-/`target_id`-Felder können nicht mit einem einzelnen normalen Fremdschlüssel auf mehrere Tabellen zeigen. Vor der Migration ist eine konkrete Lösung festzulegen: typisierte Referenzen mit echten Constraints oder sorgfältige Datenbankfunktionen/Trigger. Ausschließliche UI-Prüfung reicht nicht aus. Auch direkte Data-API-Aufrufe, paralleles Löschen und Eigentümerwechsel müssen abgesichert werden. Das Entfernen eines Links löscht niemals seine Endpunkte.

## Geldwerte

- Bevorzugte Repräsentation: PostgreSQL `bigint` für Minor Units und expliziter Währungscode. Für das erste EUR-Inkrement bedeutet 10,99 EUR exakt 1099 Cent.
- TypeScript und JSON dürfen nur Werte innerhalb eines ausdrücklich begrenzten sicheren Integer-Bereichs als `number` transportieren. Die Datenbank muss denselben Bereich per `CHECK` sichern; größere Werte brauchen String-/BigInt-Transport. Bloßes Verwenden von `bigint` in PostgreSQL löst das Transportproblem nicht.
- Dezimale Benutzereingaben werden als Text validiert und stellenweise in Minor Units umgewandelt. Kein `parseFloat(value) * 100` für persistierte Beträge. Zu viele Nachkommastellen werden abgewiesen, sofern keine explizite Rundungsregel vorgesehen ist.
- Summen, Differenzen und Zwischenwerte müssen vor Überlauf geschützt werden. Prozentwerte dürfen für die Anzeige gerundet werden; zugrunde liegende Geldbeträge bleiben exakt.
- Nur gleiche Währungen werden aggregiert. Keine automatische Umrechnung oder stillschweigende Annahme, jede Währung habe zwei Nachkommastellen.
- Ausgaben, Fixkosten und geplante Sparbeiträge müssen disjunkt in die Monatsrechnung eingehen. Budgetlimits sind keine zusätzlichen Ausgaben. Zielbeiträge sind Planung, kein Beleg tatsächlicher Einzahlungen.
- Aktueller Zielstand und `GoalProgress` dürfen keine konkurrierenden Wahrheiten werden. Der Goals-Task legt fest, ob Fortschritt aus einem Journal abgeleitet oder atomar mit einem Snapshot aktualisiert wird.

## Zeit und Wiederholungen

- `timestamptz` für absolute Ereignisse, `date` für reine Kalendertage bzw. explizite Monatszuordnung. Eine Deadline ohne Uhrzeit wird nicht automatisch zu einem UTC-Mitternachtszeitpunkt.
- Eine IANA-Profilzeitzone bestimmt Tages-, Wochen- und Monatsgrenzen. Berechnungsintervalle sind am Anfang inklusive und am Ende exklusiv.
- Monatliche Fixkosten brauchen Gültigkeitsintervalle und Regeln für spätere Betragsänderungen. Alte Monate dürfen sich nicht durch unbemerkte rückwirkende Änderungen verschieben.
- Kalenderwoche, erster Sparbeitrag und Budgetzuordnung sind offene Produktregeln; dieses Dokument ersetzt ihre Entscheidung nicht.

## Migrationsstrategie

Die erste Migration unter `supabase/migrations` führt das Profil samt Constraints, Grants, Zeitstempel-Trigger und RLS ein. Jede weitere Fachänderung folgt in einer neuen versionierten Migration. Generierte TypeScript-Datenbanktypen werden mit dem Schema aktualisiert. `pnpm test:integration` prüft insbesondere die Isolation zwischen Nutzern über die normale Data API.

Seeds enthalten ausschließlich fiktive Entwicklungsdaten und entstehen zusammen mit dem Schema. Derzeit ist Seeding deaktiviert. Ein lokaler Reset darf nur eine lokale Testdatenbank betreffen; produktive Migrationen und Wiederherstellung werden vor Beta separat geprüft.

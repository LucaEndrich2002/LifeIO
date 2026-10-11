# LifeOS – beabsichtigtes V1-Datenmodell

Dieses Dokument beschreibt die Entitäten aus der README. Die folgenden Abschnitte kennzeichnen den implementierten Stand und die weiterhin vorgesehenen Entitäten. Offene Produktregeln stehen im [PRD, Abschnitt 8](../product/PRD.md).

`calendar_events` ergänzt eigene Termine mit Titel, `starts_at`/`ends_at` als `timestamptz`, ursprünglicher IANA-`time_zone`, Revision und Löschmarkierung. Beide lokalen Endpunkte liegen zwischen 2000 und 2100; Zeitpunktwerte sind endlich und minutengenau, das Ende folgt dem Beginn. RLS verbirgt fremde und entfernte Zeilen, direkte Schreibrechte fehlen. `mutate_calendar_event` prüft Eigentümer und Revision; `read_calendar_events` liest in einem Snapshot eindeutige überlappende Termine mit vollständiger Anzahl und 25er-Seiten. Darstellung und Tagesgrenzen folgen der Profilzeitzone; deren Änderung schreibt Termine nicht um. Details: [CALENDAR_STATUS.md](../CALENDAR_STATUS.md).

## Bereits implementiert

Der Einstieg ergänzt `onboarding.tasks_status` und bis zu drei initiale `tasks` mit eindeutigem `(user_id, onboarding_slot)`. Dieselben Aufgaben stehen nach Abschluss in Plan zur Verfügung; gewöhnliche Plan-Aufgaben haben keinen Slot. `save_onboarding_step` speichert Aufgaben und Entscheidung atomar, verlangt vor Abschluss alle vier Entscheidungen und weist veraltete Revisionen ab. Bereits abgeschlossene Einrichtungen erhalten bei der Migration `not_offered`, offene Einrichtungen `pending`. Keine erfundenen Aufgaben oder Überspringentscheidungen: [ONBOARDING_TASKS_STATUS.md](../ONBOARDING_TASKS_STATUS.md).

`ai_request_limits` ist ein betrieblicher Zähler je Auth-Nutzer mit UTC-Tag, Versuchszahl und letztem Anfragezeitpunkt. Er enthält keine Frage, Antwort oder Finanzdaten. Nutzer dürfen ausschließlich die eigene Zeile lesen. `claim_ai_request()` erhöht ihn atomar nach Identitäts- und Onboarding-Prüfung und erzwingt 30 Sekunden Abstand sowie 20 Versuche pro UTC-Tag. Die eng begrenzte Definer-Funktion akzeptiert keine Parameter und gewährt keine Schreibrechte auf Fachdatensätze. Auth-Löschung entfernt den Zähler. Details: [AI_MONTH_STATUS.md](../AI_MONTH_STATUS.md).

`profiles` verwendet `user_id` als Primär-/Fremdschlüssel zu `auth.users`, `display_name`, `time_zone`, `currency = EUR` sowie serverseitige Zeitstempel. Constraints, Eigentümer-RLS und explizite Spaltenrechte sind Teil derselben Migration. Die Löschung eines Auth-Nutzers entfernt sein Profil und dessen initiale Finanzdaten ausdrücklich per Kaskade. Ein gespeichertes Profil bedeutet noch nicht abgeschlossenes Onboarding.

`incomes` speichert einen positiven EUR-Betrag mit Monat, `expenses` die monatlichen Fixkostenregeln ab einem Startmonat, `goals` Zielbetrag, Sparstand und geplanten Beitrag. Beträge sind `bigint` mit Obergrenze 99.999.999.999 Cent; die drei Fachtabellen haben stabile UUIDs und eindeutige Slots für die initialen Einträge. `onboarding` speichert ausschließlich Schrittentscheidungen, Startmonat, Revision und finanziellen Abschlusszeitpunkt. Ein eng begrenztes, authentifiziertes Datenbank-RPC verändert die Fachdatensätze und den Status gemeinsam in einer Transaktion; direkte Schreibrechte sind entzogen, Lesen ist durch Eigentümer-RLS geschützt. Vollständige Details und die spätere Erweiterung der Slots: [FINANCIAL_ONBOARDING_STATUS.md](../FINANCIAL_ONBOARDING_STATUS.md).

## Entitäten

`goals.kind` unterscheidet `financial` und `personal`. Persönliche Ziele verwenden Namen, optionales Zieldatum, Revision und dieselben Meilensteine; ihre Beträge und Währung müssen `NULL` sein. Finanzielle Ziele behalten verpflichtende Geldfelder. Finanz-RPCs schließen persönliche Ziele aus; Money zählt ausschließlich finanzielle Ziele. Details und additive Migration: [PERSONAL_GOALS_STATUS.md](../PERSONAL_GOALS_STATUS.md).

`goal_milestones` ergänzt benannte, gleich gewichtete Schritte bestehender Sparziele. Revision, Erledigungs- und Entfernungszeitpunkt schützen gegen konkurrierende und wiederholte Änderungen. Ein zusammengesetzter Fremdschlüssel bindet Nutzer und Ziel; RLS verbirgt fremde und entfernte Einträge. Die Meilenstein-Zählung verändert weder Sparstand noch Rate. Details: [GOAL_MILESTONES_STATUS.md](../GOAL_MILESTONES_STATUS.md).

Die laufende Sparzielverwaltung erweitert `goals` um Revision/Zieldatum und zusätzliche Ziele ohne Onboarding-Slot. `current_minor` ist das korrigierbare Startguthaben; `goal_contributions` enthält tatsächliche Einzahlungen einschließlich Stornokennzeichnung. `goal_rates` enthält Monatsraten ab ihrem Gültigkeitsmonat. Beide Kindtabellen verwenden EUR-Cent, Eigentümer-Fremdschlüssel und RLS. Details: [SAVINGS_GOALS_STATUS.md](../SAVINGS_GOALS_STATUS.md).

Das Fixkosten-/Budget-Inkrement ergänzt `expenses.end_month` und `superseded_by` mit Eigentümer-Fremdschlüssel. Gültigkeitsintervalle ersetzen keine historischen Beträge; ein enges Mutations-RPC erstellt atomar die nachfolgende Fassung. `budgets` ist eine eigene RLS-Tabelle mit genau einem EUR-Limit pro Nutzer/Monat und Revision. Derselbe Monats-Snapshot enthält Budget, vollständige Ausgabensumme und Fixkostenbasis. Details: [FIXED_COSTS_BUDGET_STATUS.md](../FIXED_COSTS_BUDGET_STATUS.md).

Im ersten Money-Inkrement sind die Onboarding-Slots von `incomes` und `expenses` optional für zusätzliche Einträge. Ein Constraint trennt monatliche Fixkosten (`start_month`) von variablen Ausgaben (`spent_on`, feste `category`). Revisionen schützen bearbeitete Zeilen. Ein autorisiertes Mutations-RPC ergänzt CRUD; ein Invoker-RPC liefert vollständige Monatssummen und getrennte 25er-Seiten. Details: [MONEY_TRANSACTIONS_STATUS.md](../MONEY_TRANSACTIONS_STATUS.md). Fixkosten und Goals werden in diesem Task weiter nur aus dem Onboarding übernommen.

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

`tasks` ist als erste Plan-Entität implementiert: Eigentümer, Titel, Priorität, optionaler Kalendertag `due_on`, Revision sowie Erfassungs-, Erledigungs- und Löschzeitpunkt. Entfernte IDs bleiben gegen verspätete Wiederholungen erhalten, sind aber über RLS unsichtbar. Der Fremdschlüssel auf das Profil räumt alle Aufgaben bei Kontolöschung auf. Details: [TASKS_STATUS.md](../TASKS_STATUS.md).

- Authentifizierung ersetzt keine Eigentumsprüfung. `user_id` wird aus verifizierter Identität abgeleitet und nicht ungeprüft aus einer Nutzereingabe übernommen.
- Eigene Tabellen benötigen RLS mit `USING` für bestehende Zeilen und `WITH CHECK` für neue bzw. geänderte Zeilen, eingeschränkt auf den angemeldeten Eigentümer. Policies, Grants und Indizes gehören zur selben Migration wie die Tabelle.
- Bei Beziehungen zwischen eigenen Tabellen müssen Fremdschlüssel bzw. weitere Constraints auch übereinstimmende Eigentümer sichern, z. B. über zusammengesetzte Referenzen `(user_id, id)`. Eine gültige fremde ID darf nicht zu einer gültigen eigenen Beziehung werden.
- Globale vordefinierte Kategorien sind getrennt von privaten Einträgen zu behandeln: freigegebene Lesezugriffe bedeuten keine allgemeinen Schreibrechte.
- Löschregeln und Aufbewahrung werden explizit definiert. Keine pauschale Kaskade über alle Module, die unbemerkt Fachdatensätze löscht.
- Jeder Task mit Persistenz prüft eigene, fremde, anonyme und ungültige Zugriffe sowie den Wechsel von `user_id` in Updates.

## EntityLink

`entity_links` verwendet `id`, `user_id`, `goal_id`, `created_at`, `removed_at` und genau eine zum Beziehungstyp passende Referenz: `budget_id` bei `funded_by`, `task_id` bei `requires`, `calendar_event_id` bei `scheduled_as`. Ein CHECK erzwingt die Kombinationen; zusammengesetzte Eigentümer-Fremdschlüssel und eindeutige Indizes für aktive Paare sichern Identität, Existenz und Duplikatfreiheit. Physisches Löschen eines Endpunkts entfernt nur seine Links. Soft-Delete von Aufgaben/Terminen markiert deren Links in derselben Transaktion ebenfalls als entfernt; eine gemeinsame Onboarding-Sperre serialisiert dies mit dem Anlegen. Die Beziehungen sind Planungskontext ohne Veränderung von Fortschritten oder Beträgen. Regeln: [GOAL_BUDGET_LINKS_STATUS.md](../GOAL_BUDGET_LINKS_STATUS.md), [GOAL_PLAN_LINKS_STATUS.md](../GOAL_PLAN_LINKS_STATUS.md). Die folgende allgemeine Form bleibt Entwurf für weitere Beziehungstypen.

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

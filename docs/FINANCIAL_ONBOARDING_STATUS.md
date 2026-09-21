# Finanzielle Einrichtung – zweites Inkrement von Phase 3

Stand: 20.09.2026. Task-Branch: `codex/financial-onboarding`, aufbauend auf `codex/auth-and-profile`.

Dieser Bericht beschreibt den abgeschlossenen Einrichtungs-Task. Das Folgeinkrement [MONEY_TRANSACTIONS_STATUS.md](MONEY_TRANSACTIONS_STATUS.md) ergänzt inzwischen die laufende Pflege von Einnahmen und variablen Ausgaben. Nach Abschluss führt `/account/overview` zur aktuellen Money-Ansicht des Startmonats; eine separate, veraltete Startrechnung wird nicht weitergeführt.

## Umfang und Abnahme

Nach dem gespeicherten Profil führt „Weiter zur finanziellen Einrichtung“ zu Einkommen, monatlichen Fixkosten, einem ersten Sparziel und einer Abschlussübersicht. Jeder Finanzbereich kann ausdrücklich ausgelassen werden. Gespeicherte Schritte lassen sich vor dem Abschluss erneut öffnen, korrigieren und nach einer Unterbrechung fortsetzen. Der Abschluss führt zu einer persönlichen Startübersicht aus echten eigenen Angaben. Die öffentliche Vorschau bleibt als fiktiv gekennzeichnet.

Abnahmekriterien dieses Tasks:

- Erfasstes Einkommen, bis zu 20 Fixkosten und ein Sparziel bleiben nach Neuladen erhalten; wiederholtes Speichern aktualisiert bestehende Positionen.
- Jeder Bereich verlangt entweder gültige Angaben oder eine ausdrückliche Auslassentscheidung. Eine Auslassentscheidung entfernt zuvor gespeicherte Angaben dieses Einrichtungsschritts, mit entsprechendem Hinweis im Formular.
- Ungültige Beträge, unvollständige Abschlüsse und veraltete Formularstände werden abgewiesen. Eingaben bleiben zur Korrektur sichtbar. Ein Fehler innerhalb eines Schritts rollt dessen gesamte Datenbanktransaktion zurück.
- Nur vollständige Entscheidungen erlauben den Abschluss. Wiederholter Abschluss ist idempotent; abgeschlossene Startdaten können nicht über den Einrichtungsablauf überschrieben werden.
- Alle Datensätze sind privat; anonyme und fremde Zugriffe sowie direkte Schreibversuche werden geprüft. Desktop und Mobil sind mit Tastatur, Lade-, Fehler- und Leerzuständen nutzbar.

Die optionalen Aufgaben aus R02/J01 bleiben dem Plan-Inkrement vorbehalten. Es wird kein Aufgaben-Schritt als erledigt gespeichert. Die vollständige Phase 3 beziehungsweise sämtliche Kriterien aus J01 werden deshalb nicht pauschal als abgeschlossen bezeichnet. Dieser Task implementiert ausschließlich den beauftragten finanziellen Einstieg. Die spätere Money-/Goals-Verwaltung verwendet dieselben Tabellen.

## Konkretisierte Arbeitsannahmen

Der vorgeschlagene Umfang wurde zur Rückmeldung gestellt; bis zur Umsetzung lag keine abweichende Vorgabe vor. Dies sind dokumentierte Arbeitsannahmen, keine behauptete ausdrückliche Bestätigung einzelner Produktregeln.

- Ein gesamtes monatliches Nettoeinkommen für einen wählbaren Startmonat; keine automatische Fortschreibung in spätere Monate. Mehrere Einkommensquellen folgen mit Money.
- Monatliche Fixkosten ab demselben Startmonat, höchstens 20 Positionen. Sie sind Planung und erzeugen keine zusätzlichen Ausgabenbuchungen. Ein Monatswechsel während der Einrichtung verschiebt alle initialen Positionen gemeinsam.
- Korrekturen sind vor Abschluss erlaubt. Danach bleiben die Startdaten in diesem Inkrement lesbar. Historische Änderungen, Gültigkeitsende und Folgemonate werden mit Money Core konkretisiert; O02 wird nicht durch unbemerkte rückwirkende Änderungen vorweggenommen.
- Ein Sparziel mit Name, Zielbetrag, tatsächlich angegebenem Sparstand und geplanter monatlicher Sparrate. Sparstand und Rate dürfen null sein; ein Sparstand oberhalb des Ziels bleibt sichtbar. Eine Rate erzeugt keine Einzahlung. Deadline und Projektion nach O03 gehören zum späteren Goals-Inkrement.
- EUR, Dezimaltext mit Komma oder Punkt und höchstens zwei Nachkommastellen, keine Tausendertrennzeichen. Jeder Betrag ist auf 99.999.999.999 Cent begrenzt (999.999.999,99 EUR). Einkommen, Fixkosten und Zielbetrag müssen positiv sein. Negative Planergebnisse bleiben negativ.
- Geld wird durch Stellenwerte in ganzzahlige Cent umgewandelt, als begrenztes PostgreSQL `bigint` gespeichert und als sicherer JavaScript-Integer transportiert. Aggregationen prüfen den sicheren Integer-Bereich. Keine Dezimal-Float-Arithmetik für Geld.
- Monate sind reine Kalenderdaten mit Tag 1, zwischen Januar 2000 und Dezember 2100. Der anfängliche Vorschlag folgt der Profilzeitzone. Gespeicherte Monatszuordnungen ändern sich nicht durch einen späteren Zeitzonenwechsel.

Der Planwert lautet Einkommen − monatliche Fixkosten − geplante Sparrate. Variable Ausgaben fehlen noch; die Oberfläche nennt dies ausdrücklich. Fehlendes Einkommen oder fehlende Fixkosten erzeugen „Noch unvollständig“, keinen scheinbar gültigen Nullbetrag. Die Startübersicht ist weder ein Kontostand noch ein bereits vollständiges Money-Dashboard.

## Datenbank und Sicherheit

Die Migration `20260921090000_financial_onboarding.sql` ergänzt `incomes`, `expenses`, `goals` sowie `onboarding` für Schrittstatus, Startmonat, Revision und Abschlusszeitpunkt. Finanzbeträge stehen ausschließlich in den Fachtabellen, nicht zusätzlich in einem JSON-Entwurf. Stabile IDs und eindeutige `(user_id, onboarding_slot)`-Schlüssel verhindern doppelte initiale Einträge. Die Slots und ihre Beschränkungen werden mit der späteren vollständigen Verwaltung erweitert; es wird keine zweite Datenbasis aufgebaut.

Alle Tabellen haben RLS und ausschließlich Eigentümer-SELECT. Direkte INSERT/UPDATE/DELETE-Rechte sind entzogen. Ein bewusst eng begrenztes `save_onboarding_step`-RPC führt die Änderungen atomar aus. Es verwendet `SECURITY DEFINER` mit leerem `search_path`, vollständig qualifizierten Tabellen und ausschließlich `auth.uid()` als Eigentümer. Es akzeptiert keine Eigentümer- oder Datensatz-ID, validiert direkte API-Eingaben erneut und ist nur für `authenticated` ausführbar. Seine erhöhten Datenbankrechte dienen dazu, direkte Manipulation von Abschlussstatus und Fachdatensätzen auszuschließen; die Anwendung verwendet weiterhin nur den öffentlichen Schlüssel und die Nutzersitzung. Siehe [Supabase: Function security and privileges](https://supabase.com/docs/guides/database/functions#security-definer-vs-invoker).

Die Funktion sperrt den Nutzerstatus während des Speicherns und vergleicht die erwartete Revision. Bei konkurrierenden Formularen wird eine Anfrage abgewiesen, statt einen neueren Stand zu überschreiben. Normale Nutzer erhalten keine Rechte auf interne Validatorfunktionen. Die Entfernung eines Auth-Kontos löscht über dessen Profil die zugehörigen initialen Finanzdaten ausdrücklich per Kaskade; eine Konto-Löschoberfläche ist weiterhin nicht implementiert.

Server Actions prüfen zusätzlich die Identität mit `getUser()` und validieren Eingaben mit Zod. Fehlermeldungen enthalten keine Datenbankdetails oder Finanzwerte. Alle neuen Routen liegen unter dem bestehenden privaten, nicht cachebaren `/account`-Bereich. Kein Service-Role-Client wird für normale Anfragen verwendet.

## Lokal verwenden und prüfen

1. Lokale Supabase starten und `pnpm exec supabase migration up --local` ausführen.
2. App starten, unter `/auth/signup` registrieren und den Code aus dem lokalen Testpostfach auf Port 54324 bestätigen.
3. Unter `/account` das Profil speichern und die finanzielle Einrichtung öffnen.
4. Schritte erfassen oder ausdrücklich auslassen, Angaben prüfen und abschließen. `/account/onboarding` setzt einen offenen Ablauf fort oder führt zur fertigen Übersicht unter `/account/overview`.

Die bestehenden Qualitätsbefehle bleiben unverändert: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm format:check`, `pnpm test:integration`, `pnpm test:auth`, `pnpm test:e2e`. CI führt dieselben Datenbank- und Browserprüfungen gegen eine temporäre lokale Supabase aus. Finanzielle Browser-Fixtures sind ausschließlich fiktiv und werden wie die Auth-Fixtures gezielt entfernt; Traces bleiben ausgeschaltet.

Die Tests decken Stellenwertkonvertierung, Betragsgrenzen, Null und negative Ergebnisse, Monats-/Jahresgrenzen in Profilzeitzonen, explizites Auslassen, idempotente Änderungen, Transaktions-Rollback, konkurrierende Revisionen, unvollständigen Abschluss und sämtliche Nutzergrenzen ab. Browserprüfungen erfassen vollständige und leere Einrichtung, Wiederaufnahme, Korrektur, serverseitige Betragsfehler und sichtbare Konfliktrückmeldung mit erhaltenen Eingaben. Der tatsächliche externe Prüfstand steht beim aktuellen Commit in [GitHub Actions](https://github.com/LucaEndrich2002/LifeIO/actions).

Lokaler Prüfstand dieses Inkrements: Lint, Typecheck, Formatprüfung und Produktionsbuild erfolgreich; 57 Unit-/Komponententests, 12 Datenbanktests, 14 Auth-/Onboarding-Browsertests und 12 Vorschau-Browsertests bestanden (95 insgesamt). Die persönliche mobile Übersicht im dunklen Farbschema und die Desktop-Konfliktrückmeldung wurden zusätzlich visuell geprüft.

Nächster begrenzter Ausbau: Money Core mit mehreren Einkommensquellen und der laufenden Pflege von Ausgaben und Fixkosten; vor historischen Änderungen die Regeln aus O02 weiter konkretisieren. Keine Bankanbindung, KI, Cloud-Einrichtung oder Veröffentlichung der App in diesem Task.

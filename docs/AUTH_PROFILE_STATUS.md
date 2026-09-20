# Kontozugang und Profil – erstes Inkrement von Phase 3

Stand: 20.09.2026. Arbeitsbranch: `codex/auth-and-profile`, aufgebaut auf dem Dashboard-Branch. Der ursprüngliche Dashboard-Pull-Request bleibt davon getrennt.

## Verfügbar

Über „Mein Konto“ in der Dashboard-Vorschau gelangt man zum geschützten Profil oder zur Anmeldung. Unterstützt werden Registrierung mit E-Mail und Passwort, Bestätigung per sechsstelligen E-Mail-Code, erneuter Codeversand, Anmeldung, Abmeldung der aktuellen Sitzung sowie Passwortwiederherstellung per einmaligem Code. Passwörter haben 12–128 Zeichen; E-Mail-Codes gelten gemäß lokaler Auth-Konfiguration eine Stunde.

Das Profil speichert Anzeigename, explizite IANA-Zeitzone und EUR. Deutsch, Montag als Wochenbeginn und Europe/Berlin als änderbare Voreinstellung sind die im Task vorgeschlagenen Arbeitsannahmen. Es wurde keine abweichende Nutzervorgabe übermittelt. Ein erneutes Speichern aktualisiert denselben Datensatz. Der Kontobereich verwendet eigene Lade-/Fehlerzustände und erklärt die tatsächliche Speicherung; die öffentliche Dashboard-Vorschau bleibt klar als fiktiv gekennzeichnet.

Der Profil-Schritt ist der Beginn des Onboardings. Einkommen, Fixkosten, Sparziel, optionale Aufgaben und der Abschlussstatus aus R02/J01 sind noch nicht implementiert. Phase 3 ist deshalb nicht insgesamt abgeschlossen. Es werden keine fiktiven Finanzwerte in ein neues Konto übernommen.

## Lokal ausprobieren

1. Supabase starten: `pnpm db:start`.
2. Anwendung starten: `pnpm dev`, dann `http://127.0.0.1:3000/auth/signup` öffnen.
3. Mit einer eigenen Entwicklungsadresse registrieren. Das lokale [Testpostfach](http://127.0.0.1:54324) fängt alle Mails ab; es erfolgt kein externer E-Mail-Versand.
4. Den Code aus dem Testpostfach unter „E-Mail bestätigen“ eingeben und das Profil speichern.
5. Abmelden, erneut anmelden und den erhaltenen Profilstand prüfen. „Passwort vergessen?“ verwendet ebenfalls das lokale Testpostfach.

Die Templates in `supabase/templates` enthalten bewusst Codes statt Links mit Sitzungstokens. Codes und Passwörter gehen im POST-Body an Server Actions, nicht in Query-Parameter. Ein separates Cloud-Projekt benötigt die entsprechenden Mailtemplates, produktiven Versand, Datenschutzregion und Schutzmaßnahmen vor öffentlichem Betrieb.

Nach einem Checkout zuerst `pnpm exec supabase migration up --local` ausführen. Änderungen an Auth-Konfiguration oder Mailtemplates benötigen einen Supabase-Stop/Start mit erhaltenen Volumes. Die Windows-Netzwerkregeln und der bekannte Docker-Desktop-Startfehler stehen in [LOCAL_SUPABASE.md](LOCAL_SUPABASE.md).

## Zugriffsschutz und Schema

- `src/proxy.ts` erneuert Sitzungen vor dem Rendern und übernimmt Auth-Cookies sowie Cache-Header in die Antwort. Konto- und Auth-Routen sind `private, no-store`; persönliche Inhalte landen nicht in statischen Seiten.
- Geschützte Seiten und jede Profilmutation verifizieren die Identität serverseitig über `getUser()`. Vom Browser übermittelte Eigentümer-IDs werden nicht übernommen. Server Actions verwenden zusätzlich den Origin-/Host-Abgleich von Next.js.
- Die erste Migration erzeugt `public.profiles` mit Primärschlüssel/Fremdschlüssel zu `auth.users`, Constraints, expliziten Grants und RLS. SELECT, INSERT und UPDATE sind auf den Eigentümer beschränkt; normale Nutzer erhalten kein DELETE und keine Schreibrechte auf Zeitstempel.
- Das Löschen eines Auth-Kontos entfernt dessen Profil per ausdrücklich definierter Kaskade. Eine Konto-Löschfunktion in der App ist noch nicht Teil dieses Inkrements.
- Datenbanktypen in `src/types/database.ts` wurden aus dem lokalen Schema generiert. Das Windows-Kommando benötigt beim vorhandenen Netzwerk `--network-id lifeos-local`.
- Der normale Anwendungscode verwendet ausschließlich den Publishable Key und die Sitzung des Nutzers. Privilegierte Schlüssel werden nur im lokalen Testprozess für Fixture-Erzeugung und gezielte Bereinigung verwendet; sämtliche Rechteprüfungen laufen mit Nutzer- bzw. anonymem Client.

## Validierung

| Prüfung                              | Ergebnis                                                          |
| ------------------------------------ | ----------------------------------------------------------------- |
| Lint, Typecheck und Produktionsbuild | Erfolgreich                                                       |
| `pnpm test`                          | 37 Unit-/Komponententests erfolgreich                             |
| `pnpm test:integration`              | 6 echte Datenbanktests erfolgreich                                |
| `pnpm test:auth`                     | 8 Browsertests erfolgreich, Desktop und 375-px-Mobilgerät         |
| `pnpm test:e2e --workers=1`          | 12 bestehende Vorschau-/Navigationstests erfolgreich              |
| Visuelle Prüfung                     | Desktop-Profil und mobile Anmeldung im dunklen Farbschema geprüft |

Die Integrationstests decken eigene und fremde Daten, direkte ID-Manipulation, Upsert, Eigentümerwechsel, anonyme Zugriffe, unzulässige Währung/Zeitzone/Namen, unveränderbare Zeitstempel und Zugriff nach Abmeldung ab. Die Auth-Browsertests prüfen Registrierung mit echtem lokalen Mailversand, Speicherung nach Neuladen, erneute Anmeldung, abgelehnte falsche Codes und alte Passwörter, gefälschte Sitzungscookies sowie tatsächliche Cookie-Erneuerung bei einer abgelaufenen Sitzung. Fixtures werden anschließend gezielt entfernt.

Die Tests benötigen eine laufende lokale Supabase-Instanz. `scripts/test-supabase.mjs` liest die CLI-Konfiguration nur im Speicher, weist entfernte Endpunkte ab und startet die jeweilige Testsuite. Der private Fixture-Schlüssel wird nicht an den App-Testserver weitergegeben. Auth-Traces bleiben ausgeschaltet, damit Passwörter, Codes und Cookies nicht in CI-Artefakten landen.

GitHub Actions startet Supabase mit demselben Schema, führt sowohl RLS- als auch Auth-Browsertests aus und stoppt die Testdatenbank abschließend. Die tatsächlichen Ergebnisse stehen bei den [Actions-Läufen](https://github.com/LucaEndrich2002/LifeIO/actions) und im Pull Request. Ohne erfolgreichen Lauf für dessen aktuellen Commit gilt die externe Prüfung nicht als abgeschlossen.

## Nächster begrenzter Schritt

Das restliche Onboarding aus R02: Einkommen, Fixkosten und erstes Sparziel mit ausdrücklich speicherbaren Auslassentscheidungen, Wiederaufnahme und einem korrekten Abschlussstatus. Vor finanzieller Persistenz sind Betragsgrenzen und die dafür relevanten Regeln aus O02/O03 im [PRD](product/PRD.md) festzulegen. Vollständige Money-/Goals-Verwaltung, Cloud-Betrieb und Deployment bleiben eigene Aufgaben.

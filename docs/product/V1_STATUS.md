# LifeOS – Verbleibender V1-Umfang

Stand: 27.10.2026. Diese Übersicht bündelt die offenen Arbeiten in drei Pakete. Sie ist keine Anzahl gleich großer Tickets oder Aufwandsschätzung. Historische Statussätze in älteren Inkrement-Berichten beschreiben deren damaligen Stand.

## Bereits umgesetzt

Lokales Projektfundament und GitHub-Prüfungen; responsive Oberfläche mit hellem/dunklem Design; Kontozugang, Profil und Einstieg einschließlich optionaler erster Aufgaben; Einnahmen, variable Ausgaben, historische Fixkostenfassungen und Monatsbudget; Sparziele mit Einzahlungen, Ratenverlauf und Prognose; persönliche Ziele und Meilensteine; Aufgaben, Kalender sowie Zielverknüpfungen; persönliches Home mit berechneten Hinweisen. Life AI hat sechs autorisierte Lesezugriffe und freizugebende Ansichten für Finanzmonat, einzelne Sparprognose, mehrere Ziele und Aufgaben/Termine der aktuellen Woche.

Der funktionale Einstieg nach R02/J01 ist ergänzt: [ONBOARDING_TASKS_STATUS.md](../ONBOARDING_TASKS_STATUS.md).

Der gespeicherte Wochenrückblick nach R13 zeigt Finanzen, Budgets, Ziele, Aufgaben und Fristen mit deterministischen Hinweisen, Datenstand und ausdrücklicher Aktualisierung ohne Duplikate: [WEEKLY_REVIEW_STATUS.md](../WEEKLY_REVIEW_STATUS.md).

Die In-App-Hinweisliste nach R14 wertet vier festgelegte Auslöser auf Klick aus und speichert Anlass, eigenen Quellenverweis und Lesestatus ohne Duplikate. O05 ist für V1 konkretisiert: [NOTIFICATIONS_STATUS.md](../NOTIFICATIONS_STATUS.md).

Implementierter Funktionsumfang ersetzt keine ausstehende Gesamtabnahme oder Veröffentlichung. Die Änderungen liegen auf Arbeitsbranches und Pull Requests; ihre Integration in den Hauptbranch ist separat zu prüfen.

## Drei offene Arbeitspakete

| Paket                                 | Noch erforderlich                                                                                                                                                                                                                                                                                                                  | Bezug             |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 1. Life AI abschließen                | Tatsächliche Antwortqualität prüfen. Dies ist auf Nutzerwunsch ausdrücklich ausgesetzt; die lesenden Ansichten einschließlich des Home-KI-Bereichs sind implementiert.                                                                                                                                                             | Phase 8, R11–R12  |
| 2. Verständlichkeit abnehmen          | Home mit fünf Testpersonen prüfen: dieselben drei Kernfragen innerhalb von zehn Sekunden korrekt beantworten. Automatisierte Tests ersetzen diese Prüfung nicht.                                                                                                                                                                   | Phase 7, J05      |
| 3. Onlinebetrieb und Beta vorbereiten | Gesamtprüfung von Auth/RLS, Datenflüssen, Logs, Rate Limits, Secrets und Validierung; Datenschutzregion und Aufbewahrungs-/Löschkonzept festlegen; Backup/Restore und Migrationen prüfen; Supabase Cloud und Vercel einrichten; offene Änderungen integrieren; Beta mit 10–30 Personen und festgelegten Messkriterien durchführen. | Phase 10, O07–O08 |

Keine dieser externen oder manuellen Abnahmen wird ohne tatsächliche Durchführung als bestanden gewertet. Automatische Sicherheits- und Funktionstests laufen bereits während der Entwicklung.

Für Paket 2 ist ein ausführbares [Home-Testpaket mit Anleitung und Lösungsschlüssel](../HOME_COMPREHENSION_TEST.md) vorbereitet: isolierte fiktive Aufnahme der echten Oberfläche, Zehn-Sekunden-Anzeige und leeres Protokoll für fünf Personen. Die tatsächliche Durchführung und Auswertung bleiben offen.

Am 17.10.2026 bestanden beide GitHub-Prüfungen des Home-Testpaket-PR #24. Eine neue [gemeinsame Datenbankprüfung](../DATABASE_SECURITY_STATUS.md) erfasst alle 15 Anwendungstabellen und 28 Funktionen sowie Rollen, Spaltenrechte und Eigentümer-Policies. Sie ergänzt die bestehenden Isolationstests; Paket 3 bleibt bis zur vollständigen Abnahme offen.

## Was konkret noch fehlt

Eine [durchgesetzte Content Security Policy](../CONTENT_SECURITY_POLICY_STATUS.md) ergänzt inzwischen den Browserschutz für Vorschau, Auth und Konto. Die vollständige Produktionshärtung einschließlich Prüfung in der späteren Hostingumgebung bleibt offen.

Eine [lokale logische Wiederherstellungsprobe](../BACKUP_RESTORE_STATUS.md) ergänzt Paket 3: fiktive Daten werden tatsächlich gesichert und in eine leere Datenbank zurückgespielt; Daten, Schema und Rechte werden verglichen. Die gemeinsame Rollenbasis, synthetischen Auth-Referenzen und offenen Betriebsanforderungen sind ausdrücklich abgegrenzt. Dies ersetzt keine vollständige Supabase-/Cloud-Wiederherstellung oder Migrationsprobe mit vorhandenem Datenbestand.

Eine [begrenzte Migrationsprobe](../MIGRATION_EXISTING_DATA_STATUS.md) ergänzt inzwischen drei bereits vor der Sparziel-Migration angelegte fiktive Konten. Sie prüft Erhalt alter Daten, historische Raten, späteren Einrichtungsabschluss und Eigentümerrechte durch alle nachfolgenden SQL-Dateien. Andere Altbestände bleiben offen; den tatsächlichen CLI-Ablauf ergänzt die unten beschriebene Probe.

Diese Prüfliste zerlegt die drei Pakete; die Zeilen sind keine zusätzlichen Produktphasen. Sie ist eine Bestandsaufnahme, keine Freigabe für Cloud-Ausgaben, Veröffentlichung oder Zusammenführen von Pull Requests.

Der [Wiederanlaufleitfaden und die CLI-Probe](../RECOVERY_RUNBOOK.md) ergänzen den tatsächlichen Migrationsweg einschließlich kontrolliertem Fehler, Rücknahme und erneutem Lauf. Die vollständige Supabase-/Auth-Wiederherstellung bleibt offen.

Das [Inventar zu Logs, Geheimnissen und Anfragegrenzen](../LOGS_SECRETS_LIMITS_STATUS.md) trennt vorhandene lokale Nachweise von offenen Hosting- und Betriebsaufgaben. Ein gefundener Fehlerpfad im lokalen Teststarter wurde abgesichert: ungültige CLI-Werte werden nicht mehr über rohe Parser-/URL-Fehler ausgegeben. Dies ist keine vollständige Produktionshärtung.

| Bereich                  | Offener Abschluss / Nachweis                                                                                                                                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home-Abnahme             | Fünf unbeeinflusste Erstversuche durchführen, Zeit und Antworten erfassen; bei Missverständnissen korrigieren und erneut abnehmen. Das neue Paket liefert Material, keine Testergebnisse.                                                                                       |
| KI-Antworten             | Echte Antworten für Monat, Sparprognose, Zielübersicht und Wochenplanung auf Richtigkeit, Quellen und Verständlichkeit prüfen. Auf Nutzerwunsch ausgesetzt; der Verzicht ist kein bestandener Test.                                                                             |
| Hauptbranch              | Die gestapelten Funktions-PRs prüfen und in Abhängigkeitsreihenfolge integrieren, danach den zusammengeführten Stand vollständig prüfen. Am 16.10.2026 lagen vor diesem Testpaket 23 offene PRs (#1–#23) vor; beide Prüfungen von #23 waren erfolgreich.                        |
| Sicherheitsabnahme       | Auth, Sitzungen, RLS und bereichsübergreifende Zugriffe insgesamt prüfen; offene Befunde beheben. Vorhandene negative Rechte- und Funktionstests sind eine Grundlage, keine abschließende Beta-Freigabe.                                                                        |
| Produktionshärtung       | Datenflüsse, Logs, Validierung, Anfragegrenzen, passende Content Security Policy und produktive Secret-Verwaltung prüfen bzw. vervollständigen. Abhängigkeiten und ihre unterstützten Versionen gemeinsam überprüfen; dokumentierte Tooling-Grenzen berücksichtigen.            |
| Datenschutz und Löschung | Cloud-Region und Datenempfänger festlegen; Aufbewahrungs-/Löschkonzept sowie tatsächlich ausführbare Löschabläufe definieren und prüfen. Erforderliche Nutzerinformationen daraus ableiten.                                                                                     |
| Sicherung und Änderungen | Backup und tatsächliche Wiederherstellung erproben, Migrationen mit vorhandenem Datenbestand testen und Wiederanlauf/Rückfallablauf dokumentieren. Keine Probe durch Zurücksetzen echter Daten ersetzen.                                                                        |
| Hosting                  | Supabase Cloud und Vercel konfigurieren; Umgebungen, erlaubte Auth-URLs, E-Mail-Zustellung, HTTPS und Zugangsdaten einrichten. Danach Registrierung, Anmeldung, Wiederherstellung und Kernabläufe auf der echten Zielumgebung prüfen. Lokal laufend bedeutet noch nicht online. |
| Betrieb                  | Fehlererkennung, Zuständigkeit, Support- und Störungsablauf sowie Kosten-/Kapazitätsgrenzen für die Beta festlegen und prüfen. Keine Finanzinhalte oder Tokens in Telemetrie übernehmen.                                                                                        |
| Beta-Messplan            | Die vorgeschlagenen PRD-Kennzahlen und geschäftlichen Erfolgsschwellen vorab beschließen (O08). Datenschutzregion bleibt Teil von O07. Die ausgesetzte KI-Abnahme bei der Freigabe ausdrücklich berücksichtigen.                                                                |
| Beta-Durchführung        | 10–30 reale Testpersonen einladen, Kernabläufe und Nutzung beobachten, Fehler/Feedback auswerten und erforderliche Korrekturen erneut prüfen. Erst danach den tatsächlichen Freigabestand festhalten.                                                                           |

Die nächste externe Voraussetzung für J05 sind fünf Testpersonen. Für Hosting und Beta werden danach konkrete Konto-/Region-/Kosten- und Produktentscheidungen gebraucht. Diese werden nicht stillschweigend durch technische Defaults ersetzt.

## Abgrenzung

Die Planungserklärung zeigt offene Aufgaben dieser Woche und noch anstehende Termine. Der gespeicherte Wochenrückblick ist zusätzlich umgesetzt und benötigt keine KI-Anfragen. Einzelne Sparprognosen und eine seitenweise Einordnung mehrerer Ziele sind vorhanden. Monat, Woche und Zielseite lassen sich auch direkt im KI-Bereich auf Home erklären; die Abnahme echter Antworten bleibt ausgesetzt.

Schreibende KI-Aktionen, externe Kalender, Bankanbindung und die späteren Produktversionen gehören nicht in diesen Restumfang. Eine Zahlungsintegration folgt erst nach belegtem Produktnutzen. Historische Fixkostenkorrekturen benötigen eine eigene Regelentscheidung; bestehende Fassungen bleiben erhalten, rückwirkendes Umschreiben wird nicht stillschweigend eingeführt.

Grundlage: [PRD](PRD.md), [Roadmap](ROADMAP.md), [Home-KI](../HOME_AI_STATUS.md).

Die [getrennte Auth-Quellprobe](../AUTH_RECOVERY_ACCEPTANCE.md) prüft Registrierung, lokale E-Mail-Bestätigung, Passwortanmeldung und abgewiesene Zugangsdaten mit eigenen kurzlebigen Diensten. Sie ersetzt noch keine Wiederherstellung in einen unabhängigen Zielcluster oder eine Abnahme der Data API nach Restore.

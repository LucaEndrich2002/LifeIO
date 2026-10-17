# Gemeinsame Prüfung der Datenbankrechte

Stand: 17.10.2026. Begrenzte Sicherheitsprüfung des bestehenden V1-Schemas, keine vollständige Sicherheits- oder Beta-Freigabe.

## Ergebnis und Umfang

Die lokale Datenbank enthält 15 Anwendungstabellen und 28 Funktionen im Schema `public`. Die fünf neuen gemeinsamen Prüfungen bestehen für diesen Stand. Im geprüften Umfang wurden keine unzulässigen Freigaben gefunden; eine Änderung der Datenbankrechte war nicht erforderlich.

| Prüfung                | Verbindliche Grenze                                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API-Rollen             | `anon` und `authenticated` sind weder Superuser noch RLS-Bypass-Rollen. Sie dürfen keine Rollen, Datenbanken oder Objekte in `public` erstellen, replizieren oder eine andere Rolle übernehmen.                                                                                                                                                                 |
| Vollständiges Inventar | Alle 15 Tabellen sind ausdrücklich aufgeführt, gehören `postgres`, haben RLS aktiviert und eine verpflichtende UUID-Eigentümerspalte. Zusätzliche Tabellen, Views oder andere Relationen benötigen eine eigene Prüfung.                                                                                                                                         |
| Wirksame Rechte        | Anonyme Aufrufer erhalten keine Tabellen- oder Spaltenrechte. Angemeldete Nutzer haben SELECT; direktes INSERT/UPDATE ist ausschließlich für die vier freigegebenen Profilspalten möglich. Sonstige Writes, TRUNCATE, Trigger-/Wartungsrechte und Weitergabe von Rechten sind nicht erlaubt.                                                                    |
| Eigentümerregeln       | Jede Lesepolicy vergleicht die Eigentümer-ID mit `auth.uid()`. Bei Aufgaben, Terminen, Meilensteinen und Verknüpfungen werden entfernte Datensätze ausgeschlossen. Nur das Profil besitzt zusätzliche Insert-/Update-Policies, ebenfalls mit Eigentümerprüfung. Zusätzliche permissive Policies oder offene Bedingungen schlagen fehl.                          |
| Funktionsgrenzen       | Das Inventar prüft vollständige Signaturen einschließlich Überladungen. Anonyme Aufrufe sind gesperrt; nur die 23 festgelegten Funktionen sind für angemeldete Nutzer ausführbar. Fünf interne Hilfs-/Triggerfunktionen bleiben gesperrt. Owner, Invoker-/Definer-Modus und leerer Suchpfad sind festgelegt; Nutzer dürfen Ausführungsrechte nicht weitergeben. |

Der Test prüft die tatsächlich installierten Katalogeinträge und wirksamen Rechte, einschließlich über PUBLIC bzw. Rollenmitgliedschaften erhaltenen Rechten. Spaltenrechte werden separat erfasst: Ein fehlendes Tabellen-Schreibrecht allein würde zusätzliche Spaltenfreigaben nicht erkennen. Grundlage sind die PostgreSQL-17-Dokumentation zu [Rechteabfragen](https://www.postgresql.org/docs/17/functions-info.html#FUNCTIONS-INFO-ACCESS-TABLE), [Policies](https://www.postgresql.org/docs/17/catalog-pg-policy.html) und [Row-Level Security](https://www.postgresql.org/docs/17/ddl-rowsecurity.html).

## Ausführung und Datenschutz

`pnpm test:integration` führt `tests/integration/security-posture.test.ts` neben den vorhandenen Zwei-Nutzer- und anonymen Negativtests aus. Der bestehende CI-Ablauf nimmt die neue Datei automatisch mit auf. Keine neuen Abhängigkeiten, Produktrouten oder Migrationen sind erforderlich.

Lokaler Prüfstand am 17.10.2026: Lint, Typecheck, Formatprüfung und Produktionsbuild bestanden. Alle 187 Unit- und 132 Datenbanktests sind erfolgreich, einschließlich der fünf neuen Katalogprüfungen. Produktoberfläche und Nutzerabläufe wurden nicht verändert; die bestehenden Browserprüfungen laufen im CI weiterhin mit. Der CI-Stand dieses Inkrements ist im zugehörigen Pull Request separat zu prüfen.

Der ausschließlich im Testcode verwendete Katalogleser `tests/supabase/security-catalog.ts` akzeptiert nur eine Loopback-Supabase-Konfiguration und einen lokalen Docker-Endpunkt. Er liest über den festen Container `supabase_db_lifeos` ausschließlich die feste Abfrage `security-catalog.sql`. Eine READ-ONLY-Transaktion, SQL-/Prozesszeitlimits und eine Ausgabegrenze begrenzen die Ausführung. Es werden weder Anwendungszeilen noch Passwörter, Tokens oder finanzielle Inhalte gelesen. Die Abfrage legt keine Objekte an und ändert keine Rechte. Der privilegierte Katalogzugriff wird nicht in App-Code importiert; normale Anwendungszugriffe bleiben bei Nutzerclient und RLS.

Inventar, erlaubte Profilspalten und Policy-Ausdrücke sind bewusst explizit. Eine Schemaänderung oder neue Funktion darf nicht durch blindes Aktualisieren der Liste akzeptiert werden: Berechtigung, Eigentümerregel, Aufrufgrenze und passende Zwei-Nutzer-Tests müssen zuerst geprüft werden. PostgreSQL-Darstellungsänderungen bei Policy-Ausdrücken können ebenfalls eine bewusste Anpassung erfordern. Der Check repariert nichts automatisch.

## Was dieser Nachweis nicht abdeckt

Die Katalogprüfung beweist nicht die vollständige Fachlogik und Eigentümerkontrolle innerhalb aller privilegierten Funktionskörper. Dafür bleiben die vorhandenen anonymen und Zwei-Nutzer-Integrationstests sowie die Codeprüfung erforderlich. Nicht untersucht werden hier Supabase-interne Schemas, Cloud-Konfiguration, Endgeräte oder Infrastruktur außerhalb des lokalen Anwendungsschemas.

Weiterhin offen sind die Gesamtprüfung von Auth/Sitzungen und Datenflüssen, produktive Anfragegrenzen, CSP, Log-/Secret-Verwaltung, Datenschutz-/Löschabläufe, Backups und Wiederherstellung, Hosting und Beta. J05 benötigt weiterhin fünf echte Testpersonen. Die echte KI-Antwortqualität bleibt auf Nutzerwunsch ausgesetzt. Der vorherige Home-Testpaket-PR #24 hat beide GitHub-Prüfungen bestanden; dessen Erfolg ersetzt keine menschliche Abnahme.

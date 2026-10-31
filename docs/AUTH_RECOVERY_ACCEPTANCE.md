# LifeOS – Abnahme einer unabhängigen Auth-Wiederherstellung

Stand: 31.10.2026. Die Abschnitte vom 29.10. beschreiben die Vorbereitung und die geprüfte Quelle. Das neue Inkrement für einen unabhängigen Zielcluster samt Prüfstand steht am Ende. Frühere Ergebnisse bleiben in [BACKUP_RESTORE_STATUS.md](BACKUP_RESTORE_STATUS.md) und [RECOVERY_RUNBOOK.md](RECOVERY_RUNBOOK.md) abgegrenzt.

## Warum ein zusätzlicher Nachweis nötig ist

Die bisherige Wiederherstellungsprobe verwendet zwei Datenbanken im selben PostgreSQL-Container. Beide teilen Clusterrollen. Ihre zwei Konten sind direkt eingefügte Auth-Referenzen ohne nutzbares Passwort. Deshalb belegt der erfolgreiche SQL-Restore weder Anmeldung noch eine Wiederherstellung in einem unabhängigen Cluster. Die neue CLI-Probe schließt diese Lücke ebenfalls nicht.

## Am 29.10. um 04:29 UTC rein lesend festgestellte Voraussetzungen

- Die laufende lokale Umgebung verwendet PostgreSQL `17.6.1.167`, GoTrue `v2.196.0`, PostgREST `v16.2`, Kong `2.8.1` und Mailpit `v1.30.2`. Die zugehörigen Images sind bereits vorhanden; ein weiterer Download ist für einen versionsgleichen Versuch zunächst nicht nötig.
- Docker Engine `29.8.0`, acht CPUs, rund 7,66 GiB Docker-Arbeitsspeicher insgesamt. Das ist keine Aussage über aktuell freien Arbeitsspeicher. Auf C: waren 6,11 GiB frei; vor dem Versuch erneut prüfen. Keine Images/Volumes der laufenden Umgebung löschen, um Platz zu gewinnen.
- Das bestehende Projekt verlangt bestätigte E-Mail-Adressen. Ein Versuch mit automatisch bestätigten Konten würde den tatsächlichen Einstiegsablauf nicht abdecken. Fiktive Bestätigungsmails benötigen einen eigenen lokalen Mailpit-Dienst.
- Keine Bestandsdaten, Zugangsdaten, Container-Konfigurationen mit Secret-Werten oder Backups wurden ausgelesen. Es wurden keine neuen Dienste gestartet.

## Aufbau der Probe

Zuerst eine eigene Quelle mit PostgreSQL, GoTrue und Mailpit erzeugen. Die Versionen aus der Bestandsaufnahme ausdrücklich verwenden, kein impliziter Image-Download. Ein eigener Ressourcenname, Kennzeichnungen, lokale Zielprüfung, Speichergrenzen, Zeitlimits und gezielte Bereinigung müssen vor dem ersten schreibenden Test stehen. Keine bestehende Supabase-Instanz als Quelle oder Ziel verwenden; keine fremden Datenbankadressen als Argument akzeptieren.

Zwei fiktive Konten über den Auth-Dienst registrieren, die ausschließlich lokal zugestellte Bestätigung abschließen und beide mit Passwort anmelden. Die Auth-Antworten müssen verwertbare Benutzeridentitäten liefern. Erst diese Identitäten verwenden, um über vorhandene autorisierte Anwendungsoperationen Testdaten zu erzeugen. Keine direkt eingefügten `auth.users`-Zeilen als Ersatz für diesen Nachweis akzeptieren. Codes, Sitzungstokens und vollständige Auth-Antworten werden nur im Arbeitsspeicher verarbeitet und nicht in Prüflogs geschrieben. Für die eigenen kurzlebigen Dienste werden ausschließlich zufällige fiktive Zugangsdaten erzeugt.

Danach den Wiederherstellungsschritt in einer zweiten, tatsächlich unabhängigen PostgreSQL-Instanz mit eigenem Datenverzeichnis erproben. Der Zielcluster erhält eine frisch erzeugte Rollenbasis und eigene Dienstpasswörter. Rollenattribute, Mitgliedschaften und Objekteigentümer müssen geprüft werden; identische Rollennamen allein sind kein Nachweis. Ein Vergleich mit einer zweiten Datenbank desselben Clusters reicht nicht.

## Abnahmekriterien für die Wiederherstellung

1. Beide Konten können sich nach Wiederherstellung neu anmelden. Identität, Bestätigungsstatus, Profil und zuvor erfasste Anwendungsdaten bleiben erhalten. Falsches Passwort und unbestätigter Zugang werden weiterhin abgewiesen.
2. Quelle und Ziel verwenden getrennte Prozesse, Verzeichnisse und Datenbankverbindungen. Eine nur in der Quelle erzeugte Änderung nach der Sicherung fehlt im Ziel. Sie darf nicht durch eine versehentliche Verbindung zum Quellcluster sichtbar werden.
3. Daten, Constraints, RLS, Grants, Rollenmitgliedschaften, Auth-Trigger und Migrationshistorie werden nach Restore verglichen. Ein neuer JWT aus der Zielanmeldung muss eigenen Zugriff ermöglichen; fremde und anonyme Zugriffe müssen scheitern. Ein bloß manuell gesetzter SQL-Claim ersetzt diese Prüfung nicht.
4. Ein Neustart des Ziel-Auth-Dienstes erhält die Anmeldungsmöglichkeit. Verlust bzw. bewusst andere Signierschlüssel und der Umgang mit bereits ausgegebenen Sitzungen werden separat dokumentiert. Keine allgemeine sofortige Token-Ungültigkeit aus einem einzelnen negativen Test ableiten.
5. Die Probe muss bei beschädigtem Auth-Datenbestand oder falschen Ziel-Dienstzugängen scheitern und ausschließlich eigene Ressourcen bereinigen. Ein positiver Kontrolllauf muss anschließend erfolgreich sein.

Ein Test mit Datenbank, Auth und lokalem Postfach ist zunächst ein **Auth-/Datenbank-Nachweis**. Erst zusätzliche Prüfungen über die tatsächliche Data API, Gateway-Konfiguration und LifeOS-Browserabläufe dürfen ihn zu einem vollständigen Supabase-/App-Wiederanlauf erweitern. Studio, externe Mailzustellung, Speicherobjekte, Cloud-Konfiguration und produktive Schlüsselverwaltung sind dadurch nicht automatisch abgenommen.

## Sicherungsumfang und offene Grenzen

Die [offizielle Supabase-Anleitung](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) behandelt Rollen, Schema, Daten und Migrationshistorie getrennt. Sie nennt zudem Besonderheiten verwalteter Schemas und eigener Login-Rollen. Diese Bereiche müssen ausdrücklich im Testinventar stehen; eine erfolgreiche Wiederherstellung von `public` allein genügt nicht.

Die konkrete Sicherungs-/Restore-Reihenfolge wird erst an den getrennten Testinstanzen festgelegt und geprüft. Keine fremden Cloud-Reparaturbefehle ungeprüft übernehmen, keine Trigger-/Eigentümerprüfung abschalten, um Fehler zu übergehen. Sicherungsintervalle, externe verschlüsselte Ablage, Verlustfenster, Wiederanlaufzeit und Aufbewahrung bleiben eigenständige Betriebsentscheidungen. Echte KI-/OpenAI-Live-Tests bleiben ausgesetzt.

## Ausführbare Auth-Quelle als erstes Inkrement

`pnpm test:auth:source` startet ausschließlich eigene temporäre PostgreSQL-, GoTrue- und Mailpit-Container mit den oben genannten Versionen. Sie teilen den Netzwerk-Namensraum der Testdatenbank; SMTP und die Auth-Datenbankverbindung verwenden darin Loopback. Am Host sind ausschließlich die beiden geprüften HTTP-Ports von Auth und Mailpit lokal erreichbar, kein zusätzlicher Datenbank- oder SMTP-Port. Die bestehende Datenbank wird nicht verwendet. Das Skript akzeptiert keine Argumente, nutzt vorhandene Images ohne impliziten Download und benötigt Docker 28+.

Die zwei Konten entstehen über `/signup`. Unbestätigte Konten dürfen sich nicht anmelden. Die Probe liest die Bestätigungsnachricht ausschließlich aus dem eigenen Mailpit, prüft die enthaltene Zieladresse und bestätigt über `/verify`. Danach werden falsches Passwort, erfolgreiche Passwortanmeldung und `/user` mit gültigem, fehlendem und manipuliertem Token geprüft. Kein Bestätigungslink wird als Browserweiterleitung verfolgt. Unter GoTrue `v2.196.0` muss die manipulierte Signatur mit HTTP 403 und `bad_jwt` scheitern; die fehlende Anmeldung mit HTTP 401 und `no_authorization`. [Versionsgebundener Auth-Code](https://github.com/supabase/auth/blob/v2.196.0/internal/api/auth.go).

Die von Auth zurückgegebenen Identitäten werden als Eigentümer zweier Profile verwendet, die mit der Rolle `authenticated` und aktiver RLS entstehen. Beide Profile existieren vor der Zugriffsprüfung; jedes Konto sieht über die SQL-Prüfung nur sein eigenes. Das ist ausdrücklich noch kein Zugriff mit dem JWT über PostgREST und kein Test der LifeOS-Registrierungsoberfläche. Ein Auth-Signup erzeugt in LifeOS nicht automatisch ein Profil.

Container und Netzwerk werden per ID und eigener Kennzeichnung geprüft, HTTP-Zielbindungen vor jeder Anfrage erneut kontrolliert. Dienste sind auf 768/256/128 MiB begrenzt; Datenbank und Postfach verwenden begrenzte temporäre Speicher. HTTP-Antworten sind auf 64 KiB und zehn Sekunden begrenzt. Auth-/Mailpit-Container verwenden keinen Docker-Logspeicher; rohe Antworten, Codes und Tokens werden nicht ausgegeben. Zufällige fiktive Dienstzugänge stehen während des Laufs in der eigenen Containerkonfiguration und verschwinden bei deren Bereinigung. Kein echter Provider, externes Postfach, Service-Role-Zugang oder bestehendes Benutzerkonto wird verwendet.

Erfolg und Fehler entfernen nur die eigenen per Kennzeichnung geprüften Dienste, danach Datenbank und Netzwerk. Nach hartem Abbruch ausschließlich Ressourcen mit dem konkreten Namen `lifeos-auth-source-…` und `io.lifeos.auth-source-rehearsal` prüfen. Die bisherigen Restore-/SQL-Proben bleiben netzwerklos; die CLI-Probe verwendet dieselbe gemeinsame Prüfung ihres eigenen Netzwerkziels.

## Prüfstand dieses Inkrements

Die neue Auth-Quelle besteht lokal, ebenso die bisherigen drei Datenbankproben, Lint, Typecheck, 196 Unit-Tests, 19 Werkzeugtests, Build und 16 öffentliche Browserfälle. Die endgültige Formatprüfung besteht. Eine erste Erwartung von HTTP 401 für manipulierte Tokens war falsch: die isolierte Diagnose bestätigte 403, `bad_jwt` und keine zurückgegebene Identität. Die Prüfung verlangt jetzt genau diese Ablehnung; der frühere Lauf zählt nicht als bestanden.

Vor der Ausführung musste der erneut bestätigte lokale Docker-Socket-Fehler mit dem dokumentierten reversiblen Verfahren behoben werden. Die sieben vorhandenen LifeOS-Dienste liefen anschließend wieder; eigene Probecontainer und Netzwerke wurden entfernt. Details: [LOCAL_SUPABASE.md](LOCAL_SUPABASE.md).

Noch kein neues Backup, Zielcluster oder Restore ausgeführt. Neustart, Schlüsselwechsel, tatsächliche Data-API-/App-Zugriffe und die obigen Wiederherstellungskriterien bleiben offen. Dieses Inkrement schafft ausschließlich die bestätigte Auth-Quelle für die nächste Probe.

[PR #33](https://github.com/LucaEndrich2002/LifeIO/pull/33), Code `d3e8b1ebf3b4b7bfa1d70a1b544acd16be5d79ea`: beide vollständigen GitHub-Läufe bestanden, [Push 40855330613](https://github.com/LucaEndrich2002/LifeIO/actions/runs/40855330613) und [PR 40855339892](https://github.com/LucaEndrich2002/LifeIO/actions/runs/40855339892). Enthalten: Format, Lint, Typecheck, Build, 196 Unit-, 19 Werkzeug-, 132 Integrations-, 16 öffentliche und 124 private Browserprüfungen, alle vier Datenbank-/Auth-Proben und das Home-Testpaket. Kein Main-Merge oder Deployment.

Eine zusätzliche lokale Prüfkopie mit automatischer E-Mail-Bestätigung scheiterte erwartungsgemäß vor dem erfolgreichen Login. Ihre eigenen Ressourcen wurden entfernt. Diese Gegenprobe ist kein zusätzlicher permanenter CI-Testfall.

## Unabhängiger Zielcluster und Data API (31.10.)

`pnpm test:auth:restore` ergänzt die bestätigte Quelle um ein unbestätigtes Konto und zwei fiktive Einkommen, angelegt über den bestehenden Einrichtungsaufruf mit Nutzerrechten. Zwei PostgreSQL-Container haben getrennte Prozesse und Daten-tmpfs; verschiedene Container- und PostgreSQL-Systemkennungen sind Pflicht. Clusterrollen entstehen jeweils frisch aus dem festgeschriebenen Image. Ihre Fähigkeiten und Mitgliedschaften werden verglichen; globale Rollen und Dienstpasswörter werden **nicht aus dem Backup wiederhergestellt**.

`pg_dump --format=custom` sichert `public`, `auth` und `supabase_migrations`. Das begrenzte Archiv wird binär im Arbeitsspeicher übertragen, ohne Hostdatei oder Ausgabe seiner Inhalte. Im unabhängigen Cluster entsteht eine leere Datenbank aus `template0` mit erhaltenem Standard-Public-Schema. Aus der Restore-Liste wird ausschließlich dessen eindeutig geprüfter doppelter `CREATE SCHEMA`-Eintrag ausgenommen; sein Eigentümer wird vorab geprüft, sämtliche ACL-, Kommentar- und Daten-Einträge bleiben enthalten. `pg_restore --exit-on-error --single-transaction` erhält Eigentümer und Rechte. Ein abgeschnittenes Archiv muss scheitern und darf keine Tabellen hinterlassen; anschließend wird das vollständige Archiv restauriert. [PostgreSQL 17: pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html).

Vor dem Dienststart werden alle Tabellenzeilen dieser Schemas, vorhandene Definitionen/Constraints/Indizes/Trigger, RLS-/Anwendungsrechte, Migrationshistorie und zusätzliche Schema-/Relations-/Funktionseigentümer samt vollständigen ACL-Einträgen verglichen. Profile und Einkommen sind hier befüllt; die separate logische Probe befüllt weiterhin alle 15 Anwendungstabellen. Eine erst nach dem Backup erfolgte Quelländerung muss im Ziel fehlen.

Ziel-GoTrue und PostgREST verwenden neue zufällige Dienstpasswörter und einen eigenen Signierschlüssel. PostgREST verbindet sich als `authenticator`; Anfragen verwenden `anon` oder das echte Ziel-JWT mit Nutzerrolle. Eigene Profile und Einkommen müssen lesbar, fremde Profile unsichtbar und fremde Schreibversuche wirkungslos sein. Ein eigener Schreibaufruf muss erfolgreich sein und die Quelle unverändert lassen. Anonyme Zugriffe werden abgewiesen. [PostgREST-Konfiguration](https://docs.postgrest.org/en/v13/references/configuration.html).

Neue Passwortanmeldungen müssen Identität und bestätigten Status erhalten; falsche Passwörter und das unbestätigte Konto bleiben ausgeschlossen. Nach Ziel-Auth-Neustart mit derselben Konfiguration müssen erneute Anmeldung und das zuvor ausgegebene Zieltoken weiter funktionieren. Quelltokens scheitern an Auth und Data API wegen des anderen Zielschlüssels. Das ist keine allgemeine sofortige Tokensperre, produktive Schlüsselrotation oder Abnahme alter Refresh-Sitzungen.

Jede Umgebung besitzt eine eigene Bridge ohne IP-Masquerading; eigene Dienste teilen jeweils nur den Netzwerk-Namensraum ihrer Testdatenbank. Das Ziel veröffentlicht zusätzlich den geprüften PostgREST-Port auf Host-Loopback. Datenbank/SMTP bleiben unveröffentlicht. Zieladressen oder Argumente werden nicht angenommen, Services und Netzwerke per Kennzeichnung geprüft und nach Erfolg/Fehler entfernt. Nach hartem Abbruch nur eigene `lifeos-auth-source-…` / `lifeos-auth-target-…`-Ressourcen prüfen. Die Bridge ist keine vollständige Netzwerksperre. Keine echten Konten, Provider, neue Abhängigkeit oder historische Migration werden verwendet bzw. geändert.

**Grenze:** Auth, Datenbank und direkte Data API sind der Umfang. Gateway und LifeOS-Browserabläufe gegen das wiederhergestellte Ziel, Studio, Storage, Cloud, externe Mailzustellung, externe Sicherung, Aufbewahrung und produktiver Wiederanlauf bleiben offen.

### Prüfstand des Ziel-Inkrements

Lokal bestanden: Lint, Typprüfung, 196 Unit-, 19 Werkzeugtests, Build, Formatprüfung, 16 öffentliche Browserfälle und alle fünf Datenbank-/Auth-Proben. Eine lokale Kopie mit absichtlich beschädigten Passwortdaten scheiterte genau bei der erneuten Anmeldung; der anschließende unveränderte positive Lauf bestand. Ein ausgelöstes SIGTERM beendete die verschachtelte Probe mit 130 und entfernte beide eigenen Container. Diese beiden Gegenproben sind keine zusätzlichen permanenten CI-Fälle. GitHub-Prüfungen stehen noch aus.

Erste Vergleichsläufe schlugen fehl und zählen nicht als bestanden. Die Diagnose fand sowohl eine andere Reihenfolge identischer ACL-Einträge als auch ein fehlendes Standardrecht: Das vorherige Entfernen des Public-Schemas nahm `PUBLIC` sein Standard-`USAGE`, das der Dump relativ zum initdb-Ausgangsstand behandelt. Der Vergleich sortiert jetzt vollständige ACL-Einträge ohne Rechte zu entfernen; beide Restore-Proben erhalten das leere Standard-Schema und prüfen zusätzliche Eigentümer/ACLs. Das bloße Beibehalten des Schemas scheiterte zunächst am doppelten CREATE; die eng begrenzte Restore-Liste löst dies ohne unterdrückte SQL-Fehler. In der älteren logischen Probe war außerdem ein explizites Standard-ACL nach Restore als NULL gespeichert. Die Abfrage verwendet deshalb PostgreSQLs `acldefault` für NULL und vergleicht unverändert alle wirksamen Einträge. Keine der früheren fehlgeschlagenen Proben zählt als bestanden; die oben genannten erfolgreichen Läufe verwenden die korrigierten Prüfungen.

# LifeOS – lokaler Wiederanlauf und Migrationsfehler

Stand: 29.10.2026. Arbeitsleitfaden für die lokale V1-Umgebung. Keine Produktionsfreigabe, kein Auftrag zum Zurücksetzen vorhandener Daten und kein vollständiger Supabase-/Auth-Restore-Nachweis.

## Bei einem Ausfall zuerst

1. Zeitpunkt, zuletzt funktionierenden Commit, betroffene Funktion und letzten Änderungsschritt notieren. Keine Finanzinhalte, Sitzungscookies, Schlüssel, Verbindungsadressen mit Passwort oder rohe CLI-Ausgaben in Tickets/Logs übernehmen. Unklare Datenfehler nicht mit weiteren Schreibversuchen überdecken.
2. Im richtigen Checkout `git status --short --branch` prüfen. Fremde Änderungen erhalten. Nicht automatisch auf einen früheren Commit wechseln, solange seine Kompatibilität mit dem vorhandenen Datenbankschema unbekannt ist.
3. `pnpm db:doctor --runtime` prüft die lokale Umgebung. Bei Docker-/Socketproblemen dem konkreten Befund in [LOCAL_SUPABASE.md](LOCAL_SUPABASE.md) folgen. Keine allgemeine Container-/Volume-Bereinigung verwenden.
4. Dienststillstand und fehlgeschlagene Migration unterscheiden. Die folgenden Abläufe haben unterschiedliche Voraussetzungen.

## Lokale Dienste wieder starten

Bei lediglich gestopptem Docker zuerst Docker Desktop starten. Anschließend im Repository `pnpm db:start` ausführen. Ein reguläres `pnpm db:stop` erhält die lokalen Volumes; keine Löschoption ergänzen. Die Startausgabe kann lokale Schlüssel enthalten und gehört nicht in geteilte Protokolle. Ein erfolgloser Start ist kein Grund für `db:reset`.

Danach die App mit der vorgesehenen lokalen Konfiguration starten und Erreichbarkeit sowie Anmeldung prüfen. Für automatisierte Prüfungen ausschließlich fiktive Konten verwenden. `pnpm test:integration` prüft unter anderem Eigentümergrenzen; `pnpm test:auth` prüft die privaten Browserabläufe. Diese Tests setzen einen passenden Migrationsstand voraus. Produktive Wiederanlaufzeit, Auth-Schlüsselwechsel und Wiederherstellung aus einem unabhängigen Backup sind dadurch nicht belegt.

## Eine Migration ist fehlgeschlagen

1. Weitere Migrationen und abhängige Änderungen anhalten. Tatsächlichen Datenbankstand und Migrationshistorie lesen; eine Fehlermeldung beweist nicht, dass jede vorherige Datei oder ein explizites `COMMIT` zurückgerollt wurde. Keine Historienzeile manuell entfernen oder als angewendet markieren, um einen Fehler zu überspringen.
2. Den auslösenden Code und den letzten funktionsfähigen Schema-/Datenstand festhalten. Vor Eingriffen in erhaltenswerte Daten ist eine geeignete Sicherung samt erprobter Wiederherstellung nötig. Die fiktive Probe unten erzeugt keine Sicherung der vorhandenen lokalen oder einer späteren produktiven Datenbank.
3. Fehler mit vergleichbaren fiktiven Daten auf einem Arbeitsbranch reproduzieren. Bereits erfolgreich angewendete historische Migrationen bleiben unverändert; ein fachlicher Fehler benötigt eine zusätzliche geprüfte Vorwärtskorrektur. Bei einer noch nicht angewendeten Datei erst verifizieren, ob Teiländerungen zurückblieben und ob sie in einer anderen Umgebung bereits erfolgreich lief.
4. Nach Korrektur alle vorgeschriebenen Prüfungen und die passende Migrationsprobe durchführen. Erhalt der Daten, Historie und Rechte prüfen. Erst dann auf das bestätigte Ziel anwenden. Keine automatische Reparatur über `migration repair`, keine automatische Rückwärtsmigration und kein Reset echter Daten.
5. Eine Rückkehr zum alten App-Commit ist nur möglich, wenn dieser zum vorhandenen Schema passt. Muss die Datenbank zurückgespielt werden, sind Umfang, Ziel, Datenverlustfenster und Auth-/Schlüsselzustand vorher ausdrücklich zu klären. Ohne diesen Nachweis bleibt der Wiederherstellungsschritt offen.

## Ausführbare Probe des CLI-Ablaufs

```sh
pnpm test:migrations:cli
```

Voraussetzungen: die im Lockfile installierte Supabase-CLI und lokaler Docker ab Version 28 mit dem bereits vorhandenen Image `public.ecr.aws/supabase/postgres:17.6.1.167`. Kein impliziter Download. Die Probe akzeptiert keine Argumente oder fremden Zieladressen und verwendet weder `--local` noch `--linked`. Die CLI erhält ausschließlich die Verbindung zu einem neu erzeugten Testcontainer; [offizielle CLI-Referenz](https://supabase.com/docs/reference/cli/supabase-migration-up).

Die CLI erstellt ihre eigene Migrationshistorie und wendet die 17 Repository-Migrationen in drei Abschnitten an: erste vier Dateien, Sparzielmigration, restlicher V1-Stand. Dazwischen entstehen die drei fiktiven Altkonten aus [MIGRATION_EXISTING_DATA_STATUS.md](MIGRATION_EXISTING_DATA_STATUS.md). Dieselben Daten-, Sparraten-, Einrichtungs- und Eigentümerprüfungen laufen nach beiden Upgradeabschnitten. Ein erneuter CLI-Lauf muss Daten und Historie unverändert lassen.

Anschließend wird nur im temporären Testprojekt eine zusätzliche Datei angelegt: Schema und Tabelle erzeugen, einen Datensatz einfügen, danach absichtlich durch null teilen. Die CLI muss fehlschlagen; Schema, neuer Historieneintrag und Datenänderungen dürfen nicht zurückbleiben. Nach Entfernen ausschließlich dieser absichtlichen Fehlerzeile muss derselbe Testversionsschritt genau einmal erfolgreich laufen. Ein weiterer Aufruf darf nichts duplizieren. Historische Repository-Dateien werden dabei nicht verändert.

### Isolation und Bereinigung

Die bisherigen SQL-/Restore-Proben behalten `--network=none`. Nur die CLI-Probe benötigt einen Hostzugang: eigener Docker-Bridge mit deaktivierter ausgehender Adressumschreibung und lokalem DNS-Ziel, ausschließlich `127.0.0.1` mit automatisch zugewiesenem Port, niemals der vorhandene Supabase-Port 54322. Vor jedem CLI-Aufruf werden laufender Container, Kennzeichnung, Netzwerkzugehörigkeit und Portbindung geprüft. Kein Hostverzeichnis wird eingebunden; Daten bleiben im privaten 512-MiB-tmpfs bei 768 MiB Containerlimit. Das Passwort ist pro Lauf zufällig und ausschließlich fiktiv.

Das temporäre CLI-Projekt enthält nur minimale Konfiguration und Migrationskopien, keine `.env` oder Projektverknüpfung. Der Unterprozess erhält nur ausgewählte Betriebssystemvariablen, keine geerbten Datenbank-/Provider-/CLI-Overrides. CLI-Ausgaben und Verbindungsargumente werden nicht protokolliert. Die lokal installierte CLI kann ihre eigenen Benutzereinstellungen bzw. Versionsprüfung verwenden; der Container-Bridge ist kein vollständig abgeschottetes Netzwerk. Die Probe benötigt die Hostverbindung zur Datenbank; auch der Hostprozess bleibt netzwerkfähig. Portveröffentlichung und ihre Grenzen: [Docker-Dokumentation](https://docs.docker.com/engine/network/port-publishing/).

Regulärer Erfolg/Fehler entfernt den eigenen Container samt anonymen Volumes, das eigene Netzwerk und den geprüften temporären Ordner. Bei hartem Prozessabbruch können Reste bleiben: ausschließlich den konkreten Namen `lifeos-migration-cli-…` und die Kennzeichnung `io.lifeos.migration-cli-rehearsal` prüfen. Erst nach Zuordnung diese Ressourcen gezielt entfernen; niemals `docker system prune` als Reparatur verwenden.

### Grenzen und Prüfstand

Die Probe prüft den installierten CLI-Ablauf für diese Dateien und einen kontrollierten SQL-Fehler. Sie beweist keine allgemeine atomare Rücknahme mehrerer Dateien, kein Verhalten bei expliziten Transaktionsgrenzen, Stromausfall, Netzwerkabbruch oder gleichzeitigen Migrationen. Der Neustart eines vollständigen Supabase-Projekts, echte Auth-Anmeldung nach unabhängigem Restore, externe Sicherungsablage und produktiver Rückfall bleiben offen. KI-/OpenAI-Live-Tests bleiben ausgesetzt.

Lokal bestanden: neue CLI-Probe, bestehende SQL-Migrations- und Wiederherstellungsprobe, Lint, Typecheck, 196 Unit-Tests, 19 Werkzeugtests, Produktionsbuild und 16 öffentliche Browserfälle. Die endgültige Formatprüfung besteht; GitHub-Prüfungen stehen noch aus. Keine Produktfunktion oder historische Migration geändert.

Zwei erste CLI-Probeläufe scheiterten vor Migrationen an einem zu kurzen Docker-Unterprozesslimit beim Bereitschaftstest. Der manuelle Bereitschaftstest war erfolgreich; das CLI-spezifische Unterprozesslimit wurde auf 15 Sekunden erhöht. Danach stoppte die Zielprüfung korrekt: ein internes Docker-Netz hatte trotz angefordertem Hostport keine tatsächliche Portbindung. Ein eigener Bridge mit deaktivierter ausgehender Adressumschreibung, lokalem DNS-Ziel und geprüfter Loopback-Bindung besteht. Diese früheren Versuche zählen nicht als bestanden; eigene Ressourcen wurden jeweils entfernt, die vorhandene Datenbank blieb gesund.

# LifeOS – Lokale Wiederherstellungsprobe

Stand: 28.10.2026. Ein begrenzter Nachweis für die logische Wiederherstellung der V1-Anwendungsdatenbank. Keine vollständige Betriebs-, Auth- oder Cloud-Backup-Abnahme.

## Ablauf und Nachweis

`pnpm test:restore` führt `scripts/test-restore.mjs` aus. Das Skript legt einen neuen, eindeutig bezeichneten PostgreSQL-Container an, wendet die 17 Repository-Migrationen an und erfasst deren Version, Namen und SQL in einer Migrationshistorie. Ausschließlich fiktive Kontoreferenzen und Daten werden erzeugt. Die fachlichen Datensätze entstehen mit der Rolle `authenticated` über die vorhandenen Profilrechte und Datenbankfunktionen.

Alle 15 Anwendungstabellen enthalten Daten für zwei Eigentümer, darunter Geldbeträge in Cent, Sparraten und Einzahlungen, Aufgaben einschließlich entfernter Datensätze, Termine, Verknüpfungen, Rückblicke und Hinweise. Der KI-Anfragezähler wird nur als Datenbankfunktion angesprochen; es gibt keine Providerverbindung.

Anschließend erstellt `pg_dump` ein komprimiertes logisches Archiv der Schemas `public`, `auth` und `supabase_migrations`. Eine zweite Datenbank aus `template0` erhält das Archiv mit `pg_restore --exit-on-error --single-transaction`. Vorher wird ausdrücklich geprüft, dass die relevanten Schemas dort keine Tabellen enthalten. Quelle und Ziel liegen im selben ausschließlich für diesen Lauf angelegten Cluster.

Verglichen werden:

- sämtliche Zeilen der Tabellen in den drei Schemas, einschließlich Zeitstempeln, Revisionen, entfernten Datensätzen und 17 Migrationseinträgen;
- die vorhandene gemeinsame Katalogabfrage für Rollen, RLS, Tabellen-/Spaltenrechte, Policies sowie Funktionsrechte und Ausführungsmodi;
- Definitionen von Funktionen, Constraints, Indizes und Triggern;
- tatsächlich ausgeführte Zugriffe: eigene Daten in allen Anwendungstabellen, kein fremder oder entfernter Aufgabenbestand, abgewiesene fremde Schreibaufrufe und anonyme Lese-/Schreibzugriffe, kein Zugriff auf Auth-Kontodaten sowie ein erfolgreicher eigener Aufgabenabschluss. Die Kontrollschreibvorgänge werden zurückgerollt, danach werden die Daten nochmals verglichen.

PostgreSQL kann `BETWEEN` beim Export und erneuten Einlesen als anders geklammerten, gleichwertigen `AND`-Ausdruck darstellen. Der Schema-Vergleich lässt CHECK-Definitionen deshalb durch PostgreSQL erneut einlesen und vergleichen: vorübergehende Zusatzconstraints in einer anschließend zurückgerollten Transaktion. Es werden keine SQL-Klammern oder Bedingungen entfernt. Eine lokal absichtlich veränderte Monatsgrenze wird weiterhin als Unterschied erkannt.

Grundlage für Archivformat, Rollenabgrenzung und Fehlerabbruch sind die PostgreSQL-17-Dokumentationen zu [pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html) und [pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html). Der neue Ablauf verwendet diese Programme direkt; er ist kein Nachweis für einen ungeprüften Standarddump der Supabase CLI.

## Isolation und Ausführung

Voraussetzung sind Node/pnpm, ein lokaler Docker-Endpunkt und das bereits geladene Image `public.ecr.aws/supabase/postgres:17.6.1.167`. CI lädt dieses festgelegte Image ausdrücklich; das Prüfsystem selbst lädt nichts nach. Lokal ist es mit der derzeitigen Supabase-Umgebung vorhanden. Es sind keine `.env.local`, API-Schlüssel oder Cloud-Konten erforderlich.

```powershell
pnpm test:restore
```

Docker muss im Suchpfad liegen. Das Skript akzeptiert keine Zieladresse, Datei oder weiteren Argumente. Es verwendet ausschließlich die ID seines neu angelegten Containers. Der Docker-Endpunkt wird vorab als lokal geprüft und für den gesamten Lauf festgehalten. Netzwerkzugang und veröffentlichte Ports fehlen; es werden keine Hostdaten eingehängt. Der Container erhält maximal 768 MiB RAM, sein Datenverzeichnis liegt in einem privaten, auf 512 MiB begrenzten RAM-Dateisystem. Auch das Archiv bleibt ausschließlich im Testcontainer.

Unterprozesse, Datenbankabfragen und Startversuche sind zeitlich begrenzt. Rohdaten, SQL-Fehlerausgaben und Zugangsdaten werden nicht protokolliert. Erfolg und reguläre Fehlerpfade entfernen ausschließlich den per ID und eigener Kennzeichnung geprüften Container samt seinen anonymen Volumes. SIGINT/SIGTERM lösen ebenfalls eine Bereinigung aus. Ein harter Prozess-/Hostabbruch kann Ressourcen zurücklassen; in diesem Fall nur den ausdrücklich als `lifeos-restore-…` bezeichneten und mit `io.lifeos.restore-rehearsal` gekennzeichneten Testcontainer untersuchen. Keine pauschale Docker-Bereinigung verwenden.

Die vorhandene lokale Datenbank und deren Volumes werden vom Prüfsystem weder angesprochen noch zurückgesetzt. Die gemeinsame Katalog-SQL wird direkt auf Quelle und Ziel dieser Probe ausgeführt; der bestehende, fest auf `supabase_db_lifeos` gerichtete Integrationstest-Leser wird nicht wiederverwendet.

## Prüfstand

Die lokale Probe besteht. Zusätzlich wurden drei nur für die lokale Prüfung erzeugte Skriptkopien nach dem Restore absichtlich verändert: ein Geldbetrag, eine zusätzliche SELECT-Freigabe für `anon` und die Monatsgrenze eines CHECK-Constraints. Jeder Lauf wurde mit passender Fehlerkategorie abgewiesen und bereinigt. Danach waren keine gekennzeichneten Testcontainer mehr vorhanden; die bestehende Supabase-Datenbank lief weiter. Diese zusätzlichen Gegenproben sind keine drei neuen dauerhaft mitlaufenden CI-Testfälle.

Lint, Typecheck, 196 Unit-Tests, Produktionsbuild, Formatprüfung und 16 öffentliche Browserfälle bestanden lokal. Auf Commit `761a202` bestanden außerdem beide vollständigen GitHub-Läufe: [Push](https://github.com/LucaEndrich2002/LifeIO/actions/runs/40689643861) und [Pull Request](https://github.com/LucaEndrich2002/LifeIO/actions/runs/40689648373), einschließlich 132 Datenbanktests, neuer Restore-Probe, aller 124 privaten Browserfälle und Home-Testpaket. [PR #29](https://github.com/LucaEndrich2002/LifeIO/pull/29) ist offen und zur Prüfung bereit; kein Merge oder Deployment.

## Verbleibende Grenzen

- Beide Datenbanken teilen die vom Image bereitgestellten Clusterrollen. Globale Rollen und Rollenpasswörter werden hier nicht gesichert und in einem neuen Cluster wiederhergestellt. Die Rechtevergleiche belegen die Rechte der zurückgespielten Anwendungsobjekte innerhalb dieser Rollenbasis.
- Die Auth-Kontoreferenzen sind synthetische Datenbankzeilen ohne nutzbares Passwort. Das Image liefert seine Auth-Basisstruktur; ein laufender Auth-Dienst und dessen zusätzliche Migrationen werden nicht gestartet. Registrierung, Anmeldung, Token-/Schlüsselwechsel und Wiederanlauf eines vollständigen Supabase-Projekts sind damit nicht geprüft.
- Die Migrationshistorie wird aus den Repository-Dateien in der bestehenden dreispaltigen Struktur aufgebaut. Geprüft ist deren Wiederherstellung, nicht der Supabase-CLI-Migrationsablauf oder ein Upgrade mit bereits vorhandenen Anwendungsdaten.
- Speicherobjekte, andere verwaltete Schemas, Cluster-/Datenbankeinstellungen, externe Dienste, verschlüsselte Vault-Inhalte und produktive Secrets gehören nicht zum Archivumfang. V1 verwendet derzeit keine Storage-Objekte.
- Keine Aussage über automatische Sicherungsintervalle, externe Aufbewahrung, Verschlüsselung, Aufbewahrungsdauer, Verlustfenster, Wiederanlaufzeit, reale Cloud-Standardrechte oder die Eignung einer konkreten Produktionssicherung. Diese Entscheidungen und Proben bleiben vor der Beta erforderlich.

Der nächste unabhängige lokale Schritt ist ein begrenzter Migrationsnachweis mit bereits vorhandenen fiktiven Daten. Eine vollständige Wiederherstellung einschließlich Auth-Dienst und unabhängiger Rollenbasis bleibt ein weiterer Prüfpunkt. Hosting-, Datenschutz- und Kostenentscheidungen sowie echte KI-Tests werden durch diese Probe nicht vorweggenommen.

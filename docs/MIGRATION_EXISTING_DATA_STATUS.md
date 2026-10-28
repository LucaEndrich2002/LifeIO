# LifeOS – Migration mit vorhandenem Datenbestand

Stand: 28.10.2026. Begrenzter Nachweis der Übernahme bestehender Sparziele. Keine Änderung an Produktcode oder historischen Migrationen, keine Produktions- oder Beta-Freigabe.

## Datenbestand und Nachweis

`pnpm test:migrations` wendet zunächst nur die vier Migrationen bis `20260921150000_fixed_costs_and_budgets.sql` auf eine eigene leere Datenbank an. Die damalige `save_onboarding_step`-Funktion erzeugt drei fiktive Konten mit Einkommen und Fixkosten:

| Fall                | Einrichtung                                       | Historischer Monat | Sparziel                                                |
| ------------------- | ------------------------------------------------- | ------------------ | ------------------------------------------------------- |
| Abgeschlossen       | Drei damalige Entscheidungen und Abschluss        | Februar 2024       | Anfangsstand 345678 Cent, monatlich 12345 Cent          |
| Noch offen          | Finanzentscheidungen gespeichert, Abschluss fehlt | November 2025      | Anfangsstand 765432 Cent, monatlich ausdrücklich 0 Cent |
| Bewusst ausgelassen | Einrichtung abgeschlossen                         | Dezember 2023      | Kein Ziel, ausdrückliche Entscheidung `skipped`         |

Erst danach läuft `20260926160000_savings_goals.sql`. Alle zuvor vorhandenen Spalten der sechs damaligen Anwendungstabellen werden vollständig verglichen: IDs, Eigentümer, Beträge, Währungen, Zeitangaben und Einrichtungsstatus bleiben identisch. Budgets sind in diesem Datensatz leer. Neue Spalten dürfen den Vergleich alter Felder nicht verdecken. Danach laufen alle weiteren Repository-Migrationen bis zum aktuellen V1-Stand mit erneuter Prüfung.

Unmittelbar nach der Sparziel-Migration und am Ende werden tatsächlich ausgeführt:

- Nur das bereits abgeschlossene Ziel erhält genau eine Anfangsrate mit ursprünglichem Monat und Betrag. Anfangsstände werden nicht in Einzahlungen umgewandelt; Revision und Deadline erhalten die erwarteten Vorgaben.
- Die offene Einrichtung bekommt erst beim späteren regulären Abschluss genau eine Rate, weiterhin mit November 2025 und Betrag null. Beim heutigen V1-Schema erfolgt vorher die neu hinzugekommene Aufgabenentscheidung. Wiederholtes Abschließen erzeugt keine Duplikate.
- Ausgelassene Ziele bleiben ohne Ziel, Rate oder Einzahlung.
- Eigentümer können lesen und schreiben. Eine Einzahlung verändert den berechneten Stand, erhält aber den Anfangsstand. Eine neue Monatsrate erhält den älteren Verlauf; der Monat vor der ersten Rate bleibt ohne Sparbetrag.
- Beide Zieleigentümer können fremde Ziele nicht ändern und fremde Ziele, Raten oder Einzahlungen nicht lesen. Das Konto ohne Ziel sieht ebenfalls keine fremden Datensätze. Anonyme Lese- und Schreibzugriffe werden abgewiesen.
- Positive Teständerungen werden zurückgerollt; derselbe Altbestand bleibt für weitere Migrationen erhalten. Die Historie muss genau die angewendeten Dateiversionen enthalten.

## Ausführung und Isolation

```sh
pnpm test:migrations
```

Voraussetzungen: lokaler Docker und das vorhandene Image `public.ecr.aws/supabase/postgres:17.6.1.167`. CI lädt das Image ausdrücklich und führt die Migrationsprobe nach der Wiederherstellungsprobe aus. Keine neue Abhängigkeit.

`scripts/isolated-database.mjs` enthält die gemeinsame interne Umgebung für Migrations- und [Wiederherstellungsprobe](BACKUP_RESTORE_STATUS.md). Sie akzeptiert keine Befehlszeilenargumente oder fremden Datenbankziele: ausschließlich ein neuer Container ohne Netzwerk, Ports oder Hostverzeichnisse, maximal 768 MiB RAM und 512 MiB für das private Datenverzeichnis. Keine bestehende Datenbank wird angesprochen oder zurückgesetzt. Rohdaten, SQL-Fehlerdetails und Zugangsdaten werden nicht ausgegeben.

Erfolg und Fehler entfernen nur den eigenen, per ID und Kennzeichnung geprüften Container samt dessen anonymen Volumes. Nach hartem Prozessabbruch ausschließlich den konkreten Container `lifeos-migration-…` mit Kennzeichnung `io.lifeos.migration-rehearsal` untersuchen; keine allgemeine Docker-Bereinigung. Die bisherigen Restore-Kennzeichnungen bleiben unverändert.

## Prüfstand und Grenzen

Die normale Migrationsprobe und die bestehende Wiederherstellungsprobe bestehen lokal. Vier nur lokal erzeugte Prüfkopien wurden absichtlich verfälscht: Anfangsstand, Anfangsrate, vorzeitige Rate der offenen Einrichtung sowie deaktivierte RLS auf Raten. Alle wurden abgewiesen und bereinigt. Diese Gegenproben sind keine zusätzlichen permanenten CI-Fälle.

Lint, Typecheck und 196 Unit-Tests bestanden. Der anfängliche Unit-Lauf in der Windows-Sandbox scheiterte an fehlenden temporären Dateien; die unveränderte Wiederholung außerhalb der Sandbox bestand. Der erste Build und eine Wiederholung konnten den CSS-Unterprozess nicht verbinden. Nach Entfernung ausschließlich erzeugter Build-Zwischendateien bestand der frische Produktionsbuild. Prüfregeln wurden nicht abgeschwächt. Weitere Prüfungen und PR-Stand: [AUTONOMOUS_PROGRESS.md](AUTONOMOUS_PROGRESS.md).

Geprüft werden Repository-SQL-Dateien über `psql` unter der Migrationsrolle `postgres` mit einfacher Historientabelle. Das belegt weder den Supabase-CLI-Migrationsablauf samt Fehler-/Wiederaufnahmeverhalten noch unterbrechungsfreie Cloud-Upgrades. Kontoreferenzen sind synthetisch; kein Auth-Dienst oder Login. Der Nachweis umfasst diesen älteren Ausgangsstand und drei Sparziel-Fälle, nicht alle historischen Bestände, Datenmengen oder konkurrierenden Schreibvorgänge.

Unabhängige Rollen-/Auth-Wiederherstellung, produktive Sicherungs-/Aufbewahrungsregeln und dokumentierter Wiederanlauf-/Rückfallablauf bleiben offen. Echte KI-Tests bleiben ausgesetzt; keine Cloud-Buchung, Veröffentlichung oder Integration in den Hauptbranch.

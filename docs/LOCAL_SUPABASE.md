# Lokale Supabase-Umgebung unter Windows

Stand der erneuten Systemprüfung: 19.09.2026. Dieser Bericht beschreibt die damalige Einrichtung der lokalen Laufzeit; zu diesem Zeitpunkt gab es noch kein Anwendungsschema und keine Authentifizierungsoberfläche. Das Folgeinkrement vom 20.09.2026 ergänzt Profil, RLS und Auth-Mailtemplates, siehe [AUTH_PROFILE_STATUS.md](AUTH_PROFILE_STATUS.md).

## Tatsächlicher Ausgangspunkt

- Windows 11 Home, 64 Bit, Build 26200; Intel x64 und rund 16 GB RAM.
- Windows meldet einen aktiven Hypervisor (`HypervisorPresent=true`). Die Firmware-Einstellungen wurden nicht verändert.
- Docker Desktop 4.91.0 ist pro Benutzer unter `%LOCALAPPDATA%\Programs\DockerDesktop` installiert; die Docker-CLI meldet 29.8.0. Die Linux-Engine läuft mit WSL 2.
- WSL 2.7.13 und die Windows-Funktion `VirtualMachinePlatform` sind installiert. Die Distribution `docker-desktop` läuft mit dem Kernel `6.18.33.2-microsoft-standard-WSL2`. Ein Windows-Neustart war für diesen Start nicht erforderlich.
- Es ist nur Laufwerk C: verfügbar. Nach der Bereinigung durch den Nutzer standen am 19.09.2026 vor Beginn der Installation etwa 25,9 GiB frei.
- Die lokale Supabase-CLI und `supabase/config.toml` sind bereits im Projekt vorhanden.

Für Installation, Linux-Datenträger, Containerimages und temporäre Entpackdateien planen wir **20 GiB freien Platz als Arbeitsreserve** ein. Das ist eine vorsichtige Projektvorgabe, keine behauptete Mindestanforderung von Docker. Diese Speicherprüfung wurde vor der Installation bestanden. Nach Installation und Downloads waren zuletzt rund 10 GiB frei. Persönliche Dateien, andere Projekte und gemeinsame Paket-Caches wurden nicht bereinigt.

## Ergebnis der Installation am 19.09.2026

- Der offizielle Docker-Installer wurde gegen den von WinGet gelieferten SHA-256-Wert und seine gültige Docker-Inc.-Signatur geprüft. Die Installation mit `--user --backend=wsl-2 --no-windows-containers` endete mit Exit-Code 0.
- Die erneut angeforderte Windows-Administratorbestätigung war erfolgreich. Sowohl die WSL-Paketinstallation als auch die Aktivierung von `VirtualMachinePlatform` endeten mit Exit-Code 0. `wsl --version`, `wsl --status` und die laufende Docker-Distribution sind geprüft; `docker info --format '{{.OSType}}'` meldet `linux`.
- `pnpm db:start` und der abschließende Ablauf `pnpm db:stop` → `pnpm db:start` endeten jeweils mit Exit-Code 0. Das bestehende Datenbankvolume blieb erhalten.
- Sieben Dienste laufen: PostgreSQL, Kong, Auth, PostgREST, Postgres Meta, Studio und Mailpit. Alle konfigurierten Docker-Healthchecks sind gesund; PostgREST wurde zusätzlich über HTTP geprüft. Auth-Health, REST-API, Studio und Mailpit antworten mit HTTP 200, PostgreSQL akzeptiert Verbindungen.
- API, PostgreSQL, Studio und Mailpit sind nur an `127.0.0.1` und `::1` gebunden. Sowohl Docker-Portzuordnungen als auch die Windows-Listener wurden geprüft.
- `.env.local` enthält ausschließlich die lokale API-URL und den öffentlichen Publishable Key. Die Werte wurden mit der vorhandenen Zod-Validierung geprüft; private Statuswerte wurden weder in die Datei noch in Diagnoseprotokolle übernommen.
- `pnpm db:doctor --runtime` besteht. Die 20-GiB-Standardprüfung bleibt für eine neue Installation bzw. umfangreiche zusätzliche Downloads vorgesehen.

**Verwendeter WSL-Installationsweg:** Der direkte Aufruf `wsl --install --no-distribution` meldete auf diesem Rechner nur die fehlende Installation; das offizielle WinGet-Paket `Microsoft.WSL` lieferte ohne erhöhte Windows-Rechte den Fehler `0x80073d28`. Nach erfolgreicher Windows-Administratorbestätigung ließ sich das Paket installieren.

Für eine entsprechende Neueinrichtung PowerShell über das Startmenü mit „Als Administrator ausführen“ öffnen und im Windows-Fenster „Benutzerkontensteuerung“ auf „Ja“ klicken; gegebenenfalls wird ein Administratorkennwort verlangt. Die folgenden Befehle einzeln ausführen und erst nach erfolgreicher Paketinstallation mit dem zweiten Befehl fortfahren:

```powershell
winget.exe install --id Microsoft.WSL --exact --source winget --accept-package-agreements --accept-source-agreements
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```

Damit wird keine zusätzliche Ubuntu-Distribution angelegt. Einen angeforderten Neustart nach dem Sichern offener Arbeit manuell durchführen. Danach `wsl --version` prüfen, Docker Desktop starten und mit Schritt 4 der folgenden Reihenfolge fortfahren. Bereits offene Terminals benötigen für den vom Docker-Installer ergänzten PATH gegebenenfalls einen Neustart.

## Lokale Ports und Docker-Desktop-Einstellungen

`pnpm db:start` prüft zunächst, dass Docker einen lokalen Endpunkt verwendet, und erstellt oder prüft das Bridge-Netzwerk `lifeos-local` mit `com.docker.network.bridge.host_binding_ipv4=127.0.0.1`. Ein vorhandenes Netzwerk mit abweichender Konfiguration wird nicht verändert; der Start bricht dann ab. Anschließend startet die CLI mit `--network-id lifeos-local`. Netzwerkprüfung und Diagnose verwenden dieselbe Endpunktprüfung; entfernte Docker-Ziele werden abgewiesen.

Auf diesem Windows-Rechner reichte die Netzwerkoption allein nicht aus: Docker Desktop veröffentlichte die Ports zunächst weiterhin auf allen Schnittstellen. Zusätzlich wurde daher in `%APPDATA%\Docker\settings-store.json` die Benutzereinstellung `PortBindingBehavior` auf `default-local-port-binding` gesetzt. Sie entspricht Dockers Standardbindung an localhost und gilt auch für künftige Container ohne explizite Host-IP. Die vorherige Einstellung wurde lokal unter `.cache/setup/docker-settings-before-loopback.json` gesichert. Nach dem Docker-Neustart und erneuten Erzeugen der Supabase-Container sind ausschließlich Loopback-Bindungen nachgewiesen.

Bei einer Neueinrichtung die Docker-Desktop-Netzwerkeinstellung für standardmäßige localhost-Portbindung ebenfalls setzen und nach dem Start die tatsächlichen Host-Ports prüfen. Eine korrekte Netzwerkoption allein ist unter Docker Desktop kein ausreichender Nachweis.

## Beobachteter Docker-Neustartfehler

Nach einem regulären Docker-Stopp scheiterte Desktop 4.91.0 beim erneuten Start am Umbenennen von `sailor-ingest.sock` mit Windows-Fehler 1920. Das entspricht der Fehlerklasse aus den verlinkten Docker-Issues; der dort beschriebene Workaround ist ein Nutzerbericht, keine zugesagte Herstellerkorrektur.

Nach Beenden der fehlgeschlagenen Desktop-Prozesse wurden ausschließlich diese zuvor geprüften Laufzeitverzeichnisse reversibel umbenannt:

- `%LOCALAPPDATA%\Docker\run` → `run.lifeos-socket-backup-20260919` im selben übergeordneten Verzeichnis.
- `%LOCALAPPDATA%\docker-secrets-engine` → `docker-secrets-engine.lifeos-socket-backup-20260919` im selben übergeordneten Verzeichnis; darin lag nur `engine.sock`.

`EnableDockerAI` steht auf `false`. Die Docker-Anwendung wurde danach direkt gestartet; Engine und Supabase liefen wieder. Diese Einstellung betrifft Docker-eigene Funktionen, nicht die geplante LifeOS-KI. Die Sicherungsverzeichnisse bleiben erhalten; Images und Datenbankvolumes wurden nicht zurückgesetzt. Ein mögliches erneutes Auftreten bei späteren Docker-Desktop-Neustarts bleibt eine externe Einschränkung. Der normale Supabase-Stop-/Start-Ablauf wurde anschließend erfolgreich geprüft und benötigt keinen Desktop-Neustart.

## Wiederholbare Vorprüfung

Am 26.09.2026 trat derselbe `sailor-ingest.sock`-Fehler beim erneuten Docker-Start auf. Nach Prüfung der Fehlermeldung und der betroffenen Verzeichnisse wurde derselbe reversible Workaround erneut angewendet. Die beiden Sicherungen tragen den Zusatz `.lifeos-socket-backup-20260926-172634`. Docker 29.8.0 und die vorhandene Supabase-Datenbank starteten anschließend erfolgreich; Datenbankvolumes wurden nicht zurückgesetzt.

```sh
pnpm db:doctor
```

In PowerShell bei gesperrten `.ps1`-Launchern: `pnpm.cmd db:doctor`.

Der Befehl prüft RAM, freien Speicher, unter Windows die WSL-Version, die Docker-CLI und einen lokalen Linux-Container-Daemon. Fehlende Voraussetzungen ergeben Exit-Code 1. Die Prüfung verändert keine Konfiguration, startet keine Dienste, lädt keine Images und gibt keine Supabase-Schlüssel aus. Unbekannte oder entfernte Docker-Endpunkte werden nicht kontaktiert. Eine erfolgreiche Vorprüfung ist noch kein Nachweis eines laufenden Supabase-Stacks.

Nach vollständiger Installation sind Teile der Installationsreserve durch die Images belegt. Für einen bereits eingerichteten Stack gibt es deshalb eine separate Betriebsprüfung:

```sh
pnpm db:doctor --runtime
```

Sie verlangt **5 GiB freie Betriebsreserve** statt 20 GiB für erneute Installation und Downloads. Beide Werte sind Projektvorgaben, keine Herstellermindestwerte. Alle anderen Prüfungen bleiben identisch. Der Standardbefehl behält seine 20-GiB-Prüfung; `--runtime` darf erst nach erfolgreicher Erstinstallation verwendet werden. Für umfangreiche neue Images oder Updates erneut die Installationsreserve prüfen.

Wenn Docker-Daten auf einem anderen Datenträger liegen sollen, kann dessen vorhandenes Verzeichnis geprüft werden:

```powershell
pnpm.cmd db:doctor --storage-path 'D:\'
```

Der Parameter **prüft nur freien Speicher**. Er konfiguriert oder verschiebt keine Docker-Daten. Für den Installer und Windows-Updates muss auf C: weiterhin ausreichend Platz bleiben. Das Ziel für den virtuellen Datenträger wird erst bei der tatsächlichen Docker-Einrichtung festgelegt.

## Installationsreihenfolge nach Bereitstellung des Speichers

1. **WSL ohne zusätzliche Ubuntu-Installation einrichten.** In einer administrativen PowerShell `wsl --install --no-distribution` ausführen. Docker erzeugt seine benötigte Linux-Umgebung selbst. Falls Windows einen Neustart verlangt, Arbeit sichern und den Neustart manuell durchführen; es wird kein automatischer Neustart ausgelöst.
2. **WSL prüfen.** `wsl --version` muss mindestens 2.1.5 melden. Falls erforderlich mit `wsl --update` aktualisieren. Nach Installation/Neustart eine neue PowerShell öffnen.
3. **Docker Desktop für x64 aus der offiziellen Quelle installieren.** Für Windows Home verwenden wir Linux-Container mit WSL 2. Die Installation pro Benutzer ist vorgesehen. Keine Mitgliedschaft in einer zusätzlichen privilegierten Gruppe oder Freigabe eines unverschlüsselten Netzwerk-Daemons ist für diesen Ablauf geplant.
4. **Docker Desktop starten und den WSL-2-Backendstatus prüfen.** Den erforderlichen Erststart abschließen, die oben beschriebene localhost-Portbindung einstellen und warten, bis die Engine bereit ist. Danach die neue Terminalumgebung mit `docker version` bzw. `pnpm db:doctor` prüfen.
5. **Supabase aus dem Projekt starten.** `pnpm db:start` lädt beim ersten Start die benötigten Images. Ein gescheiterter Pull wegen fehlendem Speicher gilt nicht als erfolgreiche Einrichtung.
6. **Laufzeit verifizieren.** PostgreSQL-Container und aktivierte Dienste müssen gesund sein. Studio unter `http://127.0.0.1:54323` und das lokale Postfach unter `http://127.0.0.1:54324` müssen erreichbar sein. Anschließend `pnpm db:stop` und erneutes `pnpm db:start` als Wiederanlaufprüfung durchführen.
7. **Nur öffentliche Verbindungskonfiguration übernehmen.** Erst nach erfolgreichem Start `.env.example` nach `.env.local` kopieren und die lokale API-URL sowie den Publishable-/Legacy-anon-Key aus `pnpm db:status` übernehmen. Die Statusausgabe kann auch private Schlüssel enthalten und darf nicht ungefiltert geteilt werden. Das Fundament benötigt keinen Service-Role-Key.

## Abschlusskriterien dieses Tasks

- Vorprüfung erfolgreich und tatsächlich laufende lokale Linux-Container-Engine.
- `pnpm db:start` und Wiederanlauf erfolgreich, aktivierte Supabase-Dienste gesund.
- Öffentliche lokale Verbindungskonfiguration sicher in der ignorierten `.env.local`; keine Schlüssel in Git oder Diagnoseberichten.
- Bestehende Lint-, Typ-, Test-, Build- und Formatprüfungen unverändert erfolgreich.
- Dokumentation beschreibt den tatsächlichen Zustand. Noch keine Aussage über Nutzer-Isolation ohne die dafür später erforderlichen Tabellen und Tests.

Die lokale Laufzeiteinrichtung ist abgeschlossen. Die statische App-Vorschau funktioniert weiterhin ohne Anmeldung; sie speichert noch keine Nutzerdaten. Authentication, weitere Produktfunktionen, Cloud-Projekte und Deployments sind kein Teil dieser Einrichtung. Die beschriebene Docker-Desktop-Einschränkung ist dokumentiert und bleibt beim weiteren Betrieb zu beachten.

## Quellen

- [Docker Desktop: Windows-Voraussetzungen und Installationsoptionen](https://docs.docker.com/desktop/setup/install/windows-install/)
- [Microsoft: WSL installieren](https://learn.microsoft.com/en-us/windows/wsl/install)
- [Microsoft: WSL-Optionen einschließlich `--no-distribution`](https://learn.microsoft.com/en-us/windows/wsl/basic-commands)
- [Supabase: CLI und lokale Entwicklung](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Supabase: eigenes Netzwerk mit localhost-Bindung](https://supabase.com/docs/guides/local-development)
- [Docker Desktop: Netzwerk und Portveröffentlichung](https://docs.docker.com/desktop/features/networking/)
- [Docker: Einstellung für Portbindung](https://docs.docker.com/enterprise/security/hardened-desktop/settings-management/settings-reference/#port-binding-behavior)
- [Docker-Issue 531: Socket-Fehler und berichteter Workaround](https://github.com/docker/desktop-feedback/issues/531)
- [Docker-Issue 675: Socket-Fehler auch nach regulärem Stopp](https://github.com/docker/desktop-feedback/issues/675)

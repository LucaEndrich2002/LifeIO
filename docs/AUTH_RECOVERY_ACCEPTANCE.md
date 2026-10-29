# LifeOS – Abnahme einer unabhängigen Auth-Wiederherstellung

Stand: 29.10.2026. Vorbereitung des nächsten begrenzten Betriebsnachweises, **noch kein bestandener Wiederherstellungstest**. Die bisherigen Ergebnisse bleiben in [BACKUP_RESTORE_STATUS.md](BACKUP_RESTORE_STATUS.md) und [RECOVERY_RUNBOOK.md](RECOVERY_RUNBOOK.md) abgegrenzt.

## Warum ein zusätzlicher Nachweis nötig ist

Die bisherige Wiederherstellungsprobe verwendet zwei Datenbanken im selben PostgreSQL-Container. Beide teilen Clusterrollen. Ihre zwei Konten sind direkt eingefügte Auth-Referenzen ohne nutzbares Passwort. Deshalb belegt der erfolgreiche SQL-Restore weder Anmeldung noch eine Wiederherstellung in einem unabhängigen Cluster. Die neue CLI-Probe schließt diese Lücke ebenfalls nicht.

## Am 29.10. rein lesend festgestellte Voraussetzungen

- Die laufende lokale Umgebung verwendet PostgreSQL `17.6.1.167`, GoTrue `v2.196.0`, PostgREST `v16.2`, Kong `2.8.1` und Mailpit `v1.30.2`. Die zugehörigen Images sind bereits vorhanden; ein weiterer Download ist für einen versionsgleichen Versuch zunächst nicht nötig.
- Docker Engine `29.8.0`, acht CPUs, rund 7,66 GiB Docker-Arbeitsspeicher insgesamt. Das ist keine Aussage über aktuell freien Arbeitsspeicher. Auf C: waren 6,11 GiB frei; vor dem Versuch erneut prüfen. Keine Images/Volumes der laufenden Umgebung löschen, um Platz zu gewinnen.
- Das bestehende Projekt verlangt bestätigte E-Mail-Adressen. Ein Versuch mit automatisch bestätigten Konten würde den tatsächlichen Einstiegsablauf nicht abdecken. Fiktive Bestätigungsmails benötigen einen eigenen lokalen Mailpit-Dienst.
- Keine Bestandsdaten, Zugangsdaten, Container-Konfigurationen mit Secret-Werten oder Backups wurden ausgelesen. Es wurden keine neuen Dienste gestartet.

## Nächster ausführbarer Schritt

Zuerst eine eigene Quelle mit PostgreSQL, GoTrue und Mailpit erzeugen. Die Versionen aus der Bestandsaufnahme ausdrücklich verwenden, kein impliziter Image-Download. Ein eigener Ressourcenname, Kennzeichnungen, lokale Zielprüfung, Speichergrenzen, Zeitlimits und gezielte Bereinigung müssen vor dem ersten schreibenden Test stehen. Keine bestehende Supabase-Instanz als Quelle oder Ziel verwenden; keine fremden Datenbankadressen als Argument akzeptieren.

Zwei fiktive Konten über den Auth-Dienst registrieren, die ausschließlich lokal zugestellte Bestätigung abschließen und beide mit Passwort anmelden. Die Auth-Antworten müssen verwertbare Benutzeridentitäten liefern. Erst diese Identitäten verwenden, um über vorhandene autorisierte Anwendungsoperationen Testdaten zu erzeugen. Keine direkt eingefügten `auth.users`-Zeilen als Ersatz für diesen Nachweis akzeptieren. Passwörter, Codes, Tokens und vollständige Auth-Antworten bleiben ausschließlich im Arbeitsspeicher.

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

## Aktueller Prüfstand

Nur Quellen-/Codeprüfung und lesende Ressourceninventur abgeschlossen. Keine Auth-Testinstanz, kein neues Backup, keine Restore-Ausführung und keine neue Anmeldung in diesem Inkrement. Die bisherigen grünen Tests gelten weiterhin ausschließlich für ihren dokumentierten Umfang. Vor der Umsetzung erneut Codex-Kontingent und freie Ressourcen prüfen; keine bezahlten Credits oder Resets.

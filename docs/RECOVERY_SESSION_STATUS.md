# LifeOS – Sitzungserneuerung nach Auth-Wiederanlauf

Stand: 11.11.2026, Branch `codex/recovery-refresh-sessions`, Basis PR #40. Begrenzter V1-Betriebsnachweis; keine vollständige Auth- oder Produktionsfreigabe.

## Umfang

Die vorhandene unabhängige Auth-Restore-Probe verwendet zusätzlich `scripts/recovery-refresh-sessions.mjs`. Zwei bestätigte fiktive Konten erhalten nach Restore je eine Sitzung vor dem Neustart des Ziel-Auth-Dienstes und eine unabhängige Kontrollsitzung danach. Alle Dienste, Passwörter und Signierschlüssel gehören ausschließlich zur kurzlebigen lokalen Probe.

- Nach dem Neustart mit demselben Schlüssel erneuert der echte Refresh-Endpunkt beide vorher ausgestellten Zielsitzungen. Refresh-Token müssen wechseln, Sitzungs-ID und Identität erhalten bleiben. Auth-Identitätsabfrage und Data API bestätigen eigenen Profil-/Einkommenszugriff sowie ausgeblendete Fremdprofile.
- Lokale Abmeldung entfernt genau die betroffene Sitzung aus `auth.sessions`. Sowohl das zuletzt erhaltene als auch das vorherige Refresh-Token müssen danach ohne neue Tokens abgewiesen werden. Abgewiesene Erneuerung darf die Sitzung nicht wiederherstellen.
- Nach jeder Abmeldung lassen sich die unabhängige Sitzung desselben Kontos und die Kontrollsitzung des anderen Kontos weiterhin erneuern und authentifizieren. Damit gibt es positive Kontrollen für Umfang und Verfügbarkeit der Abmeldung.
- Vollständige Vergleiche aller vorhandenen Anwendungstabellen bestätigen unveränderte Daten in Quelle und Ziel. Tokens und Auth-Antworten bleiben ausschließlich im Speicher; keine Sitzungsexporte, Auth-Zeilen oder Rohantworten im Log. Für SQL-Prüfungen werden nur validierte Sitzungs-UUIDs verwendet.

Der gemeinsame Ablauf läuft über `pnpm test:auth:restore` sowie vor den bestehenden Gateway-/Browser- und Money-Restore-Proben. Keine zusätzliche CI-Serie, Migration oder Produktänderung. Der HTTP-Testhelfer behandelt nun auch Antworten ohne Body. Ein eigener lokaler HTTP-Regressionstest prüft HTTP 204, eine normale JSON-Antwort und die unveränderte Grenze von 65536 Bytes.

## Grenzen und Quellen

Geprüft werden nach Restore ausgestellte Sitzungen bei gleichem Schlüssel und ausdrücklicher lokaler Abmeldung. Refresh-Tokens aus einer alten Sicherung, Wiederverwendung abgelöster Tokens während einer aktiven Sitzung, abgelaufene Zugriffstokens, Schlüsselrotation und Cloud-/Browser-Cookie-Verhalten sind separate Abnahmen. Der bestehende Browser-Sitzungsnachweis bleibt in [SESSION_BOUNDARIES_STATUS.md](SESSION_BOUNDARIES_STATUS.md) dokumentiert.

Eine lokale Abmeldung widerruft Refresh-Sitzungen; bereits ausgestellte Zugriffstokens können bis zum Ablauf gültig bleiben. Deshalb behauptet diese Probe keine sofortige JWT-Ungültigkeit. Grundlagen: [Supabase-Abmeldeumfang](https://supabase.com/docs/guides/auth/signout), [Sitzungsmodell](https://supabase.com/docs/guides/auth/sessions) und die verwendete Implementierung [GoTrue v2.196.0 Logout](https://github.com/supabase/auth/blob/v2.196.0/internal/api/logout.go). Die tatsächlichen lokalen Ergebnisse werden separat unten festgehalten.

## Prüfstand

Transport-Regressionstest und erste vollständige unabhängige Auth-/Refresh-/Logout-Probe bestanden (Exit 0; `.cache/recovery-refresh-transport-20261111.log` und `.cache/recovery-refresh-first-20261111.log`). Lint, Typprüfung, 196 Unit-/20 Werkzeugtests, Formatprüfung, Produktionsbuild und alle 16 öffentlichen Browserfälle bestanden. Die Gateway-/Browser-Restore-Probe besteht für beide Konten Desktop/Mobil einschließlich der neuen Sitzungsfälle; auch die vollständige Money-Restore-Probe besteht für beide Konten auf Desktop/Mobil (Exit 0). GitHub-PR und dessen vollständige CI-Prüfung noch offen. Logs: `.cache/recovery-refresh-{checks,build,public,browser,money}-20261111.log`. Diff auf Umfang, Identität, lokale Abmeldegrenzen, unveränderte Daten und Geheimnisschutz geprüft. Der Transport-Regressionstest scheiterte zunächst am gesperrten Sandbox-Loopbackzugriff (`EACCES`), mit normalem lokalen Netzwerkzugriff danach am erwarteten Zugriff auf den fehlenden HTTP-204-Body. Der Helfer ist korrigiert; die positive Nachprüfung besteht einschließlich JSON-Verarbeitung und unveränderter Antwortgrößenbegrenzung. Frühere erfolgreiche CI-Läufe gelten nicht als Nachweis dieses Schritts.

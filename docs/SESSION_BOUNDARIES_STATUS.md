# LifeOS – Sitzungsgrenzen

Stand: 28.10.2026. Begrenzter Nachweis der V1-Sicherheit; keine vollständige Authentifizierungs- oder Produktionsabnahme.

## Nachgewiesener Ablauf

`tests/auth-e2e/session-boundaries.spec.ts` prüft auf Desktop und Mobil die reale Profil-Server-Action im Produktionsbuild:

1. Ein angemeldeter Testnutzer speichert sein Profil. Der Test übernimmt die tatsächlich versendete Action-Kennung und den kodierten Request ausschließlich im Arbeitsspeicher, ohne Cookie-Header zu kopieren.
2. Derselbe direkte POST schreibt mit gültiger Sitzung nachweislich in die Datenbank. Diese positive Kontrolle verhindert einen falschen Sicherheitsnachweis durch eine ungültige Action-Kennung oder kaputte Kodierung.
3. Ein zweiter Tab hält ein bearbeitetes Formular offen. Nach ausdrücklicher Abmeldung im ersten Tab wird derselbe direkte POST mit dem aktuellen Cookie-Stand zur Anmeldung verwiesen. Der geschützte Profilstand bleibt erhalten.
4. Auch das Absenden des noch offenen Formulars führt zur Anmeldung und verändert das gespeicherte Profil nicht. Die Kontrolle liest über eine unabhängige gewöhnliche Nutzersitzung; kein Service-Role-Client wird für die geprüften Anwendungsoperationen verwendet.

Der installierte Next.js-Action-Handler übermittelt Fetch-Action-Weiterleitungen mit HTTP 200 und `x-action-redirect`. Der Test prüft deshalb diesen Weiterleitungsheader und die tatsächliche Datenbankwirkung. Die anfängliche Annahme HTTP 303 war für diese Fetch-Action falsch; die unveränderte Datenbank und der Login-Verweis wurden separat bestätigt.

## Umfang und Grenzen

Das bestehende Verhalten benötigt für diesen Fall keine Produktänderung: `requireIdentity(true)` prüft die aktuelle Identität vor der Profiländerung. Abmeldung verwendet `scope: "local"`. Bestehende Browserprüfungen decken außerdem Sitzungserneuerung, erneuten Seitenzugriff nach Logout, Passwortwiederherstellung und gefälschte Sitzungscookies ab.

Dieser Test beweist weder die sofortige Ungültigkeit zuvor kopierter Zugriffstokens noch die Abmeldung anderer Geräte. Er deckt eine repräsentative Profilmutation ab, nicht alle Server Actions. Weitere direkte Schreibaufrufe, ungültige/abgelaufene Identitäten, fremde Eigentümer und die konkrete Hosting-/Proxy-Konfiguration bleiben Gegenstand weiterer begrenzter Prüfungen. RLS-Integrationstests bleiben eigenständige Nachweise.

Lokal bestanden Lint, Typecheck, Formatprüfung, 196 Unit-Tests, Produktionsbuild, 16 öffentliche Browserprüfungen und beide neuen Desktop-/Mobilprüfungen. Die vollständige private Suite mit nun 122 Fällen und die Datenbankintegration müssen zusätzlich im GitHub-Lauf des Branch-Commits kontrolliert werden. Keine echten KI-Aufrufe, produktiven Konten, neuen Abhängigkeiten oder Datenbankänderungen.

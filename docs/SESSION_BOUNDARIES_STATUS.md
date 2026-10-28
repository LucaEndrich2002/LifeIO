# LifeOS – Sitzungsgrenzen

Stand: 28.10.2026. Begrenzter Nachweis der V1-Sicherheit; keine vollständige Authentifizierungs- oder Produktionsabnahme.

## Nachgewiesener Ablauf

`tests/auth-e2e/session-boundaries.spec.ts` prüft auf Desktop und Mobil die reale Profil-Server-Action im Produktionsbuild:

1. Ein angemeldeter Testnutzer speichert sein Profil. Der Test übernimmt die tatsächlich versendete Action-Kennung und den kodierten Request ausschließlich im Arbeitsspeicher, ohne Cookie-Header zu kopieren.
2. Derselbe direkte POST schreibt mit gültiger Sitzung nachweislich in die Datenbank. Diese positive Kontrolle verhindert einen falschen Sicherheitsnachweis durch eine ungültige Action-Kennung oder kaputte Kodierung.
3. Ein zweiter Tab hält ein bearbeitetes Formular offen. Nach ausdrücklicher Abmeldung im ersten Tab wird derselbe direkte POST mit dem aktuellen Cookie-Stand zur Anmeldung verwiesen. Der geschützte Profilstand bleibt erhalten.
4. Auch das Absenden des noch offenen Formulars führt zur Anmeldung und verändert das gespeicherte Profil nicht. Die Kontrolle liest über eine unabhängige gewöhnliche Nutzersitzung; kein Service-Role-Client wird für die geprüften Anwendungsoperationen verwendet.

Der installierte Next.js-Action-Handler übermittelt Fetch-Action-Weiterleitungen mit HTTP 200 und `x-action-redirect`. Der Test prüft deshalb diesen Weiterleitungsheader und die tatsächliche Datenbankwirkung. Die anfängliche Annahme HTTP 303 war für diese Fetch-Action falsch; die unveränderte Datenbank und der Login-Verweis wurden separat bestätigt.

## Direkte Aufgabenänderung und Eigentümer

`tests/auth-e2e/action-ownership.spec.ts` ergänzt auf Desktop und Mobil den direkten Abschluss einer bestehenden Aufgabe. Der Test übernimmt den echten POST aus dem Eigentümerformular, hält dessen erste Übertragung jedoch an, damit Aufgaben-ID und Revision für alle Wiederholungen aktuell bleiben.

- Ein anderer vollständig eingerichteter Nutzer sendet denselben POST. Er erhält eine generische Fehlermeldung ohne den privaten Aufgabentitel; weder die fremde noch seine eigene Kontrollaufgabe ändern sich.
- Ohne Sitzung und mit einem synthetisch gefälschten Sitzungscookie, das die Identität des Eigentümers behauptet, führt der POST zur Anmeldung. Beide Datenbankstände bleiben unverändert.
- Erst der abschließende identische POST mit der echten Eigentümersitzung setzt die Aufgabe auf erledigt und erhöht ihre Revision genau einmal. Dadurch beweist der Test, dass die vorigen Ablehnungen nicht allein an einer falschen Kodierung, ungültigen Action-Kennung oder veralteten Revision lagen.

Der gemeinsame Helfer `tests/server-actions.ts` bewahrt nur URL, kodierten Inhalt und ausdrücklich benötigte Protokollheader im Arbeitsspeicher auf. Cookies werden nicht kopiert; jeder Aufruf verwendet den aktuellen Sitzungsspeicher seines eigenen Browserkontexts. Der bestehende Profiltest nutzt denselben Helfer und wurde erneut auf beiden Ansichten geprüft. Für die Kontrolle der Datenbankstände werden ausschließlich die gewöhnlichen Sitzungen der jeweiligen Testnutzer verwendet.

Die vier betroffenen Desktop-/Mobilfälle bestehen lokal, ebenso Lint, Typecheck, Formatprüfung, 196 Unit-Tests, Produktionsbuild und 16 öffentliche Browserprüfungen. Die vollständige private Suite umfasst damit 124 Fälle; der GitHub-Nachweis dieses Nachtrags ist getrennt vom unten dokumentierten PR-27-Ergebnis zu kontrollieren. Keine Änderungen an Produktcode, Datenbankschema oder Abhängigkeiten.

Der erste Push-Lauf auf `360bfb1` bestand vollständig; im parallelen PR-Lauf scheiterte die neue Mobilprüfung bei unverändert geforderter Eigentümeraufgabe (123/124 bestanden). Der Test entfernte die Route bereits nach dem Request-Ereignis, das vor der Verarbeitung durch den Route-Handler auftreten kann. Damit konnte der ursprüngliche Eigentümer-POST noch durchgehen. Der korrigierte Ablauf wartet auf `requestfailed`, also den im Browser angekommenen Abbruch, bevor die Route entfernt und der fremde POST gesendet wird. Alle Ablehnungs- und Datenbankprüfungen bleiben unverändert. Nach dieser Korrektur bestanden lokal 20/20 gezielte Fälle (beide Abläufe auf beiden Ansichten, jeweils fünf Wiederholungen ohne Test-Retries) sowie erneut Lint, Typecheck, Formatprüfung, 196 Unit-Tests, Build und 16 öffentliche Browserprüfungen. Der vollständige GitHub-Nachlauf dieser Korrektur steht noch aus; der frühere fehlgeschlagene Lauf wird nicht als bestanden gezählt.

## Umfang und Grenzen

Das bestehende Verhalten benötigt für diesen Fall keine Produktänderung: `requireIdentity(true)` prüft die aktuelle Identität vor der Profiländerung. Abmeldung verwendet `scope: "local"`. Bestehende Browserprüfungen decken außerdem Sitzungserneuerung, erneuten Seitenzugriff nach Logout, Passwortwiederherstellung und gefälschte Sitzungscookies ab.

Diese Tests beweisen weder die sofortige Ungültigkeit zuvor kopierter Zugriffstokens noch die Abmeldung anderer Geräte. Sie decken Profilaktualisierung nach Abmeldung und Aufgabenabschluss mit fremder, fehlender oder gefälschter Identität ab, nicht alle Server Actions. Weitere Schreiboperationen, tatsächlich abgelaufene Tokens und die konkrete Hosting-/Proxy-Konfiguration bleiben Gegenstand weiterer begrenzter Prüfungen. RLS-Integrationstests bleiben eigenständige Nachweise.

Lokal bestanden Lint, Typecheck, Formatprüfung, 196 Unit-Tests, Produktionsbuild, 16 öffentliche Browserprüfungen und beide neuen Desktop-/Mobilprüfungen. Auf Commit `3ce55dd` bestanden außerdem beide vollständigen GitHub-Läufe: [Push](https://github.com/LucaEndrich2002/LifeIO/actions/runs/40640882027) und [Pull Request](https://github.com/LucaEndrich2002/LifeIO/actions/runs/40640912416), einschließlich Datenbankintegration, aller 122 privaten Browserprüfungen und Home-Testpaket. [PR #27](https://github.com/LucaEndrich2002/LifeIO/pull/27) ist zur Prüfung bereit; nicht gemergt. Keine echten KI-Aufrufe, produktiven Konten, neuen Abhängigkeiten oder Datenbankänderungen.

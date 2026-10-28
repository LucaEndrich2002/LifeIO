# LifeOS – Fortsetzungsstand

Stand: 28.10.2026. Selbständige V1-Fortsetzung im bestehenden Chat ist autorisiert; stündliche Automation `lifeos-selbst-ndig-weiterentwickeln` ist aktiv. Vor umfangreicher Arbeit Nutzungslimits prüfen. Bei gesperrter regulärer Nutzung oder weniger als 10 % Rest in einem Fenster keinen umfangreichen neuen Schritt beginnen; keine Zusatzcredits oder Kontingent-Resets nutzen. Echte KI-Live-Tests bleiben ausgesetzt.

## Abgeschlossene Schritte

- **CSP:** [PR #26](https://github.com/LucaEndrich2002/LifeIO/pull/26), Code-Commit `65c8f22`. Beide vollständigen GitHub-Läufe bestanden. Browser-/Caching-Verhalten, frühere Locator-Fehler und endgültiger Nachweis stehen in [CONTENT_SECURITY_POLICY_STATUS.md](CONTENT_SECURITY_POLICY_STATUS.md).
- **Profilmutation nach Logout:** [PR #27](https://github.com/LucaEndrich2002/LifeIO/pull/27), Code-Commit `3ce55dd`. Ein realer direkter Profil-Action-POST und ein noch offenes Formular werden nach Abmeldung zur Anmeldung verwiesen und verändern die gespeicherten Daten nicht. Eine erfolgreiche authentifizierte Wiederholung desselben POST dient als positive Kontrolle. Keine Produktänderung nötig. Umfang und Grenzen: [SESSION_BOUNDARIES_STATUS.md](SESSION_BOUNDARIES_STATUS.md).
- Für PR #27 bestanden lokal Lint, Typecheck, Formatprüfung, 196 Unit-Tests, Build, 16 öffentliche Browserprüfungen und die zwei neuen privaten Fälle. Die vollständigen [Push-](https://github.com/LucaEndrich2002/LifeIO/actions/runs/40640882027) und [PR-Läufe](https://github.com/LucaEndrich2002/LifeIO/actions/runs/40640912416) bestanden zusätzlich Datenbankintegration, alle 122 privaten Browserprüfungen und Home-Testpaket. Frühere falsche HTTP-303-Testannahme wurde anhand des installierten Next.js korrigiert: Fetch-Actions melden den Redirect über Header mit HTTP 200.

- **Direkte Aufgabenänderung:** [PR #28](https://github.com/LucaEndrich2002/LifeIO/pull/28), geprüfter Code-Commit `4020790`. Ein identischer echter POST kann nur mit der Eigentümersitzung abschließen; fremde, fehlende und gefälschte Identitäten verändern keine der beiden Testaufgaben. Die Reihenfolge des anfänglichen Request-Abbruchs wurde nach einem CI-Fehler korrigiert; alle negativen Kontrollen bleiben erhalten. [Push-Lauf](https://github.com/LucaEndrich2002/LifeIO/actions/runs/40649975564) und [PR-Lauf](https://github.com/LucaEndrich2002/LifeIO/actions/runs/40649981959) bestanden vollständig: 196 Unit-, 132 Datenbank-, 16 öffentliche und 124 private Browserprüfungen sowie Home-Testpaket. Lokal zusätzlich 20/20 wiederholte Identitäts-/Logout-Fälle. Umfang und Fehlerhistorie: [SESSION_BOUNDARIES_STATUS.md](SESSION_BOUNDARIES_STATUS.md).

Diese drei PRs sind offen und zur Prüfung bereit. Kein Main-Merge oder Deployment erfolgt. Die vorübergehende Kontingentsperre wurde durch reguläre Erneuerung beendet; keine Credits/Resets verwendet.

## Aktueller Ausgangspunkt

`codex/backup-restore-rehearsal` basiert auf dem vollständig geprüften PR-28-Commit `4020790`. Bisher nur Fortsetzungsdokumentation und Bestandsaufnahme; noch keine Sicherungs-/Wiederherstellungsprobe implementiert oder ausgeführt. Der PR-28-Branch bleibt unverändert auf seinem geprüften Stand.

Die aktuelle CI legt eine frische lokale Supabase-Datenbank an und wendet Migrationen an. Ein eigenständiger Backup-/Restore-Ablauf wurde in `scripts` und `tests` nicht gefunden. Daher als nächstes einen isolierten Wiederherstellungsnachweis mit ausschließlich fiktiven Daten ergänzen. Reale lokale Daten und vorhandene Volumes weder sichern noch zurücksetzen oder ersetzen.

Vorbereitung: PostgreSQL-Image `public.ecr.aws/supabase/postgres:17.6.1.167` ist vorhanden, C: hatte am 28.10. rund 7,8 GiB frei. Vor zusätzlicher Laufzeit Speicher erneut prüfen; keine Images/Volumes aufräumen. Eigene eindeutige Testprojekt-/Container-Namen, Loopback-Endpunkte, begrenzte Laufzeit und überprüfbare Bereinigung nur der selbst angelegten Ressourcen vorsehen. Noch keine konkrete Isolationsvariante als bewiesen betrachten.

`src/server/identity.ts` prüft über `getUser`. Die inventarisierten privaten Action-Einstiege verwenden `requireIdentity(true)`; `changePassword` prüft `getUser` direkt. Öffentliche Auth-Aktionen benötigen eine getrennte Bewertung. Vorhandene Browserprüfungen decken Sitzungserneuerung, Logout mit erneutem Seitenaufruf, Passwortwiederherstellung und gefälschte Sitzungscookies ab.

## Nächste autonome Arbeit

1. Isolierte Backup-/Restore-Probe implementieren: fiktive Konten und Daten erzeugen, Sicherung tatsächlich in ein frisches Ziel zurückspielen und Daten, Beziehungen, Eigentümerisolation sowie wirksame Rollen-/Tabellen-/Spalten-/Funktionsrechte vergleichen. Bestehende Katalogprüfung als Grundlage verwenden; deren aktueller Leser adressiert fest `supabase_db_lifeos` und darf nicht versehentlich die falsche Datenbank prüfen. Migrationen mit vorhandenem Datenbestand als eigenen Nachweis abgrenzen.
2. Backup-Umfang explizit prüfen: Schema, Daten, Rollen, Auth-Datensätze und Migrationshistorie. Laut [Supabase-CLI-Referenz](https://supabase.com/docs/reference/cli/supabase-db-dump) ist der Standarddump keine vollständige Datensicherung; Ziel-Standardrechte können beim Restore zusätzliche Rechte ergeben. Die [Restore-Anleitung](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) behandelt die Migrationshistorie separat. Tatsächliches Verhalten der installierten CLI 2.117.0 lokal verifizieren; keine Cloud-Anweisungen oder Rechteänderungen blind übernehmen.
3. Keine sofortige Ungültigkeit zuvor kopierter Zugriffstokens oder Abmeldung anderer Geräte aus dem Profiltest ableiten. Keine bestandenen CSP-/Logout-/Eigentümerprüfungen ohne neue Änderung oder konkrete Sorge wiederholen. Protokollierung, Geheimnisse und produktive Anfragegrenzen bleiben weitere begrenzte Prüfschritte.
4. Danach weitere lokale Sicherheits-/Betriebsarbeiten gemäß [V1_STATUS.md](product/V1_STATUS.md). Menschliche Home-Abnahme (J05), Cloudregion/-kosten, Hauptbranch-Integration und Veröffentlichung benötigen weiterhin tatsächliche Durchführung bzw. Nutzerentscheidung. Keine späteren Produktphasen, Käufe, öffentlichen Deployments, Main-Merges oder Nachrichten an Dritte ohne Freigabe.
5. Sind keine unabhängigen freigegebenen Arbeiten mehr möglich, verbleibende Entscheidungen einmal melden und die Automation pausieren. Unveränderte nicht bearbeitbare Zustände still behandeln.

## Lokale Laufzeit

Letzter erfolgreicher lokaler Browserlauf am 28.10. mit vorhandener Supabase-Datenbank. Docker benötigte am 27.10. die dokumentierte reversible Socket-Reparatur; siehe [LOCAL_SUPABASE.md](LOCAL_SUPABASE.md). Volumes/Images blieben erhalten. Vorschau wurde auf Port 3000 gestartet (damalige PID 24732); vor Prozessaktionen Zustand und Pfad erneut prüfen.

Fiktives Home-Testpaket: `.cache/home-study/2026-10-27T19-59-04-470Z`. Vorbereitung ist keine menschliche J05-Abnahme. Keine Zugangsdaten, personenbezogenen Daten oder Testkonto-Passwörter in diesem Fortsetzungsstand speichern.

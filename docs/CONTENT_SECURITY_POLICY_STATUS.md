# LifeOS – Content Security Policy

Stand: 28.10.2026. Begrenztes Inkrement der Produktionshärtung aus Phase 10; keine vollständige Sicherheits- oder Beta-Freigabe.

## Verhalten und Architektur

- Der Proxy erzeugt für jede Seitenanfrage eine kryptografisch zufällige Nonce aus 32 Bytes. Eingehende `x-nonce`- und CSP-Header werden überschrieben. Die Richtlinie wird an Next.js weitergegeben und als durchgesetzter `Content-Security-Policy`-Antwortheader ausgeliefert.
- Framework-Skripte und der Startcode des Hell-/Dunkelmodus erhalten dieselbe Nonce. Der Theme-Provider behält die Nonce des aktuellen Dokuments auch nach Clientnavigation und Server Actions; seine temporären Übergangsstile bleiben dadurch zulässig.
- Im Produktionsbuild sind Inline-Skripte ohne gültige Freigabe, HTML-Ereignishandler, nicht freigegebene Inline-Stile, fremde Netzwerkverbindungen, Einbettungen, Plugins und fremde Formularziele gesperrt. `strict-dynamic` erlaubt vertrauenswürdig gestarteten Skripten das Nachladen der Anwendungsbausteine. Das ist keine Freigabe für beliebige Skripte aus untrusted HTML und kein Ersatz für sichere Ausgabe/Eingabevalidierung.
- Ressourcen kommen vom eigenen Ursprung; Bilder dürfen zusätzlich Daten-URLs verwenden. Browserzugriffe auf externe Supabase-/OpenAI-Ursprünge sind nicht freigegeben: Die aktuellen Funktionen verwenden Server Actions und serverseitige Dienste. Neue Browserintegrationen benötigen eine gezielte Prüfung der Richtlinie.
- Nur `next dev` erlaubt zusätzlich JavaScript-Auswertung für Entwicklungswerkzeuge, Inline-Styles für den Style-Loader und WebSockets zu lokalen Loopback-Adressen für Hot Reload. Im Produktionsbuild gibt es weder `unsafe-inline` noch `unsafe-eval`. Entwicklung über entfernte Hosts/HTTPS ist damit nicht pauschal freigegeben.
- Auth-Cookies werden weiterhin ausschließlich für `/auth` und `/account` erneuert. Beim erneuten Erzeugen der Antwort bleiben aktualisierte Request-Cookies, gesetzte Response-Cookies, CSP, `no-referrer` und `private, no-store` erhalten. Öffentliche Vorschauseiten kontaktieren keine Datenbank und verlangen keine Supabase-Konfiguration.

## Bewusste Änderung am Caching

Auch öffentliche Vorschauseiten und 404-Seiten werden jetzt pro Anfrage gerendert. Ein Root-Layout liest die vom Proxy erzeugte Nonce, alle HTML-Antworten sind `private, no-store`. Damit gilt derselbe Schutz bereits vor dem ersten Wechsel von der Vorschau zur Anmeldung. Die bisherige statische HTML-Erzeugung und ein gemeinsamer HTML-CDN-Cache entfallen; der spätere Hostingbetrieb muss den zusätzlichen Renderaufwand berücksichtigen. Framework-Assets unter `/_next/static` behalten ihre unabhängige Zwischenspeicherung.

Eine Richtlinie nur auf den privaten Routen würde bei einer Clientnavigation aus einem ungeschützten Vorschau-Dokument nicht automatisch zur Dokumentrichtlinie. Die gemeinsame Richtlinie vermeidet diese Grenze und benötigt weder zusätzliche Root-Layouts noch Änderungen an den Routenadressen.

## Prüfumfang

- Unit-Prüfungen: frische Nonce, Zurückweisung fremder Header, getrennte Entwicklungsfreigaben, präzise Auth-Routengrenzen sowie wiederholte Cookie-Erneuerung ohne Verlust der Schutzheader.
- Browserprüfungen auf Desktop/Mobil: Header/Nonce für alle Vorschauseiten und 404; Browser blockiert in die echte HTML-Antwort eingefügte Skripte ohne/falsche Nonce, Inline-Handler, nicht freigegebene Styles und eine synthetische fremde Verbindung. Der Test unterbindet die Verbindung zusätzlich, falls die CSP regressiert.
- Normale Navigation, gespeicherter Hell-/Dunkelmodus, Registrierung, Codes, Passwortwiederherstellung, Sitzungserneuerung, Anmeldung, Profilspeicherung und Abmeldung werden mit den bestehenden Browserabläufen geprüft. Eine zusätzliche Prüfung verbindet Vorschau, Login, Server Action, Themewechsel, Reload und Logout ohne CSP-Verstöße.

Die Prüfung verwendet die reale Richtlinie des Produktionsbuilds. Skriptinjektion erfolgt über die HTML-Antwort, nicht durch das privilegierte JavaScript-Ausführungsumfeld der Browserautomation. Es werden keine echten KI-Anfragen gesendet.

## Prüfstand am 28.10.2026

Abgeschlossen auf `65c8f22`: Sowohl [Push-Prüfung](https://github.com/LucaEndrich2002/LifeIO/actions/runs/40613393005) als auch [Pull-Request-Prüfung](https://github.com/LucaEndrich2002/LifeIO/actions/runs/40613398250) sind vollständig erfolgreich. Beide umfassen Format, Lint, Typecheck, 196 Unit-Tests, Build, 16 öffentliche Browserprüfungen, Datenbankintegration, alle 120 privaten Browserprüfungen und das Home-Testpaket. Die 120 privaten Abläufe bestanden nach der abschließenden Korrektur auch in einem vollständigen lokalen Lauf. Die folgenden Absätze dokumentieren die vorangegangenen Fehler und Nachläufe.

Lint, Typecheck, Formatprüfung und Produktionsbuild bestehen. Alle 196 Unit-/Komponententests und 16 öffentlichen Browserprüfungen bestehen. Die private Gesamtsuite lieferte zunächst 118 erfolgreiche Prüfungen und zwei Fehler durch mehrdeutige Treffer in temporären unsichtbaren Framework-Inhalten. Nach Einschränkung dieser Anzeige-Locators auf den sichtbaren Hauptbereich bestanden alle zwölf Home-/Wochenrückblick-Prüfungen auf Desktop und Mobil.

Der vollständige [GitHub-Push-Lauf für dd5dbb8](https://github.com/LucaEndrich2002/LifeIO/actions/runs/40574219737) bestand anschließend einschließlich Datenbankprüfungen, aller 120 privaten Browserprüfungen und Home-Testpaket. Im parallelen [PR-Lauf](https://github.com/LucaEndrich2002/LifeIO/actions/runs/40574252055) blieb eine weitere mehrdeutige `goal-balance`-Anzeigeabfrage (119/120 erfolgreich). Der Nachtrag begrenzt die positiven Abfragen dieses Wertes in den drei betroffenen Testdateien ebenfalls auf den sichtbaren Hauptbereich. Alle 20 zugehörigen Desktop-/Mobilprüfungen sowie Lint, Typecheck und Formatprüfung bestanden danach lokal. Der Nachtrag ändert ausschließlich Tests und Dokumentation; die vollständigen Prüfungen des jeweils aktuellen Commits sind in [PR #26](https://github.com/LucaEndrich2002/LifeIO/pull/26) einzusehen.

Beide GitHub-Läufe des ersten Nachtrags `be778fa` bestanden alle vorgeschalteten Prüfungen, fanden aber dieselbe weitere mehrdeutige `goal-forecast`-Abfrage (jeweils 119/120 private Abläufe erfolgreich). Die gleichartigen positiven Test-ID-Abfragen für Prognose, Frist, Fortschritt, Meilensteine und Monats-/Budgetwerte verwenden deshalb ebenfalls den sichtbaren Hauptbereich. Negative Abwesenheits-/Zugriffsprüfungen behalten ihren globalen Suchbereich. Es werden weder Wiederholungsversuche noch Wartezeiten hinzugefügt, und die erwarteten Werte bleiben unverändert.

Die Zugriffsprüfungen wurden nicht gelockert. Eine separate lokale Diagnose mit sechs vollständigen Home-Aufrufen fand nach dem Laden jeweils einen sichtbaren Inhalt und keine CSP-Verstöße. Der Entwicklungs-Smoke-Test bestätigte Themewechsel, Navigation und die lokale Hot-Reload-Verbindung. Die Datenbanksuite wurde in diesem Schritt mangels Änderungen an Schema oder Datenzugriff nicht erneut lokal ausgeführt; CI führt sie weiterhin aus. Echte KI-Aufrufe bleiben deaktiviert.

## Grenzen und verbleibende Arbeit

CSP reduziert bestimmte Browserangriffe; sie ersetzt weder Autorisierung/RLS noch CSRF-Schutz, valide Fachregeln, sichere Abhängigkeiten oder die vollständige Auth-/Sitzungsprüfung. Die Laufzeitprüfung deckt Chromium auf Desktop und Mobil ab; andere Browser und das spätere Hosting benötigen eigene Abnahme. HTTPS, HSTS, Proxy-/CDN-Verhalten und produktive Header bleiben in der noch nicht eingerichteten Zielumgebung zu prüfen. Es gibt keinen CSP-Meldedienst und keine Übertragung von CSP-Berichten mit möglicherweise privaten URLs.

Produktive Anfragegrenzen, Log-/Secret-Verwaltung, Datenschutz und Löschung, Backup/Restore, Hosting, Integration der Arbeitsbranches sowie Beta bleiben offen. J05 braucht weiterhin fünf tatsächliche Testpersonen. Echte KI-Antwortqualität bleibt auf Nutzerwunsch ausgesetzt.

## Referenzen

- [Next.js: Content Security Policy und Nonces](https://nextjs.org/docs/app/guides/content-security-policy)
- [next-themes: Nonce-Unterstützung](https://github.com/pacocoursey/next-themes)
- [W3C: Content Security Policy Level 3](https://www.w3.org/TR/CSP/)

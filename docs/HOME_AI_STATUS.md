# Life AI direkt auf Home

Stand: 10.10.2026. Begrenztes sechstes Inkrement von Phase 8, nach der [Zielübersicht](AI_GOALS_STATUS.md).

## Verhalten

Das persönliche Home enthält unter den Zielen den Bereich „Dein Überblick mit Life AI“. Nutzer wählen den auf Home eingestellten Finanzmonat, die aktuelle Profilwoche oder die angezeigte Zielseite. Datenvorschau, ausdrückliche Freigabe, Erklärung und feste Quellen erscheinen direkt auf Home. Die Auswahl erzeugt noch keine Provideranfrage. Ohne Auswahl werden auch keine zusätzlichen KI-Daten gelesen.

`insight=month|plan|goals` wählt den Bereich. Feste Links erhalten Monat und Zielseite. Öffnen, Wechseln und Schließen erfolgen mit vollständiger Navigation: Antworten, Freitext und Zustimmung werden nicht auf eine andere Auswahl übertragen. Eine neue Monatsauswahl oder Zielseitennavigation in den ursprünglichen Home-Bereichen schließt die KI-Auswahl ebenfalls. Wiederholungslinks nach Daten- oder Antwortfehlern erhalten den Home-Kontext.

Der Finanzmonat darf historisch sein; die Planung betrifft ausdrücklich die aktuelle Woche, Ziele ihren heutigen Stand und die gewählte Seite. Es gibt keine gemeinsame Bewertung aller Datenbereiche. Die separate Erklärung einer einzelnen Sparprognose bleibt über die Zieldetails erreichbar.

## Daten- und Ausfallgrenzen

`loadHomeInsight` validiert die Auswahl und ruft genau einen bestehenden Snapshot-Lader auf. Autorisierte Tools, RLS, Datenverträge, Fingerabdrücke, Identitätsprüfung, Kontingent und Providertransport bleiben unverändert. Zielnamen bleiben beim Zielüberblick lokal. Keine neuen Tabellen, Migrationen, Abhängigkeiten, Providerprompts, Schreibrechte oder Server Actions.

Die vorhandenen Formulare erhalten einen optionalen, serverseitig fest erzeugten Rückweg. Datenumfang, Quellen und Freigabeprüfung bleiben erhalten. Ohne konfigurierte KI bleiben Werte sichtbar und das Senden deaktiviert. Leere Zielseiten und Seiten außerhalb der KI-Grenze bis einschließlich Index 1000 bieten keine Anfrage an; ein Rückweg führt zur ersten Zielseite oder Zielverwaltung.

Die Vorschau besitzt einen eigenen Ladezustand und fängt Fehler ihrer Datenbeschaffung innerhalb des KI-Bereichs ab. Sie ersetzt die übrigen Home-Daten nicht durch eine Fehlerseite oder scheinbare Nullwerte. Bestehende Home-Hinweise bleiben regelbasiert. KI-Erklärungen werden nicht automatisch gespeichert, erzeugt oder erneuert.

## Prüfung und Grenzen der Abnahme

Lokal bestanden: 175 Unit-/Komponententests, Typecheck, Lint und Formatprüfung. Neue Fälle prüfen die ausschließliche Auswahl eines Bereichs, fehlende Auswahl ohne Zusatzabfragen, Zielseitengrenzen, ungültige Auswahl, lokale Fehlerbehandlung sowie Freigabe, Antwortdarstellung und Home-Rückweg.

Zwei neue Datenbankfälle behandeln echte Monatsdaten, aktuelle Wochenbegrenzung, Zielseite, Kontotrennung, Anmeldung/Einrichtung, leere Ergebnisse und unverbrauchtes KI-Kontingent. Vier neue Browserfälle auf Desktop und Smartphone prüfen Tastatur, Wechsel und Schließen, Kontext, deaktivierte Provider, leere/zu hohe Zielseiten, manipulierte Auswahl und Überlauf. Sie erzeugen helle und dunkle Aufnahmen für die Sichtprüfung.

Lokale Einschränkung: C: hatte bei Erstellung nur rund 200 MB frei. Produktionsbuild und vollständige Datenbank-/Browserprüfungen werden deshalb in GitHub Actions ausgeführt; bestätigte Ergebnisse und Sichtprüfung stehen am Pull Request. Die lokale Vorschau wird erst nach ausreichend freiem Speicher neu gebaut und aktualisiert.

Echte OpenAI-Anfragen und die Bewertung tatsächlicher Antworten bleiben auf Nutzerwunsch ausgesetzt. Die lesenden KI-Ansichten einschließlich Home sind implementiert; R12 ist ohne diese Abnahme nicht vollständig bestätigt. Die manuelle Home-Verständlichkeitsprüfung J05, optionale Onboarding-Aufgaben, Wochenrückblick, Benachrichtigungen und Beta-Vorbereitung bleiben separat offen; siehe [V1_STATUS.md](product/V1_STATUS.md).

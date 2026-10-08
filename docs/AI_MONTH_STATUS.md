# Life AI – private Monatserklärung

Stand: 02.10.2026

Fortschreibung vom 07.10.2026: Die lokale Providerkonfiguration ist inzwischen hinterlegt. Der Verbindungstest meldete fehlendes API-Guthaben; weitere KI-Live-Tests werden auf ausdrücklichen Nutzerwunsch ausgelassen. Die folgende Abnahme bleibt eine Abnahme mit Testantworten. [AI_GOAL_STATUS.md](AI_GOAL_STATUS.md) beschreibt die anschließende Sparziel-Erklärung und die gemeinsam genutzten Formular-, Provider- und Kontingentgrenzen.

Dieses zweite, begrenzte Inkrement von Phase 8 macht den Finanzmonat unter `/account/ai` zugänglich. Die öffentliche AI-Seite und die Kontonavigation verlinken dorthin. Monatsdaten, fehlende Angaben und ein fehlendes Budget sind unabhängig von einer Modellanbindung sichtbar. Die KI-Verbindung ist auf diesem Rechner noch nicht eingerichtet: Es wurden keine echten Provideranfragen gesendet. R12 bleibt offen, insbesondere die weiteren Datenbereiche und die qualitative Abnahme echter Modellantworten.

## Nutzerablauf

Der Nutzer wählt einen Monat und sieht die tatsächlich verwendeten Werte, Buchungsanzahlen, Budgetangaben und Fehlstellen. Die Daten stammen aus `get_financial_summary` und `get_budget_status`, jeweils mit aktueller Anmeldung und RLS. Weitere Datenbereiche sind für diesen Ablauf nicht freigegeben.

Eine optionale Frage hat höchstens 600 Zeichen. Erst nach dem aktiven Ankreuzen der Datenfreigabe wird der Sendeknopf verfügbar. Änderungen an der Frage entfernen die Freigabe. Der Server verlangt dieselbe Bestätigung, einen gültigen Monat und den Fingerabdruck der angezeigten Werte. Er lädt eigene Daten erneut; bei abweichenden Werten verlangt er eine neue Vorschau. Die Auswahl kann nicht über zusätzliche Toolnamen, Nutzer-IDs oder Provideradressen erweitert werden.

Die Antwort erscheint als kurzer, ausdrücklich als KI-Einordnung markierter Text mit festen Links zur ursprünglichen Monatsübersicht und zum Budget. Geldwerte und Warnschwellen rendert die Anwendung aus ihren Fachberechnungen. Der Modelltext soll keine Zahlen enthalten; numerische Zeichen im Freitext werden serverseitig zurückgewiesen. Das verhindert erfundene Ziffernwerte, garantiert aber keine inhaltlich fehlerfreie Einordnung. Ausgeschriebene Zahlen oder falsche qualitative Aussagen sind weiterhin eine Grenze, die vor Freischaltung mit echten Antworten geprüft werden muss. Die Oberfläche fordert dazu auf, die Originalwerte zu prüfen.

Laden, fehlende Konfiguration, unvollständige Daten, veraltete Vorschau, Providerfehler und Anfragelimits erhalten eigene sichtbare Zustände. Eingaben bleiben bei Fehlern erhalten. Antworten werden als React-Text ausgegeben; Modelltexte erzeugen weder HTML noch anklickbare externe Quellen oder ausführbare Aktionen. Es gibt keinen gespeicherten Chatverlauf und keinen automatischen Wiederholungsversuch.

## Datenfluss und Grenzen

`src/server/ai-actions.ts` ist die schmale Server Action; `answer.ts` prüft Freigabe, Identität, Vorschau und Kontingent. Der Server verwendet ausschließlich normale Supabase-Nutzerrechte. `month-data.ts` reduziert die bestehenden Leseantworten auf den sichtbaren Monatsvertrag. Buchungsnamen, Einzelbuchungen, Notizen, Kontodaten, Zielnamen und Kalenderdaten verlassen diese Grenze nicht. Freitext, den der Nutzer selbst in die Frage schreibt, wird wie angekündigt mitgesendet.

`provider.ts` führt höchstens einen HTTPS-Aufruf an die feste OpenAI-Responses-Adresse aus: 20 Sekunden Zeitlimit, 1.200 Ausgabetokens, keine Tools, keine Weiterleitungen, keine Gesprächsfortsetzung und `store: false`. Die Antwort muss vollständig und strukturiert sein; maximal 64 KiB Antwortdaten, drei kurze Absätze und die bekannten Quellenbezeichner werden akzeptiert. Ablehnungen, unerwartete Toolausgaben oder ungültige Formate werden zu einer neutralen Fehlermeldung. Rohfehler, Schlüssel, Fragen und Finanzwerte werden nicht protokolliert. Die Sitzung wird vor dem Ausliefern erneut geprüft.

Die additive Migration `20261001190000_ai_request_limits.sql` speichert nur Nutzer-ID, UTC-Kalendertag, Versuchszahl und letzten Anfragezeitpunkt. Pro Konto sind höchstens 20 Versuche je UTC-Tag und höchstens ein Versuch in 30 Sekunden zulässig. Fehlgeschlagene Provideraufrufe verbrauchen einen Versuch. Eine feste `security definer`-Funktion mit leerem Suchpfad und ohne Parameter erhöht den Zähler atomar nach Auth-/Onboarding-Prüfung. Das ist eine eng begrenzte betriebliche Schreiboperation, keine KI-Schreibberechtigung auf Nutzerdaten. Nutzer können nur ihre eigene Zählerzeile lesen und den Zähler nicht zurücksetzen; Kontolöschung entfernt sie. Das Limit gilt über mehrere App-Prozesse. Für eine öffentliche Beta bleiben zusätzliche Grenzen gegen massenhafte Kontenerstellung und ein globales Betreiberbudget erforderlich.

## Lokale Einrichtung

In der ignorierten `.env.local` werden ausschließlich serverseitig `OPENAI_API_KEY` und `OPENAI_MODEL` gesetzt; anschließend den lokalen App-Prozess neu starten. Ein eigenes API-Projekt mit begrenztem Budget verwenden und ein dafür freigegebenes Responses-Modell mit strukturierten Textausgaben wählen. Es wird kein Modell automatisch ausgewählt. Schlüssel weder im Chat noch in Git oder `NEXT_PUBLIC_*` hinterlegen. Die Beispieldatei enthält nur leere Platzhalter.

Ohne beide Werte bleibt die echte Monatsübersicht nutzbar und die Sendefunktion deaktiviert. Unit-Tests ersetzen den HTTP-Transport; Integrationstests ersetzen ausschließlich den Provider bei echten lokalen Nutzerrechten. Der lokale Supabase-Teststarter und der private Browser-Testserver setzen die Providerkonfiguration explizit leer. Dadurch verwenden Tests auch auf später konfigurierten Rechnern keine echten KI-Zugangsdaten. Die Vorschau enthält keine als echt ausgegebenen Musterantworten.

`store: false` deaktiviert den gespeicherten Responses-Verlauf, ist aber keine Zusage vollständiger Datenlöschung: OpenAI beschreibt eigene Aufbewahrung für Missbrauchsschutz. Die Oberfläche verlinkt die Datennutzung vor dem Senden. Grundlage der Implementierung sind die offiziellen Seiten zu [strukturierten Ausgaben](https://developers.openai.com/api/docs/guides/structured-outputs), [Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses) und [Datennutzung](https://developers.openai.com/api/docs/guides/your-data), geprüft am 01.10.2026.

## Prüfung

Neue Tests prüfen Zustimmung, begrenzte Eingaben, Betragsdarstellung, Quellen, manipulierte Inhalte, Antwortgrößen, Providerfehler, fehlende Konfiguration und Lade-/Antwortzustände. Datenbanktests prüfen normale Nutzerrechte, zwei getrennte Konten, unveränderte Finanzdaten, parallele Kontingentansprüche, UTC-Tageswechsel, direkte Zählermanipulation und Abmeldung während der Anfrage. Browserprüfungen auf Desktop und Smartphone behandeln die neue private Route, Monatswechsel, fehlende Daten, Kontoschutz und den Zustand ohne Provider.

Lokale Abnahme am 02.10.2026 abgeschlossen: Lint, Typecheck, Formatprüfung und Produktionsbuild bestanden. Alle 333 Tests sind erfolgreich: 147 Unit-/Komponenten-, 90 Datenbank-, 84 private Browser- und 12 öffentliche Browsertests. Der präzisierte Datenbankfall mit einer tatsächlichen Budgetänderung nach der Vorschau wurde anschließend gezielt erneut geprüft. Die Desktopansicht im hellen und die Smartphoneansicht im dunklen Design wurden visuell kontrolliert. Es blieben keine automatisch erzeugten Testkonten zurück. Die GitHub-Abnahme des konkreten Commits wird im Pull Request dokumentiert.

Ein erster Datenbanklauf scheiterte beim künstlichen Vorbelegen von Testzählern, weil direkte Data-API-Schreibrechte absichtlich fehlen. Der ausschließlich lokale Fixture-Helfer setzt nun streng validierte Testwerte über die Datenbankverbindung, ohne Nutzerrechte zu erweitern. Der abschließende Lauf bestand. Bei bestehenden Zielverknüpfungs-Browsertests erschienen erneut einzelne Meldungen „The destination stream closed early“; deren Assertions bestanden. Zeitlimits und Sicherheitsprüfungen wurden nicht gelockert.

Ein echter OpenAI-Antworttest bleibt mangels API-Schlüssel und Modellauswahl offen. Ziel-/Aufgaben-/Terminantworten, ein Home-KI-Insight und die Verständlichkeitsprüfung J05 gehören weiterhin nicht zu diesem Monatsinkrement.

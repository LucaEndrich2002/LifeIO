# Home verstehen: Testpaket für J05

Stand: 16.10.2026. **Vorbereitet, noch nicht mit Menschen durchgeführt.** Ein erfolgreicher Vorbereitungslauf ist keine bestandene Produktabnahme.

## Material erstellen und öffnen

1. Lokale Supabase starten, dann den aktuellen Stand mit `pnpm build` bauen. Die öffentlichen Supabase-Buildvariablen müssen auf dieselbe lokale Datenbank zeigen wie bei `pnpm test:auth`.
2. `pnpm test:home:prepare` ausführen. Der bestehende Test-Wrapper akzeptiert ausschließlich lokale Docker-/Supabase-Endpunkte und deaktiviert echte KI-Anfragen. Er erstellt ein isoliertes fiktives Konto, erfasst das echte private Home und löscht das Konto anschließend. Bestehende Konten werden nicht verwendet.
3. Im ausgegebenen Ordner `.cache/home-study/<Zeitpunkt>/` müssen `index.html`, `home.png`, `protokoll.csv`, `ANLEITUNG.md` und `manifest.json` liegen. Nur ein Manifest mit `preparation: "ready"` bestätigt einen vollständig erfolgreichen Vorbereitungslauf. Abgebrochene Ordner nicht verwenden.
4. `index.html` in einem Desktop-Browser öffnen. Die Datei enthält das Bild selbst, benötigt keine Anmeldung und keine Netzwerkverbindung. Browserzoom 100 %, Inhaltsbereich mindestens 1280 × 792 Pixel. Bei zu kleinem Fenster bleibt Start gesperrt. Für alle fünf Personen **dieselbe erzeugte Datei** verwenden, nicht vor jeder Person neu vorbereiten.

Das Manifest hält Quellcommit, uncommittierte Änderungen, Aufnahmedatum, Profilzeitzone, Finanzmonat, Bild-Prüfsumme und Bildschirmgröße fest. Die Aufnahme enthält nur fiktive Daten, keine Zugangsdaten. Sie zeigt den tatsächlichen Stand des zuvor erstellten Builds; deshalb nach Codeänderungen erneut bauen. Die gesamte Gruppe verwendet einen unveränderten Stand.

Die Quelle des Testpakets liegt in `tests/home-study/`, die separate Vorbereitung in `playwright.home-study.config.ts`. CI führt die Vorbereitung zusätzlich zu den bestehenden Abnahmen aus und stellt das frisch erzeugte Paket als Artefakt `home-study-kit` für sieben Tage bereit. Dieses enthält ausschließlich fiktive Daten und ein leeres Protokoll; ausgefüllte lokale Protokolle werden nicht hochgeladen. Ein CI-Erfolg ist keine menschliche J05-Abnahme. Das Testpaket verändert weder Produktrouten noch Datenbankrechte und installiert keine weiteren Pakete. Lokale Ausgaben und ausgefüllte Protokolle unter `.cache/` bleiben außerhalb von Git.

## Durchführung mit fünf Personen

Fünf Personen aus der V1-Zielgruppe auswählen, die diese konkrete Aufnahme und den Lösungsschlüssel noch nicht gesehen haben. Nur P01 bis P05 protokollieren; Namen, E-Mail-Adressen und Tonaufnahmen sind nicht nötig. Die folgenden Fragen stehen vor Beginn auf dem Bildschirm. Keine Felder erklären, Antworten verraten oder auf Bereiche zeigen.

> Du siehst gleich ein fiktives Dashboard. Was steht heute an? Wie viel bleibt nach den erfassten Angaben im angezeigten Monat? Welches Ziel benötigt Aufmerksamkeit, und warum? Antworte laut. Du hast insgesamt zehn Sekunden und darfst scrollen. Links sind in der Aufnahme nicht anklickbar.

1. Die Person liest alle Fragen vor dem Start. Die Testleitung hält das leere Protokoll bereit; Lösungsschlüssel und vorige Ergebnisse bleiben für die Person verborgen.
2. „Test starten“ zeigt das Dashboard und startet gleichzeitig die Zeit. Die Person kann per Maus oder Tastatur scrollen. Die Aufnahme wird in Originalgröße gezeigt; Ziele unterhalb des ersten Ausschnitts werden nicht vorab eingeblendet.
3. Die Testleitung klickt unmittelbar nach der letzten gesprochenen Antwort auf „Letzte Antwort gegeben · stoppen“. Die Seite blendet das Bild aus und nennt die Dauer. Die Bedienung verzögert die Messung geringfügig; keine nachträgliche Verkürzung oder Aufrundung zu einem bestandenen Versuch. Bei uneindeutiger Grenzmessung als unklar dokumentieren.
4. Nach zehn Sekunden verschwindet das Bild automatisch. Noch offene oder erst danach gegebene Antworten erfüllen das Zeitkriterium nicht. Es sind **nicht** zehn Sekunden Anschauen plus zusätzliche Antwortzeit.
5. Jetzt die wörtlichen Antworten, Zeit, Richtigkeit und Missverständnisse eintragen. Erst anschließend nachfragen, was verwirrend war; diese nachträglichen Antworten zählen nicht für J05.
6. „Nächste Person vorbereiten“ verdeckt das Bild wieder. Nur ein unbeeinflusster Erstversuch pro Person zählt. Fenster-/Tabwechsel, technische Unterbrechungen, Hilfe und vorherige Sichtung kennzeichnen. Wiederholungen nicht als unabhängige Erstversuche ausgeben.

Das Tool erkennt Tab-Ausblendung und Größenänderung während des Durchlaufs und markiert ihn dann als unterbrochen. Sonstige Ablenkungen und Hilfestellungen muss die Testleitung erfassen. Es gibt keine automatische inhaltliche Bewertung und keine Speicherung gesprochener Antworten.

## Lösungsschlüssel – nur für die Testleitung

| Frage | Als korrekt werten                                                                                                                                                                                                                                                                                                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Heute | Die offene Aufgabe **„Reise planen“** und den Termin **„Beratung“** nennen. Der Termin ist am in der Aufnahme genannten Tag von 10:00 bis 11:00 Uhr in Europe/Berlin; genaue Uhrzeiten sind für diese Kernfrage nicht zusätzlich erforderlich. Nur „eine Aufgabe und ein Termin“ ohne Identifikation reicht nicht. |
| Monat | **800 Euro verbleiben** nach erfassten Angaben im September 2026. Der Betrag ist ein Planwert, kein Kontostand. Eine ausdrücklich als Kontostand bezeichnete Antwort ist falsch. Die Herleitung muss nicht aufgesagt werden.                                                                                       |
| Ziel  | **„Sprache lernen“**, weil sein Zieldatum bereits verstrichen ist und es noch offen ist. Nur „ein Ziel ist überfällig“ ohne Name oder ausschließlich das Budget bzw. eine Aufgabe zu nennen reicht nicht.                                                                                                          |

Der fiktive Ausgangspunkt: 2.800 Euro Einnahmen − 900 Euro Fixkosten − 600 Euro variable Ausgaben − 500 Euro geplante Sparrate = 800 Euro. Das 500-Euro-Budget begrenzt die bereits erfassten variablen Ausgaben und wird nicht nochmals abgezogen; es ist um 100 Euro überschritten. Zusätzlich ist „Unterlagen prüfen“ überfällig. Das Sparziel „Reserve“ steht bei 35 % und hat kein überschrittenes Zieldatum. Heute und das gestrige Zieldatum werden bei der Aufnahme passend zur Profilzeitzone angelegt und im Manifest festgehalten; der Finanzmonat bleibt September 2026.

## Protokoll und Entscheidung

Die erzeugte CSV enthält fünf leere Zeilen. Zeit mit zwei Dezimalstellen notieren; bei Ablauf `>10`, bei Unterbrechung `unterbrochen`. Richtigkeit und Zeitkriterium jeweils mit `ja`, `nein` oder `unklar` erfassen. Bei Antworten mit Semikolon oder Zeilenumbruch ein Tabellenprogramm verwenden, damit die CSV korrekt maskiert bleibt.

- Eine Person besteht nur, wenn **alle drei Antworten korrekt**, spätestens nach zehn Sekunden abgeschlossen und ohne Hilfe gegeben wurden.
- J05 besteht nur mit **fünf von fünf** gültigen bestandenen Erstversuchen derselben Aufnahme. Ergebnisse nicht mitteln, fehlende Zeilen nicht als bestanden zählen.
- Bei Fehlversuchen die konkrete Verwechslung oder Suchstelle festhalten, Home gezielt überarbeiten und anschließend eine neue dokumentierte Gruppe mit unverbrauchtem Erstversuch prüfen. Der ursprüngliche Durchgang bleibt erhalten.
- Zeitpunkt, Manifest/Bild-Prüfsumme, Browser, Gerät, Zoom und Testleitung zum Protokoll notieren. Ausgefüllte Protokolle nur lokal aufbewahren; Löschzeitpunkt mit den Beteiligten vorab vereinbaren. Kein automatischer Upload.

Die Aufnahme prüft die visuelle Verständlichkeit dieses Desktop-Stands. Sie ersetzt keine Prüfung interaktiver Links, der Smartphoneansicht oder mit assistiven Technologien; diese Grenzen gehören in den Abschlussbericht. Automatische Browserprüfungen bleiben ergänzende technische Nachweise. Erst nach realer Durchführung Ergebnisse zusammenfassen und den J05-Status in PRD/Roadmap aktualisieren.

## Technischer Prüfstand

Am 16.10.2026 bestanden Lint, Typecheck, Formatprüfung und Produktionsbuild sowie 187 Unit-, 127 Datenbank- und 12 öffentliche Browsertests. Der zusätzliche Vorbereitungstest erfasst Home über den normalen angemeldeten Nutzer, prüft Geldbetrag, heutige Einträge und das überfällige Ziel und entfernt danach sein Testkonto. Er prüft außerdem Tastaturstart, Zeitablauf, rechtzeitiges Stoppen ohne automatische Bestehenswertung, Tab-Ausblendung, Größenänderung und gesperrten Start bei zu kleinem Fenster. Die tatsächliche Dashboard-Aufnahme wurde visuell kontrolliert. **Keine dieser Prüfungen zählt zu den fünf menschlichen Erstversuchen.** Echte KI-Anfragen wurden nicht ausgeführt.

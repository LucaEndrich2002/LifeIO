# Life AI – Mehrere Ziele einordnen

Stand: 10.10.2026. Begrenztes fünftes Inkrement von Phase 8, nach der [Wochenansicht](AI_PLAN_STATUS.md).

## Umfang

`/account/ai/goals` zeigt bis zu sechs eigene Sparziele und persönliche Ziele pro Seite. Die Reihenfolge entspricht dem persönlichen Dashboard: offene Ziele zuerst, anschließend nach Zieldatum und stabiler ID. Gesamtanzahl, aktuelle Seite und ein ausdrücklicher Ausschnitt-Hinweis grenzen die Einordnung ein. Weitere Seiten lassen sich vor einer jeweils neuen Freigabe öffnen. Eine leere Seite führt zur ersten Seite; ein Konto ohne Ziele zur Zielverwaltung. Leere Seiten bieten keine Provideranfrage an.

Zielverwaltung und Monats-KI verlinken „Ziele gemeinsam mit Life AI betrachten“. Jede Karte verlinkt ihr eigenes Ziel, die feste Antwortquelle führt zur entsprechenden Zielseite im Dashboard. Die bestehenden Einzelprognosen bleiben unter `/account/ai/goals/[id]` erreichbar. Ungültige Seiten werden abgewiesen. Die bestehende Toolgrenze von Seite 0 bis 1000 bleibt erhalten; weitere Ziele können im Dashboard geöffnet werden.

Sparziele zeigen Zielbetrag, tatsächlichen Stand, Restbetrag, Zieldatum, Prognosestatus, berechneten Termin und Terminvergleich. Persönliche Ziele zeigen erledigte und erfasste Meilensteine. Ohne Meilensteine bleibt der Fortschritt offen. Ein zukünftiges persönliches Zieldatum ist ohne Dauer und Zeitplan nicht einschätzbar. Ein überschrittenes Zieldatum wird getrennt von einer berechneten verspäteten Sparprognose ausgewiesen. Ein erreichtes Ziel liefert keinen früheren Abschlusszeitpunkt.

Die Prognoseannahmen gelten wie in der Einzelansicht: Beiträge am Monatsende ab dem Folgemonat, gespeicherte Ratenänderungen und Pausen, keine automatisch nachgeholten Beiträge, Zinsen oder Renditen. Die Ansicht prüft weder gemeinsame Finanzierbarkeit noch verfügbares Zeitbudget, Abhängigkeiten oder die Verteilung eines gemeinsamen Geldtopfs.

## Daten- und Freigabegrenzen

Das bestehende autorisierte Tool `get_goals` ergänzt seine Sparziele um `remaining_minor` und die aus `forecastGoal` berechnete `projection`. Dazu genügt der bereits vorhandene gemeinsame Datenbanksnapshot von Zielen, tatsächlichen Einzahlungen, Sparraten und Meilensteinanzahlen. Es werden keine zusätzlichen Ziel-Detailabfragen durchgeführt. Die vorhandenen Toolfelder bleiben erhalten; `get_goal_projection` verwendet unverändert dieselbe Fachberechnung für ein einzelnes Sparziel. RLS, aktuelle Anmeldung und abgeschlossene Einrichtung bleiben erforderlich.

`loadAiGoals` erhält ausschließlich die Freigabe für `get_goals`. Der Provider sieht nur die ausgewählte Seite: Kürzel A bis F, Zielarten, Beträge in ganzzahligen EUR-Cent-Zeichenfolgen, Zieldaten, Prognose-/Terminstatus und Meilensteinanzahlen, dazu Stichtag, Profilzeitzone, Seitenindex und Gesamtanzahl. Namen, interne IDs, Meilensteintitel, Ratenverläufe, Einzahlungsnotizen, andere Zielseiten sowie Money-/Plan-Datensätze bleiben außerhalb der Anfrage. Die Kürzel beginnen auf jeder Seite neu. Diese Verringerung direkter Identifikatoren macht die enthaltenen persönlichen Planungsdaten nicht anonym.

Namen erscheinen nur lokal neben den Kürzeln. Der Fingerabdruck bindet trotzdem Namen, IDs, Seite und angezeigte Fakten an die Vorschau, damit eine Umbenennung oder geänderte Auswahl vor dem Senden eine erneute Prüfung verlangt. Änderungen an Einzahlungen, Meilensteinen, Prognosen, Profilzeitzone und lokalem Datum werden ebenfalls erkannt. Selbst eingegebener Freitext wird nach sichtbarer Freigabe mitgesendet.

Formular, ausdrückliche Zustimmung, Begrenzung der Frage auf 600 Zeichen, Erhaltung von Eingaben bei Fehlern, Kontolimit und Providertransport werden wiederverwendet. Der Server lädt den Datenstand vor jeder Anfrage erneut, verbraucht bei ungültiger Freigabe kein Kontingent und prüft nach der Antwort nochmals die Identität. Kein Chatverlauf, keine Schreibrechte, keine neuen Tabellen, Migrationen oder Abhängigkeiten. Modelltext darf nur die feste Quelle `goals` verwenden; Zahlen stehen in der Datenvorschau und werden im Modellfreitext nicht zugelassen.

## Prüfung und verbleibender Umfang

Prüfungen decken gemeinsame Prognosewerte, beide Zielarten, Terminstatus, unvollständige Seiten, Geld-/Zählergrenzen, sichere Zuordnung, Kontotrennung, manipulierte Argumente, leere Konten, fehlende Freigabe/Konfiguration, veränderte Quelldaten, Zeitzonen-/Tageswechsel, geteiltes Kontingent, Providerfehler und Abmeldung ab. Browserfälle behandeln außerdem Seitennavigation, feste Zielquellen, Anmeldung/Einrichtung, Tastatur und mobilen Überlauf.

Lokal bestanden: 168 Unit-/Komponententests, 107 Datenbanktests, 18 betroffene private Browserfälle und 12 öffentliche Browserfälle auf Desktop und Smartphone, insgesamt 305 Fälle. Lint, Typecheck, Produktionsbuild und Formatprüfung sind bestanden. Die Desktop-Ansicht im hellen Design und die mobile Ansicht im dunklen Design wurden anhand der Browseraufnahmen visuell geprüft. Die vollständige private Browsersuite läuft zusätzlich in GitHub Actions; ihr Ergebnis wird am zugehörigen Pull Request ausgewiesen.

Die zunächst zu strikte HTTP-404-Erwartung für ungültige Seiten wurde an den [dokumentierten Next.js-Vertrag](https://nextjs.org/docs/app/api-reference/file-conventions/not-found) angepasst: Nach Beginn einer gestreamten Antwort bleibt der HTTP-Status 200. Der Test verlangt unabhängig davon die Nicht-gefunden-Ansicht, `noindex`, einen gültigen Rückweg und das Fehlen von Zieldaten und Providerformular; er legt zuvor ein eigenes Ziel an. Quellenprüfungen warten außerdem auf die tatsächlich angezeigten Ziele im Dashboard, bevor Testkonten entfernt werden.

Echte KI-Anfragen bleiben auf ausdrücklichen Nutzerwunsch ausgesetzt; Tests verwenden simulierte Antworten oder deaktivierte Providerkonfiguration. Die tatsächliche Antwortqualität bleibt offen.

Nach diesem Inkrement bleibt innerhalb von R11/R12 vor allem der KI-Insight-Bereich im persönlichen Home sowie die ausgesetzte Abnahme echter Antworten. Wochenrückblick, Benachrichtigungen, optionale Onboarding-Aufgaben und Beta-Vorbereitung folgen separat; siehe [V1_STATUS.md](product/V1_STATUS.md).

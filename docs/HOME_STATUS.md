# Persönliches Home-Dashboard

## Umfang und Einstieg

Das erste Home-Inkrement setzt den technischen Überblick aus R11 um: Begrüßung und Datum, Heute, Monatsübersicht, Ziele und überprüfbare Aufmerksamkeitshinweise. `/account/home` benötigt eine gültige Sitzung, ein Profil und abgeschlossene Einrichtung. Der Abschluss der Einrichtung führt über `/account/overview` zum Dashboard mit dem gewählten Startmonat. Der normale Home-Einstieg verwendet den aktuellen Monat der Profilzeitzone. Das Profil und die Navigation im Kontobereich bieten einen direkten Einstieg; die öffentliche Startseite bleibt eine gekennzeichnete Vorschau.

R12/KI, Weekly Review, Benachrichtigungen, neue Schreibaktionen und optionale Onboarding-Aufgaben gehören nicht zu diesem Inkrement. Der KI-Insight-Bereich folgt mit R12. Die Verständlichkeitsprüfung J05 mit fünf Personen ist weiterhin offen; technische Tests ersetzen sie nicht. Phase 7 ist deshalb nicht insgesamt abgenommen.

## Regeln

- Ein serverseitiger Zeitpunkt bestimmt heute und den Standardmonat in der Profilzeitzone. Ein gewählter Finanzmonat verändert weder heute noch den aktuellen Zielfortschritt. Kalendergrenzen verwenden die vorhandene Temporal-Zeitlogik; Start inklusive, Ende exklusiv, auch bei 23-/25-Stunden-Tagen und Terminen über Mitternacht.
- Heute zeigt bis zu drei offene, heute fällige Aufgaben nach Priorität und drei heutige Termine nach Beginn. Die Gesamtzahlen umfassen alle passenden Einträge, unabhängig von der Vorschaugrenze. Links führen zu vollständigen Tageslisten und den konkreten Details. Erledigte oder entfernte Aufgaben zählen nicht als offen; undatierte Aufgaben bleiben im Plan auffindbar.
- Money verwendet unverändert `loadMoneyMonth` und `availableMinor`. Einnahmen minus Fixkosten minus variable Ausgaben minus geplante Sparrate entspricht bei gleichem Datenstand der Money-Detailansicht. Ein Budget ist kein weiterer Abzug. Fehlende Einnahmen oder unbekannte Fixkosten ergeben „Noch unvollständig“, keinen erfundenen verfügbaren Betrag. Der Planwert ist kein Kontostand.
- Ziele umfassen beide Arten, sechs Einträge pro Seite mit vollständiger Gesamtzahl. Offene Ziele stehen zuerst, danach aufsteigend nach Zieldatum und ID; Ziele ohne Datum folgen innerhalb ihres Status. Leere Folgeseiten behalten die Rücknavigation. Tatsächliche Einzahlungen ohne stornierte Beiträge ergeben zusammen mit dem Anfangsstand den Sparfortschritt; Rate und Prognose verwenden vorhandene Regeln. Persönlicher Fortschritt zählt alle aktiven Meilensteine; ohne Meilensteine bleibt er unbekannt. Erreichte Ziele lösen keine überfälligen Zieldaten aus.
- Hinweise nennen den überprüfbaren Anlass und einen passenden Link: Budgetnutzung ab exakt 90 % (vor Prozent-Rundung), Überschreitung, überfällige offene Aufgaben und überschrittene offene Zieldaten. Die letzten beiden Gesamtzahlen umfassen alle Einträge; höchstens drei älteste Aufgaben werden direkt angezeigt. Sparprognose-Hinweise beziehen sich ausdrücklich auf die sichtbare Zielseite. Die erste Zielseite enthält die frühesten offenen Zieldaten.
- Die Übersicht liest aktuelle Daten beim Aufruf. Ein Neuladen übernimmt Änderungen aus anderen Fenstern. Lade- und Fehlergrenzen des Kontobereichs zeigen keine vermeintlich gültigen Nullwerte; ein fehlgeschlagener Teilzugriff lässt die gesamte Übersicht fehlschlagen. Leerzustände bieten konkrete erste Schritte. Formulare, Links und Seitenauswahl sind per Tastatur bedienbar; das Layout verwendet dieselben hellen und dunklen Farben wie die übrige App.

## Architektur und Sicherheit

`src/server/home.ts` kombiniert die bestehenden autorisierten Money-, Aufgaben- und Kalenderzugriffe, eine eigene begrenzte Abfrage überfälliger Aufgaben und `read_home_goals`. Alle verwenden den angemeldeten Supabase-Client und RLS; jede Abfrage ist auf den Nutzer begrenzt. Es gibt keine Admin-Schlüssel, Cross-User-Parameter oder neue Schreibrechte.

`20261001090000_home_goals.sql` ergänzt ausschließlich eine stabile `security invoker`-Lesefunktion mit leerem Suchpfad. Sie validiert Tag und begrenzte Seitenzahl, verlangt Anmeldung und abgeschlossene Einrichtung, aggregiert eigene Einzahlungen und aktive Meilensteine und liest Raten nur für die sechs gewählten Ziele. Seitendaten und Gesamtzahlen der Ziele kommen aus demselben Datenbank-Snapshot. Bestehende Tabellen, Regeln und Daten bleiben erhalten; kein Reset und keine zusätzlichen Pakete sind erforderlich.

Reine Zeitraumauswahl, validierte Ergebnisformen und Hinweisregeln liegen in `src/domain/home.ts`. Home-Featureansichten sind Server Components. Der schmale Kontobereich wird nur für das Home-Dashboard verbreitert; bestehende Formulare behalten ihre Breite. Auth-Ansichten erhalten keine Kontonavigation.

## Prüfung und verbleibende Abnahme

Neue Unit-Tests behandeln lokale Monats-/Tagesgrenzen, Sommerzeit, die exakte Budgetwarnschwelle, unbekannten/überschrittenen Fortschritt sowie ungültige Eingaben. Datenbanktests prüfen die tatsächliche Home-Zusammenstellung, Übereinstimmung mit Money und Zieldetails, vollständige Zählungen jenseits von 25 Einträgen, mehrere Zielseiten, stornierte/entfernte Einträge, Datumsgrenzen, RLS mit zwei Nutzern sowie anonyme und unvollständige Konten.

Browserabläufe auf Desktop und Smartphone prüfen Navigation und Monatswechsel, Aktualisierung nach erledigten Aufgaben, komplette Zählungen und Zielseiten, Leerzustände, fremde Parameter und ungültige Routen. Die vorhandenen Onboarding-Tests prüfen nun den Dashboard-Abschluss mit unveränderten finanziellen Assertions.

Lokale Abnahme am 01.10.2026: Lint, Typecheck, Formatprüfung und Produktionsbuild bestanden. Alle 302 Tests sind erfolgreich: 132 Unit-, 78 Datenbank-, 80 private Browser- und 12 öffentliche Browsertests. Die Desktopansicht im hellen Design und die Smartphoneansicht im dunklen Design wurden visuell geprüft; die mobile Monatsauswahl zeigt Monat und Jahr vollständig. Die Migration wurde additiv angewandt, ohne Datenreset. Nach den Tests blieben keine automatisch erzeugten Testkonten zurück.

Im ersten gezielten Browserlauf erwartete der neue Test bei ungültigen Parametern einen HTTP-404-Status. Private Seiten können bereits ihre Ladeansicht gestreamt haben und die korrekte Not-found-Ansicht deshalb mit HTTP 200 ausliefern. Der Test prüft nun die tatsächliche Fehleransicht sowie ausdrücklich das Fehlen privater Dashboardinhalte. Der abschließende vollständige Lauf bestand alle Fälle; bestehende Zeitlimits und Sicherheitsprüfungen wurden nicht gelockert. Die GitHub-Abnahme des konkreten Commits wird im Pull Request dokumentiert.

Für J05 wird mit fünf Personen dieselbe ausdrücklich fiktive Ausgangslage verwendet: heutige Aufgabe und Termin, 2.800 EUR Einnahmen, 900 EUR Fixkosten, 600 EUR variable Ausgaben, 500 EUR Sparrate, Budget 500 EUR und ein offenes Ziel mit verstrichenem Datum. Ohne Erklärung beantworten sie innerhalb von zehn Sekunden: Was steht heute an? Wie viel bleibt nach den erfassten Angaben im Monat? Welches Ziel benötigt Aufmerksamkeit? Pro Person werden Zeit, Antworten und Missverständnisse erfasst. Diese Prüfung wurde noch nicht durchgeführt; es werden keine Ergebnisse erfunden.

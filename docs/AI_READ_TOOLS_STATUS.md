# Life AI – autorisierte Lesezugriffe

Stand: 01.10.2026

Weiterentwicklung: [AI_MONTH_STATUS.md](AI_MONTH_STATUS.md) beschreibt die inzwischen implementierte private Monatsoberfläche und Provideranbindung. Die nachfolgenden Angaben dokumentieren den Stand des ersten Leseinkrements.

Dieses erste Inkrement von Phase 8 setzt die sechs Anwendungstools aus R12 um. Es ist eine ausschließlich serverseitige Grundlage: Noch gibt es keine echten KI-Antworten, Modellanbindung oder zusätzliche Chatoberfläche. Es werden keine Daten an einen KI-Anbieter übertragen. R12 und Phase 8 bleiben insgesamt offen; die Home-Verständlichkeitsprüfung J05 bleibt ebenfalls offen.

## Umfang und Ergebnisvertrag

`executeAiReadTool(request, allowedTools)` in `src/server/ai-tools.ts` erzeugt den Supabase-Client aus der aktuellen Sitzung. Der Serveraufrufer muss die für die aktuelle Anfrage freigegebenen Toolnamen separat liefern. Modellargumente können diese Freigabe nicht erweitern. Ohne passende Freigabe erfolgt kein Datenabruf. Es gibt keinen öffentlichen HTTP-Endpunkt für diese Funktionen.

| Tool                    | Strikt validierte Argumente                                | Ergebnis                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_financial_summary` | `month` als `YYYY-MM`                                      | Monatssummen für Einnahmen, Fixkosten, variable Ausgaben und geplantes Sparen; rechnerisch verfügbarer Betrag und fehlende Berechnungsgrundlage |
| `get_budget_status`     | `month`                                                    | Monatslimit, tatsächliche variable Ausgaben, Rest und exakter Warnstatus; fehlendes Budget ausdrücklich als `not_set`                           |
| `get_goals`             | optionale `page`                                           | Beide Zielarten, Name, Zieldatum und Fortschritt; sechs Ziele pro Seite mit vollständiger Gesamtzahl                                            |
| `get_goal_projection`   | `goal_id` als UUID                                         | Eigenes finanzielles Ziel mit tatsächlichem Stand, deterministischer Prognose und ihren Annahmen                                                |
| `get_tasks`             | `day`, `view` (`day`, `week`, `undated`), optionale `page` | Nur offene eigene Aufgaben, Titel, Fälligkeit, Priorität und Überfälligkeit; 25 pro Seite mit vollständiger Gesamtzahl                          |
| `get_upcoming_events`   | `day`, `days` (1–7), optionale `page`                      | Eigene laufende und bevorstehende Termine; 25 pro Seite mit vollständiger Gesamtzahl und Links zu den Terminen                                  |

Seiten beginnen bei 0 und sind auf 1000 begrenzt. Jede Liste benennt `total`, `page_size` und `has_more`; eine einzelne Seite darf später nicht als vollständige Liste ausgegeben werden. Geldbeträge werden an der Toolgrenze als ganzzahlige Zeichenfolgen in Minor Units mit expliziter Währung EUR ausgegeben. Bestehende Fachberechnungen bleiben maßgeblich; ein Modell berechnet keine Beträge. Die finanzielle Übersicht ist eine Planung aus erfassten Angaben, kein Bankkontostand. Fehlende Einnahmen oder unbekannte Fixkosten führen zu `available_minor: null` und einer benannten fehlenden Grundlage.

Erfolgreiche Ergebnisse enthalten den Beobachtungszeitpunkt, die Profilzeitzone, den betrachteten Zeitraum und einen festen internen Herkunftslink. Wochen folgen Montag bis Sonntag in der Profilzeitzone. Überfälligkeit und Prognosen beziehen sich auf den tatsächlichen lokalen Tag. Termine beginnen frühestens am heutigen Tag; für heute wird die Untergrenze auf den aktuellen Zeitpunkt gesetzt. Noch laufende Termine bleiben enthalten, bereits beendete nicht. Das Ende des Zeitraums ist exklusiv. Sommerzeit und Jahreswechsel werden über Kalenderdaten statt über feste 24-Stunden-Schritte berechnet.

## Rechte und Datensparsamkeit

Der Serverkern `src/server/ai/read-tools.ts` prüft vor jedem freigegebenen Abruf die Identität erneut mit `getUser`, das eigene Profil und die abgeschlossene Einrichtung. Er verwendet bestehende lesende Datenbankfunktionen mit Nutzerrechten und RLS. Fremde, fehlende und für Prognosen ungeeignete persönliche Ziele liefern dieselbe neutrale Fehlerantwort. Anfragen akzeptieren weder Nutzer-IDs noch SQL, frei wählbare Datenbankfelder, URLs oder Schreiboperationen.

Monatsantworten enthalten nur Summen, keine Buchungsnamen oder Einzelbuchungen. Ziele liefern keine Sparratenhistorie oder Einzahlungslisten, Aufgaben und Termine keine internen Revisionsfelder. Kontodaten und Tokens werden nicht ausgegeben. Gespeicherte Namen und Titel bleiben unvertrauenswürdige Daten; sie verändern weder Rechte noch ausführbare Funktionen. Die spätere Modellanbindung muss diese Trennung beim Prompt und bei jeder weiteren Toolausführung erhalten.

Fehler verwenden nur `invalid_input`, `not_allowed`, `authentication_required`, `setup_required` oder `unavailable`. Technische Fehlertexte, SQL und private Feldinhalte werden weder zurückgegeben noch geloggt. Ein fehlgeschlagener Abruf wird nicht zu einem erfundenen Nullbetrag. Der Einstieg verwendet keinen Service-Role-Client und keine Schreibfunktion. Der testbare Kern erhält seinen Client ausschließlich vom vertrauenswürdigen Serveraufrufer.

## Prüfung und offene Arbeit

Unit-Tests behandeln strikte Eingaben, Freigaben, begrenzte Seiten, exakte Geldwerte, fehlende Grundlage, Budgetgrenzen und lokale Terminzeiträume. Integrationstests verwenden echte lokale Supabase-Nutzerrechte: getrennte Konten, fremde Ziel-IDs, vollständige Seiten, ausgeschlossene erledigte/entfernte Einträge, fehlende Einrichtung, Abmeldung zwischen Aufrufen, manipulative Titel und Fehler ohne Datenpreisgabe. Die Monats- und Aufgabenbestände werden vor und nach Leseaufrufen verglichen.

Lokale Abnahme am 01.10.2026: Lint, Typecheck, Formatprüfung und Produktionsbuild bestanden. Alle 313 Tests sind erfolgreich: 137 Unit-, 84 Datenbank-, 80 private Browser- und 12 öffentliche Browsertests. Für dieses Inkrement sind keine neuen Pakete, Schlüssel, Umgebungsvariablen, Tabellen oder Migrationen nötig. CI benötigt keine Modellanfragen; die GitHub-Abnahme des konkreten Commits wird im Pull Request dokumentiert.

Im lokalen Browser-Testserver erschienen bei den bestehenden Zielverknüpfungsabläufen vereinzelt Meldungen „The destination stream closed early“. Die betreffenden Abläufe bestanden ihre Assertions. Die Ursache dieser Meldung wurde in diesem reinen Server-Inkrement nicht untersucht; Zeitlimits und Prüfungen wurden nicht gelockert.

Als nächster eigener Schritt bleiben die Modellanbindung und eine nutzbare private Antwortoberfläche mit sichtbarer Datenauswahl, Herkunft, Lade-/Fehlerzuständen und begrenzten Toolaufrufen. Die serverseitige Auswahl der pro Anfrage nötigen Werkzeuge muss dann umgesetzt werden; die hier vorhandene Freigabeliste ersetzt diese Produktauswahl nicht. Schreibaktionen und wiederkehrende Insights sind weiterhin spätere Inkremente.

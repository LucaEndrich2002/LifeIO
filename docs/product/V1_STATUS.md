# LifeOS – Verbleibender V1-Umfang

Stand: 10.10.2026. Diese Übersicht bündelt die offenen Arbeiten in sechs Pakete. Sie ist keine Anzahl gleich großer Tickets oder Aufwandsschätzung. Historische Statussätze in älteren Inkrement-Berichten beschreiben deren damaligen Stand.

## Bereits umgesetzt

Lokales Projektfundament und GitHub-Prüfungen; responsive Oberfläche mit hellem/dunklem Design; Kontozugang, Profil und finanzieller Einstieg; Einnahmen, variable Ausgaben, historische Fixkostenfassungen und Monatsbudget; Sparziele mit Einzahlungen, Ratenverlauf und Prognose; persönliche Ziele und Meilensteine; Aufgaben, Kalender sowie Zielverknüpfungen; persönliches Home mit berechneten Hinweisen. Life AI hat sechs autorisierte Lesezugriffe und freizugebende Ansichten für Finanzmonat, einzelne Sparprognose, mehrere Ziele und Aufgaben/Termine der aktuellen Woche.

Implementierter Funktionsumfang ersetzt keine ausstehende Gesamtabnahme oder Veröffentlichung. Die Änderungen liegen auf Arbeitsbranches und Pull Requests; ihre Integration in den Hauptbranch ist separat zu prüfen.

## Sechs offene Arbeitspakete

| Paket                                 | Noch erforderlich                                                                                                                                                                                                                                                                                                                  | Bezug             |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 1. Life AI abschließen                | KI-Insight im persönlichen Home; tatsächliche Antwortqualität prüfen. Letzteres ist auf Nutzerwunsch ausdrücklich ausgesetzt.                                                                                                                                                                                                      | Phase 8, R11–R12  |
| 2. Einstieg ergänzen                  | Optional erste Aufgaben im Onboarding erfassen oder bewusst überspringen; Wiederaufnahme und gesamter Einstieg prüfen.                                                                                                                                                                                                             | R02, J01          |
| 3. Wochenrückblick                    | Reproduzierbare Wochenzusammenfassung von Finanzen, Budgets, Zielen, Aufgaben und Fristen mit begründeten Hinweisen, Datenstand und Aktualisierung ohne Duplikate.                                                                                                                                                                 | Phase 9, R13      |
| 4. Benachrichtigungen                 | In-App-Hinweise mit Grund und eigenem Ursprungsdatensatz; gelesen/ungelesen dauerhaft speichern und doppelte Auslöser vermeiden. Auslöser konkretisieren.                                                                                                                                                                          | Phase 9, R14, O05 |
| 5. Verständlichkeit abnehmen          | Home mit fünf Testpersonen prüfen: dieselben drei Kernfragen innerhalb von zehn Sekunden korrekt beantworten. Automatisierte Tests ersetzen diese Prüfung nicht.                                                                                                                                                                   | Phase 7, J05      |
| 6. Onlinebetrieb und Beta vorbereiten | Gesamtprüfung von Auth/RLS, Datenflüssen, Logs, Rate Limits, Secrets und Validierung; Datenschutzregion und Aufbewahrungs-/Löschkonzept festlegen; Backup/Restore und Migrationen prüfen; Supabase Cloud und Vercel einrichten; offene Änderungen integrieren; Beta mit 10–30 Personen und festgelegten Messkriterien durchführen. | Phase 10, O07–O08 |

Keine dieser externen oder manuellen Abnahmen wird ohne tatsächliche Durchführung als bestanden gewertet. Automatische Sicherheits- und Funktionstests laufen bereits während der Entwicklung.

## Abgrenzung

Die neue Planungserklärung zeigt offene Aufgaben dieser Woche und noch anstehende Termine; sie ist kein gespeicherter Wochenrückblick. Einzelne Sparprognosen und eine seitenweise Einordnung mehrerer Ziele sind umgesetzt. Der KI-Insight-Bereich auf Home bleibt offen.

Schreibende KI-Aktionen, externe Kalender, Bankanbindung und die späteren Produktversionen gehören nicht in diesen Restumfang. Eine Zahlungsintegration folgt erst nach belegtem Produktnutzen. Historische Fixkostenkorrekturen benötigen eine eigene Regelentscheidung; bestehende Fassungen bleiben erhalten, rückwirkendes Umschreiben wird nicht stillschweigend eingeführt.

Grundlage: [PRD](PRD.md), [Roadmap](ROADMAP.md), [Aufgaben-/Termin-KI](../AI_PLAN_STATUS.md).

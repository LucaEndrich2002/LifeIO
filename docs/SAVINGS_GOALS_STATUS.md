# Laufende Sparzielverwaltung

## Begrenzter Umfang

Die bisher nur im Onboarding angelegten Sparziele lassen sich unter `/account/goals` laufend verwalten. Dieser Task ergänzt mehrere finanzielle Ziele, Änderungen von Name, Zielbetrag, Startguthaben und optionalem Zieldatum, den Verlauf geplanter Sparraten sowie tatsächliche Einzahlungen mit bestätigter Stornierung. Die öffentliche Goals-Seite bietet einen Einstieg in diesen privaten Bereich.

Persönliche Ziele, Milestones, Zielprognosen nach O03, Entnahmen, Archivierung/Löschung von Zielen und Verknüpfungen zwischen Modulen folgen in eigenen Inkrementen. R07 und Phase 5 sind deshalb nicht insgesamt abgeschlossen.

## Fachregeln

- Geld wird in EUR-Cent gespeichert, mit expliziter EUR-Währung. Zielbetrag und Einzahlungen sind positiv; Startguthaben und geplante Monatsrate dürfen null sein. Zielbetrag, einzelne Beträge und gesamter Sparstand sind jeweils auf 99.999.999.999 Cent begrenzt. Es gibt keine automatische Bankbuchung.
- Der tatsächliche Sparstand ist Startguthaben plus alle aktiven Einzahlungen, auch jenseits der ersten Listenseite. Das Feld `current_minor` bleibt für bestehende Ziele das ausdrücklich eingegebene Startguthaben. Beim Bearbeiten wird seine Bedeutung angezeigt; eine Korrektur ersetzt nur dieses Startguthaben und verändert keine Einzahlungen oder Monatspläne.
- Einzahlungen haben ein echtes Kalenderdatum und optional eine Notiz. Ein zukünftiger Tag wird anhand der gespeicherten Profilzeitzone abgewiesen. Bereits im Startguthaben enthaltenes Geld darf nicht erneut eingegeben werden; die Oberfläche erklärt dies. Geplante Raten erzeugen keine tatsächlichen Einzahlungen.
- Eine Stornierung verlangt eine sichtbare Bestätigung, setzt einen Stornozeitpunkt und entfernt den Betrag aus dem Sparstand. Der Eintrag bleibt im Verlauf lesbar. Korrekturen einer Einzahlung erfolgen durch Stornierung und erneute Erfassung; Entnahmen sind nicht Teil dieser Buchungsart.
- Der Fortschritt verwendet den tatsächlichen Stand. Übererfüllung bleibt als Betrag und Prozentwert sichtbar; nur der Balken endet bei 100 %. Prozentwerte sind ganzzahlig gerundet. Ein erreichtes Ziel beendet seine Sparrate nicht automatisch; eine Rate von null pausiert den Plan.
- Neue Ziele haben eine erste geplante Monatsrate ab einem gewählten Startmonat. Änderungen an Rate oder Gültigkeitsmonat beginnen strikt nach der letzten gespeicherten Ratenfassung. Frühere Monate behalten ihre Rate. Eine neue Rate gilt bis zum Vormonat der nächsten Fassung und darf null sein. Nur Name, Zielbetrag, Startguthaben oder Zieldatum ändern benötigt keine neue Ratenfassung.
- Money summiert für den gewählten Monat die dann gültige Rate jedes Sparziels genau einmal. Einzahlungen und Stornierungen werden nicht zusätzlich vom Monatsbudget oder verfügbaren Monatsbetrag abgezogen. Der Ziel-Detailbereich zeigt den aktuellen Sparstand; Money zeigt ausdrücklich den Monatsplan.
- Ein optionales Zieldatum wird als Kalenderdatum von 2000 bis 2100 gespeichert. Ein verstrichenes Datum wird bei einem noch nicht erreichten Ziel gekennzeichnet. Es wird kein prognostiziertes Erreichungsdatum erfunden.
- Listen der Ziele und Einzahlungen haben deterministische 25er-Seiten. Summen umfassen alle Einzahlungen. Wiederholte Erfassung mit derselben Formular-ID erzeugt kein zweites Ziel oder eine zweite Einzahlung. Stornieren ist bei Wiederholung wirkungslos. Veraltete Änderungen werden mit erhaltenen Formulareingaben abgewiesen.

## Persistenz und Sicherheit

`20260926160000_savings_goals.sql` erweitert `goals` um optionale Onboarding-Slots, Revision und Zieldatum. Die bestehenden Ziel-IDs, Zielbeträge und Startguthaben bleiben erhalten. `goal_rates` und `goal_contributions` referenzieren Ziel und Eigentümer gemeinsam. Benutzerlöschung entfernt weiterhin die eigenen Daten per Kaskade. `20260926161000_goal_currency.sql` hält EUR auch auf jedem Raten- und Einzahlungsdatensatz explizit fest.

Die initiale Rate bestehender abgeschlossener Onboardings wird einmalig übernommen. Ein ausschließlich interner Trigger initialisiert die Rate künftiger Nutzer erst beim Abschluss ihrer Einrichtung; zuvor sind Onboarding-Entwürfe unverändert korrigierbar. Der bestehende `monthly_minor`-Wert bleibt als zuletzt geplante Rate für diese Kompatibilität erhalten. Die Monatsberechnung verwendet ausschließlich den Verlauf in `goal_rates`.

RLS erlaubt nur eigenes Lesen. Normale Nutzer und anonyme Rollen besitzen keine direkten Schreibrechte auf Ziele, Raten oder Einzahlungen. `mutate_goal` prüft verifizierte Identität, Eigentum, abgeschlossenes Onboarding, Revision, alle Beträge und Datumsgrenzen und schreibt atomar. Es sperrt Profil, Onboarding und Ziel in derselben Reihenfolge wie der Einrichtungsablauf. `read_goal` verwendet Invoker-Rechte und einen SQL-Snapshot für Startguthaben, vollständige Summe, Raten und Listenseite.

Server Actions prüfen sichtbare Bestätigungen und Zod-Eingaben. Externe Fehler behalten die Eingaben; sensible Beträge, Notizen und Tokens werden nicht geloggt. Kein gewöhnlicher Zugriff verwendet einen Service-Role-Client. Neue Routen erben Auth-Schutz, private Cache-Header sowie Lade- und Fehlerzustände des Kontobereichs. Neue Abhängigkeiten sind nicht nötig.

## Abnahme

Unit-Tests prüfen Beträge, Datumsvalidierung, Prozentwerte bei null/erreicht/überschritten, große Ganzzahlen und ungültige Snapshot-Summen. Integrationstests prüfen Onboarding-Übernahme, zusätzliche Ziele, historische Raten, eine Nullrate, idempotente Einzahlungen, Stornierungen, Konkurrenz, Summen über 28 Einträge, fremde IDs, direkte Schreibversuche, Profilzeitzone und Betragsgrenzen. Browserfälle prüfen Anlegen/Bearbeiten, die gemeinsame Money-Datenbasis, Übererfüllung, Bestätigung, veraltete Formulare und private Routen auf Desktop und Mobil.

Lokaler Prüfstand vom 26.09.2026: Alle 154 Tests bestehen (81 Unit-, 31 Supabase-Integrations-, 30 private und 12 öffentliche Browserfälle). `pnpm lint`, `pnpm typecheck`, `pnpm build` und `pnpm format:check` sind ebenfalls erfolgreich. Die Zielansicht wurde auf Desktop im hellen und auf Smartphone im dunklen Erscheinungsbild visuell geprüft. Die abschließende Diff-Prüfung umfasst Umfang, Eigentumsprüfung/RLS, Typen, Abhängigkeiten und Konfiguration; neue Abhängigkeiten wurden nicht eingeführt. Der vorhandene GitHub-Workflow führt dieselben Prüfsuiten aus.

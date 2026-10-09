# Life AI – Aufgaben und Termine dieser Woche

Stand: 09.10.2026. Begrenztes viertes Inkrement von Phase 8, nach der [Sparziel-Erklärung](AI_GOAL_STATUS.md).

## Umfang und Zeitregeln

`/account/ai/plan` zeigt eigene offene Aufgaben mit Fälligkeit in der aktuellen Montag-bis-Sonntag-Woche sowie beim Laden noch laufende und bevorstehende Termine bis zum folgenden Montag, dessen Beginn ausgeschlossen ist. Die Profilzeitzone bestimmt Tag und Woche; Terminzeiten werden mit UTC-Offset in dieser Zone angezeigt. Ein Termin, der genau zum Datenstand endet, zählt nicht mehr. Ein Termin, der genau dann beginnt, gilt als laufend. Mehrtägige Termine bleiben enthalten, solange sie das Intervall überlappen. Sommerzeit und Jahresgrenzen verwenden die vorhandene Temporal-Zeitlogik.

Aufgaben ohne Datum, erledigte Aufgaben, überfällige Aufgaben früherer Wochen und bereits beendete Termine sind ausdrücklich ausgenommen. Feste Links führen zur vollständigen Aufgabenliste beziehungsweise zur passenden Kalenderwoche; dort sind auch bereits beendete Wochentermine sichtbar. Die Monats-KI und die Aufgabenliste verlinken die neue Ansicht. Leere Listen werden als fehlende erfasste Einträge erklärt, ohne freie Zeit oder einen leeren Arbeitsvorrat zu behaupten.

Pro Bereich erscheinen höchstens die ersten 25 Einträge samt Gesamtanzahl, in der bestehenden Reihenfolge der Fachzugriffe: Aufgaben nach Fälligkeit/Priorität/ID, Termine nach Beginn/ID. Ein größerer Bestand wird sichtbar als unvollständiger Ausschnitt ausgewiesen. Es gibt keinen stillen automatischen Abruf weiterer Seiten. Diese Ansicht ist eine Einordnung der sichtbaren Planung, noch kein Weekly Review aus R13.

## Freigabe und Datenminimierung

Vor einer optionalen Erklärung sind sämtliche übertragenen Fakten sichtbar: Titel, Priorität, Fälligkeit, Überfällig-Status, Terminbeginn/-ende, Läuft-Status, Gesamtanzahlen, lokaler Tag, Wochenzeitraum und Profilzeitzone. Titel werden zur verständlichen Einordnung benötigt und können persönliche Angaben enthalten; die Freigabe nennt das ausdrücklich. Eine eigene Frage mit höchstens 600 Zeichen ist möglich, sonst gilt „Was sollte ich diese Woche erledigen?“.

`loadAiPlan` darf ausschließlich `get_tasks` und `get_upcoming_events` lesen. Identität, abgeschlossene Einrichtung und Eigentum werden durch vorhandene Zugriffskontrollen und RLS geprüft. Die Providerdaten enthalten keine internen Kennungen, Revisionen, Links, Profilnamen, Finanzwerte, Ziele oder andere Wochen. Es gibt keine neuen Datenbankrechte, Migrationen oder Abhängigkeiten.

Das gemeinsame Freigabeformular setzt die Zustimmung bei einer Frageänderung zurück. Der Server lädt vor jeder Erklärung die aktuelle Auswahl erneut; Änderungen an sichtbaren Daten, Profilzeitzone, lokalem Tag oder Laufstatus eines Termins entwerten den Fingerabdruck. Unveränderte Daten bleiben trotz verstrichener Sekunden freigegeben. Anfragen teilen mit Monat und Sparziel das bestehende Kontingent und die begrenzte Provideranbindung. Der Provider erhält ausschließlich Daten und eine Frage, keine ausführbaren Werkzeuge oder Schreibrechte. Nach der Antwort wird die Identität erneut geprüft.

Gespeicherte Titel und Fragen sind unzuverlässige Daten und können keine zusätzlichen Rechte oder Abrufe veranlassen. Modellantworten verwenden nur die festen Quellen `tasks` und `events`; Zahlen sind im Modellfreitext ausgeschlossen, exakte Werte stehen in der Vorschau. Das Formular rendert Text ohne HTML-Ausführung. Weder Aufgabendauern noch verfügbare Zeit werden aus Einträgen erfunden. Ein Ausfall lässt Datenvorschau und ursprüngliche Verwaltung nutzbar.

## Prüfstand und Grenzen

Die Abnahme umfasst Verträge, Woche/Zeitzone/Sommerzeit, Freigabe, Ausschnitt und Leerzustand, Prompt-Daten-Trennung, fehlende Konfiguration, Providerfehler, Abmeldung, zwei getrennte Konten, veränderte Aufgaben, Terminbeginn/-ende, Wochenwechsel und gemeinsames Kontingent. Desktop- und Smartphoneprüfungen behandeln echten lokalen Datenbestand, Anmeldung, abgeschlossene Einrichtung, feste Quellen, Tastatur und Überlauf.

Lokale Abnahme am 09.10.2026: Lint, Typecheck, Formatprüfung und Produktionsbuild bestanden; 161 Unit-/Komponententests, 101 Datenbanktests, zwölf betroffene private KI-Browserfälle und zwölf öffentliche Browserfälle erfolgreich (286 unterschiedliche Tests). Im ersten neuen Browserfall wurden Testtermine zunächst mit Sekunden angelegt und von der bestehenden Minutengrenze abgewiesen. Nach Korrektur der Fixture bestanden alle zwölf KI-Fälle auf Desktop und Smartphone. Desktop hell und Smartphone dunkel wurden anhand der Screenshots visuell geprüft. Die bestehende Next-Meldung „The destination stream closed early“ erschien beim Wechsel zwischen Ansichten; sämtliche Assertions bestanden. Prüfungen und Datenregeln wurden nicht gelockert.

Der vollständige CI-Lauf einschließlich der übrigen privaten Browserabläufe wird mit dem konkreten Commit im Pull Request festgehalten. Sämtliche Tests verwenden Testantworten oder deaktivierte Providerkonfiguration. Auf ausdrücklichen Nutzerwunsch erfolgen keine echten KI-Anfragen. Die tatsächliche Modellqualität ist daher weiterhin nicht abgenommen.

R12 bleibt offen für Erklärungen zu mehreren Zielen und den KI-Insight auf Home; R13/R14 sind eigene nachfolgende Schritte. Der konsolidierte verbleibende V1-Umfang steht in [V1_STATUS.md](product/V1_STATUS.md).

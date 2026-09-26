# Fixkosten und Monatsbudget

## Umfang

Dieses begrenzte Money-Inkrement ergänzt die laufende Fixkostenpflege und ein Monatslimit für variable Ausgaben. Es setzt auf dem Einnahmen-/Ausgaben-Inkrement auf. Sparzielverwaltung, historische Korrekturbuchungen, mehrere Budgettöpfe und das persönliche Home-Dashboard sind nicht Teil dieses Tasks.

## Fachregeln und Abnahme

Die folgenden Arbeitsannahmen konkretisieren O02/O04 des PRD für den autorisierten nächsten Money-Schritt:

- Fixkosten besitzen einen positiven EUR-Monatsbetrag, einen ersten und optional letzten Gültigkeitsmonat. Beide Grenzen zählen einschließlich. Ohne Endmonat läuft die Planung weiter. Unterstützt werden Monate von Januar 2000 bis Dezember 2100.
- Eine Betrags-/Namensänderung beginnt nach dem Startmonat der letzten Fassung und innerhalb ihrer bisherigen Laufzeit. Die alte Fassung endet im Vormonat; eine neue Fassung übernimmt die eingegebenen Angaben. Frühere Beträge bleiben unverändert. Die Oberfläche zeigt Start-/Endmonat und erklärt diesen Übergang.
- Ein Endmonat lässt sich für die letzte Fassung festlegen oder verschieben, frühestens auf deren Startmonat. Er zählt noch vollständig. Bereits abgelöste Fassungen bleiben unveränderlich. Rückwirkende Betragskorrekturen und das vollständige Entfernen irrtümlich angelegter Fixkosten sind getrennte spätere Entscheidungen; es gibt hier kein stilles Umschreiben der Historie.
- Wiederholung derselben Erfassung, Änderungsfassung oder Beendigung erzeugt keine weitere monatliche Belastung. Eine Änderung aus einem veralteten Formular überschreibt keine neuere Fassung. Unterschiedliche eigenständig angelegte Einträge mit gleichem Namen bleiben zulässig.
- „Fixkosten verwalten“ listet die letzte Fassung jedes Eintrags mit 25 Einträgen pro Seite, auch künftige und beendete. Die Monatsübersicht zeigt die im gewählten Monat gültigen Fassungen. Frühere Fassungen verweisen auf ihren Nachfolger.
- Es gibt genau ein benanntes EUR-Budget pro Nutzer und Monat. Es umfasst sämtliche variablen Ausgaben dieses Monats über alle Kategorien und Listenseiten. Es wird nicht in spätere Monate kopiert. Beim Bearbeiten bleibt der Monat fest; Name und Limit sind änderbar. Bestätigtes Löschen entfernt nur das Limit, keine Ausgabe.
- 500 EUR Limit und 450 EUR Ausgaben ergeben 90 % Nutzung und 50 EUR Rest. Überziehung bleibt als negativer Restbetrag sichtbar. Prozentwerte sind ganzzahlig gerundet; nur der grafische Fortschrittsbalken endet bei 100 %.
- Das Budgetlimit ist kein zusätzlicher Abfluss. Verfügbar bleibt Einnahmen minus Fixkosten minus variable Ausgaben minus geplante Sparrate. Keine neue automatische Buchung wird erzeugt.
- Fehlende Einnahmen oder unbekannte Fixkosten verhindern einen scheinbar vollständigen Planwert. Nach übersprungenem Onboarding begründet eine später erfasste Fixkostenposition die Fixkostenbasis ab ihrem ersten Monat. Nach Beendigung aller Positionen sind null gültige Fixkosten nachvollziehbar; vor der ersten Angabe bleibt die Basis unbekannt.

## Daten und Sicherheit

`20260921150000_fixed_costs_and_budgets.sql` erweitert `expenses` um `end_month` und `superseded_by`. Bestehende Onboarding-IDs und Beträge bleiben bestehen. Ein zusammengesetzter Fremdschlüssel bindet Nachfolger an denselben Eigentümer. Die Benutzerlöschung entfernt weiterhin die eigenen Daten per Kaskade.

`budgets` enthält UUID, Eigentümer, Name, positives Limit in Cent (höchstens 99.999.999.999), EUR, Monat und Revision. Ein Unique-Constraint auf Eigentümer/Monat verhindert überlappende Budgettöpfe. RLS erlaubt ausschließlich eigene Lesezugriffe; direkte Schreibrechte sind für normale Nutzer und anonyme Aufrufe entzogen.

`mutate_fixed_cost` und `mutate_budget` verwenden die verifizierte `auth.uid()`, validieren Argumente, verlangen abgeschlossenes Onboarding und serialisieren Änderungen über dessen Zeile. Revisionen und feste Eintrags-/Nachfolger-IDs sichern konkurrierende oder wiederholte Anfragen. Kein gewöhnlicher App-Zugriff verwendet Service-Role-Rechte.

`read_money_month` bleibt ein Invoker-RPC mit RLS und liefert Einnahmen, variable Ausgaben, gültige Fixkosten, Budget und vollständige Summen aus einem gemeinsamen SQL-Snapshot. Aggregate reisen als Integer-Zeichenketten; die Domain prüft sichere Ganzzahlen. Prozentberechnung verwendet BigInt, keine monetäre Dezimalarithmetik.

Server Actions validieren Formulare und bestätigen Beendigung bzw. Budgetlöschung sichtbar. Fehler behalten Eingaben und bieten den aktuellen Stand an. Kontolayout, Lade-/Fehlerzustände, Auth-Schutz und private Cache-Header gelten auch für die neuen Routen.

## Prüfung

- Unit: inklusive Grenzen, Monatswechsel, Betragsvalidierung, 90-%-Beispiel, Überziehung und große Ganzzahlen.
- Integration: historische Werte und Jahreswechsel, Wiederholung, Konkurrenz, vollständige Budgetsumme über 30 Ausgaben und mehrere Kategorien, Monatsverschiebung, Löschung, RLS, fremde Nachfolger, direkte Schreibversuche und Onboarding-Sperre.
- Browser auf Desktop und Mobil: Fixkosten erfassen/ändern/beenden, Validierungsfehler, alte Fassung, Budget anlegen/bearbeiten/bestätigt entfernen, Überziehung, konkurrierende Formulare und fremde IDs.

Lokale Abnahme am 26.09.2026: `pnpm lint`, `pnpm typecheck`, `pnpm build` und `pnpm format:check` erfolgreich; 76 Unit-Tests, 24 Integrationstests, 24 private Browserfälle und 12 öffentliche Browserfälle erfolgreich (136 insgesamt). Desktop in Light Mode und Smartphone in Dark Mode wurden zusätzlich anhand der Test-Screenshots visuell geprüft. Der Diff wurde auf Berechnungen, Eigentümerrechte, Revisionen, Eingabevalidierung, Umfang und Abhängigkeiten geprüft; neue Abhängigkeiten sind nicht nötig. GitHub prüft dieselben Suites beim Push und Pull Request.

Die frühere öffentliche Home-Vorschau bleibt ausdrücklich fiktiv; die private Money-Übersicht enthält echte gespeicherte Angaben. Phase 4 wird durch diesen Task nicht pauschal als vollständig abgenommen markiert.

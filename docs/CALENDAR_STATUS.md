# Kalender – zweiter Plan-Schritt

## Begrenzter Umfang

Dieses Inkrement setzt R09 um: eigene Termine mit Titel, Beginn, Ende und Zeitzone anlegen, bearbeiten und bestätigt löschen. `/account/plan/calendar` bietet Tag und Montag-bis-Sonntag-Woche. Die öffentliche Plan-Seite und die private Aufgabenliste führen zum Kalender.

Goal–Task-/Event-Verknüpfungen bleiben der nächste getrennte Schritt für Phase 6. Externe Kalender, Wiederholungen, Einladungen, Erinnerungen, optionale Onboarding-Aufgaben und KI sind nicht enthalten. Finanzwerte und Finanzberechnungen bleiben unverändert.

## Regeln und Abnahme

- Titel umfassen nach Unicode-Trimmen 1–80 Unicode-Zeichen. Beginn und Ende sind minutengenaue lokale Angaben zwischen 2000 und 2100 mit expliziter IANA-Zeitzone; das Formular schlägt die Profilzeitzone vor und erfindet keine Uhrzeiten.
- Die Speicherung enthält absolute UTC-Zeitpunkte und die ursprüngliche Terminzeitzone. Die Profilzeitzone bestimmt Tages-/Wochenzuordnung und angezeigte Uhrzeiten; ein Profilwechsel schreibt vorhandene Termine nicht um. Bearbeiten verwendet wieder die Terminzeitzone. Beim Ändern dieser Zone bleiben die eingegebenen lokalen Uhrzeiten stehen und ändern damit den Zeitpunkt; das Formular erklärt dies.
- Sommerzeitlücken werden abgewiesen, nicht automatisch verschoben. Bei doppelten Uhrzeiten ist die explizite Wahl des ersten oder zweiten Vorkommens erforderlich. Beim Bearbeiten bleibt die gespeicherte Wahl erhalten. Das Ende muss als tatsächlicher Zeitpunkt nach dem Beginn liegen; angezeigte UTC-Offsets unterscheiden doppelte Uhrzeiten.
- Ein Termin belegt das halboffene Intervall `[Beginn, Ende)`. Er erscheint an jedem überlappten Tag. Ein Ende genau um Mitternacht gehört nicht zum Folgetag. Tagesanfänge werden getrennt in der Profilzeitzone aufgelöst; 23-/25-Stunden-Tage, Sprünge um Mitternacht und komplett übersprungene Tage sind berücksichtigt.
- Wochen beginnen montags, auch über Jahreswechsel. Für die Anzeige von Grenzterminen in einer anderen Zeitzone sind zusätzlich 30./31.12.1999 und 01./02.01.2101 auswählbar. Erfassungsdaten bleiben auf 2000–2100 begrenzt.
- Pro Seite werden höchstens 25 eindeutige Termine nach Beginn und stabiler ID geladen und dann auf die betroffenen Tage verteilt. Anzahl und Einträge stammen aus einem Datenbanksnapshot. Die Anzahl zählt einen mehrtägigen Termin einmal. Leere Tagesabschnitte beziehen sich ausdrücklich auf die aktuelle Seite. Ein leer gewordenes Seitenende behält den Rückweg.
- Nach Erfassung öffnet sich die erste Seite des Starttags in der Profilzeitzone mit derselben Ansicht. Bearbeiten und Löschen erhalten Ansicht, Tag und Seite. Filterwechsel setzen die Seite zurück.
- Revisionen verhindern das Überschreiben neuerer Änderungen. Veraltete Formulare behalten Eingaben und bieten den aktuellen Stand an. Identische wiederholte Erfassung mit derselben ID ist idempotent. Entfernte IDs bleiben als unsichtbare Löschmarkierung erhalten und verhindern verspätete Wiederherstellung; Kontolöschung entfernt sie per Fremdschlüssel.
- Löschen benötigt die konkrete Terminzusammenfassung und eine serverseitig geprüfte Checkbox-Bestätigung. Anmeldung und abgeschlossene Einrichtung sind für Oberfläche und RPCs erforderlich. Fremde, entfernte und ungültige IDs geben keine privaten Inhalte zurück. Bestehende Kontobereichsgrenzen behandeln Laden/Fehler, Formulare zeigen korrigierbare Fehler und Listen echte Leerzustände.

## Daten und Architektur

Die additive Migration `20260929090000_calendar_events.sql` ergänzt `calendar_events`, Eigentümer-RLS, einen Intervallindex sowie `mutate_calendar_event` und `read_calendar_events`. Frühere Migrationen und bestehende Datensätze bleiben erhalten. Normale Benutzer haben nur eigene Leserechte; direkte Schreib- und anonyme Rechte sind entzogen. Der Security-Definer-Mutationspfad hat einen leeren Suchpfad, explizite Ausführungsrechte und prüft Identität, Einrichtung, Eigentümer, Argumente und Revision. Die Sperrreihenfolge bleibt Profil → Onboarding → eigener Datensatz. Das Invoker-Lese-RPC verwendet RLS und begrenzte Zeiträume/Seiten.

Reine Schemas liegen in `src/domain/calendar.ts`, Zeitregeln in `calendar-time.ts`, privilegierte Anwendungspfade in `src/server/calendar.ts`/`calendar-actions.ts`, Featureansichten unter `src/features/plan`. Routen bleiben dünn und übernehmen IDs ausdrücklich aus dem Pfad. Nur das interaktive Formular ist eine Client Component. Normale Anfragen verwenden keinen Service-Schlüssel.

Die neue, tatsächlich verwendete Abhängigkeit `@js-temporal/polyfill` 0.5.1 (mit `jsbi`) vermeidet selbst geschriebene IANA-/Sommerzeitauflösung. Sie wird nur über die reine Zeitlogik in Serveransichten, Server Actions und Tests verwendet, nicht im Clientformular. Grundlage: [Temporal.PlainDateTime](https://tc39.es/proposal-temporal/docs/plaindatetime.html) und [Temporal.PlainDate](https://tc39.es/proposal-temporal/docs/plaindate.html).

## Prüfung

Sieben zusätzliche Unit-Tests prüfen Eingabegrenzen, echte Daten, halboffene Intervalle, Montag-Wochen, Zeitzonenwechsel, Sommerzeitlücken/-doppelungen, 23-/25-Stunden-Tage, Übergänge um Mitternacht, einen übersprungenen Tag und nicht ganzstündige Offsets. Sieben zusätzliche Integrationstests prüfen Speicherung, Isolation, direkte/anonyme Rechte, unvollständige Einrichtung, Wiederholungen, konkurrierende Änderungen, ungültige RPC-Eingaben, Intervallgrenzen und vollständige Seitenzählung.

Vier neue Browserabläufe laufen auf Desktop und Smartphone: Tastaturerfassung/Bearbeiten/Löschen mit mehrtägigen Terminen; Sommerzeitfehler und erhaltene Vorkommenswahl; Konflikte und Zugriffsschutz; vollständige Seiten und Anzeige in abweichender Profilzeitzone. Die öffentlichen Navigationstests prüfen den Kalendereinstieg.

Stand 30.09.2026: Die Suite umfasst 263 Fälle: 124 Unit-, 63 Integrations-, 64 private und 12 öffentliche Browsertests. Unit-, Integrations- und öffentliche Browsersuite bestanden vollständig. Lint, Typprüfung, Produktionsbuild, Format- und Diff-Prüfung sind erfolgreich. Kalenderansicht und Formular wurden bei 1440 bzw. 375 Pixeln sowie in hellem/dunklem Design visuell geprüft; Tastaturbedienung und fehlender horizontaler Überlauf sind zusätzlich automatisiert geprüft.

In frühen lokalen Integrationsläufen gab es wechselnde Zeitüberschreitungen bestehender Money-/Ziel-Budget-Tests; der lokale Auth-Dienst meldete Request-Timeouts. Der vollständige erneute Integrationslauf bestand alle 63 Fälle. Der vollständige private Browserlauf bestand 62 von 64 Fällen, einschließlich aller acht neuen Kalenderfälle; zwei bestehende Meilensteinabläufe überschritten ihre Zeitgrenze. Nach der letzten Textkorrektur bestanden alle 14 gezielt wiederholten Kalender- und Meilensteinabläufe auf Desktop und Smartphone. Testzeitgrenzen und fachliche Erwartungen wurden nicht abgeschwächt. Zwei übrig gebliebene, eindeutig markierte Testkonten wurden entfernt; danach waren keine Testkonten mehr vorhanden.

Der Diff-Review umfasst Scope, Identität/Eigentümer, RLS, Revisionen, Eingabegrenzen, Zeitzonen, unveränderte Finanzwerte, Typen und die tatsächlich genutzte neue Abhängigkeit. GitHub prüft die vollständige Suite zusätzlich mit frisch migrierter Datenbank. Docker-Reparatur und lokale Einschränkung sind in [LOCAL_SUPABASE.md](LOCAL_SUPABASE.md) dokumentiert.

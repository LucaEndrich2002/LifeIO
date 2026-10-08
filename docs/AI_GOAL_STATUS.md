# Life AI – Erklärung einer Sparprognose

Stand: 08.10.2026. Begrenztes drittes Inkrement von Phase 8, aufbauend auf der [Monatserklärung](AI_MONTH_STATUS.md).

## Umfang

Ein vorhandenes eigenes Sparziel verlinkt „Sparprognose mit Life AI verstehen“. Unter `/account/ai/goals/[id]` erscheinen zuerst Zielbetrag, tatsächlicher Sparstand, Restbetrag, Datenstand/Zeitzone, optionales Zieldatum, berechnetes Erreichungsdatum, nächster angenommener Beitrag, Beitragsanzahl und Terminvergleich. Die Monats-KI verlinkt die bestehende Zielauswahl. Persönliche Ziele ohne Geldbetrag werden nicht als Sparprognose behandelt.

Die Prognose verwendet unverändert `forecastGoal` über das autorisierte Tool `get_goal_projection`. Geplante Beiträge beginnen am Monatsende des Folgemonats; Ratenänderungen und Pausen sind berücksichtigt. Es gibt keine automatisch nachgeholten Beiträge, Zinsen, Rendite oder Prüfung, ob das Monatsbudget die Rate trägt. Erreichte Ziele, fehlende positive Sparplanung, ein fehlendes Zieldatum und die Berechnungsgrenze Ende 2100 werden sichtbar unterschieden. Ohne Modellverbindung bleibt die berechnete Übersicht nutzbar.

Erst nach ausdrücklicher Freigabe darf eine optionale Frage mit höchstens 600 Zeichen an OpenAI gehen. Die Standardfrage lautet „Wann erreiche ich mein Sparziel?“. Modelltext bleibt qualitativ; Beträge und Termine stellt die Anwendung aus den Fachberechnungen dar. Die einzige Antwortquelle ist ein fester interner Link zum ausgewählten Sparziel. Eingaben bleiben bei Fehlern erhalten; erneutes Laden zeigt den aktuellen Stand.

## Daten- und Zugriffsgrenzen

`loadAiGoal` ruft ausschließlich `get_goal_projection` mit der serverseitig festgelegten Freigabe auf. Identität, Onboarding und Eigentümerrechte werden durch den bestehenden Leseweg und RLS geprüft. Fremde, fehlende und persönliche Ziele liefern denselben neutralen Nichtverfügbarkeitszustand. Es werden keine neuen Datenbankrechte, Migrationen oder Abhängigkeiten eingeführt.

Zielname, Ziel-ID, Nutzer-ID, Einzahlungsnotizen, Ratenverlauf, andere Ziele, Monatsbudget und Einzelbuchungen gehen nicht an den Provider. Der Zielname dient nur der lokalen Überschrift. Selbst eingegebener Freitext wird wie angezeigt mitgesendet. Der Fingerabdruck bindet das ausgewählte Ziel und die exakt freigegebenen Prognosedaten einschließlich lokalem Stichtag und Zeitzone. Änderungen an diesen Daten erfordern vor dem Senden eine neue Vorschau.

Monats- und Zielantwort teilen Formular, Freigabeverhalten, Providertransport und den serverseitigen Ablauf für erneute Identitätsprüfung, Datenvergleich, Konfiguration, Kontingent und Identitätsprüfung nach der Antwort. Die Zod-Verträge für beide Datenbereiche bleiben getrennt. Das vorhandene Kontingent gilt gemeinsam: höchstens ein Versuch in 30 Sekunden und 20 Versuche pro UTC-Tag. Die Transportgrenzen bleiben unverändert: ein Aufruf, keine Tools oder Weiterleitungen, `store: false`, 20 Sekunden und höchstens 1.200 Ausgabetokens/64 KiB Antwort. Kein Chatverlauf und keine Finanzmutationen.

## Abnahme und offene Grenzen

Unit- und Komponentenprüfungen behandeln Faktenanzeige, fehlende Prognosen, strikte Verträge, Quellen, Freigabe, Ladezustand, erhaltene Fragen und sichere Textdarstellung. Datenbankprüfungen behandeln zwei Konten, nicht abgeschlossene Einrichtung, persönliche/fremde/fehlende Ziele, tatsächliche Einzahlung nach der Vorschau, Tageswechsel in Europe/Berlin, Datenminimierung, gemeinsame Kontingente, Providerfehler und Abmeldung während der Antwort. Browserprüfungen decken Navigation, Kontoschutz, Nichtverfügbarkeit, Originalwerte und mobilen Überlauf ab.

Lokale Abnahme am 08.10.2026: Lint, Typecheck, Formatprüfung und Produktionsbuild bestanden. 154 Unit-/Komponenten- und 95 Datenbanktests sind erfolgreich. Der vollständige private Browserlauf bestand 86 von 88 Fällen; die beiden neuen Navigationsfälle lasen ihre Rückkehradresse vor dem abgeschlossenen Seitenwechsel. Nach einer ausdrücklichen Prüfung der Zielroute bestanden alle acht Monats-/Sparziel-Browserfälle erneut auf Desktop und Smartphone. Damit sind sämtliche 88 privaten Browserfälle abgedeckt. Auch die zwölf öffentlichen Browsertests bestanden, insgesamt 349 unterschiedliche Tests. Die Desktopansicht im hellen und die Smartphoneansicht im dunklen Design wurden visuell geprüft; ein fehlendes Leerzeichen wurde korrigiert. Es blieben keine Testkonten zurück.

Die bekannten Meldungen „The destination stream closed early“ aus bestehenden Zielverknüpfungs-/Meilensteinprüfungen traten im vollständigen Browserlauf erneut auf; die betreffenden Assertions bestanden. Zeitlimits und Rechteprüfungen wurden nicht gelockert. Der CI-Stand des konkreten Commits wird im Pull Request festgehalten.

Auf ausdrücklichen Nutzerwunsch vom 07.10.2026 werden keine weiteren KI-Live-Tests ausgeführt. Der zuvor versuchte Verbindungstest scheiterte an fehlendem API-Guthaben. Alle Prüfungen dieses Inkrements verwenden Testantworten beziehungsweise eine deaktivierte Providerkonfiguration. Echte Antwortqualität ist deshalb weiterhin nicht abgenommen. R12 bleibt offen, insbesondere Zielübersichten mit mehreren Zielen, Aufgaben-/Terminantworten und der Home-KI-Insight; die manuelle Verständlichkeitsprüfung J05 bleibt ebenfalls offen.

# LifeOS – erste Designgrundlage

Die Shell setzt die Richtung aus der README um: ruhig, übersichtlich, großzügige Abstände und klare Hierarchie. Sie ist ein technischer Einstieg in Phase 2, noch kein vollständiges Designsystem oder Daten-Dashboard.

## Visuelle Sprache

- Heller, leicht warmer Hintergrund mit weißen Cards; dunkle Variante mit tiefen Grüntönen.
- Gedämpftes Grün als Akzent und für primäre Handlungen. Neutrale Texte bleiben gut lesbar; Bedeutung wird nicht nur durch Farbe vermittelt.
- Systemschrift ohne externen Font-Download. Große Seitenüberschrift, deutliche Abschnittstitel, kurze beschreibende Texte.
- Abstände über Tailwind-Skala; 24–40 px horizontaler Seitenabstand, abgerundete Cards, feine Trennlinien.
- CSS-Variablen in `src/app/globals.css` sind die gemeinsame Quelle für Light/Dark-Farben, Radien und Schrift. Keine doppelte Theme-Konfiguration.

## Vorhandene Bausteine

| Baustein                   | Verwendung                                                               |
| -------------------------- | ------------------------------------------------------------------------ |
| AppShell                   | Markenbereich, Hauptnavigation, Inhaltsbereich und Vorschauhinweis       |
| AppNavigation              | Home, Money, Plan, Goals und AI mit `aria-current`                       |
| Card                       | Lokaler shadcn/ui-Baustein mit Header, Titel, Beschreibung und Inhalt    |
| ModulePlaceholder          | Gemeinsamer ehrlicher Leerzustand für noch nicht verfügbare Module       |
| ThemeToggle                | Systempräferenz beim Einstieg; explizite Auswahl bleibt lokal erhalten   |
| Error / Loading / NotFound | Verständliche Zustände ohne interne Fehlerdetails oder falsche Nullwerte |

`components.json` ist für Tailwind 4, CSS-Variablen, New York und den Alias `@/components/ui` vorbereitet. Weitere shadcn/ui-Komponenten werden bei tatsächlichem Bedarf ergänzt. Card-Titel sind semantische Überschriften; deren Ebene muss bei späterer Wiederverwendung zum Kontext passen.

## Responsivität und Bedienung

Desktop verwendet eine seitliche Navigation. Unterhalb des großen Breakpoints erscheint dieselbe Navigation als Reihe unter der Marke; keine duplizierten versteckten Menüs. Der Content bleibt in einer begrenzten Breite lesbar und Cards wechseln von einer auf drei Spalten.

Alle interaktiven Elemente sind echte Links oder Buttons, besitzen sichtbaren Tastaturfokus und verständliche Namen. Dekorative Icons sind für Screenreader verborgen. Ein Skip-Link führt direkt zum Hauptinhalt. Reduzierte Bewegungspräferenzen werden berücksichtigt. Die Vorschau hat keine Finanzformulare und keine versteckten Dateneingaben.

Browsertests prüfen Desktop, 375 px Mobilbreite, Light/Dark-Umschaltung, Persistenz, Skip-Link und Überlauf. Diese Prüfungen ersetzen keine vollständige Accessibility-Prüfung der späteren Fachfunktionen.

## Weiterentwicklung in Phase 2

KPI-, Fortschritts- und Formularbausteine mit echten Zuständen ausarbeiten, Kontraste und Tastaturabläufe vertieft prüfen und einen statischen Dashboard-Prototyp auf PRD-Journeys abstimmen. Keine erfundenen Kontostände, Fake-Erfolge oder bereits nutzbar dargestellten Formulare in der Foundation-Vorschau.

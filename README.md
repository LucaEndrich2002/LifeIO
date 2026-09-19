# LifeOS

> **Personal Life Operating System**  
> Ein persönliches Cockpit für **Geld, Zeit und Ziele** – später erweitert um Life Admin, Integrationen und einen KI-Assistenten, der die Bereiche miteinander verbindet.

---

## 1. Produktvision

LifeOS soll nicht einfach mehrere Funktionen nebeneinander anbieten. Das Produkt soll die wichtigsten Lebensbereiche eines Nutzers miteinander verbinden und daraus einen verständlichen Gesamtüberblick erzeugen.

Die drei Kernfragen, die LifeOS beantworten soll:

1. **Wo stehe ich gerade?**
2. **Was steht als Nächstes an?**
3. **Bin ich bei meinen wichtigsten Zielen auf Kurs?**

Langfristig entwickelt sich LifeOS zu einem persönlichen digitalen Betriebssystem:

- **Home** – persönliches Cockpit
- **Money** – Einkommen, Ausgaben, Budgets, Sparziele
- **Plan** – Kalender, Aufgaben, Routinen
- **Goals** – finanzielle und persönliche Ziele
- **Life Admin** – Dokumente, Verträge, Fristen
- **Life AI** – Insights, Planung und Aktionen über alle Module hinweg
- **Integrationen** – Kalender, Banken, Cloud-Speicher und weitere Dienste

### Produktprinzip

LifeOS gewinnt nicht dadurch, dass es jeden Kalender oder jede Banking-App ersetzt.

LifeOS gewinnt dadurch, dass es **Zusammenhänge versteht**.

Beispiel:

> Der Nutzer plant eine Reise. LifeOS verbindet das Reiseziel mit Sparziel, Budget, Kalender, Aufgaben und später Dokumenten.

---

## 2. Zielgruppe V1

### Primäre Zielgruppe

20–35-jährige Berufstätige, die:

- ihre Finanzen besser kontrollieren möchten,
- Ziele wie Urlaub, Auto, Wohnung oder Notgroschen verfolgen,
- Kalender und Aufgaben nutzen,
- aktuell mehrere Apps oder Excel/Notizen verwenden,
- ein einfaches, modernes Dashboard statt eines komplizierten Produktivitätssystems möchten.

### Kernproblem

Die Daten eines Nutzers sind auf mehrere Systeme verteilt:

- Bank-/Finanz-App
- Kalender
- To-do-App
- Notizen
- Excel
- Dokumente
- persönliche Ziele im Kopf

LifeOS soll daraus eine verständliche Schaltzentrale machen.

---

## 3. Scope von LifeOS V1

V1 bleibt bewusst klein.

### Enthalten

- Benutzerkonto
- Onboarding
- Home Dashboard
- Einkommen
- manuelle Ausgaben
- Fixkosten
- Budgets
- Sparziele
- Aufgaben
- einfache Kalenderereignisse
- Verknüpfungen zwischen Goals, Money, Tasks und Events
- AI Insights
- Weekly Review
- grundlegende Notifications

### Nicht enthalten

- direkte Bankanbindung
- Aktienhandel
- Investment-Portfolio
- Versicherungsvergleich
- Dokumentenablage
- Health Tracking
- Social Features
- eigener Mail-Client
- Marketplace
- komplexe Automationen

Diese Funktionen gehören in spätere Versionen.

---

## 4. Tech Stack

### Frontend

- Next.js
- React
- TypeScript mit Strict Mode
- Tailwind CSS
- shadcn/ui
- Recharts für Charts

### Backend

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage später für Dokumente

### Validation

- Zod

### AI

- OpenAI API
- serverseitige Tool-/Action-Schicht
- keine direkte Datenbanksteuerung durch das Modell

### Testing

- Vitest
- React Testing Library
- Playwright für kritische End-to-End-Flows

### Hosting

- Vercel
- Supabase Cloud

### Product Analytics

Später:

- PostHog oder vergleichbare Product Analytics

---

# 5. Architektur

Wir starten als **modularer Monolith**.

Keine Microservices in V1.

```text
Browser
   │
   ▼
Next.js Application
   │
   ├── Home
   ├── Money
   ├── Plan
   ├── Goals
   └── AI
   │
   ▼
Application / Domain Layer
   │
   ├── Money Service
   ├── Goal Service
   ├── Planning Service
   ├── Insight Service
   └── AI Action Service
   │
   ▼
Supabase / PostgreSQL
```

### Architekturregel

Business-Logik darf nicht ausschließlich in React-Komponenten leben.

Finanzberechnungen, Goal-Projektionen, AI-Aktionen und Validierungen gehören in klar getrennte Domain-/Service-Funktionen.

---

# 6. Life Core

Der Life Core ist das gemeinsame Datenmodell.

V1-Entitäten:

```text
User
Profile

Income
Expense
ExpenseCategory
Budget

Goal
GoalProgress

Task
CalendarEvent

EntityLink

AIInsight
WeeklyReview
Notification
```

### Entity Links

Die Tabelle `entity_links` ermöglicht Verbindungen zwischen Modulen.

Beispiel:

```text
Goal: Japan 2027
    ├── funded_by -> Budget: Japan
    ├── requires  -> Task: Flug buchen
    └── scheduled_as -> CalendarEvent: Japan Reise
```

Vorgeschlagenes Schema:

```text
entity_links
- id
- user_id
- source_type
- source_id
- target_type
- target_id
- relationship
- created_at
```

Damit kann LifeOS später wachsen, ohne für jede neue Beziehung das Datenmodell neu zu entwerfen.

---

# 7. Repository-Struktur

Empfohlene Struktur:

```text
lifeos/
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── package.json
├── pnpm-lock.yaml
├── .env.example
├── docs/
│   ├── product/
│   │   ├── PRD.md
│   │   └── ROADMAP.md
│   ├── architecture/
│   │   ├── SYSTEM.md
│   │   ├── DATA_MODEL.md
│   │   └── decisions/
│   └── design/
│       └── DESIGN_SYSTEM.md
├── src/
│   ├── app/
│   ├── components/
│   │   ├── ui/
│   │   └── features/
│   ├── features/
│   │   ├── auth/
│   │   ├── onboarding/
│   │   ├── home/
│   │   ├── money/
│   │   ├── goals/
│   │   ├── plan/
│   │   └── ai/
│   ├── lib/
│   ├── server/
│   ├── domain/
│   └── types/
├── supabase/
│   ├── migrations/
│   └── seed.sql
└── tests/
    ├── integration/
    └── e2e/
```

---

# 8. Entwicklungsprinzipien

1. **MVP vor Vollständigkeit**
2. **Ein Problem pro Änderung**
3. **Eine Feature-Branch / ein Worktree pro Task**
4. **Kein Merge ohne Tests**
5. **Keine Geschäftslogik duplizieren**
6. **Keine Secrets committen**
7. **Neue Funktionen benötigen Acceptance Criteria**
8. **AI darf sensible Aktionen nicht ohne Bestätigung ausführen**
9. **UI muss responsive und barrierearm sein**
10. **Bestehende Tests werden nicht entfernt, nur damit eine Änderung grün wird**

---

# 9. Schritt-für-Schritt-Entwicklungsplan

## Phase 0 – Produktdefinition

### Ziel

Bevor Code geschrieben wird, definieren wir exakt, was V1 leisten soll.

### Aufgaben

- `docs/product/PRD.md` erstellen
- Zielgruppe definieren
- Kernproblem definieren
- V1 Scope festschreiben
- Nicht-Ziele festschreiben
- 5 zentrale User Journeys definieren
- Erfolgskriterien definieren

### Die 5 wichtigsten User Journeys

1. Account erstellen und Onboarding abschließen
2. Einkommen und Fixkosten erfassen
3. Budget erstellen
4. Sparziel erstellen und Fortschritt sehen
5. Dashboard öffnen und sofort verstehen, ob der Monat auf Kurs ist

### Exit-Kriterium

Jede V1-Funktion kann als User Story mit messbaren Acceptance Criteria beschrieben werden.

---

## Phase 1 – Projektfundament

### Ziel

Sauberes Repository und automatisierte Qualitätsprüfungen.

### Aufgaben

- GitHub Repository erstellen
- Next.js + TypeScript initialisieren
- pnpm konfigurieren
- Tailwind konfigurieren
- shadcn/ui einrichten
- ESLint einrichten
- Formatter einrichten
- Vitest einrichten
- Playwright einrichten
- Supabase-Projekt einrichten
- `.env.example` anlegen
- GitHub CI für Typecheck, Lint und Tests anlegen
- `AGENTS.md` und `CLAUDE.md` hinzufügen

### Exit-Kriterium

Diese Befehle laufen lokal und in CI erfolgreich:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

---

## Phase 2 – Designsystem und App Shell

### Ziel

Die visuelle Grundlage der gesamten App steht.

### Bauen

- App Layout
- Sidebar / Mobile Navigation
- Top Bar
- Card-Komponente
- KPI-Komponente
- Progress-Komponente
- Empty States
- Loading States
- Error States
- Light Mode
- Dark Mode
- Responsive Layout

### Designrichtung

- großzügiger Weißraum
- klare Typografie
- wenig visuelles Rauschen
- starke Zahlenhierarchie
- hochwertige Cards
- dezente Animationen
- mobile first mit guter Desktop-Erweiterung

### Exit-Kriterium

Ein statischer Dashboard-Prototyp funktioniert auf Desktop und Smartphone.

---

## Phase 3 – Authentication und Onboarding

### Ziel

Ein neuer Nutzer kann LifeOS vollständig einrichten.

### Screens

1. Sign Up
2. Login
3. Welcome
4. Einkommen
5. Fixkosten
6. erstes Sparziel
7. optionale Aufgaben
8. Dashboard Ready

### Daten

- Profile
- Income
- recurring Expense
- Goal

### Tests

- Registrierung
- Login
- Onboarding
- Zugriffsschutz
- User-Isolation

### Exit-Kriterium

Ein neuer Nutzer gelangt ohne manuelle Datenbankeingriffe vom Signup zu einem personalisierten Dashboard.

---

## Phase 4 – Money Core

### Ziel

LifeOS kann die finanzielle Situation eines Nutzers korrekt berechnen.

### Funktionen

- Einkommen anlegen/bearbeiten/löschen
- Ausgaben anlegen/bearbeiten/löschen
- Kategorien
- wiederkehrende Fixkosten
- Monatsbudget
- Restbudget
- geplante Sparrate
- Monatsübersicht

### Wichtige Berechnungen

```text
monthly_available =
income
- fixed_expenses
- variable_expenses
- planned_savings
```

### Anforderungen

- Geldwerte niemals als Floating Point speichern
- Beträge als Integer Minor Units oder geeigneten Decimal-Typ behandeln
- Zeitzonen und Monatsgrenzen testen
- negative/ungültige Eingaben validieren

### Exit-Kriterium

Money-Dashboard und Berechnungen sind durch Unit- und Integrationstests abgesichert.

---

## Phase 5 – Goals

### Ziel

Nutzer können konkrete Ziele planen und ihren Fortschritt verfolgen.

### Funktionen

- Goal erstellen
- Zielbetrag
- aktueller Betrag
- Deadline
- monatlicher Beitrag
- Fortschrittsbalken
- voraussichtliches Erreichungsdatum
- Goal Milestones
- Verknüpfung zu Tasks und Budgets

### Beispiel

```text
Goal: Notgroschen
Target: 10.000 €
Current: 3.500 €
Monthly: 500 €
```

LifeOS berechnet die voraussichtliche Zielerreichung.

### Exit-Kriterium

Money und Goals sind nicht mehr isoliert, sondern über den Life Core verbunden.

---

## Phase 6 – Plan: Tasks und Calendar

### Ziel

LifeOS kennt nicht nur Geld, sondern auch die nächsten Aktionen des Nutzers.

### Funktionen

- Tasks
- Priorität
- Due Date
- abgeschlossen/offen
- einfache Calendar Events
- Tagesansicht
- Wochenübersicht
- Goal ↔ Task Verbindung

### Noch keine externen Kalender

Google/Outlook-Sync kommt nach dem stabilen Core.

### Exit-Kriterium

Ein Goal kann mit konkreten Aufgaben und Terminen verbunden werden.

---

## Phase 7 – Home Dashboard

### Ziel

Das zentrale Produktversprechen wird sichtbar.

### Dashboard Sections

- Greeting + Datum
- Today
- Money
- Goals
- Attention
- AI Insight

### Dashboard-Frage

Der Nutzer muss nach maximal 10 Sekunden verstehen:

- Was passiert heute?
- Wie sieht mein Geld aus?
- Welche Ziele benötigen Aufmerksamkeit?

### Exit-Kriterium

5 Testnutzer verstehen das Dashboard ohne Erklärung.

---

## Phase 8 – Life AI V1

### Ziel

Die KI nutzt LifeOS-Daten kontrolliert und nachvollziehbar.

### Zuerst nur lesend

AI Tools:

```text
get_financial_summary
get_budget_status
get_goals
get_goal_projection
get_tasks
get_upcoming_events
```

### Beispiel-Fragen

- Wie läuft mein Monat?
- Wann erreiche ich mein Sparziel?
- Welche Ziele sind gefährdet?
- Was sollte ich diese Woche erledigen?

### AI Actions

Schreibende Aktionen kommen erst danach:

```text
create_task
create_goal
update_goal
create_event
```

Jede schreibende AI-Aktion benötigt vor Ausführung eine sichtbare Nutzerbestätigung.

### Exit-Kriterium

Die KI kann nützliche Antworten liefern, ohne direkten unkontrollierten Datenbankzugriff zu besitzen.

---

## Phase 9 – Weekly Review und Insights

### Ziel

LifeOS bekommt einen wiederkehrenden Nutzungsmoment.

### Weekly Review

- finanzielle Entwicklung
- Budgets
- Goal Progress
- offene Aufgaben
- kommende Deadlines
- 1–3 relevante Insights

### Regel

Nicht für jede Erkenntnis ein LLM verwenden.

Deterministische Regeln bevorzugen, wenn eine Berechnung genügt.

Beispiel:

```text
IF budget_usage >= 0.9
THEN create "Budget fast ausgeschöpft" insight
```

### Exit-Kriterium

Der Nutzer bekommt jede Woche eine relevante, reproduzierbare Zusammenfassung.

---

## Phase 10 – Security, Privacy und Beta

### Ziel

V1 kann echten Nutzern gegeben werden.

### Prüfen

- Row Level Security
- User Data Isolation
- Auth Flow
- API Authorization
- Rate Limits
- AI Prompt Injection Grenzen
- Logging ohne sensible Daten
- Secret Management
- Input Validation
- Error Handling
- Backup-/Migration-Strategie
- DSGVO-relevante Datenflüsse dokumentieren

### Beta

Start mit 10–30 Testnutzern.

Messen:

- Onboarding Completion
- Activation
- Week-1 Retention
- Goals Created
- Weekly Review Open Rate
- AI Usage
- Bugs / Support Requests

### Exit-Kriterium

Keine kritischen Security-Bugs und genügend Nutzersignale für die nächste Produktentscheidung.

---

## Phase 11 – Monetarisierung

Erst wenn die Core-Nutzung funktioniert.

Mögliche Struktur:

### Free

- Dashboard
- Money Basic
- Tasks
- wenige Goals

### Pro

- AI Assistant
- Weekly Review
- Forecasts
- unbegrenzte Goals
- Integrationen
- erweiterte Analysen

Zahlungsintegration erst hinzufügen, wenn klar ist, welche Funktionen Nutzer wiederholt verwenden.

---

# 10. Roadmap nach V1

## V1.5 – Connected Life

- Google Calendar
- Outlook Calendar
- recurring expenses
- Subscriptions
- bessere Notifications

## V2 – AI Life Assistant

- AI Actions
- Planung
- Szenarioanalysen
- Daily Brief
- Goal Generation

## V3 – Life Admin

- Dokumente
- Verträge
- Fristen
- Life Events
- Reminders

## V4 – Financial Ecosystem

- Open Banking über regulierte Partner
- automatische Transactions
- Net Worth
- Assets
- Financial Forecasting

## V5 – Ecosystem

- Health
- Habits
- weitere Integrationen
- Automationen
- Templates / Life Events

---

# 11. So arbeiten wir mit AI-Coding-Agenten

Der Agent ist ein Entwickler, nicht der Product Owner.

Der Mensch entscheidet:

- Was gebaut wird
- Warum es gebaut wird
- Scope
- Acceptance Criteria
- Sicherheitsgrenzen
- Produktentscheidungen

Der Agent übernimmt:

- Codebase analysieren
- Implementierungsplan
- Code schreiben
- Tests
- Refactorings
- Dokumentation
- technische Reviews

---

# 12. Standard-Workflow für jeden Task

Jeder Task folgt demselben Ablauf.

## Step 1 – Issue / Task definieren

Ein Task benötigt:

```text
Problem
Ziel
Scope
Nicht im Scope
Acceptance Criteria
Betroffene Bereiche
Tests
```

Beispiel:

```text
Titel:
Add savings goal creation

Problem:
Users cannot currently create financial goals.

Scope:
Create a goal form and persist the goal.

Not in scope:
AI suggestions, bank integrations, shared goals.

Acceptance criteria:
- authenticated user can create goal
- target amount > 0
- deadline optional
- created goal appears in goals overview
- another user cannot access it
- validation errors are shown
- tests pass
```

---

## Step 2 – Agent analysieren lassen

Noch nichts ändern.

Prompt:

```text
Read AGENTS.md/CLAUDE.md and inspect all files relevant to this task.

Do not modify files yet.

Explain:
1. current implementation,
2. files that need changes,
3. risks,
4. database implications,
5. tests we need,
6. your proposed implementation plan.

Keep the scope strictly limited to this task.
```

---

## Step 3 – Plan prüfen

Der Mensch kontrolliert:

- passt die Architektur?
- fehlt Security?
- baut der Agent unnötig viel?
- entstehen neue Dependencies ohne Grund?
- werden bestehende Patterns verwendet?

Erst danach Implementierung freigeben.

---

## Step 4 – Implementieren

Prompt:

```text
Implement the approved plan.

Constraints:
- stay strictly inside the agreed scope,
- reuse existing patterns and components,
- do not introduce dependencies unless necessary,
- add or update tests,
- do not weaken existing tests,
- do not modify unrelated files,
- run the relevant checks when finished.

Return:
- summary,
- files changed,
- tests run,
- remaining risks.
```

---

## Step 5 – Tests

Mindestens:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Für kritische Flows zusätzlich:

```bash
pnpm test:e2e
pnpm build
```

---

## Step 6 – Separates Review

Wenn möglich, verwendet nicht derselbe Agent denselben Kontext für Implementierung und finale Bewertung.

Review-Prompt:

```text
Review the current diff as a senior engineer.

Do not implement changes yet.

Look specifically for:
- functional bugs,
- authorization/data-isolation issues,
- financial calculation errors,
- missing validation,
- race conditions,
- bad abstractions,
- unnecessary complexity,
- accessibility regressions,
- missing tests.

Rank findings by severity and reference exact files/lines.
If you find no issue in a category, say so.
```

---

## Step 7 – Commit

Ein Commit soll eine logisch zusammenhängende Änderung enthalten.

Beispiel:

```text
feat(goals): add savings goal creation
```

Nicht:

```text
misc changes
```

---

# 13. Codex Workflow

Codex erhält die dauerhaften Repository-Regeln über `AGENTS.md`.

Empfehlung:

- ein klarer Task pro Agent
- große Aufgaben zuerst planen lassen
- unabhängige Aufgaben in getrennten Worktrees bearbeiten
- einen Agent nicht gleichzeitig mehrere gekoppelte Features ändern lassen
- Tests als Teil der Aufgabe definieren
- Diff immer prüfen
- bei komplexen Tasks Implementierung und Review trennen

### Gute Nutzung

Codex-Agent A:

```text
Implement Goal creation according to issue #12.
```

Codex-Agent B in separatem Worktree:

```text
Implement reusable KPI Card according to issue #13.
```

Nicht parallelisieren:

```text
Agent A changes the Goal schema
Agent B simultaneously builds a feature depending on the old Goal schema
```

---

# 14. Claude Code Workflow

Claude Code erhält dauerhaften Projektkontext über `CLAUDE.md`.

Für neue Repositories:

```text
/init
```

Danach `CLAUDE.md` überprüfen und auf die wirklich wichtigen Regeln reduzieren.

Empfohlenes Muster:

```text
Explore
→ Plan
→ Implement
→ Test
→ Review
→ Commit
```

Subagents nur verwenden, wenn eine Nebenaufgabe eigenen Kontext verdient, z. B.:

- Codebase-Recherche
- Security Review
- Testanalyse
- Suche nach bestehenden Patterns

Nicht für jede kleine Dateibearbeitung einen Subagent starten.

Hooks eignen sich für deterministische Vorgänge wie:

- Formatter nach Änderungen
- Lint vor Commit
- bestimmte gefährliche Commands blockieren

---

# 15. Codex + Claude Code gemeinsam

Die Tools sollten **nicht gleichzeitig dieselben Dateien im selben Branch bearbeiten**.

Empfohlene Rollenverteilung:

### Variante A

- Claude Code: Exploration + Architekturplan
- Codex: Implementierung
- Claude Code: Review

### Variante B

- Codex: Planung + Implementierung
- Claude Code: unabhängiges Review

### Variante C

- Codex-Agenten: parallele, unabhängige Worktrees
- Claude Code: zentrale Review-/Integrationssession

Der größte Qualitätsgewinn entsteht weniger durch „welches Modell ist besser“, sondern durch **saubere Aufgaben, begrenzten Scope und unabhängiges Review**.

---

# 16. Prompt-Regeln

Schlechte Aufgabe:

```text
Build the finance section.
```

Bessere Aufgabe:

```text
Implement manual monthly income creation.

Acceptance criteria:
- authenticated user can create one or more income entries,
- amount is stored without floating-point precision loss,
- month defaults to current month,
- validation rejects <= 0,
- data is scoped to authenticated user,
- income list refreshes after successful creation,
- add tests for validation and user isolation.

Do not implement expenses or budgets in this task.
```

### Grundsatz

Je autonomer der Agent arbeiten soll, desto klarer müssen sein:

- Ziel
- Grenzen
- Acceptance Criteria
- Testkriterien

---

# 17. Kontextmanagement

Nicht jede Information gehört in `AGENTS.md` oder `CLAUDE.md`.

### Dauerhaft

In Agent-Instructions:

- Stack
- Commands
- Coding Standards
- Architekturregeln
- Sicherheitsregeln
- Definition of Done

### Produktwissen

In `/docs`:

- PRD
- Roadmap
- Architecture
- Data Model
- ADRs

### Task-spezifisch

In GitHub Issue / Prompt:

- konkretes Problem
- Scope
- Acceptance Criteria

So bleibt der Agentenkontext klein und aktuell.

---

# 18. Definition of Done

Ein Feature gilt erst als fertig, wenn:

- Acceptance Criteria erfüllt sind
- Typecheck erfolgreich ist
- Lint erfolgreich ist
- relevante Tests erfolgreich sind
- keine Tests entfernt wurden, um Fehler zu verstecken
- Authorization geprüft wurde
- Loading/Error/Empty States berücksichtigt wurden
- responsive Darstellung geprüft wurde
- keine Secrets committed wurden
- Diff auf unnötige Änderungen geprüft wurde
- Dokumentation angepasst wurde, wenn Architektur oder Verhalten geändert wurde

---

# 19. Regeln für AI-Funktionen in LifeOS

LifeOS verarbeitet sensible persönliche Informationen.

Deshalb:

1. AI erhält nur Daten, die sie für die aktuelle Aufgabe benötigt.
2. AI hat keinen direkten beliebigen SQL-Zugriff.
3. AI greift über definierte Tools/Funktionen auf Daten zu.
4. Jede schreibende oder löschende AI-Aktion wird validiert.
5. Sensible Aktionen verlangen Nutzerbestätigung.
6. Alle Aktionen werden serverseitig autorisiert.
7. Prompts und Logs dürfen keine unnötigen personenbezogenen Daten speichern.
8. Das Produkt muss transparent zeigen, welche Daten AI verwendet.

---

# 20. Erste GitHub Issues

Nach dem Repository-Setup sollten zuerst diese Issues angelegt werden:

```text
#1 Initialize Next.js application
#2 Configure lint/typecheck/test pipeline
#3 Configure Supabase local development
#4 Add authentication
#5 Build application shell
#6 Create onboarding flow
#7 Create Money domain schema
#8 Implement income management
#9 Implement expenses
#10 Implement budget calculation
#11 Create Goal domain schema
#12 Implement goal creation
#13 Implement goal projection
#14 Implement tasks
#15 Implement calendar events
#16 Implement entity links
#17 Build Home dashboard
#18 Implement AI read tools
#19 Implement AI Insights
#20 Implement Weekly Review
#21 Security review
#22 Beta analytics
```

Nicht alle gleichzeitig beginnen.

---

# 21. Was wir zuerst tun

Der erste reale Entwicklungszyklus:

```text
1. Repository erstellen
2. README, AGENTS.md und CLAUDE.md committen
3. PRD schreiben
4. Wireframes definieren
5. Next.js App initialisieren
6. CI einrichten
7. Supabase lokal einrichten
8. Authentication bauen
9. Onboarding bauen
10. Money Core beginnen
```

Erst wenn Money + Goals + Dashboard funktionieren, kommt die echte AI-Schicht.

---

# 22. Langfristige Vision

```text
V1
Money + Goals + Plan + Dashboard

↓
Connected Life
Kalender-Integrationen + Subscriptions

↓
Life AI
Planning + Forecasts + Actions

↓
Life Admin
Documents + Contracts + Deadlines

↓
Financial Ecosystem
Banking + Net Worth

↓
LifeOS Ecosystem
Money + Time + Goals + Admin + Health + Integrations
```

Die Vision bleibt groß.

Die Implementierung bleibt klein, testbar und inkrementell.

---

# 23. Entscheidungsregel für neue Features

Bevor eine Funktion in die Roadmap kommt:

1. Welches konkrete Nutzerproblem löst sie?
2. Welches bestehende LifeOS-Modul nutzt oder verbessert sie?
3. Entsteht durch die Verbindung ein Mehrwert?
4. Brauchen wir sie wirklich für die aktuelle Produktstufe?
5. Können wir ihren Erfolg messen?

Wenn diese Fragen nicht überzeugend beantwortet werden können, wird die Funktion nicht gebaut.

---

# 24. Kurzform unseres Engineering-Prozesses

```text
Problem
  ↓
Issue + Acceptance Criteria
  ↓
Agent untersucht Code
  ↓
Plan
  ↓
Mensch prüft Plan
  ↓
Implementierung
  ↓
Tests
  ↓
Unabhängiges Review
  ↓
Commit / PR
  ↓
Merge
  ↓
Messen
```

Das ist der Standardprozess für LifeOS.

# Design: Ronda Kit MVP

## Overview

Ronda Kit is structured as a monorepo with three layers:

1. **Engine** (`packages/engine`) — pure TypeScript library with zero runtime dependencies. Owns the schema, session state machine, and report generator.
2. **Scenario content** (`scenarios/`) — JSON files and the control catalog. Treated as data, not code.
3. **App** (`apps/ransomware-house`) — Vite + TypeScript SPA. Consumes the engine via its public API and renders everything with plain DOM + CSS.

```
ronda/
├── packages/
│   └── engine/
│       ├── src/
│       │   ├── index.ts          ← public API surface
│       │   ├── schema.ts         ← Zod schema + ScenarioError
│       │   ├── session.ts        ← Session class
│       │   └── report.ts         ← generateReport()
│       └── test/
│           ├── schema.test.ts
│           ├── session.test.ts
│           ├── report.test.ts
│           └── properties.test.ts   ← fast-check PBTs
├── scenarios/
│   ├── controls.json
│   └── ransomware-toko.json
├── apps/
│   └── ransomware-house/
│       ├── index.html
│       ├── vite.config.ts
│       └── src/
│           ├── main.ts           ← bootstrap, language store
│           ├── ui/
│           │   ├── TitleScreen.ts
│           │   ├── NodeScreen.ts
│           │   ├── FeedbackOverlay.ts
│           │   └── EndingScreen.ts
│           ├── ui-strings.ts     ← centralized non-scenario UI copy
│           └── style.css
├── package.json                  ← npm workspaces root
└── .kiro/
    ├── steering/
    ├── specs/
    └── hooks/
        └── validate-scenario.kiro.hook
```

---

## Engine Design

### 1. Schema (`schema.ts`)

The schema is defined with **Zod** (chosen over raw JSON Schema for colocation of types and validation, and native TypeScript inference).

```
BilingualText   = { id: string (non-empty), en: string (non-empty) }
Room            = "detect" | "isolate" | "communicate" | "recover"
ChoiceQuality   = "good" | "neutral" | "bad"
EndingType      = "safe" | "partial" | "haunted"

Choice = {
  id:       string
  label:    BilingualText
  next:     string          ← validated post-parse as an existing node key
  quality:  ChoiceQuality
  score:    number
  controls: string[]        ← validated against catalog; ≥1 when quality === "bad"
  feedback: BilingualText
}

EndingNode = {
  room:    Room
  ending:  { type: EndingType, summary: BilingualText }
}

NonEndingNode = {
  room:    Room
  text:    BilingualText
  choices: Choice[]        ← length ≥ 1
}

ScenarioNode = NonEndingNode | EndingNode   (discriminated by presence of "ending")

Scenario = {
  id:    string
  title: BilingualText
  start: string            ← must equal a key in nodes
  nodes: Record<string, ScenarioNode>
}
```

**Two-pass validation:**
- Pass 1: Zod structural check (types, required fields, enum values, non-empty strings).
- Pass 2: Cross-reference check (referential integrity: `start` ∈ nodes, every `next` ∈ nodes, every control ID ∈ catalog).

Both passes produce typed `ScenarioError` with a `fields` array of `{ path: string; message: string }`.

### 2. Session (`session.ts`)

A `Session` is a simple state machine. It is **not** a class with private mutable state exposed via getters — it is a plain object returned by `createSession()` with methods closed over internal state.

```
Internal state:
  currentNodeId: string
  score:         number
  history:       HistoryEntry[]
  ended:         boolean

HistoryEntry = {
  nodeId:   string
  choiceId: string
  quality:  ChoiceQuality
  controls: string[]
}

ChoiceResult = {
  feedback:    BilingualText
  scoreDelta:  number
  totalScore:  number
  nextNode:    ScenarioNode
  isEnded:     boolean
}
```

`choose(choiceId)`:
1. Guard: throw `SessionError` if already ended or choice not on current node.
2. Retrieve choice from current node.
3. Push to history.
4. Update score += choice.score.
5. Advance currentNodeId = choice.next.
6. Set `ended = isEndingNode(newNode)`.
7. Return `ChoiceResult`.

No async operations; the session is entirely synchronous.

### 3. Report (`report.ts`)

`generateReport(session, catalog)`:
1. Guard: throw if `!session.isEnded()`.
2. Collect bad-choice history entries.
3. Flatten their `controls` arrays → Set → filter catalog in catalog order → `missedControls`.
4. Map missed controls to `ChecklistItem[]`.
5. Look up `endingType` and `endingSummary` from the final node.
6. Return `Report`.

```
Report = {
  finalScore:    number
  endingType:    EndingType
  endingSummary: BilingualText
  missedControls: Control[]
  checklistItems: ChecklistItem[]
}

ChecklistItem = {
  controlId:   string
  name:        BilingualText
  description: BilingualText
}
```

### 4. Public API (`index.ts`)

```typescript
export { loadScenario } from './schema'
export { createSession } from './session'
export { generateReport } from './report'
export type {
  Scenario, ScenarioNode, NonEndingNode, EndingNode,
  Choice, ChoiceResult, ChoiceQuality, EndingType, Room,
  BilingualText, Control, ControlCatalog,
  Session, HistoryEntry,
  Report, ChecklistItem,
  ScenarioError, SessionError,
} from './types'
```

All internal helpers remain unexported.

---

## Property-Based Tests Design

Each property is a separate `it` block in `properties.test.ts` using `fc.assert(fc.property(...))`.

### Arbitrary generators

Two families of test data:

**A. Real data** — the actual `ransomware-toko.json` and `controls.json` loaded from disk. Each property runs against this once as a deterministic baseline.

**B. Generated graphs** — a custom fast-check arbitrary `fc.scenarioArbitrary(catalog)`:
- Node count: `fc.integer({ min: 2, max: 20 })`.
- Random DAG structure: assign each non-ending node a subset of successors from already-created nodes plus exactly one ending node. This guarantees acyclicity.
- Room values: uniform choice over the four rooms.
- Bilingual text: non-blank strings × 2 (`fc.string({ minLength: 1 })` filtered by `s.trim() !== ""`). Plain `fc.string({ minLength: 1 })` produces whitespace-only text, which REQ-2.6 rejects; see `docs/pbt-findings.md` #1.
- Graph shape: endings are created first, the start node last; every non-ending node links to the previously created node and the first non-ending node links to every ending, so every node is reachable (REQ-5.3) by construction.
- Choice quality: weighted toward mixed (not all bad, not all good) to exercise interesting paths.
- Controls: chosen from the catalog; bad choices get ≥1.

### Property implementations

| # | Approach |
|---|---|
| REQ-5.1 Termination | BFS/DFS from start; assert all reachable paths terminate in ≤ 2×\|nodes\| steps. With the DAG generator this is structurally guaranteed; still verified algorithmically. |
| REQ-5.2 No dead ends | Iterate all non-ending nodes; assert `choices.length >= 1`; assert every `next` ∈ `Object.keys(nodes)`. |
| REQ-5.3 Reachability | BFS from start collecting reachable node IDs; assert `reachable.size === Object.keys(nodes).length`. |
| REQ-5.4 Bad → controls | Filter choices with `quality === "bad"`; assert each has `controls.length >= 1` and each control ID ∈ catalog keys. |
| REQ-5.5 Bilingual | Walk every BilingualText field recursively; assert `id.trim() !== ""` and `en.trim() !== ""`. |
| REQ-5.6 Monotonicity | For the real scenario: pick a bad choice on some node, replace it with a good equivalent, replay the same path, compare scores. For generated: compare two sessions differing by exactly one good vs bad choice. |
| Score accounting (extra) | Final score equals the sum of the chosen choices' `score` deltas. Added because REQ-5.6 alone misses a session that ignores bad-choice penalties; see `docs/pbt-findings.md` #2. |
| REQ-5.7 Report = history | Run a session to completion following a fixed (or generated) path; compute expected missed controls independently; assert deep equality with `report.missedControls`. |

---

## App Design (`apps/ransomware-house`)

### State model

The app has four screens that map 1-to-1 to React-less view functions that render into `#app`:

```
AppState = { screen: "title" }
         | { screen: "node",    session: Session }
         | { screen: "feedback", session: Session, result: ChoiceResult }
         | { screen: "ending",  session: Session, report: Report }
```

A single `lang: "id" | "en"` variable is stored in module scope and toggled by the language button. All render functions read it at call time; re-rendering on toggle calls the current screen's render function again with fresh state.

### Rendering approach

No virtual DOM, no framework. Each screen is a function that:
1. Clears `#app`.
2. Creates DOM elements imperatively (`document.createElement`).
3. Sets text via `.textContent` (never `.innerHTML` with scenario content).
4. Attaches event listeners.
5. Appends to `#app`.

This is acceptable for a small app with four screens and keeps the dependency count at zero.

### Screen specifications

**TitleScreen**
```
<main>
  <h1>  Ransomware Haunted House / Rumah Hantu Ransomware
  <p>   Problem statement (bilingual)
  <div> Language toggle  [ID | EN]
  <button> Start / Mulai
```

**NodeScreen**
```
<header>  Room label + progress indicator  (e.g. "Ruangan 2 dari 4")
<main>
  <section aria-label="situation">
    <p>  Node text
  <section aria-label="choices">
    <button> × N (one per choice, labelled with choice.label)
```

Choices are rendered as `<button>` elements. Clicking one calls `session.choose(id)`, stores the `ChoiceResult`, and renders `FeedbackOverlay`.

**FeedbackOverlay** (shown over NodeScreen after a choice)
```
<div role="dialog" aria-modal="true">
  [ghost-effect class if quality === "bad"]
  <p>  Feedback text
  [if bad]:
    <p>  "Missing control: <strong>{controlName}</strong>"
  <button>  Continue / Lanjutkan
```

The ghost effect is a CSS class (`ghost-effect`) applying a flicker animation. When `prefers-reduced-motion: reduce` is set, the animation is replaced by a static red border.

**EndingScreen**
```
<main data-ending-type="safe|partial|haunted">
  <h2>  Ending title  (safe/partial/haunted mapped to bilingual label)
  <p>   Ending summary
  <p>   Score: {finalScore}
  <section aria-label="missed controls">
    <h3>  "What you missed" / "Yang terlewat"
    <ul>
      <li> × N  (control name + description)
  <button>  Print checklist / Cetak checklist
  <button>  Play again / Main lagi
```

### Language management

```typescript
// ui-strings.ts
type UIKey = "start" | "continue" | "print" | "playAgain" | "problemStatement"
           | "roomLabel" | "progressOf" | "missedControls" | "score" | ...

const UI_STRINGS: Record<UIKey, BilingualText> = { ... }

function t(key: UIKey, lang: Lang): string {
  return UI_STRINGS[key][lang]
}
```

Scenario text is retrieved via `node.text[lang]`, `choice.label[lang]`, etc.

### CSS architecture

Single `style.css` with:
- CSS custom properties for the dark theme palette (background, surface, text, accent, danger).
- `@media (prefers-color-scheme: light)` override (optional for MVP; dark is default).
- `.ghost-effect` animation; `@media (prefers-reduced-motion: reduce)` suppresses keyframes.
- Print styles in `@media print`: hide buttons and chrome, show checklist items full-width.
- Mobile-first layout; no media query breakpoints needed beyond print.

### Vite configuration

```typescript
// vite.config.ts
export default defineConfig({
  base: './',   // relative URLs: works under any GitHub Pages path
  build: { outDir: 'dist' },
})
```

GitHub Actions workflow (`.github/workflows/deploy.yml`) runs typecheck, tests and build, then publishes `apps/ransomware-house/dist` with `actions/upload-pages-artifact` + `actions/deploy-pages` (Pages source: "GitHub Actions", no `gh-pages` branch).

---

## Data Flow Diagram

```
User action (click choice)
        │
        ▼
  NodeScreen.ts
  session.choose(choiceId)
        │
        ▼
  Session (packages/engine)
  → validates choice
  → updates history & score
  → returns ChoiceResult
        │
        ▼
  FeedbackOverlay.ts
  (shows feedback, bad → ghost effect)
        │
        ▼
  User clicks Continue
        │
        ├── isEnded === false → NodeScreen (next node)
        │
        └── isEnded === true
                │
                ▼
          generateReport(session, catalog)
                │
                ▼
          EndingScreen.ts
```

---

## Kiro Hook Design

File: `.kiro/hooks/validate-scenario.kiro.hook` (Kiro's agent-hook format)

- `when`: `fileEdited` on `scenarios/**/*.json`.
- `then`: `askAgent` with a prompt to run `npm run validate-scenario --silent -- <file>`, then `npm test` if validation passes, and report field-level errors with a one-line fix each.

The `validate-scenario` script (`packages/engine/scripts/validate.ts`, run with `tsx`) loads the control catalog, calls `loadScenario()` on the given file (argument, `KIRO_FILE_PATH`, or every file in `scenarios/`), then checks the graph rules a schema cannot express: every node reachable from `start` and no reachable cycle. It prints `✓ <file>: scenario valid` or one `path: message` line per error and exits 1 on failure.

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Zod for schema | Colocates runtime validation with TypeScript types; better DX than JSON Schema + codegen; zero extra build step. |
| No framework in app | App has 4 screens; a framework adds more complexity than it removes. Plain DOM keeps the dependency count at zero and load time minimal. |
| DAG generator for PBTs | Guarantees the generated arbitrary itself is always structurally valid, so test failures are always engine bugs, not generator bugs. |
| Functional session (closure) | Avoids exposing mutable internal state via class properties; `Session` is an interface, not a class — easier to test and mock. |
| CSS custom properties for theming | Single source of truth for colours; trivial to override in a future light theme or second app. |
| `base: './'` in Vite | GitHub Pages serves the app under the repository name (`/ronda-hackathon/`); relative asset URLs work there and anywhere else without hard-coding it. |

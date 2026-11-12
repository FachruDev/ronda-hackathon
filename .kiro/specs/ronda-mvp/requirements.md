# Requirements: Ronda Kit MVP

## Introduction

Ronda Kit is a reusable engine for branching incident-response drills ("gladi") with a bilingual (Indonesian/English) UI. The MVP delivers a working engine (`packages/engine`), a complete scenario for the first app, and the first deployed app: **Ransomware Haunted House** (`apps/ransomware-house`). Every requirement here is scoped to the MVP; App B and the Crew App are explicitly out of scope.

---

## Requirements

### 1 — Project Scaffolding

**REQ-1.1** The monorepo must follow the directory layout from the structure steering file: `packages/engine`, `scenarios/`, `apps/ransomware-house/`, `LICENSE` (MIT), and `README.md` at the root.

**REQ-1.2** The root `package.json` must configure npm workspaces covering `packages/*` and `apps/*`.

**REQ-1.3** TypeScript strict mode must be enabled in every workspace member via its own `tsconfig.json`.

**REQ-1.4** Vite must be used as the build tool for `apps/ransomware-house`. The engine is a pure TypeScript library (no Vite for the engine itself).

**REQ-1.5** Vitest must be the test runner; fast-check must be installed as a dev dependency in `packages/engine`.

---

### 2 — Scenario Schema

**REQ-2.1** A JSON Schema (or equivalent Zod schema) must be defined and exported from `packages/engine` that precisely describes a valid scenario.

**REQ-2.2** A scenario document must have:
- `id` — a non-empty string identifier.
- `title` — a bilingual text object `{ id: string; en: string }`.
- `start` — the ID of the starting node, which must reference an existing node.
- `nodes` — a map of node ID → node object (non-empty).

**REQ-2.3** Each **non-ending node** must have:
- `room` — one of `"detect" | "isolate" | "communicate" | "recover"`.
- `text` — a bilingual text object.
- `choices` — an array of at least one choice object.

**REQ-2.4** Each **choice** must have:
- `id` — a non-empty string, unique within its node.
- `label` — a bilingual text object.
- `next` — a node ID that must reference an existing node in the same scenario.
- `quality` — one of `"good" | "neutral" | "bad"`.
- `score` — a number (may be negative, zero, or positive).
- `controls` — an array of control IDs (may be empty for non-bad choices; must contain ≥1 entry for `bad` choices).
- `feedback` — a bilingual text object.

**REQ-2.5** Each **ending node** must have:
- `room` — a room string (usually `"recover"`).
- `ending` — an object with:
  - `type` — one of `"safe" | "partial" | "haunted"`.
  - `summary` — a bilingual text object.

**REQ-2.6** A bilingual text object is invalid if either the `id` field or the `en` field is an empty string or whitespace-only.

**REQ-2.7** The schema validator must return structured error messages (field path + human-readable reason) on failure, not generic exceptions.

---

### 3 — Control Catalog (`scenarios/controls.json`)

**REQ-3.1** The control catalog must be a JSON array of control objects, each with:
- `id` — a non-empty string identifier (e.g. `"offline-backup"`).
- `name` — a bilingual text object.
- `description` — a bilingual text object explaining what the control is and why it matters.

**REQ-3.2** The MVP catalog must include at least 10 controls covering: offline backup, MFA, network isolation, evidence preservation, password change on clean device, incident logging, vendor/IT contact, customer notification (data breach), use of verified recovery tools, and account audit.

**REQ-3.3** The engine's schema validator must cross-reference control IDs in choices against the catalog at load time and report unknown control IDs as errors.

---

### 4 — Engine Public API (`packages/engine/src/index.ts`)

**REQ-4.1** The engine must export a `loadScenario(json: unknown, catalog: ControlCatalog): Scenario` function that validates and parses the JSON, throwing a descriptive `ScenarioError` on failure.

**REQ-4.2** The engine must export a `createSession(scenario: Scenario): Session` function that initialises a new session at the start node with score 0 and empty history.

**REQ-4.3** `Session` must expose:
- `currentNode(): ScenarioNode` — the node the player is currently on.
- `choose(choiceId: string): ChoiceResult` — advance the session by one choice; return the choice's feedback, score delta, new cumulative score, and whether the new node is an ending.
- `isEnded(): boolean`.
- `getHistory(): HistoryEntry[]` — ordered list of `{ nodeId, choiceId, quality, controls }`.

**REQ-4.4** `choose()` must throw if `choiceId` does not exist on the current node, or if the session has already ended.

**REQ-4.5** The engine must export a `generateReport(session: Session, catalog: ControlCatalog): Report` function that returns:
- `finalScore: number`.
- `endingType: "safe" | "partial" | "haunted"`.
- `endingSummary: BilingualText`.
- `missedControls: Control[]` — the controls referenced by **bad** choices the player actually took, de-duplicated, in catalog order.
- `checklistItems: ChecklistItem[]` — one item per missed control, with its bilingual name and description.

**REQ-4.6** All types used in the public API must be exported from `packages/engine/src/index.ts`.

**REQ-4.7** The engine must have zero runtime dependencies. All validation and logic is pure TypeScript.

---

### 5 — Property-Based Tests (fast-check)

All seven properties must pass both on the real `ransomware-toko.json` scenario and on randomly generated valid scenario graphs.

**REQ-5.1 — Termination:** Every sequence of choices starting from the start node reaches an ending node within a bounded number of steps (≤ `2 × |nodes|`). No infinite cycles are possible.

**REQ-5.2 — No dead ends:** Every non-ending node has ≥1 choice, and every `next` ID in every choice references a node that exists in the scenario.

**REQ-5.3 — Full reachability:** Every node in `nodes` is reachable from `start` by following at least one valid choice sequence.

**REQ-5.4 — Bad choices reference valid controls:** Every choice with `quality === "bad"` has `controls.length >= 1`, and every listed control ID exists in the catalog.

**REQ-5.5 — Bilingual completeness:** Every bilingual text field (`title`, `text`, `label`, `feedback`, `summary`, `name`, `description`) has non-empty, non-whitespace `id` and `en` strings.

**REQ-5.6 — Score monotonicity:** For any node, substituting a bad choice with a good choice (all else equal) never produces a lower final score.

**REQ-5.7 — Report consistency:** The `missedControls` in the report exactly equals the de-duplicated union of `controls` from history entries where `quality === "bad"`.

---

### 6 — Scenario Content: `scenarios/ransomware-toko.json`

**REQ-6.1** The scenario must be fully fictional (no real company data, real network topology, or real procedures).

**REQ-6.2** The scenario must have 10–14 nodes across four rooms in order: `detect → isolate → communicate → recover`.

**REQ-6.3** The scenario must have exactly three ending nodes: `safe`, `partial`, and `haunted`.

**REQ-6.4** Each non-ending node must offer 2–4 choices. The majority of detect/isolate/communicate nodes must have at least one good and one bad choice.

**REQ-6.5** All text must be bilingual and written naturally (not literal word-for-word translation). Indonesian is the primary language; English is a faithful equivalent.

**REQ-6.6** The scenario must not contain any attack instructions, exploit details, or malware technical specifics.

**REQ-6.7** Any reference to legal obligations (e.g. data breach notification under UU PDP) must be phrased as general advice, not as a precise legal claim with specific deadlines, unless verified against the official text.

**REQ-6.8** The scenario must pass all seven PBTs without modification.

---

### 7 — App A: Ransomware Haunted House (`apps/ransomware-house`)

#### 7.1 — Title Screen

**REQ-7.1.1** The title screen must show: the app title ("Ransomware Haunted House" / "Rumah Hantu Ransomware"), a one-sentence problem statement in the active language, a Start button, and an ID/EN language toggle.

**REQ-7.1.2** The language toggle must switch all visible text immediately without a page reload.

#### 7.2 — Room / Node Screen

**REQ-7.2.1** Each node screen must display the room name, the node's situation text, and all available choices as buttons or interactive elements.

**REQ-7.2.2** After the player selects a choice, the feedback for that choice must be shown before advancing to the next node.

**REQ-7.2.3** A bad choice must trigger a "ghost" visual effect (CSS animation). The effect must be suppressed or reduced to a simple indicator when `prefers-reduced-motion: reduce` is active.

**REQ-7.2.4** A bad choice feedback screen must name the missing control in the active language.

**REQ-7.2.5** The player must be able to continue to the next node only after reading the feedback (explicit "Continue" action).

**REQ-7.2.6** The current room and overall progress (e.g. "Room 2 of 4") must be visible at all times during play.

#### 7.3 — Ending Screen and Report

**REQ-7.3.1** The ending screen must display the ending type with a matching visual treatment (`safe` = calm, `partial` = warning, `haunted` = eerie), the bilingual ending summary, and the final score.

**REQ-7.3.2** The report section must list each missed control with its bilingual name and description.

**REQ-7.3.3** A "Print checklist" button must trigger the browser print dialog; print CSS must format the checklist legibly and hide interactive UI chrome.

#### 7.4 — Language

**REQ-7.4.1** All user-facing strings (title, situation text, choice labels, feedback, control names, room labels, button text) must be available in both Indonesian and English.

**REQ-7.4.2** The language toggle must persist the choice for the entire session (not reset on node navigation).

**REQ-7.4.3** No user-facing string may be hard-coded in the app outside of the scenario JSON and a small, centralized UI-string map.

#### 7.5 — Accessibility

**REQ-7.5.1** All interactive elements must be keyboard-navigable (Tab/Enter/Space).

**REQ-7.5.2** The focus ring must be visually distinct and always visible.

**REQ-7.5.3** Color contrast must meet WCAG AA (4.5:1 for normal text, 3:1 for large text) in the dark theme.

**REQ-7.5.4** The ghost animation must respect `prefers-reduced-motion: reduce`.

**REQ-7.5.5** Scenario text must be rendered via `textContent` or equivalent safe DOM APIs; `innerHTML` with scenario content is forbidden.

**REQ-7.5.6** Semantic HTML must be used: headings for titles, `<button>` for actions, `<main>`, `<section>`, `<nav>` where appropriate.

#### 7.6 — Layout and Performance

**REQ-7.6.1** The app must be mobile-friendly (viewport meta tag, no horizontal overflow, touch targets ≥44 × 44 px).

**REQ-7.6.2** The app must function correctly without JavaScript on the first paint only if a `<noscript>` notice is shown; full functionality requires JS.

**REQ-7.6.3** The app must be a fully static site: no backend calls, no server-side rendering, no external API requests at runtime.

---

### 8 — Deployment

**REQ-8.1** The app must be deployable to GitHub Pages using the standard Vite `base` configuration for the repository path.

**REQ-8.2** The root `README.md` must document: how to install dependencies, how to run the app locally, and the live GitHub Pages URL once deployed.

**REQ-8.3** The MIT `LICENSE` file must be present at the root.

---

### 9 — Kiro Hook

**REQ-9.1** A Kiro hook must be configured at `.kiro/hooks/validate-scenario.json` that fires when any file matching `scenarios/**/*.json` is saved.

**REQ-9.2** The hook must run the schema validator and the PBT suite against the saved file and report errors to the terminal.

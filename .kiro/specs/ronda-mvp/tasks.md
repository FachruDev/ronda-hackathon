# Tasks: Ronda Kit MVP

Tasks are ordered by dependency. Each task is independently executable. The checkboxes track completion.

---

## Phase 1 — Project Scaffolding

- [x] **TASK-1** Initialize monorepo structure

  Create the directory tree and root-level files:
  - `package.json` with `"workspaces": ["packages/*", "apps/*"]`, dev scripts (`build`, `test`, `validate-scenario`).
  - `.gitignore` covering `node_modules`, `dist`, `.env`.
  - `LICENSE` (MIT, current year).
  - `README.md` placeholder (expand in TASK-16).

  Acceptance: `npm install` from root resolves without errors; workspace packages are linked.

- [x] **TASK-2** Set up `packages/engine`

  - `packages/engine/package.json`: `name: "@ronda/engine"`, `main: "src/index.ts"`, devDependencies: `typescript`, `vitest`, `fast-check`, `zod`.
  - `packages/engine/tsconfig.json`: strict mode, `moduleResolution: "bundler"`, `target: "ES2020"`.
  - Empty `packages/engine/src/index.ts` and `packages/engine/test/.gitkeep`.

  Acceptance: `npx tsc --noEmit` in `packages/engine` exits 0 with no source files yet.

- [x] **TASK-3** Set up `apps/ransomware-house`

  - `apps/ransomware-house/package.json`: `name: "@ronda/ransomware-house"`, dependencies: `@ronda/engine`, devDependencies: `vite`, `typescript`.
  - `apps/ransomware-house/tsconfig.json`: strict mode, extends engine tsconfig for shared settings.
  - `apps/ransomware-house/vite.config.ts`: `base: '/ronda/'`, `build.outDir: 'dist'`.
  - `apps/ransomware-house/index.html`: minimal shell with `<div id="app">` and `<script type="module" src="/src/main.ts">`.
  - Empty `apps/ransomware-house/src/main.ts`.

  Acceptance: `npm run dev --workspace=apps/ransomware-house` starts Vite dev server; opening localhost shows an empty page without console errors.

---

## Phase 2 — Engine Core

- [ ] **TASK-4** Define shared TypeScript types

  Create `packages/engine/src/types.ts` exporting all shared types listed in the design:
  `BilingualText`, `Room`, `ChoiceQuality`, `EndingType`, `Choice`, `NonEndingNode`, `EndingNode`, `ScenarioNode`, `Scenario`, `Control`, `ControlCatalog`, `HistoryEntry`, `ChoiceResult`, `Session`, `Report`, `ChecklistItem`, `ScenarioError`, `SessionError`.

  - `ScenarioError` and `SessionError` extend `Error` and include a `fields?: { path: string; message: string }[]` property.
  - `Session` is a TypeScript `interface` (not a class).

  Acceptance: `npx tsc --noEmit` passes; no `any` types.

- [ ] **TASK-5** Implement schema validation (`schema.ts`)

  Implement `packages/engine/src/schema.ts`:
  - Define Zod schemas for all types from TASK-4.
  - Export `loadScenario(json: unknown, catalog: ControlCatalog): Scenario`:
    - Pass 1: Zod parse; collect errors into `ScenarioError.fields`.
    - Pass 2: cross-reference `start`, all `next` IDs, all control IDs against catalog; append any new errors.
    - If any errors: throw `ScenarioError` with the full `fields` array.
    - Return the typed `Scenario` on success.

  Acceptance: unit tests cover valid input, structurally invalid input (missing required field), and referentially invalid input (unknown control ID, unknown next node). All tests pass.

- [ ] **TASK-6** Implement Session (`session.ts`)

  Implement `packages/engine/src/session.ts`:
  - Export `createSession(scenario: Scenario): Session` returning a closure-based session object.
  - Implement all `Session` interface methods as specified in the design.
  - `choose()` throws `SessionError` if already ended or choice ID not found on current node.

  Acceptance: unit tests cover: initial state, single good choice, single bad choice, reaching an ending, calling `choose()` on ended session (should throw), calling `choose()` with invalid ID (should throw), `getHistory()` ordering.

- [ ] **TASK-7** Implement Report generation (`report.ts`)

  Implement `packages/engine/src/report.ts`:
  - Export `generateReport(session: Session, catalog: ControlCatalog): Report`.
  - Collect bad-choice history entries, flatten controls, de-duplicate using a Set, preserve catalog order.
  - Throw `SessionError` if session has not ended.

  Acceptance: unit tests cover: no bad choices (empty missed controls), one bad choice, multiple bad choices with overlapping controls (de-duplication), calling on unfinished session (should throw).

- [ ] **TASK-8** Wire public API (`index.ts`)

  Fill `packages/engine/src/index.ts` with re-exports of `loadScenario`, `createSession`, `generateReport`, and all public types from `types.ts`.

  Acceptance: importing `{ loadScenario, createSession, generateReport }` from `@ronda/engine` resolves in both the engine's own tests and the app.

---

## Phase 3 — Property-Based Tests

- [ ] **TASK-9** Build the scenario arbitrary generator

  In `packages/engine/test/arbitraries.ts`:
  - Implement `bilingualArbitrary()`: `fc.record({ id: fc.string({minLength:1}), en: fc.string({minLength:1}) })`.
  - Implement `scenarioArbitrary(catalog: ControlCatalog)`:
    - Generate a DAG: 1 start node + 2–10 non-ending nodes + 1–3 ending nodes.
    - Ending nodes created first, then non-ending nodes whose `next` references only already-created nodes (guarantees acyclicity).
    - Assign rooms, bilingual text, 1–4 choices per node, mixed quality, controls from catalog for bad choices.
  - Export both arbitraries.

  Acceptance: `fc.sample(scenarioArbitrary(catalog), 20)` produces valid scenarios (verified by running `loadScenario` on each).

- [ ] **TASK-10** Implement the seven PBT properties

  In `packages/engine/test/properties.test.ts`:
  - Load `ransomware-toko.json` and `controls.json` from disk for the real-scenario baseline (skipped with a clear message if files don't exist yet, to allow running the test file before TASK-13/TASK-14).
  - For each of the 7 properties (REQ-5.1 through REQ-5.7): one `it` block each, running `fc.assert(fc.property(scenarioArbitrary(catalog), ...))` with 1000 runs.
  - Each property also has a plain (non-PBT) assertion against the real scenario when available.

  Acceptance: `vitest --run` on the engine exits green (the real-scenario assertions are skipped if the JSON files are absent).

---

## Phase 4 — Scenario Content

- [ ] **TASK-11** Create the control catalog (`scenarios/controls.json`)

  Write `scenarios/controls.json` as a JSON array with ≥10 controls. Required controls (see REQ-3.2):

  | ID | Name (en) |
  |---|---|
  | `offline-backup` | Offline / air-gapped backup |
  | `mfa` | Multi-factor authentication |
  | `network-isolation` | Network isolation |
  | `evidence-preservation` | Evidence preservation |
  | `clean-device-password-change` | Password change from clean device |
  | `incident-log` | Incident chronology log |
  | `vendor-contact` | IT vendor / MSP contact |
  | `customer-notification` | Customer data-breach notification |
  | `verified-recovery-tools` | Verified recovery tools only |
  | `account-audit` | Account and privilege audit |

  Each entry: `{ id, name: BilingualText, description: BilingualText }`. Descriptions must be clear and educational, not technical jargon-heavy.

  Acceptance: a simple Node script (`node -e "require('./scenarios/controls.json')"`) parses the file; Zod control catalog schema validates it without errors.

- [ ] **TASK-12** Write scenario `scenarios/ransomware-toko.json`

  Implement the full scenario following the design in `docs/MVP.md` section 3:
  - 10–14 nodes, 4 rooms (`detect`, `isolate`, `communicate`, `recover`).
  - 3 ending nodes: `end-safe`, `end-partial`, `end-haunted`.
  - Every room has at least one node with a good choice and one with a bad choice.
  - All text bilingual, natural Indonesian (not literal translation).
  - No legal claims with specific deadlines; UU PDP reference is phrased as general advice.
  - No attack instructions or malware technical specifics.

  Acceptance: `loadScenario(json, catalog)` succeeds; all 7 PBTs pass with the real scenario.

---

## Phase 5 — App UI

- [ ] **TASK-13** Bootstrap app entry point and language store

  In `apps/ransomware-house/src/main.ts`:
  - Load scenario JSON and control catalog JSON (static imports, bundled by Vite).
  - Call `loadScenario()` at startup; if it throws, render an error message to `#app`.
  - Export a `lang` module-level variable and a `setLang(l: "id" | "en")` function that re-renders the current screen.
  - Define the `AppState` union type and a `render(state: AppState)` dispatcher.
  - On load, render `TitleScreen`.

  Acceptance: `npm run dev` opens to a page with no console errors; the scenario loads silently.

- [ ] **TASK-14** Implement TitleScreen

  In `apps/ransomware-house/src/ui/TitleScreen.ts`:
  - Export `renderTitleScreen(onStart: () => void, onToggleLang: () => void): void`.
  - Build the DOM as described in the design section.
  - Start button calls `onStart`.
  - Language toggle calls `onToggleLang` (which updates `lang` and re-renders).
  - Use `textContent` for all text; retrieve strings from `ui-strings.ts`.

  Acceptance: Title screen visible; language toggle switches all text; Start button calls the callback.

- [ ] **TASK-15** Implement NodeScreen and FeedbackOverlay

  In `apps/ransomware-house/src/ui/NodeScreen.ts`:
  - Export `renderNodeScreen(session: Session, onChoice: (choiceId: string) => void): void`.
  - Display room label, progress indicator, node text, choice buttons.
  - Each choice button's click handler calls `onChoice(choice.id)`.

  In `apps/ransomware-house/src/ui/FeedbackOverlay.ts`:
  - Export `renderFeedbackOverlay(result: ChoiceResult, catalog: ControlCatalog, onContinue: () => void): void`.
  - Show feedback text; if `quality === "bad"`, add `.ghost-effect` class and display the missed control names.
  - Continue button calls `onContinue`.

  Acceptance: Clicking a choice shows the overlay with correct feedback text; "bad" choices show the ghost class and control name; Continue advances correctly.

- [ ] **TASK-16** Implement EndingScreen

  In `apps/ransomware-house/src/ui/EndingScreen.ts`:
  - Export `renderEndingScreen(session: Session, report: Report, catalog: ControlCatalog, onRestart: () => void): void`.
  - Show ending type (with `data-ending-type` attribute), summary, final score.
  - List missed controls with bilingual name and description.
  - "Print checklist" button calls `window.print()`.
  - "Play again" button calls `onRestart` (which resets to TitleScreen with a fresh session).

  Acceptance: All three ending types render with correct visual treatment; print button triggers print dialog; checklist items match session history.

- [ ] **TASK-17** Create UI strings map (`ui-strings.ts`)

  In `apps/ransomware-house/src/ui-strings.ts`:
  - Define the `UIKey` type and `UI_STRINGS` map as specified in the design.
  - Export `t(key: UIKey, lang: "id" | "en"): string`.
  - Cover at minimum: `start`, `continue`, `print`, `playAgain`, `problemStatement`, `roomLabel`, `progressOf`, `missedControls`, `score`, `missingControl`, `playAgainLabel`, room display names for all four rooms, ending type labels for all three types.

  Acceptance: No hard-coded bilingual strings remain in screen components; all pass through `t()` or `node.text[lang]`.

---

## Phase 6 — Styling and Accessibility

- [ ] **TASK-18** Implement base CSS

  In `apps/ransomware-house/src/style.css`:
  - CSS custom properties: `--color-bg`, `--color-surface`, `--color-text`, `--color-accent`, `--color-danger`, `--color-muted`.
  - Dark theme values as defaults; a `prefers-color-scheme: light` override (can be a simple palette swap for MVP).
  - Base reset, typography, layout (flex/grid for centering screens).
  - Button styles (minimum 44×44 px touch target, visible focus ring, hover state).
  - Mobile-first (no fixed widths that cause overflow on small screens).

  Acceptance: App looks intentional and readable on a 375 px viewport and on a 1280 px viewport.

- [ ] **TASK-19** Implement ghost effect and print CSS

  In the same `style.css`:
  - `.ghost-effect` keyframe animation (flicker, slight desaturation, red tint).
  - `@media (prefers-reduced-motion: reduce)`: replace animation with a static `border: 2px solid var(--color-danger)` on `.ghost-effect`.
  - `@media print`: hide `<nav>`, buttons, language toggle; show checklist items full-width; use black text on white.

  Acceptance: Bad choice triggers visible ghost animation in browser; print preview shows only the checklist.

- [ ] **TASK-20** Accessibility pass

  Review and fix across all screen components:
  - All interactive elements reachable by Tab.
  - Focus ring visible (not hidden by `outline: none` without replacement).
  - Heading hierarchy: `<h1>` on title screen, `<h2>` for ending screen title, `<h3>` for sub-sections.
  - `<main>`, `<header>`, `<section>` with meaningful `aria-label`.
  - FeedbackOverlay uses `role="dialog"` and `aria-modal="true"`; focus moves into it on open.
  - Color contrast checked for primary text, muted text, and button labels against their backgrounds.

  Acceptance: Keyboard-only navigation can complete a full session from title to ending screen; no WCAG AA contrast failures on the dark theme.

---

## Phase 7 — Deployment and Finishing

- [ ] **TASK-21** GitHub Actions deploy workflow

  Create `.github/workflows/deploy.yml`:
  - Trigger: push to `main`.
  - Steps: checkout → setup Node 20 → `npm ci` → `npm run build --workspace=apps/ransomware-house` → deploy `apps/ransomware-house/dist` to `gh-pages` branch using `actions/deploy-pages@v4` (or `peaceiris/actions-gh-pages`).
  - Set `permissions: contents: write`.

  Acceptance: Pushing to `main` triggers the workflow; the app is live at `https://<user>.github.io/ronda/`.

- [ ] **TASK-22** Kiro hook for scenario validation

  Create `.kiro/hooks/validate-scenario.json` as described in the design.
  Add a `validate-scenario` npm script to `packages/engine/package.json`:
  ```
  "validate-scenario": "node scripts/validate.mjs"
  ```
  Create `packages/engine/scripts/validate.mjs` that:
  - Reads the file path from `process.env.KIRO_FILE_PATH` (or `process.argv[2]`).
  - Calls `loadScenario()` on the file content.
  - On error, prints structured messages and exits with code 1.
  - On success, prints "✓ Scenario valid" and exits 0.

  Acceptance: Saving a valid scenario JSON in Kiro prints "✓ Scenario valid" in the terminal panel; saving a broken scenario prints the field-level errors.

- [ ] **TASK-23** Write README

  Update `README.md`:
  - Project description (one paragraph).
  - Live demo URL.
  - Local development: `npm install`, `npm run dev --workspace=apps/ransomware-house`.
  - Running tests: `npm test --workspace=packages/engine`.
  - Scenario authoring: how to add/modify a scenario JSON and run validation.
  - License badge.

  Acceptance: A developer can follow the README to get the app running locally without prior knowledge of the repo.

- [ ] **TASK-24** Final integration check

  Run the full verification suite:
  1. `npm ci` from root — clean install.
  2. `npx tsc --noEmit` in both `packages/engine` and `apps/ransomware-house` — no type errors.
  3. `npm test --workspace=packages/engine -- --run` — all 7 PBTs and all unit tests green.
  4. `npm run build --workspace=apps/ransomware-house` — build succeeds.
  5. Serve `dist/` locally (e.g. `npx serve apps/ransomware-house/dist`) and play through all three endings.
  6. Check on a mobile viewport (375 px) using browser DevTools.
  7. Run print preview on the ending screen and verify checklist layout.
  8. Toggle language on every screen and verify all strings switch.

  Acceptance: All 8 checks pass. Any failures are fixed before marking the task complete.

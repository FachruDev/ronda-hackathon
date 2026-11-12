# Prompt for Kiro (Spec mode, Requirements-First)

Paste the text below into Kiro when creating a new Feature spec. Let Kiro generate `requirements.md`, `design.md` and `tasks.md`, then review and edit them before running tasks.

---

Build the MVP of **Ronda Kit**, a lean, reusable engine for branching incident-response drills ("tabletop exercises"), plus the first app built on it: **Ransomware Haunted House**, a bilingual (Indonesian/English) ransomware response drill for small businesses and small IT teams in Indonesia.

## Engine (`packages/engine`, framework-agnostic TypeScript)
- Load a scenario from JSON and validate it against a schema; reject invalid scenarios with clear error messages.
- A scenario is a directed graph: nodes belong to a "room" (incident phase: detect, isolate, communicate, recover); each non-ending node has choices; each choice has a `next` node, a `quality` (good | neutral | bad), a score delta, bilingual feedback, and a list of control IDs from a shared control catalog.
- Ending nodes have a type (safe | partial | haunted) and a bilingual summary.
- Run a session: start node → player picks choices → engine returns current node, feedback, score, and history.
- Produce an end report: final score, ending type, the set of missed controls (union of controls from bad choices taken), and a printable checklist.
- All user-facing text is an object `{ "id": string, "en": string }`.
- No UI code and no app-specific content inside the engine.

## Property-based tests (fast-check) — required
1. Every path from the start node reaches an ending within a bounded number of steps (no infinite cycles).
2. No dead ends: every non-ending node has ≥1 choice and every `next` references an existing node.
3. Every node is reachable from the start node.
4. Every `bad` choice references ≥1 control that exists in the catalog.
5. Every bilingual text has non-empty `id` and `en`.
6. Score monotonicity: replacing one bad choice with a good choice on the same node never lowers the final score.
7. The report's missed controls equal exactly the union of controls from bad choices taken.
Run these properties both on the real scenario files and on randomly generated graphs.

## App A (`apps/ransomware-house`, Vite + TypeScript, static site)
- Title screen with a one-sentence problem statement, Start button, and ID/EN toggle.
- One screen per room showing situation text and choices; after each choice show feedback; bad choices trigger a "ghost" visual effect and name the missing control.
- Ending screen + report with score, missed controls with explanations, and a "Print checklist" button using print CSS.
- Mobile-friendly, keyboard accessible, respects prefers-reduced-motion.
- Deployable to GitHub Pages with no backend.

## Out of scope for this spec
Second app (fire/chemical-spill safety drill), Kiro Crew app, accounts, analytics, any backend.

Example scenario shape (illustrative only):

```json
{
  "id": "ransomware-toko",
  "title": { "id": "Malam di Toko Sumber Rejeki", "en": "A Night at Sumber Rejeki Store" },
  "start": "detect-1",
  "nodes": {
    "detect-1": {
      "room": "detect",
      "text": { "id": "...", "en": "..." },
      "choices": [
        {
          "id": "unplug",
          "label": { "id": "Cabut kabel LAN dan matikan Wi-Fi PC itu", "en": "Unplug the PC's network cable and Wi-Fi" },
          "next": "isolate-1",
          "quality": "good",
          "score": 10,
          "controls": [],
          "feedback": { "id": "...", "en": "..." }
        }
      ]
    },
    "end-safe": {
      "room": "recover",
      "ending": { "type": "safe", "summary": { "id": "...", "en": "..." } }
    }
  }
}
```

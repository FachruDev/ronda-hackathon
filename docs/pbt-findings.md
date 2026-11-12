# What property-based testing caught

Log of real findings from the fast-check suite (`packages/engine/test/properties.test.ts`). Raw material for the Kiroween write-up.

## 1. The spec contradicted itself: whitespace-only text (12 Nov 2026)

**Setup.** `design.md` said the random scenario generator should build bilingual text with `fc.string({ minLength: 1 })`. REQ-2.6 says text that is empty *or whitespace-only* is invalid.

**What happened.** The very first generated scenario was rejected by `loadScenario`. fast-check shrank it (136 steps) to the smallest failing case: every text field is a single space.

```
Counterexample: { "title": { "id": " ", "en": " " }, ... }
ScenarioError: title.id — must not be empty or whitespace-only
```

**Fix.** The generator now uses non-blank strings (`textArbitrary` in `test/arbitraries.ts`), and `design.md` was updated. The validator was right; the design was wrong. Without PBT this would have surfaced later as a "flaky" generator or, worse, a validator loosened to match it.

## 2. Monotonicity alone does not protect the score (mutation test, 12 Nov 2026)

**Setup.** To check the suite has teeth, the engine was deliberately broken in two ways and the tests re-run.

| Mutation | Caught by |
|---|---|
| Report also counts controls from *good* choices | REQ-5.7, shrunk to a 3-node scenario with one good choice listing `offline-backup` |
| Session silently ignores the score of *bad* choices | **Nothing.** All 7 required properties stayed green. |

The second mutation only ever *raises* scores, so REQ-5.6 (swapping bad for good never lowers the score) cannot notice it. A drill that never penalises bad decisions would have shipped.

**Fix.** Added a "score accounting" property: the final score equals the sum of the chosen choices' deltas. It catches the mutation immediately, shrunk to a single bad choice worth -1.

## How to reproduce

```bash
npm test
```

Each failure prints a `seed` and `path`; pass them to `fc.assert(..., { seed, path })` to replay the exact counterexample.

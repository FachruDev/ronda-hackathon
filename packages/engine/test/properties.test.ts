/**
 * Property-based tests for REQ-5.1 .. REQ-5.7.
 *
 * Each property runs twice:
 *  - once, exhaustively, against the real scenario in `scenarios/` (skipped until the file exists);
 *  - 1000 times against randomly generated scenarios from `scenarioArbitrary`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createSession, generateReport, loadControlCatalog, loadScenario, ScenarioError } from '../src';
import type { ControlCatalog, Scenario } from '../src/types';
import { picksArbitrary, scenarioArbitrary, textArbitrary } from './arbitraries';
import { catalog as fixtureCatalog } from './fixtures';
import {
  allPaths,
  bilingualTexts,
  choicesOf,
  isEnding,
  longestPathLength,
  playPath,
  playWithPicks,
  reachableFrom,
  replaceChoice,
} from './graph';

fc.configureGlobal({ numRuns: 1000 });

// ---------------------------------------------------------------------------
// Real scenario (optional until TASK-11 / TASK-12 are done)
// ---------------------------------------------------------------------------

const scenariosDir = fileURLToPath(new URL('../../../scenarios/', import.meta.url));
const readJson = (name: string): unknown => JSON.parse(readFileSync(scenariosDir + name, 'utf8'));
const hasRealScenario = existsSync(scenariosDir + 'controls.json') && existsSync(scenariosDir + 'ransomware-toko.json');

function loadReal(): { scenario: Scenario; catalog: ControlCatalog } {
  const catalog = loadControlCatalog(readJson('controls.json'));
  return { scenario: loadScenario(readJson('ransomware-toko.json'), catalog), catalog };
}

const realIt = it.skipIf(!hasRealScenario);
if (!hasRealScenario) {
  console.info('[properties] scenarios/ransomware-toko.json or controls.json not found: real-scenario checks skipped.');
}

// ---------------------------------------------------------------------------
// Generated scenarios
// ---------------------------------------------------------------------------

const catalog = fixtureCatalog;
const generated = () => scenarioArbitrary(catalog).map((json) => loadScenario(json, catalog));

// ---------------------------------------------------------------------------
// Checks shared by the real and generated runs
// ---------------------------------------------------------------------------

const nodeCount = (s: Scenario) => Object.keys(s.nodes).length;

function checkTermination(scenario: Scenario) {
  expect(longestPathLength(scenario)).toBeLessThanOrEqual(2 * nodeCount(scenario));
}

function checkNoDeadEnds(scenario: Scenario) {
  for (const [nodeId, node] of Object.entries(scenario.nodes)) {
    if ('ending' in node) continue;
    expect(node.choices.length, `${nodeId} has no choices`).toBeGreaterThanOrEqual(1);
    for (const choice of node.choices) {
      expect(scenario.nodes, `${nodeId}.${choice.id} -> ${choice.next}`).toHaveProperty([choice.next]);
    }
  }
}

function checkReachability(scenario: Scenario) {
  const reachable = reachableFrom(scenario);
  const unreachable = Object.keys(scenario.nodes).filter((id) => !reachable.has(id));
  expect(unreachable).toEqual([]);
}

function checkBadChoicesHaveControls(scenario: Scenario, controls: ControlCatalog) {
  const known = new Set(controls.map((c) => c.id));
  for (const [nodeId, node] of Object.entries(scenario.nodes)) {
    if ('ending' in node) continue;
    for (const choice of node.choices.filter((c) => c.quality === 'bad')) {
      expect(choice.controls.length, `${nodeId}.${choice.id} has no controls`).toBeGreaterThanOrEqual(1);
      for (const id of choice.controls) expect(known.has(id), `unknown control ${id}`).toBe(true);
    }
  }
}

function checkBilingual(scenario: Scenario, controls: ControlCatalog) {
  for (const [where, text] of bilingualTexts(scenario, controls)) {
    expect(text.id.trim(), `${where}.id`).not.toBe('');
    expect(text.en.trim(), `${where}.en`).not.toBe('');
  }
}

/**
 * Plays `path`, then for every bad choice taken swaps it for each good choice
 * on the same node (keeping `id` and `next`, so the same path replays) and
 * checks the final score never goes down.
 */
function checkMonotonicity(scenario: Scenario, path: string[]) {
  const original = playPath(scenario, path);
  const history = original.getHistory();

  for (const entry of history.filter((h) => h.quality === 'bad')) {
    const choices = choicesOf(scenario, entry.nodeId);
    const bad = choices.find((c) => c.id === entry.choiceId)!;
    for (const good of choices.filter((c) => c.quality === 'good')) {
      const swapped = replaceChoice(scenario, entry.nodeId, bad.id, { ...good, id: bad.id, next: bad.next });
      const replayed = playPath(swapped, path);
      expect(
        replayed.getScore(),
        `swapping ${entry.nodeId}.${bad.id} for ${good.id} lowered the score`,
      ).toBeGreaterThanOrEqual(original.getScore());
    }
  }
}

/** Missed controls must equal the de-duplicated union of controls from bad choices, in catalog order. */
function checkReportConsistency(scenario: Scenario, controls: ControlCatalog, path: string[]) {
  const session = playPath(scenario, path);
  const report = generateReport(session, controls);

  const expected = new Set<string>();
  path.reduce((nodeId, choiceId) => {
    const choice = choicesOf(scenario, nodeId).find((c) => c.id === choiceId)!;
    if (choice.quality === 'bad') choice.controls.forEach((id) => expected.add(id));
    return choice.next;
  }, scenario.start);

  expect(report.missedControls.map((c) => c.id)).toEqual(controls.map((c) => c.id).filter((id) => expected.has(id)));
  expect(report.checklistItems.map((i) => i.controlId)).toEqual(report.missedControls.map((c) => c.id));
}

/** Turns arbitrary picks into a complete path of choice IDs. */
function pathFromPicks(scenario: Scenario, picks: number[]): string[] {
  const session = playWithPicks(scenario, picks, 2 * nodeCount(scenario));
  expect(session.isEnded()).toBe(true);
  return session.getHistory().map((h) => h.choiceId);
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe('generator (TASK-9)', () => {
  it('only produces scenarios that loadScenario accepts', () => {
    fc.assert(
      fc.property(scenarioArbitrary(catalog), (json) => {
        loadScenario(json, catalog);
      }),
    );
  });
});

describe('REQ-5.1 termination', () => {
  realIt('real scenario: every path ends within 2 x |nodes| steps', () => {
    const { scenario } = loadReal();
    checkTermination(scenario);
    for (const path of allPaths(scenario)) {
      expect(isEnding(scenario, playPath(scenario, path).currentNodeId())).toBe(true);
    }
  });

  it('generated: longest path is bounded and any play-through ends', () => {
    fc.assert(
      fc.property(generated(), picksArbitrary(), (scenario, picks) => {
        checkTermination(scenario);
        const session = playWithPicks(scenario, picks, 2 * nodeCount(scenario));
        expect(session.isEnded()).toBe(true);
      }),
    );
  });
});

describe('REQ-5.2 no dead ends', () => {
  realIt('real scenario', () => checkNoDeadEnds(loadReal().scenario));

  it('generated', () => {
    fc.assert(fc.property(generated(), (scenario) => checkNoDeadEnds(scenario)));
  });
});

describe('REQ-5.3 full reachability', () => {
  realIt('real scenario', () => checkReachability(loadReal().scenario));

  it('generated', () => {
    fc.assert(fc.property(generated(), (scenario) => checkReachability(scenario)));
  });
});

describe('REQ-5.4 bad choices reference valid controls', () => {
  realIt('real scenario', () => {
    const { scenario, catalog: real } = loadReal();
    checkBadChoicesHaveControls(scenario, real);
  });

  it('generated', () => {
    fc.assert(fc.property(generated(), (scenario) => checkBadChoicesHaveControls(scenario, catalog)));
  });
});

describe('REQ-5.5 bilingual completeness', () => {
  realIt('real scenario and catalog', () => {
    const { scenario, catalog: real } = loadReal();
    checkBilingual(scenario, real);
  });

  it('generated', () => {
    fc.assert(fc.property(generated(), (scenario) => checkBilingual(scenario, catalog)));
  });
});

describe('REQ-5.6 score monotonicity', () => {
  realIt('real scenario: every path, every bad choice', () => {
    const { scenario } = loadReal();
    for (const path of allPaths(scenario)) checkMonotonicity(scenario, path);
  });

  it('generated', () => {
    fc.assert(
      fc.property(generated(), picksArbitrary(), (scenario, picks) => {
        checkMonotonicity(scenario, pathFromPicks(scenario, picks));
      }),
    );
  });
});

/**
 * Not in the original spec. Added after a mutation test showed REQ-5.6 alone
 * does not notice a session that silently drops bad-choice scores.
 */
describe('score accounting', () => {
  const sumOfDeltas = (scenario: Scenario, path: string[]) =>
    path.reduce(
      ({ nodeId, total }, choiceId) => {
        const choice = choicesOf(scenario, nodeId).find((c) => c.id === choiceId)!;
        return { nodeId: choice.next, total: total + choice.score };
      },
      { nodeId: scenario.start, total: 0 },
    ).total;

  realIt('real scenario: every path', () => {
    const { scenario } = loadReal();
    for (const path of allPaths(scenario)) {
      expect(playPath(scenario, path).getScore()).toBe(sumOfDeltas(scenario, path));
    }
  });

  it('generated: final score equals the sum of the chosen deltas', () => {
    fc.assert(
      fc.property(generated(), picksArbitrary(), (scenario, picks) => {
        const path = pathFromPicks(scenario, picks);
        expect(playPath(scenario, path).getScore()).toBe(sumOfDeltas(scenario, path));
      }),
    );
  });
});

describe('REQ-5.7 report consistency', () => {
  realIt('real scenario: every path', () => {
    const { scenario, catalog: real } = loadReal();
    for (const path of allPaths(scenario)) checkReportConsistency(scenario, real, path);
  });

  it('generated', () => {
    fc.assert(
      fc.property(generated(), picksArbitrary(), (scenario, picks) => {
        checkReportConsistency(scenario, catalog, pathFromPicks(scenario, picks));
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// The validator must catch broken content, not just accept good content.
// ---------------------------------------------------------------------------

type RawScenario = { start: string; nodes: Record<string, { choices?: Record<string, unknown>[] } & Record<string, unknown>> };

/** Picks a random choice in a generated raw scenario and lets `mutate` break it. */
function mutatedScenario(mutate: (choice: Record<string, unknown>) => void) {
  return fc.tuple(scenarioArbitrary(catalog), fc.nat(), fc.nat()).map(([json, a, b]) => {
    const raw = structuredClone(json) as unknown as RawScenario;
    const nodesWithChoices = Object.values(raw.nodes).filter((n) => n.choices);
    const node = nodesWithChoices[a % nodesWithChoices.length]!;
    const choice = node.choices![b % node.choices!.length]!;
    mutate(choice);
    return raw;
  });
}

function expectRejected(json: unknown) {
  expect(() => loadScenario(json, catalog)).toThrow(ScenarioError);
}

describe('validator rejects broken scenarios', () => {
  it('a choice pointing to a missing node', () => {
    fc.assert(fc.property(mutatedScenario((c) => (c.next = 'missing-node')), expectRejected));
  });

  it('a bad choice without controls', () => {
    fc.assert(
      fc.property(
        mutatedScenario((c) => {
          c.quality = 'bad';
          c.controls = [];
        }),
        expectRejected,
      ),
    );
  });

  it('a control that is not in the catalog', () => {
    fc.assert(fc.property(mutatedScenario((c) => (c.controls = ['not-in-catalog'])), expectRejected));
  });

  it('whitespace-only text', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(' ', '\t', '\n', '   '),
        fc.constantFrom('id', 'en'),
        (blank, lang) => {
          fc.assert(
            fc.property(
              mutatedScenario((c) => ((c.label as Record<string, string>)[lang] = blank)),
              expectRejected,
            ),
            { numRuns: 20 },
          );
        },
      ),
      { numRuns: 8 },
    );
  });

  it('accepts any non-blank text (no false rejections)', () => {
    fc.assert(
      fc.property(textArbitrary(), (text) => {
        const s = createSession(
          loadScenario(
            {
              id: 'x',
              title: { id: text, en: text },
              start: 'a',
              nodes: { a: { room: 'detect', ending: { type: 'safe', summary: { id: text, en: text } } } },
            },
            catalog,
          ),
        );
        expect(s.isEnded()).toBe(true);
      }),
    );
  });
});

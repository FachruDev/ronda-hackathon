import fc from 'fast-check';
import type { BilingualText, ChoiceQuality, ControlCatalog, Room } from '../src/types';

/** Score ranges per quality. Every good score is >= every bad score (REQ-5.6). */
export const SCORE_RANGES: Record<ChoiceQuality, { min: number; max: number }> = {
  good: { min: 1, max: 20 },
  neutral: { min: -5, max: 5 },
  bad: { min: -20, max: 0 },
};

const ROOMS: Room[] = ['detect', 'isolate', 'communicate', 'recover'];

/** Non-empty text that is not whitespace-only (REQ-2.6). */
export const textArbitrary = () => fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0);

export const bilingualArbitrary = (): fc.Arbitrary<BilingualText> =>
  fc.record({ id: textArbitrary(), en: textArbitrary() });

const choiceArbitrary = (choiceId: string, next: string, controlIds: string[]) =>
  fc.constantFrom<ChoiceQuality>('good', 'neutral', 'bad').chain((quality) =>
    fc.record({
      id: fc.constant(choiceId),
      label: bilingualArbitrary(),
      next: fc.constant(next),
      quality: fc.constant(quality),
      score: fc.integer(SCORE_RANGES[quality]),
      controls:
        quality === 'bad'
          ? fc.subarray(controlIds, { minLength: 1 })
          : fc.subarray(controlIds),
      feedback: bilingualArbitrary(),
    }),
  );

/**
 * Generates a valid scenario as raw JSON (the shape `loadScenario` accepts).
 *
 * Nodes are laid out in creation order: endings first, then non-ending nodes,
 * with the start node created last. A choice may only point to an earlier
 * node, so the graph is a DAG. Reachability is guaranteed by construction:
 * every non-ending node links to the node created just before it, and the
 * first non-ending node links to every ending.
 */
export function scenarioArbitrary(catalog: ControlCatalog) {
  const controlIds = catalog.map((c) => c.id);

  return fc
    .record({
      endingCount: fc.integer({ min: 1, max: 3 }),
      // Non-ending nodes, including the start node.
      nonEndingCount: fc.integer({ min: 3, max: 11 }),
    })
    .chain(({ endingCount, nonEndingCount }) => {
      const ids = [
        ...Array.from({ length: endingCount }, (_, k) => `end-${k}`),
        ...Array.from({ length: nonEndingCount }, (_, j) => `node-${j}`),
      ];

      const endings = Array.from({ length: endingCount }, (_, k) =>
        fc.record({
          room: fc.constantFrom(...ROOMS),
          ending: fc.record({
            type: fc.constantFrom('safe' as const, 'partial' as const, 'haunted' as const),
            summary: bilingualArbitrary(),
          }),
        }).map((node) => [ids[k]!, node] as const),
      );

      const nonEndings = Array.from({ length: nonEndingCount }, (_, j) => {
        const index = endingCount + j;
        const forced = j === 0 ? ids.slice(0, endingCount) : [ids[index - 1]!];
        const extra = fc.array(fc.integer({ min: 0, max: index - 1 }), {
          maxLength: Math.max(0, 4 - forced.length),
        });

        return extra.chain((extraTargets) => {
          const targets = [...forced, ...extraTargets.map((i) => ids[i]!)];
          return fc
            .record({
              room: fc.constantFrom(...ROOMS),
              text: bilingualArbitrary(),
              choices: fc.tuple(...targets.map((next, c) => choiceArbitrary(`choice-${c}`, next, controlIds))),
            })
            .map((node) => [ids[index]!, node] as const);
        });
      });

      return fc.tuple(bilingualArbitrary(), ...endings, ...nonEndings).map(([title, ...entries]) => ({
        id: 'generated',
        title,
        start: ids[ids.length - 1]!,
        nodes: Object.fromEntries(entries as (readonly [string, unknown])[]),
      }));
    });
}

/** A list of choice picks used to walk a scenario; each pick is taken modulo the number of choices. */
export const picksArbitrary = () => fc.array(fc.nat(), { minLength: 1, maxLength: 30 });

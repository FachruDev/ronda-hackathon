/**
 * Independent graph helpers used by the property tests. They deliberately do
 * not reuse engine internals, so a bug in the engine cannot hide itself.
 */
import { createSession } from '../src/session';
import type { BilingualText, Choice, ControlCatalog, Scenario, Session } from '../src/types';

export function choicesOf(scenario: Scenario, nodeId: string): Choice[] {
  const node = scenario.nodes[nodeId];
  return node && 'choices' in node ? node.choices : [];
}

export function isEnding(scenario: Scenario, nodeId: string): boolean {
  const node = scenario.nodes[nodeId];
  return node !== undefined && 'ending' in node;
}

/** Node IDs reachable from the start node (BFS). */
export function reachableFrom(scenario: Scenario, start = scenario.start): Set<string> {
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const choice of choicesOf(scenario, id)) {
      if (!seen.has(choice.next)) {
        seen.add(choice.next);
        queue.push(choice.next);
      }
    }
  }
  return seen;
}

/**
 * Length (in choices) of the longest path from the start node, or `Infinity`
 * if a cycle is reachable.
 */
export function longestPathLength(scenario: Scenario): number {
  const memo = new Map<string, number>();
  const onStack = new Set<string>();

  const visit = (id: string): number => {
    if (onStack.has(id)) return Infinity;
    const cached = memo.get(id);
    if (cached !== undefined) return cached;

    onStack.add(id);
    let longest = 0;
    for (const choice of choicesOf(scenario, id)) {
      longest = Math.max(longest, 1 + visit(choice.next));
    }
    onStack.delete(id);
    memo.set(id, longest);
    return longest;
  };

  return visit(scenario.start);
}

/** Every complete sequence of choice IDs from start to an ending. Assumes the graph is acyclic. */
export function allPaths(scenario: Scenario): string[][] {
  const paths: string[][] = [];
  const walk = (id: string, path: string[]) => {
    if (isEnding(scenario, id)) {
      paths.push(path);
      return;
    }
    for (const choice of choicesOf(scenario, id)) walk(choice.next, [...path, choice.id]);
  };
  walk(scenario.start, []);
  return paths;
}

/** Plays a scenario using `picks` (each modulo the number of choices) until it ends or `maxSteps` is hit. */
export function playWithPicks(scenario: Scenario, picks: number[], maxSteps: number): Session {
  const session = createSession(scenario);
  for (let step = 0; step < maxSteps && !session.isEnded(); step++) {
    const choices = choicesOf(scenario, session.currentNodeId());
    const pick = picks[step % picks.length]!;
    session.choose(choices[pick % choices.length]!.id);
  }
  return session;
}

/** Plays a fixed list of choice IDs. */
export function playPath(scenario: Scenario, path: string[]): Session {
  const session = createSession(scenario);
  path.forEach((choiceId) => session.choose(choiceId));
  return session;
}

/** Every bilingual text in a scenario and catalog, with a readable location. */
export function bilingualTexts(scenario: Scenario, catalog: ControlCatalog): [string, BilingualText][] {
  const out: [string, BilingualText][] = [['title', scenario.title]];
  for (const [nodeId, node] of Object.entries(scenario.nodes)) {
    if ('ending' in node) {
      out.push([`nodes.${nodeId}.ending.summary`, node.ending.summary]);
      continue;
    }
    out.push([`nodes.${nodeId}.text`, node.text]);
    node.choices.forEach((c, i) => {
      out.push([`nodes.${nodeId}.choices.${i}.label`, c.label]);
      out.push([`nodes.${nodeId}.choices.${i}.feedback`, c.feedback]);
    });
  }
  catalog.forEach((control, i) => {
    out.push([`catalog.${i}.name`, control.name]);
    out.push([`catalog.${i}.description`, control.description]);
  });
  return out;
}

/** A deep copy of the scenario where one choice is replaced. */
export function replaceChoice(scenario: Scenario, nodeId: string, choiceId: string, replacement: Choice): Scenario {
  const copy: Scenario = structuredClone(scenario);
  const node = copy.nodes[nodeId];
  if (!node || !('choices' in node)) throw new Error(`no choices on ${nodeId}`);
  node.choices = node.choices.map((c) => (c.id === choiceId ? replacement : c));
  return copy;
}

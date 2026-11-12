import {
  SessionError,
  isEndingNode,
  type ChoiceResult,
  type HistoryEntry,
  type Scenario,
  type ScenarioNode,
  type Session,
} from './types';

function getNode(scenario: Scenario, nodeId: string): ScenarioNode {
  const node = scenario.nodes[nodeId];
  if (!node) {
    throw new SessionError(`Unknown node "${nodeId}"`, [{ path: 'nodeId', message: 'not in scenario' }]);
  }
  return node;
}

/** Starts a new play-through at the scenario's start node with score 0. */
export function createSession(scenario: Scenario): Session {
  let currentNodeId = scenario.start;
  let score = 0;
  let ended = isEndingNode(getNode(scenario, currentNodeId));
  const history: HistoryEntry[] = [];

  return {
    scenario,

    currentNodeId: () => currentNodeId,

    currentNode: () => getNode(scenario, currentNodeId),

    isEnded: () => ended,

    getScore: () => score,

    getHistory: () => history.map((entry) => ({ ...entry, controls: [...entry.controls] })),

    choose(choiceId: string): ChoiceResult {
      if (ended) {
        throw new SessionError('The session has already ended', [{ path: 'choiceId', message: 'session ended' }]);
      }

      const node = getNode(scenario, currentNodeId);
      const choice = isEndingNode(node) ? undefined : node.choices.find((c) => c.id === choiceId);
      if (!choice) {
        throw new SessionError(`Choice "${choiceId}" is not available on node "${currentNodeId}"`, [
          { path: 'choiceId', message: 'not on current node' },
        ]);
      }

      const nextNode = getNode(scenario, choice.next);

      history.push({
        nodeId: currentNodeId,
        choiceId: choice.id,
        quality: choice.quality,
        controls: [...choice.controls],
      });
      score += choice.score;
      currentNodeId = choice.next;
      ended = isEndingNode(nextNode);

      return {
        choice,
        feedback: choice.feedback,
        scoreDelta: choice.score,
        totalScore: score,
        nextNode,
        isEnded: ended,
      };
    },
  };
}

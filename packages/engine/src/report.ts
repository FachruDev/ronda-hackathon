import { SessionError, isEndingNode, type ControlCatalog, type Report, type Session } from './types';

/**
 * Builds the end-of-drill report: final score, ending, and the controls the
 * player missed (from bad choices taken), de-duplicated and in catalog order.
 */
export function generateReport(session: Session, catalog: ControlCatalog): Report {
  const node = session.currentNode();
  if (!session.isEnded() || !isEndingNode(node)) {
    throw new SessionError('Cannot generate a report before the session has ended');
  }

  const missedIds = new Set(
    session
      .getHistory()
      .filter((entry) => entry.quality === 'bad')
      .flatMap((entry) => entry.controls),
  );

  const missedControls = catalog.filter((control) => missedIds.has(control.id));

  return {
    finalScore: session.getScore(),
    endingType: node.ending.type,
    endingSummary: node.ending.summary,
    missedControls,
    checklistItems: missedControls.map((control) => ({
      controlId: control.id,
      name: control.name,
      description: control.description,
    })),
  };
}

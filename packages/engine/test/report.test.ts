import { describe, expect, it } from 'vitest';
import { createSession, generateReport, loadScenario, SessionError } from '../src';
import { catalog, makeScenarioJson } from './fixtures';

const play = (...choices: string[]) => {
  const s = createSession(loadScenario(makeScenarioJson(), catalog));
  choices.forEach((c) => s.choose(c));
  return s;
};

describe('generateReport', () => {
  it('has no missed controls when no bad choices were taken', () => {
    const r = generateReport(play('unplug', 'restore'), catalog);
    expect(r).toMatchObject({ finalScore: 20, endingType: 'safe', missedControls: [], checklistItems: [] });
    expect(r.endingSummary.en).toBe('Safe.');
  });

  it('ignores controls listed on good choices', () => {
    // "restore" is good but lists offline-backup; it must not count as missed.
    expect(generateReport(play('unplug', 'restore'), catalog).missedControls).toEqual([]);
  });

  it('lists the controls of one bad choice', () => {
    const r = generateReport(play('unplug', 'tool'), catalog);
    expect(r.endingType).toBe('haunted');
    expect(r.missedControls.map((c) => c.id)).toEqual(['offline-backup', 'network-isolation']);
  });

  it('de-duplicates overlapping controls and keeps catalog order', () => {
    const r = generateReport(play('pay', 'tool'), catalog);
    expect(r.finalScore).toBe(-15);
    expect(r.missedControls.map((c) => c.id)).toEqual(['offline-backup', 'mfa', 'network-isolation']);
    expect(r.checklistItems).toEqual(
      catalog.map((c) => ({ controlId: c.id, name: c.name, description: c.description })),
    );
  });

  it('throws on an unfinished session', () => {
    expect(() => generateReport(play('unplug'), catalog)).toThrow(SessionError);
  });
});

import { describe, expect, it } from 'vitest';
import { createSession, loadScenario, SessionError } from '../src';
import { catalog, makeScenarioJson } from './fixtures';

const scenario = () => loadScenario(makeScenarioJson(), catalog);

describe('createSession', () => {
  it('starts at the start node with score 0 and empty history', () => {
    const s = createSession(scenario());
    expect(s.currentNodeId()).toBe('start');
    expect(s.getScore()).toBe(0);
    expect(s.getHistory()).toEqual([]);
    expect(s.isEnded()).toBe(false);
  });

  it('applies a good choice', () => {
    const s = createSession(scenario());
    const r = s.choose('unplug');
    expect(r).toMatchObject({ scoreDelta: 10, totalScore: 10, isEnded: false, feedback: { en: 'Good.' } });
    expect(s.currentNodeId()).toBe('mid');
  });

  it('applies a bad choice and records its controls', () => {
    const s = createSession(scenario());
    const r = s.choose('pay');
    expect(r.totalScore).toBe(-10);
    expect(s.getHistory()).toEqual([
      { nodeId: 'start', choiceId: 'pay', quality: 'bad', controls: ['offline-backup', 'mfa'] },
    ]);
  });

  it('reaches an ending', () => {
    const s = createSession(scenario());
    s.choose('unplug');
    const r = s.choose('restore');
    expect(r.isEnded).toBe(true);
    expect(s.isEnded()).toBe(true);
    expect(s.currentNodeId()).toBe('end-safe');
  });

  it('throws when choosing after the session ended', () => {
    const s = createSession(scenario());
    s.choose('wait');
    expect(() => s.choose('unplug')).toThrow(SessionError);
  });

  it('throws on a choice that is not on the current node and leaves state unchanged', () => {
    const s = createSession(scenario());
    expect(() => s.choose('restore')).toThrow(SessionError);
    expect(s.getScore()).toBe(0);
    expect(s.getHistory()).toEqual([]);
  });

  it('keeps history in order and returns a copy', () => {
    const s = createSession(scenario());
    s.choose('pay');
    s.choose('tool');
    const history = s.getHistory();
    expect(history.map((h) => h.choiceId)).toEqual(['pay', 'tool']);
    history[0]!.controls.push('tampered');
    history.pop();
    expect(s.getHistory()).toHaveLength(2);
    expect(s.getHistory()[0]!.controls).toEqual(['offline-backup', 'mfa']);
  });
});

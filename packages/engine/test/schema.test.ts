import { describe, expect, it } from 'vitest';
import { loadControlCatalog, loadScenario, ScenarioError } from '../src';
import { catalog, makeScenarioJson } from './fixtures';

function errorsOf(fn: () => unknown) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(ScenarioError);
    return (e as ScenarioError).fields;
  }
  throw new Error('expected ScenarioError');
}

describe('loadScenario', () => {
  it('accepts a valid scenario', () => {
    const scenario = loadScenario(makeScenarioJson(), catalog);
    expect(scenario.start).toBe('start');
    expect(Object.keys(scenario.nodes)).toHaveLength(5);
  });

  it('rejects non-objects', () => {
    expect(errorsOf(() => loadScenario(null, catalog)).length).toBeGreaterThan(0);
  });

  it('reports a missing required field with its path', () => {
    const json = makeScenarioJson();
    const choice: Record<string, unknown> = json.nodes.start.choices[0]!;
    delete choice.feedback;
    expect(errorsOf(() => loadScenario(json, catalog))).toContainEqual(
      expect.objectContaining({ path: 'nodes.start.choices.0.feedback' }),
    );
  });

  it('rejects whitespace-only bilingual text', () => {
    const json = makeScenarioJson();
    json.title.en = '   ';
    expect(errorsOf(() => loadScenario(json, catalog))).toContainEqual(expect.objectContaining({ path: 'title.en' }));
  });

  it('rejects a bad choice without controls', () => {
    const json = makeScenarioJson();
    json.nodes.start.choices[1]!.controls = [];
    expect(errorsOf(() => loadScenario(json, catalog))).toContainEqual(
      expect.objectContaining({ path: 'nodes.start.choices.1.controls' }),
    );
  });

  it('rejects a non-ending node without choices', () => {
    const json = makeScenarioJson();
    json.nodes.mid.choices = [];
    expect(errorsOf(() => loadScenario(json, catalog))).toContainEqual(
      expect.objectContaining({ path: 'nodes.mid.choices' }),
    );
  });

  it('rejects an invalid room', () => {
    const json = makeScenarioJson();
    json.nodes.mid.room = 'kitchen';
    expect(errorsOf(() => loadScenario(json, catalog))).toContainEqual(
      expect.objectContaining({ path: 'nodes.mid.room' }),
    );
  });

  it('rejects unknown fields (typos)', () => {
    const json = { ...makeScenarioJson(), titel: 'oops' };
    expect(errorsOf(() => loadScenario(json, catalog)).length).toBeGreaterThan(0);
  });

  it('reports an unknown control id', () => {
    const json = makeScenarioJson();
    json.nodes.start.choices[1]!.controls = ['offline-backup', 'no-such-control'];
    expect(errorsOf(() => loadScenario(json, catalog))).toEqual([
      { path: 'nodes.start.choices.1.controls.1', message: 'unknown control "no-such-control"' },
    ]);
  });

  it('reports an unknown next node and an unknown start', () => {
    const json = makeScenarioJson();
    json.start = 'nowhere';
    json.nodes.mid.choices[0]!.next = 'void';
    const fields = errorsOf(() => loadScenario(json, catalog));
    expect(fields).toContainEqual({ path: 'start', message: 'unknown node "nowhere"' });
    expect(fields).toContainEqual({ path: 'nodes.mid.choices.0.next', message: 'unknown node "void"' });
  });

  it('reports duplicate choice ids within a node', () => {
    const json = makeScenarioJson();
    json.nodes.start.choices[2]!.id = 'unplug';
    expect(errorsOf(() => loadScenario(json, catalog))).toContainEqual(
      expect.objectContaining({ path: 'nodes.start.choices.2.id' }),
    );
  });
});

describe('loadControlCatalog', () => {
  it('accepts a valid catalog', () => {
    expect(loadControlCatalog(catalog)).toHaveLength(3);
  });

  it('rejects duplicate ids', () => {
    expect(errorsOf(() => loadControlCatalog([...catalog, catalog[0]]))).toContainEqual(
      expect.objectContaining({ path: '3.id' }),
    );
  });
});

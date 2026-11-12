import { describe, expect, it } from 'vitest';
import * as engine from '@ronda/engine';

describe('public API', () => {
  it('resolves through the package name', () => {
    expect(typeof engine.loadScenario).toBe('function');
    expect(typeof engine.loadControlCatalog).toBe('function');
    expect(typeof engine.createSession).toBe('function');
    expect(typeof engine.generateReport).toBe('function');
    expect(new engine.ScenarioError('x')).toBeInstanceOf(Error);
  });
});

/**
 * Content rules for the real scenario (REQ-6). These are specific to
 * `ransomware-toko.json`, unlike the universal properties in properties.test.ts.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createSession, generateReport, loadControlCatalog, loadScenario } from '../src';
import type { Room } from '../src/types';
import { allPaths, choicesOf, playPath } from './graph';

const dir = fileURLToPath(new URL('../../../scenarios/', import.meta.url));
const read = (name: string): unknown => JSON.parse(readFileSync(dir + name, 'utf8'));

const catalog = loadControlCatalog(read('controls.json'));
const scenario = loadScenario(read('ransomware-toko.json'), catalog);
const nodes = Object.entries(scenario.nodes);
const ROOM_ORDER: Room[] = ['detect', 'isolate', 'communicate', 'recover'];

describe('control catalog (REQ-3)', () => {
  it('has the ten required controls', () => {
    expect(catalog.map((c) => c.id)).toEqual(
      expect.arrayContaining([
        'offline-backup',
        'mfa',
        'network-isolation',
        'evidence-preservation',
        'clean-device-password-change',
        'incident-log',
        'vendor-contact',
        'customer-notification',
        'verified-recovery-tools',
        'account-audit',
      ]),
    );
  });

  it('every control is taught by at least one bad choice', () => {
    const taught = new Set(
      nodes.flatMap(([id]) => choicesOf(scenario, id).filter((c) => c.quality === 'bad').flatMap((c) => c.controls)),
    );
    expect(catalog.map((c) => c.id).filter((id) => !taught.has(id))).toEqual([]);
  });
});

describe('ransomware-toko scenario (REQ-6)', () => {
  it('has 10 to 14 nodes (REQ-6.2)', () => {
    expect(nodes.length).toBeGreaterThanOrEqual(10);
    expect(nodes.length).toBeLessThanOrEqual(14);
  });

  it('has exactly one safe, one partial and one haunted ending (REQ-6.3)', () => {
    const types = nodes.flatMap(([, n]) => ('ending' in n ? [n.ending.type] : [])).sort();
    expect(types).toEqual(['haunted', 'partial', 'safe']);
  });

  it('offers 2 to 4 choices on every non-ending node (REQ-6.4)', () => {
    for (const [id, node] of nodes) {
      if ('ending' in node) continue;
      expect(node.choices.length, id).toBeGreaterThanOrEqual(2);
      expect(node.choices.length, id).toBeLessThanOrEqual(4);
    }
  });

  it('gives every detect/isolate/communicate node at least one good and one bad choice (REQ-6.4)', () => {
    for (const [id, node] of nodes) {
      if ('ending' in node || node.room === 'recover') continue;
      const qualities = node.choices.map((c) => c.quality);
      expect(qualities, id).toContain('good');
      expect(qualities, id).toContain('bad');
    }
  });

  it('visits rooms in order detect -> isolate -> communicate -> recover on every path (REQ-6.2)', () => {
    for (const path of allPaths(scenario)) {
      let nodeId = scenario.start;
      const rooms: Room[] = [scenario.nodes[nodeId]!.room];
      for (const choiceId of path) {
        nodeId = choicesOf(scenario, nodeId).find((c) => c.id === choiceId)!.next;
        rooms.push(scenario.nodes[nodeId]!.room);
      }
      const order = rooms.map((r) => ROOM_ORDER.indexOf(r));
      expect(order, path.join(' > ')).toEqual([...order].sort((a, b) => a - b));
      expect(new Set(rooms), path.join(' > ')).toEqual(new Set(ROOM_ORDER));
    }
  });

  it('can reach every ending, and the safe ending only without bad choices along the way', () => {
    const reached = new Map<string, number>();
    for (const path of allPaths(scenario)) {
      const report = generateReport(playPath(scenario, path), catalog);
      reached.set(report.endingType, (reached.get(report.endingType) ?? 0) + 1);
    }
    expect([...reached.keys()].sort()).toEqual(['haunted', 'partial', 'safe']);

    const best = createSession(scenario);
    ['unplug', 'disconnect-nas', 'clean-device', 'log-and-evidence', 'restore-properly'].forEach((c) => best.choose(c));
    expect(generateReport(best, catalog)).toMatchObject({ endingType: 'safe', missedControls: [] });
  });

  it('keeps a play-through short: 4 to 6 decisions (3-5 minute session)', () => {
    for (const path of allPaths(scenario)) {
      expect(path.length).toBeGreaterThanOrEqual(4);
      expect(path.length).toBeLessThanOrEqual(6);
    }
  });
});

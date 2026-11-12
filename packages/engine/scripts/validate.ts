/**
 * Validates scenario files: schema + references (loadScenario), then graph
 * rules that a schema cannot express (no cycles, every node reachable).
 *
 * Usage:
 *   npm run validate-scenario                       # every scenario in scenarios/
 *   npm run validate-scenario -- scenarios/foo.json # one file
 * The file can also come from KIRO_FILE_PATH. Paths are resolved against the
 * directory npm was started from, so repo-root-relative paths work.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadControlCatalog, loadScenario, ScenarioError, type FieldError } from '../src';
import { longestPathLength, reachableFrom } from '../test/graph';

const scenariosDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../scenarios');
const cwd = process.env.INIT_CWD ?? process.cwd();
const CATALOG = 'controls.json';

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function printErrors(file: string, fields: FieldError[]) {
  console.error(`✗ ${file}`);
  for (const f of fields) console.error(`    ${f.path}: ${f.message}`);
}

function validateScenario(path: string, catalog: ReturnType<typeof loadControlCatalog>): FieldError[] {
  const scenario = loadScenario(readJson(path), catalog);
  const errors: FieldError[] = [];

  const reachable = reachableFrom(scenario);
  for (const id of Object.keys(scenario.nodes)) {
    if (!reachable.has(id)) errors.push({ path: `nodes.${id}`, message: 'not reachable from start' });
  }

  const longest = longestPathLength(scenario);
  if (longest === Infinity) {
    errors.push({ path: 'nodes', message: 'a cycle is reachable from start, so a play-through may never end' });
  }
  return errors;
}

function main(): number {
  const arg = process.argv[2] ?? process.env.KIRO_FILE_PATH;
  const targets = arg
    ? [resolve(cwd, arg)]
    : readdirSync(scenariosDir)
        .filter((f) => f.endsWith('.json') && f !== CATALOG)
        .map((f) => join(scenariosDir, f));

  let catalog;
  try {
    catalog = loadControlCatalog(readJson(join(scenariosDir, CATALOG)));
  } catch (error) {
    printErrors(CATALOG, error instanceof ScenarioError ? error.fields : [{ path: '(file)', message: String(error) }]);
    return 1;
  }

  let failed = 0;
  for (const path of targets) {
    const name = basename(path);
    if (name === CATALOG) {
      console.log(`✓ ${name}: control catalog valid (${catalog.length} controls)`);
      continue;
    }
    try {
      const errors = validateScenario(path, catalog);
      if (errors.length > 0) {
        failed++;
        printErrors(name, errors);
      } else {
        console.log(`✓ ${name}: scenario valid`);
      }
    } catch (error) {
      failed++;
      printErrors(name, error instanceof ScenarioError ? error.fields : [{ path: '(file)', message: String(error) }]);
    }
  }
  return failed > 0 ? 1 : 0;
}

process.exit(main());

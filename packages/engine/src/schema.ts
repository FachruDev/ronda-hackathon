import { z } from 'zod';
import {
  ScenarioError,
  type Control,
  type ControlCatalog,
  type EndingNode,
  type FieldError,
  type NonEndingNode,
  type Scenario,
  type ScenarioNode,
} from './types';

const nonBlank = z
  .string({ error: 'must be a string' })
  .refine((s) => s.trim().length > 0, { error: 'must not be empty or whitespace-only' });

export const bilingualTextSchema = z.strictObject({ id: nonBlank, en: nonBlank });

export const roomSchema = z.enum(['detect', 'isolate', 'communicate', 'recover']);
export const choiceQualitySchema = z.enum(['good', 'neutral', 'bad']);
export const endingTypeSchema = z.enum(['safe', 'partial', 'haunted']);

export const choiceSchema = z
  .strictObject({
    id: nonBlank,
    label: bilingualTextSchema,
    next: nonBlank,
    quality: choiceQualitySchema,
    score: z.number().finite(),
    controls: z.array(nonBlank),
    feedback: bilingualTextSchema,
  })
  .refine((c) => c.quality !== 'bad' || c.controls.length > 0, {
    error: 'a bad choice must reference at least one control',
    path: ['controls'],
  });

export const nonEndingNodeSchema = z.strictObject({
  room: roomSchema,
  text: bilingualTextSchema,
  choices: z.array(choiceSchema).min(1, { error: 'a non-ending node needs at least one choice' }),
});

export const endingNodeSchema = z.strictObject({
  room: roomSchema,
  ending: z.strictObject({
    type: endingTypeSchema,
    summary: bilingualTextSchema,
  }),
});

const scenarioShellSchema = z.strictObject({
  id: nonBlank,
  title: bilingualTextSchema,
  start: nonBlank,
  nodes: z.record(z.string(), z.unknown()).refine((n) => Object.keys(n).length > 0, {
    error: 'a scenario needs at least one node',
  }),
});

export const controlSchema = z.strictObject({
  id: nonBlank,
  name: bilingualTextSchema,
  description: bilingualTextSchema,
});

export const controlCatalogSchema = z.array(controlSchema);

function toFieldErrors(error: z.ZodError, prefix: (string | number)[] = []): FieldError[] {
  return error.issues.map((issue) => ({
    path: formatPath([...prefix, ...issue.path.map((p) => (typeof p === 'symbol' ? String(p) : p))]),
    message: issue.message,
  }));
}

function formatPath(path: (string | number)[]): string {
  return path.length === 0 ? '(root)' : path.join('.');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates a control catalog (a JSON array of controls) and returns it typed.
 * Control IDs must be unique.
 */
export function loadControlCatalog(json: unknown): ControlCatalog {
  const parsed = controlCatalogSchema.safeParse(json);
  if (!parsed.success) {
    throw new ScenarioError('Invalid control catalog', toFieldErrors(parsed.error));
  }

  const errors: FieldError[] = [];
  const seen = new Set<string>();
  parsed.data.forEach((control, index) => {
    if (seen.has(control.id)) {
      errors.push({ path: formatPath([index, 'id']), message: `duplicate control id "${control.id}"` });
    }
    seen.add(control.id);
  });
  if (errors.length > 0) {
    throw new ScenarioError('Invalid control catalog', errors);
  }

  return parsed.data satisfies Control[];
}

/**
 * Validates a scenario against the schema (pass 1) and checks references to
 * nodes and catalog controls (pass 2). Throws a `ScenarioError` listing every
 * problem found; returns the typed scenario on success.
 */
export function loadScenario(json: unknown, catalog: ControlCatalog): Scenario {
  // Pass 1: structure.
  const shell = scenarioShellSchema.safeParse(json);
  if (!shell.success) {
    throw new ScenarioError('Invalid scenario', toFieldErrors(shell.error));
  }

  const errors: FieldError[] = [];
  const nodes: Record<string, ScenarioNode> = {};

  for (const [nodeId, rawNode] of Object.entries(shell.data.nodes)) {
    const prefix = ['nodes', nodeId];
    const schema = isRecord(rawNode) && 'ending' in rawNode ? endingNodeSchema : nonEndingNodeSchema;
    const parsed = schema.safeParse(rawNode);
    if (parsed.success) {
      nodes[nodeId] = parsed.data as NonEndingNode | EndingNode;
    } else {
      errors.push(...toFieldErrors(parsed.error, prefix));
    }
  }

  if (errors.length > 0) {
    throw new ScenarioError('Invalid scenario', errors);
  }

  // Pass 2: references.
  const nodeIds = new Set(Object.keys(nodes));
  const controlIds = new Set(catalog.map((c) => c.id));

  if (!nodeIds.has(shell.data.start)) {
    errors.push({ path: 'start', message: `unknown node "${shell.data.start}"` });
  }

  for (const [nodeId, node] of Object.entries(nodes)) {
    if ('ending' in node) continue;

    const choiceIds = new Set<string>();
    node.choices.forEach((choice, index) => {
      const at = (field: string) => formatPath(['nodes', nodeId, 'choices', index, field]);

      if (choiceIds.has(choice.id)) {
        errors.push({ path: at('id'), message: `duplicate choice id "${choice.id}" in this node` });
      }
      choiceIds.add(choice.id);

      if (!nodeIds.has(choice.next)) {
        errors.push({ path: at('next'), message: `unknown node "${choice.next}"` });
      }

      choice.controls.forEach((controlId, controlIndex) => {
        if (!controlIds.has(controlId)) {
          errors.push({
            path: formatPath(['nodes', nodeId, 'choices', index, 'controls', controlIndex]),
            message: `unknown control "${controlId}"`,
          });
        }
      });
    });
  }

  if (errors.length > 0) {
    throw new ScenarioError('Invalid scenario', errors);
  }

  return { ...shell.data, nodes };
}

/** A user-facing string in Indonesian (`id`) and English (`en`). */
export interface BilingualText {
  id: string;
  en: string;
}

export type Lang = keyof BilingualText;

/** Incident phase a node belongs to. */
export type Room = 'detect' | 'isolate' | 'communicate' | 'recover';

export type ChoiceQuality = 'good' | 'neutral' | 'bad';

export type EndingType = 'safe' | 'partial' | 'haunted';

export interface Choice {
  id: string;
  label: BilingualText;
  /** ID of the node this choice leads to. */
  next: string;
  quality: ChoiceQuality;
  /** Score delta applied when this choice is taken (may be negative). */
  score: number;
  /** Control IDs from the catalog this choice relates to. Non-empty for `bad` choices. */
  controls: string[];
  feedback: BilingualText;
}

export interface NonEndingNode {
  room: Room;
  text: BilingualText;
  choices: Choice[];
}

export interface EndingNode {
  room: Room;
  ending: {
    type: EndingType;
    summary: BilingualText;
  };
}

export type ScenarioNode = NonEndingNode | EndingNode;

export interface Scenario {
  id: string;
  title: BilingualText;
  /** ID of the first node. */
  start: string;
  nodes: Record<string, ScenarioNode>;
}

/** A security or safety control that a drill teaches. */
export interface Control {
  id: string;
  name: BilingualText;
  description: BilingualText;
}

/** Ordered list of controls; the order is used for reports and checklists. */
export type ControlCatalog = Control[];

export interface HistoryEntry {
  nodeId: string;
  choiceId: string;
  quality: ChoiceQuality;
  controls: string[];
}

export interface ChoiceResult {
  /** The choice that was taken. */
  choice: Choice;
  feedback: BilingualText;
  scoreDelta: number;
  totalScore: number;
  nextNode: ScenarioNode;
  isEnded: boolean;
}

export interface Session {
  /** The scenario this session plays. */
  readonly scenario: Scenario;
  currentNodeId(): string;
  currentNode(): ScenarioNode;
  choose(choiceId: string): ChoiceResult;
  isEnded(): boolean;
  getScore(): number;
  /** Choices taken so far, oldest first. Returns a copy. */
  getHistory(): HistoryEntry[];
}

export interface ChecklistItem {
  controlId: string;
  name: BilingualText;
  description: BilingualText;
}

export interface Report {
  finalScore: number;
  endingType: EndingType;
  endingSummary: BilingualText;
  missedControls: Control[];
  checklistItems: ChecklistItem[];
}

/** A single validation problem, located by a dotted path such as `nodes.detect-1.choices.0.next`. */
export interface FieldError {
  path: string;
  message: string;
}

/** Thrown when a scenario or control catalog fails validation. */
export class ScenarioError extends Error {
  readonly fields: FieldError[];

  constructor(message: string, fields: FieldError[] = []) {
    super(message);
    this.name = 'ScenarioError';
    this.fields = fields;
  }
}

/** Thrown when a session is used incorrectly (unknown choice, already ended, report too early). */
export class SessionError extends Error {
  readonly fields: FieldError[];

  constructor(message: string, fields: FieldError[] = []) {
    super(message);
    this.name = 'SessionError';
    this.fields = fields;
  }
}

export function isEndingNode(node: ScenarioNode): node is EndingNode {
  return 'ending' in node;
}

import type { Room, Session } from '@ronda/engine';
import { lang } from '../lang';
import { ROOM_ORDER, roomKey, t } from '../ui-strings';
import { svg } from './dom';

/** How a room's window looks: not reached yet, where the player is now, cleared, or haunted by a bad choice. */
export type WindowState = 'dark' | 'current' | 'lit' | 'haunted';

/** Derives each room's window from what the player has done so far. */
export function windowStates(session: Session): Record<Room, WindowState> {
  const states: Record<Room, WindowState> = { detect: 'dark', isolate: 'dark', communicate: 'dark', recover: 'dark' };
  const roomOf = (nodeId: string) => session.scenario.nodes[nodeId]!.room;

  for (const entry of session.getHistory()) {
    const room = roomOf(entry.nodeId);
    if (entry.quality === 'bad') states[room] = 'haunted';
    else if (states[room] !== 'haunted') states[room] = 'lit';
  }

  if (!session.isEnded()) {
    const room = session.currentNode().room;
    if (states[room] === 'dark') states[room] = 'current';
  }
  return states;
}

// Window positions, in room order: upstairs left/right, downstairs left/right.
const WINDOWS: [number, number][] = [
  [34, 66],
  [102, 66],
  [34, 98],
  [102, 98],
];

/** The house illustration: four windows, one per room of the drill. */
export function house(states: Record<Room, WindowState>, className = ''): SVGSVGElement {
  const label = ROOM_ORDER.map((room) => t(roomKey(room), lang)).join(', ');

  const windows = ROOM_ORDER.map((room, i) => {
    const [x, y] = WINDOWS[i]!;
    return svg('g', { class: `house__window house__window--${states[room]}` }, [
      svg('rect', { x, y, width: 24, height: 20, rx: 2 }),
      svg('path', { d: `M${x + 12} ${y}v20M${x} ${y + 10}h24`, class: 'house__mullion' }),
    ]);
  });

  return svg(
    'svg',
    {
      viewBox: '0 0 160 132',
      class: `house ${className}`.trim(),
      role: 'img',
      'aria-label': `${t('houseLabel', lang)}: ${label}`,
    },
    [
      svg('path', { d: 'M8 60 L80 10 L152 60 Z', class: 'house__roof' }),
      svg('rect', { x: 112, y: 22, width: 12, height: 24, class: 'house__roof' }),
      svg('rect', { x: 20, y: 56, width: 120, height: 72, class: 'house__wall' }),
      svg('rect', { x: 70, y: 94, width: 20, height: 34, rx: 1, class: 'house__door' }),
      ...windows,
    ],
  );
}

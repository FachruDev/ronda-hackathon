import type { Session } from '@ronda/engine';
import { lang } from '../lang';
import { ROOM_ORDER, roomKey, t } from '../ui-strings';
import { topBar } from './chrome';
import { h, mount } from './dom';
import { house, windowStates } from './house';

export function renderNodeScreen(root: HTMLElement, session: Session, onChoice: (choiceId: string) => void): void {
  const node = session.currentNode();
  if ('ending' in node) throw new Error('renderNodeScreen called on an ending node');

  const roomNumber = ROOM_ORDER.indexOf(node.room) + 1;
  const roomHeading = h('h2', { class: 'room__name', attrs: { id: 'room-heading' } }, [t(roomKey(node.room), lang)]);

  const main = h('main', { class: 'screen screen--node', attrs: { 'aria-labelledby': 'room-heading' } }, [
    h('div', { class: 'room' }, [
      house(windowStates(session), 'house--map'),
      h('div', { class: 'room__label' }, [
        h('p', { class: 'room__progress' }, [t('progressOf', lang, { n: roomNumber, total: ROOM_ORDER.length })]),
        roomHeading,
      ]),
    ]),
    h('section', { class: 'situation', attrs: { 'aria-label': t('situation', lang) } }, [
      h('p', { class: 'situation__text' }, [node.text[lang]]),
    ]),
    h('section', { class: 'choices', attrs: { 'aria-label': t('choices', lang) } }, [
      h(
        'ul',
        { class: 'choices__list' },
        node.choices.map((choice) =>
          h('li', {}, [
            h(
              'button',
              { class: 'choice', attrs: { type: 'button' }, on: { click: () => onChoice(choice.id) } },
              [choice.label[lang]],
            ),
          ]),
        ),
      ),
    ]),
  ]);

  mount(root, [topBar(session.scenario.title[lang]), main], roomHeading);
}

import type { ControlCatalog, Report, Session } from '@ronda/engine';
import { lang } from '../lang';
import { endingKey, t } from '../ui-strings';
import { topBar } from './chrome';
import { h, mount } from './dom';
import { house, windowStates } from './house';

/** Printable checklist: missed controls first, then the rest of the catalog. Only visible in print. */
function checklist(report: Report, catalog: ControlCatalog): HTMLElement {
  const missedIds = new Set(report.checklistItems.map((i) => i.controlId));
  const rest = catalog.filter((c) => !missedIds.has(c.id));

  const group = (heading: string, items: { name: string; description: string }[]) =>
    items.length === 0
      ? null
      : h('section', { class: 'checklist__group' }, [
          h('h3', {}, [heading]),
          h(
            'ul',
            { class: 'checklist__items' },
            items.map((item) =>
              h('li', {}, [h('strong', {}, [item.name]), h('span', {}, [item.description])]),
            ),
          ),
        ]);

  return h('section', { class: 'checklist' }, [
    h('h2', {}, [t('checklistTitle', lang)]),
    h('p', {}, [t('checklistIntro', lang)]),
    group(
      t('checklistMissed', lang),
      report.checklistItems.map((i) => ({ name: i.name[lang], description: i.description[lang] })),
    ),
    group(
      t('checklistRest', lang),
      rest.map((c) => ({ name: c.name[lang], description: c.description[lang] })),
    ),
  ]);
}

export function renderEndingScreen(
  root: HTMLElement,
  session: Session,
  report: Report,
  catalog: ControlCatalog,
  onRestart: () => void,
): void {
  const heading = h('h2', { class: 'ending__title', attrs: { id: 'ending-heading' } }, [
    t(endingKey(report.endingType), lang),
  ]);

  const main = h(
    'main',
    {
      class: 'screen screen--ending',
      attrs: { 'data-ending-type': report.endingType, 'aria-labelledby': 'ending-heading' },
    },
    [
      h('div', { class: 'ending__hero' }, [house(windowStates(session), `house--ending house--${report.endingType}`)]),
      heading,
      h('p', { class: 'ending__summary' }, [report.endingSummary[lang]]),
      h('p', { class: 'ending__score' }, [
        h('span', { class: 'ending__score-label' }, [t('score', lang)]),
        ' ',
        h('strong', { class: 'ending__score-value' }, [String(report.finalScore)]),
      ]),
      h('section', { class: 'missed', attrs: { 'aria-labelledby': 'missed-heading' } }, [
        h('h3', { attrs: { id: 'missed-heading' } }, [t('missedControls', lang)]),
        report.missedControls.length === 0
          ? h('p', { class: 'missed__none' }, [t('noneMissed', lang)])
          : h(
              'ul',
              { class: 'missed__list' },
              report.missedControls.map((control) =>
                h('li', { class: 'missed__item' }, [
                  h('strong', { class: 'missed__name' }, [control.name[lang]]),
                  h('p', { class: 'missed__description' }, [control.description[lang]]),
                ]),
              ),
            ),
      ]),
      h('div', { class: 'actions' }, [
        h('button', { class: 'button button--primary', attrs: { type: 'button' }, on: { click: () => window.print() } }, [
          t('print', lang),
        ]),
        h('button', { class: 'button button--ghost', attrs: { type: 'button' }, on: { click: onRestart } }, [
          t('playAgain', lang),
        ]),
      ]),
      checklist(report, catalog),
    ],
  );

  mount(root, [topBar(session.scenario.title[lang]), main], heading);
}

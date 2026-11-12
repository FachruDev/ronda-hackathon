import type { ChoiceQuality, ChoiceResult, ControlCatalog } from '@ronda/engine';
import { lang } from '../lang';
import { t, type UIKey } from '../ui-strings';
import { h, svg } from './dom';

const VERDICT: Record<ChoiceQuality, UIKey> = { good: 'goodChoice', neutral: 'neutralChoice', bad: 'badChoice' };

function ghost(): SVGSVGElement {
  return svg('svg', { viewBox: '0 0 64 72', class: 'ghost', 'aria-hidden': 'true' }, [
    svg('path', {
      d: 'M32 4C17 4 8 15 8 30v38l8-7 8 7 8-7 8 7 8-7 8 7V30C56 15 47 4 32 4Z',
      class: 'ghost__body',
    }),
    svg('ellipse', { cx: 24, cy: 30, rx: 4, ry: 6, class: 'ghost__eye' }),
    svg('ellipse', { cx: 40, cy: 30, rx: 4, ry: 6, class: 'ghost__eye' }),
  ]);
}

/**
 * Shows the outcome of a choice in a modal dialog. The player must press the
 * button to move on (REQ-7.2.5); Escape does not skip it.
 */
export function renderFeedbackOverlay(
  result: ChoiceResult,
  catalog: ControlCatalog,
  onContinue: () => void,
): HTMLDialogElement {
  const { quality } = result.choice;
  const missed = quality === 'bad' ? catalog.filter((c) => result.choice.controls.includes(c.id)) : [];
  const delta = result.scoreDelta > 0 ? `+${result.scoreDelta}` : String(result.scoreDelta);

  const button = h('button', { class: 'button button--primary', attrs: { type: 'button', autofocus: true } }, [
    t(result.isEnded ? 'seeResult' : 'continue', lang),
  ]);

  const dialog = h(
    'dialog',
    {
      class: `feedback feedback--${quality}${quality === 'bad' ? ' ghost-effect' : ''}`,
      attrs: { 'aria-labelledby': 'feedback-verdict', 'aria-describedby': 'feedback-text' },
    },
    [
      quality === 'bad' ? ghost() : null,
      h('div', { class: 'feedback__body' }, [
        h('p', { class: 'feedback__meta' }, [
          h('strong', { class: 'feedback__verdict', attrs: { id: 'feedback-verdict' } }, [t(VERDICT[quality], lang)]),
          ' ',
          h('span', { class: 'feedback__delta' }, [t('points', lang, { delta })]),
        ]),
        h('p', { class: 'feedback__text', attrs: { id: 'feedback-text' } }, [result.feedback[lang]]),
        missed.length > 0
          ? h('div', { class: 'feedback__controls' }, [
              h('p', { class: 'feedback__controls-label' }, [t('missingControl', lang)]),
              h(
                'ul',
                {},
                missed.map((control) => h('li', {}, [h('strong', {}, [control.name[lang]])])),
              ),
            ])
          : null,
        button,
      ]),
    ],
  );

  dialog.addEventListener('cancel', (event) => event.preventDefault());
  button.addEventListener('click', () => {
    dialog.close();
    dialog.remove();
    onContinue();
  });

  document.body.appendChild(dialog);
  dialog.showModal();
  button.focus();
  return dialog;
}

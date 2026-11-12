import { lang } from '../lang';
import { t } from '../ui-strings';
import { topBar } from './chrome';
import { h, mount } from './dom';
import { house } from './house';

export function renderTitleScreen(root: HTMLElement, onStart: () => void): void {
  const heading = h('h1', { class: 'title__heading' }, [t('appTitle', lang)]);

  const main = h('main', { class: 'screen screen--title', attrs: { 'aria-labelledby': 'title-heading' } }, [
    house({ detect: 'current', isolate: 'dark', communicate: 'dark', recover: 'dark' }, 'house--hero'),
    heading,
    h('p', { class: 'title__problem' }, [t('problemStatement', lang)]),
    h('p', { class: 'title__intro' }, [t('intro', lang)]),
    h('button', { class: 'button button--primary', attrs: { type: 'button' }, on: { click: onStart } }, [
      t('start', lang),
    ]),
    h('p', { class: 'title__note' }, [t('fictionNote', lang)]),
  ]);
  heading.id = 'title-heading';

  mount(root, [topBar(), main], heading);
}

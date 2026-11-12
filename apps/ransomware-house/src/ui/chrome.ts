import type { Lang } from '@ronda/engine';
import { lang, setLang } from '../lang';
import { t } from '../ui-strings';
import { h } from './dom';

const LANGS: { code: Lang; label: string; name: string }[] = [
  { code: 'id', label: 'ID', name: 'Bahasa Indonesia' },
  { code: 'en', label: 'EN', name: 'English' },
];

/** ID | EN switch. Each button announces its full language name. */
export function langToggle(): HTMLElement {
  return h(
    'div',
    { class: 'lang', attrs: { role: 'group', 'aria-label': t('language', lang) } },
    LANGS.map(({ code, label, name }) =>
      h(
        'button',
        {
          class: 'lang__option',
          attrs: { type: 'button', lang: code, 'aria-pressed': code === lang ? 'true' : 'false', 'aria-label': name },
          on: { click: () => setLang(code) },
        },
        [label],
      ),
    ),
  );
}

/** Top bar shared by every screen. `title` is the scenario name during play. */
export function topBar(title?: string): HTMLElement {
  return h('header', { class: 'topbar' }, [
    h('nav', { class: 'topbar__inner', attrs: { 'aria-label': t('brand', lang) } }, [
      h('p', { class: 'topbar__brand' }, [t('brand', lang)]),
      langToggle(),
    ]),
    title ? h('h1', { class: 'topbar__title' }, [title]) : null,
  ]);
}

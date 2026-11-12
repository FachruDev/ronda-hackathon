import type { Lang } from '@ronda/engine';

const STORAGE_KEY = 'ronda.lang';

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'id' || saved === 'en') return saved;
  } catch {
    // Storage can be blocked (private mode); fall through to the default.
  }
  return 'id';
}

/** The active language. Indonesian is the primary language. */
export let lang: Lang = initialLang();

const listeners = new Set<() => void>();

export function setLang(next: Lang): void {
  if (next === lang) return;
  lang = next;
  document.documentElement.lang = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Not critical: the choice still holds for this session.
  }
  listeners.forEach((fn) => fn());
}

export function onLangChange(fn: () => void): void {
  listeners.add(fn);
}

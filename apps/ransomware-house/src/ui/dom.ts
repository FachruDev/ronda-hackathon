/**
 * Tiny DOM builder. Text is always set through text nodes, never innerHTML,
 * so scenario content cannot inject markup (REQ-7.5.5).
 */
export type Child = Node | string | number | null | undefined | false;

interface Options {
  class?: string;
  attrs?: Record<string, string | number | boolean | undefined>;
  on?: Partial<{ [K in keyof HTMLElementEventMap]: (event: HTMLElementEventMap[K]) => void }>;
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: Options = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (options.class) el.className = options.class;
  for (const [name, value] of Object.entries(options.attrs ?? {})) {
    if (value === undefined || value === false) continue;
    el.setAttribute(name, value === true ? '' : String(value));
  }
  for (const [type, handler] of Object.entries(options.on ?? {})) {
    el.addEventListener(type, handler as EventListener);
  }
  append(el, children);
  return el;
}

export function append(parent: Node, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(typeof child === 'object' ? child : document.createTextNode(String(child)));
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  children: SVGElement[] = [],
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, String(value));
  children.forEach((c) => el.appendChild(c));
  return el;
}

/** Replaces the contents of the app root and moves focus to the given element. */
export function mount(root: HTMLElement, nodes: Node[], focusTarget?: HTMLElement): void {
  root.replaceChildren(...nodes);
  if (focusTarget) {
    focusTarget.setAttribute('tabindex', '-1');
    focusTarget.focus({ preventScroll: true });
  }
  window.scrollTo({ top: 0 });
}

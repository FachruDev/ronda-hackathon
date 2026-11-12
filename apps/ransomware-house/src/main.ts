import '@fontsource/young-serif/400.css';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './style.css';

import {
  createSession,
  generateReport,
  loadControlCatalog,
  loadScenario,
  ScenarioError,
  type ChoiceResult,
  type ControlCatalog,
  type Report,
  type Scenario,
  type Session,
} from '@ronda/engine';
import controlsJson from '../../../scenarios/controls.json';
import scenarioJson from '../../../scenarios/ransomware-toko.json';
import { lang, onLangChange } from './lang';
import { t } from './ui-strings';
import { h, mount } from './ui/dom';
import { renderEndingScreen } from './ui/EndingScreen';
import { renderFeedbackOverlay } from './ui/FeedbackOverlay';
import { renderNodeScreen } from './ui/NodeScreen';
import { renderTitleScreen } from './ui/TitleScreen';

export { lang, setLang } from './lang';

export type AppState =
  | { screen: 'title' }
  | { screen: 'node'; session: Session }
  | { screen: 'feedback'; session: Session; result: ChoiceResult }
  | { screen: 'ending'; session: Session; report: Report };

const root = document.getElementById('app')!;
let state: AppState = { screen: 'title' };
let scenario: Scenario;
let catalog: ControlCatalog;

function setState(next: AppState): void {
  state = next;
  render(state);
}

export function render(current: AppState): void {
  document.documentElement.lang = lang;
  document.title = `${t('appTitle', lang)} · Ronda`;
  document.body.dataset.screen = current.screen;

  switch (current.screen) {
    case 'title':
      renderTitleScreen(root, () => setState({ screen: 'node', session: createSession(scenario) }));
      break;

    case 'node':
      renderNodeScreen(root, current.session, (choiceId) => {
        const result = current.session.choose(choiceId);
        setState({ screen: 'feedback', session: current.session, result });
      });
      break;

    case 'feedback': {
      const { session, result } = current;
      // The feedback dialog sits over the room the choice was made in.
      document.body.dataset.ghost = result.choice.quality === 'bad' ? 'true' : 'false';
      renderFeedbackOverlay(result, catalog, () => {
        delete document.body.dataset.ghost;
        setState(
          session.isEnded()
            ? { screen: 'ending', session, report: generateReport(session, catalog) }
            : { screen: 'node', session },
        );
      });
      break;
    }

    case 'ending':
      renderEndingScreen(root, current.session, current.report, catalog, () => setState({ screen: 'title' }));
      break;
  }
}

function renderLoadError(error: unknown): void {
  const fields = error instanceof ScenarioError ? error.fields : [];
  mount(root, [
    h('main', { class: 'screen screen--error' }, [
      h('h1', {}, [t('appTitle', lang)]),
      h('p', {}, [t('loadError', lang)]),
      h(
        'ul',
        {},
        fields.length > 0
          ? fields.map((f) => h('li', {}, [h('code', {}, [f.path]), ': ', f.message]))
          : [h('li', {}, [String(error)])],
      ),
    ]),
  ]);
}

try {
  catalog = loadControlCatalog(controlsJson);
  scenario = loadScenario(scenarioJson, catalog);
  onLangChange(() => {
    // Re-render the current screen in the new language. While feedback is open the
    // toggle is behind the modal dialog, so this only runs for full screens.
    if (state.screen === 'feedback') return;
    const fromToggle = document.activeElement?.classList.contains('lang__option') ?? false;
    render(state);
    // Keep keyboard users on the toggle they just used instead of jumping to the heading.
    if (fromToggle) document.querySelector<HTMLElement>(`.lang__option[lang="${lang}"]`)?.focus();
  });
  render(state);
} catch (error) {
  console.error(error);
  renderLoadError(error);
}

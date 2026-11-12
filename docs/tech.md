---
inclusion: always
---

# Tech

- Language: TypeScript (strict mode) everywhere.
- Build: Vite. Package manager: npm workspaces.
- Tests: Vitest for unit tests, fast-check for property-based tests.
- Apps are static sites deployed to GitHub Pages; no backend, no external API calls at runtime.
- No UI framework in the engine. Apps may use plain TypeScript + CSS; keep dependencies minimal.
- Scenario and control data live in JSON and must pass schema validation before use.
- Accessibility: semantic HTML, keyboard navigation, visible focus, `prefers-reduced-motion` respected, sufficient color contrast in the dark theme.
- Escape all scenario text when rendering; never use `innerHTML` with scenario content.
- Every new engine behavior needs a property-based test when a universal rule can be stated; otherwise a unit test.
- Code comments and identifiers in English.

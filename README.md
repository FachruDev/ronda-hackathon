# Ronda

> Night-watch drills for small teams with no security team.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

In Indonesian villages, *ronda* is the tradition of neighbours taking turns to guard the night. **Ronda** brings that idea to cybersecurity: short, spooky, branching drills that teach small businesses what to do in the first hour of an incident, before it happens. Every bad decision summons a ghost, and every ghost teaches one concrete safeguard, such as an offline backup or MFA. At the end you get a printable checklist for your shop.

Built for **Kiroween 2026** (Skeleton Crew category) with [Kiro](https://kiro.dev).

**Play it:** https://fachrudev.github.io/ronda-hackathon/ (Indonesian and English, about 5 minutes, works on a phone)

## What's inside

| Part | Folder | Status |
|---|---|---|
| Ronda Kit: reusable drill engine | [`packages/engine`](packages/engine) | Done (MVP) |
| Scenario content and control catalog | [`scenarios`](scenarios) | 1 scenario, 10 controls |
| App A: Ransomware Haunted House | [`apps/ransomware-house`](apps/ransomware-house) | Done (MVP) |
| App B: Ronda Gladi Api (fire safety drill) | `apps/safety-drill` | Planned |

The engine knows nothing about ransomware or haunted houses. A drill is a JSON graph of rooms, choices and endings; each app is that content plus a themed UI. App B will reuse the same engine with a different scenario.

## Run locally

Requires Node.js 20.19 or newer (CI uses Node 24).

```bash
npm install
```

```bash
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173/).

Other commands, all from the repository root:

| Command | What it does |
|---|---|
| `npm test` | Engine unit tests, property-based tests (fast-check) and scenario content tests |
| `npm run typecheck` | TypeScript strict check for the engine and the app |
| `npm run build` | Production build of the app into `apps/ransomware-house/dist` |
| `npm run validate-scenario` | Validate every scenario in `scenarios/` |

## Writing or changing a scenario

1. Edit `scenarios/ransomware-toko.json`, or add a new `scenarios/<name>.json`. The shape is described in [`packages/engine/src/types.ts`](packages/engine/src/types.ts): a `start` node, rooms (`detect`, `isolate`, `communicate`, `recover`), choices with a `quality` (`good`, `neutral`, `bad`), a score delta, bilingual feedback, and the control IDs a bad choice teaches.
2. Every user-facing string needs both `id` (Indonesian) and `en` (English). Write natural Indonesian, not a literal translation.
3. Every `bad` choice must reference at least one control from [`scenarios/controls.json`](scenarios/controls.json).
4. Validate the file. In Kiro this happens automatically on save through the hook in [`.kiro/hooks`](.kiro/hooks); by hand:

   ```bash
   npm run validate-scenario -- scenarios/ransomware-toko.json
   ```

   Then run `npm test`. The property-based tests check that every path ends, nothing is a dead end, every node is reachable, the score is consistent, and the report matches the choices taken.

Keep scenarios fictional and defensive: no real company data, and no attack instructions.

## Deploying

Pushing to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): typecheck, tests, build, then deploy to GitHub Pages. One-time setup: in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.

## How Kiro was used

- **Steering** ([`.kiro/steering`](.kiro/steering)): product principles (defensive only, fictional, bilingual), tech rules, and repo structure.
- **Spec** ([`.kiro/specs/ronda-mvp`](.kiro/specs/ronda-mvp)): requirements, design and the 24-task plan the MVP was built from.
- **Hook** ([`.kiro/hooks`](.kiro/hooks)): validates a scenario and runs the property-based tests whenever a file in `scenarios/` is saved.
- **What property-based testing caught**: see [`docs/pbt-findings.md`](docs/pbt-findings.md).

Full write-up coming soon.

## License

MIT, see [LICENSE](LICENSE).

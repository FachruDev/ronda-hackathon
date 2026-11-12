---
inclusion: always
---

# Structure

```
ronda/
├── .kiro/                    # specs, steering, hooks, agents (committed, never gitignored)
├── packages/
│   └── engine/               # framework-agnostic drill engine + schema + PBT
│       ├── src/
│       └── test/
├── scenarios/
│   ├── controls.json         # shared control catalog (bilingual)
│   └── ransomware-toko.json  # scenario content for App A
├── apps/
│   ├── ransomware-house/     # App A: Ransomware Haunted House (Vite)
│   └── safety-drill/         # App B: added after MVP
├── LICENSE                   # MIT
└── README.md
```

Rules:
- Apps import the engine only through its public API (`packages/engine/src/index.ts`).
- App-specific content and styling never go inside `packages/engine`.
- Scenario files are content, not code: changes to them must pass schema validation and the property-based tests.
- Each app keeps its own README explaining how it uses the template.

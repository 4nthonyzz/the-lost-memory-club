---
inclusion: always
---

# Architectural guardrails

- Stack: React, TypeScript, Vite, Three.js, React Three Fiber; Canvas 2D for Snake. No backend or login in the MVP.
- `src/core/contracts.ts` defines shared GameEvent, GameState and station identities. All three modules import these types.
- `src/core/gameReducer.ts` is the only place allowed to change persistent GameState. Components emit typed events; no module directly writes LocalStorage.
- `src/world/`: visual world and interactable stations, independent of persistence details.
- `src/arcade/`: pure Snake rules and an embedded React/Canvas view, independent of world geometry.
- `src/memories/`: VHS playback, clue identification and narrative interactions.
- `src/ui/`: shared UI elements managed by the narrative/UI role.
- Avoid direct imports across peer modules (`world` -> `arcade`, `arcade` -> `memories`, etc). Integrate through the App shell and core contracts.
- No changes to shared event payloads without an approved cross-team review and updated tests.
- All persistent state requires a version field and safe loading from malformed LocalStorage.
- Add tests with each feature. Prefer deterministic, pure state-transition functions; adopt property-based testing for reducer and game rules when implemented.
- Commit `.kiro/` to Git. Never commit credentials, identity data or secrets.

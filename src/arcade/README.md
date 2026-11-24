# Haunted arcade — Developer 2

Current implementation: station UI and `ARCADE_STARTED` event placeholder; **Snake gameplay is not yet implemented**.

Contract: import `SNAKE_GAME_ID` and `GameEvent` from `src/core/contracts.ts`. Emit `ARCADE_WON` only after a real deterministic, testable win condition. The App shell handles the event and save state.

Next: pure Snake engine, deterministic updates, Canvas renderer, keyboard handling, victory/lose state, tests and optional original sounds. Never modify world geometry or persist state directly.

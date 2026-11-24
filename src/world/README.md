# World and exploration — Developer 1

## Status (M1 to M3 implemented)

`WorldScene` renders a first-person archive: the main room (x -5..5, z -4..4) plus an Arcade_Area (4 by 4) entered through 2 doors in the east wall, 3 shelves, a desk, a chair, a couch and 6 detail objects, all built from primitives. WASD/arrow movement, mouse look after pointer lock (click the scene), keyboard look (I/J/K/L, M2, works without pointer lock), wall/prop/door-frame collision, and an E-key prompt near the CRT (`vhs`) and arcade stations. E calls `onInspect(stationId)`. Prompt texts are fixed and do not depend on any prop. If WebGL is unavailable, rendering throws, or a lost context is not restored within 3 s, a fallback with two buttons calls `onInspect('vhs')` / `onInspect('arcade')`. Lighting is one ambient light plus 3 point lights.

- Tested by Vitest (`npm test`: 15 files, 193 tests at the last run): pure logic in `logic/` and `layout/` (movement, collision, look, targeting, input state/mode, palette, layout reachability), the import boundary, and component-level tests of `WorldScene`, including the optional `inputEnabled` prop (M3).
- `inputEnabled`: implemented on the world side and covered by reducer and component tests. `App.tsx` is unchanged and does not pass it, so the prop is NOT verified end-to-end in the running App.
- Not manually verified by the developer in a browser: rendering, pointer lock, the E interaction, context-loss fallback.
- Not recorded yet: performance measurements (frame rate, draw calls). No performance figure is claimed.
- Not implemented: M4 environmental effects, Blender/GLB assets (M5), optional property-based tests.
- Known limitation: while `App.tsx` does not pass `inputEnabled`, the player must resume after a station request by clicking the scene (or pressing Enter/E). Resume is always user-initiated.
## Proposed App integration: `inputEnabled` (P1)

P1 is approved as an integration proposal only. `src/App.tsx` is NOT modified and must not be until the team coordinates. Full notes: `.kiro/specs/world-exploration/integration-notes.md`.

- Implemented in the world: the optional `inputEnabled?: boolean` prop, with unit and component tests. Not verified end-to-end in the running App.
- Pending in App: `<WorldScene inputEnabled={station === null} onInspect={interact} memoryShifted={memoryShifted} />`.
- The prop is optional and additive. `App.tsx` stays the source of truth for panel-open and unlock state. The world never reads `GameState` and never requests pointer lock automatically.

Expected sequences once App passes the prop:

- (a) Unlocked VHS/arcade request: E calls `onInspect`, App sets `station`, `inputEnabled` becomes false, the world suspends and releases pointer lock. When the panel closes, `inputEnabled` becomes true, the world shows the capture overlay, and the user clicks to re-capture.
- (b) Locked arcade request: App sets only the status message (`ARCADE LOCKED · Recover the VHS clue first.`) and `station` stays null. `inputEnabled` stays true, the world releases pointer lock but remains usable, and one click re-captures.
- (c) Prop absent (today): the world suspends locally after `onInspect`. The user resumes with click, Enter or E. No timers. Limitation: the world cannot know when the panel closed.

## Original notes

Contract: `WorldScene({ onInspect, memoryShifted })`. `onInspect` accepts a `StationId` from `src/core/contracts.ts` and is implemented by the App shell.

Next: movement/camera, collision and E-key proximity interaction, one small scene, visual response after Snake victory. Do not manage LocalStorage or import arcade/memories components.

# World and exploration — Developer 1

## Status (M1 to M5 implemented in code; browser verification pending for M4 and M5)

`WorldScene` renders a first-person archive: the main room (x -5..5, z -4..4) plus an Arcade_Area (4 by 4) entered through 2 doors in the east wall, 3 shelves, a desk, a chair, a couch and 6 detail objects, all built from primitives. WASD/arrow movement, mouse look after pointer lock (click the scene), keyboard look (I/J/K/L, M2, works without pointer lock), wall/prop/door-frame collision, and an E-key prompt near the CRT (`vhs`) and arcade stations. E calls `onInspect(stationId)`. Prompt texts are fixed and do not depend on any prop. If WebGL is unavailable, rendering throws, or a lost context is not restored within 3 s, a fallback with two buttons calls `onInspect('vhs')` / `onInspect('arcade')`. Lighting is one ambient light plus 3 point lights.

M4 environmental effects (implemented, covered by unit tests, not verified in a browser by this agent):

- Memory_Shift: when `memoryShifted` changes, background, fog, ambient and point-light colors, wall and screen tints, and a visual-only poster and plaque blend over 2 s, in both directions. Under reduced motion the change is immediate. If the prop is already true at mount, the world starts shifted with no transition. Colliders, Station anchors and prompt text do not depend on `memoryShifted`.
- Palette: normal and shifted palettes, with the ambient intensity never below `AMBIENT_INTENSITY_FLOOR` (0.35).
- CRT effects: light flicker, screen glow, drifting dust particles and CRT static noise, all driven from `useFrame` with no timers. They stop animating while the world is inspecting.
- Reduced motion: `useReducedMotion` follows the OS `prefers-reduced-motion` setting only. The `reducedDistortion` prop is NOT declared (P2 is pending).
- While inspecting, the canvas `frameloop` is `demand`, so no frames are rendered until something invalidates.

- Tested by Vitest (`npm test` at the M5 checkpoint: 24 files, 287 tests, all passing in two consecutive runs; includes `src/App.test.ts` with 8 tests): pure logic in `logic/` and `layout/` (movement, collision, look, targeting, input state/mode, palette and blending), effect timing and shift helpers in `scene/`, the reduced-motion hook, the import boundary, and component-level tests of `WorldScene`, including the optional `inputEnabled` prop (M3).
- `inputEnabled`: implemented on the world side and, as of task 13.5, passed by `App.tsx` (`inputEnabled={station === null}`). Covered by reducer, component and `src/App.test.ts` tests (with a stubbed `WorldScene`). NOT verified end-to-end in a browser until the user plays it.
- Manual verification: the user verified M1 to M3 in a browser. Nothing in M4 (transition, effects, reduced motion, demand frameloop) has been verified in a browser by this agent.
- Not recorded yet: performance measurements (frame rate, draw calls), planned for M6. No performance figure is claimed.
- M5 (implemented, unit-tested, not seen in a browser by any agent): full-screen shell in `App.tsx`/`styles.css` (100vw/100vh, overflow hidden, HUD badge/status/drawer, modal station dialogs, Escape closes, no automatic pointer lock; covered by `src/App.test.ts`); detailed procedural models (`scene/modelDetail.ts`, `scene/PartMeshes.tsx`; tests in `modelDetail.test.ts`); GLB asset pipeline (`assets/`: manifest, ref-counted loader with dispose, `AssetModel` with primitive fallback; the manifest is EMPTY, so no GLB is loaded and the scene is built from primitives only).
- Blender scripts (`tools/blender/generate_assets.py`, `count_triangles.py`) have NEVER been run: Blender is not installed here, no `.glb` exists in the repo, `public/models` holds only `.gitkeep`, and no triangle count has been measured. Declared budgets are not measurements.
- Not implemented: optional property-based tests.
- Known gaps: no restored-memory viewer component exists in the repo (the HUD shows only progress booleans). App-level end-to-end behavior (full-screen shell, modal overlays, focus return, Escape), visual quality of the detailed models, and performance are NOT verified in a browser and not measured.
## App integration: `inputEnabled` (P1), overlays (P3), status text (P4)

P1, P3 and P4 are IMPLEMENTED in `src/App.tsx` and `src/styles.css` (task 13.5, approved scope change M5). App renders a full-screen shell, station panels as modal dialogs, a HUD status line at the bottom of the screen and a collapsed menu drawer. Full notes: `.kiro/specs/world-exploration/integration-notes.md`.

- Implemented in the world: the optional `inputEnabled?: boolean` prop, with unit and component tests.
- Implemented in App: `<WorldScene inputEnabled={station === null} onInspect={interact} memoryShifted={memoryShifted} />`.
- The prop is optional and additive. `App.tsx` stays the source of truth for panel-open and unlock state. The world never reads `GameState` and never requests pointer lock automatically.

Sequences (App now passes the prop; verified by tests with a stubbed world, not yet in a browser):

- (a) Unlocked VHS/arcade request: E calls `onInspect`, App sets `station`, `inputEnabled` becomes false, the world suspends and releases pointer lock. When the panel closes, `inputEnabled` becomes true, the world shows the capture overlay, and the user clicks to re-capture.
- (b) Locked arcade request: App sets only the status message (`ARCADE LOCKED · Recover the VHS clue first.`) and `station` stays null. `inputEnabled` stays true, the world releases pointer lock but remains usable, and one click re-captures.
- (c) Prop absent (today): the world suspends locally after `onInspect`. The user resumes with click, Enter or E. No timers. Limitation: the world cannot know when the panel closed.

## Original notes

Contract: `WorldScene({ onInspect, memoryShifted })`. `onInspect` accepts a `StationId` from `src/core/contracts.ts` and is implemented by the App shell.

Next: movement/camera, collision and E-key proximity interaction, one small scene, visual response after Snake victory. Do not manage LocalStorage or import arcade/memories components.

# World module (`src/world/`)

First-person 3D archive room for The Lost Memory Club, built with React Three Fiber. The module renders the world, lets the player walk and look around, and reports which station the player wants to use. It does not decide what happens next.

## Verification labels

Every feature below carries one of these labels.

| Label | Meaning |
| --- | --- |
| **verified by automated test** | A Vitest test in this repository exercises it (jsdom or pure logic; no real browser, no real GPU). |
| **verified manually by the project owner (M1-M5 per the owner's report; no recorded log)** | The project owner reported checking milestones M1 to M5 in a browser. No row of `.kiro/specs/world-exploration/manual-test-log.md` is filled in, so no result is recorded. |
| **not verified** | Implemented, but no test or recorded check covers the behavior. |
| **planned/prototype** | Not implemented, or implemented only as a stand-in. |

Milestone M6, the polish pass and the spatial and visual refinement pass (media island, north-wall filing cabinets and bulletin board, wood bookcases with dense books, textured walls and rug, arcade relocation, ARCADE sign, dressing, re-centred console, SMPTE monitor, cables) have **no recorded browser run**. Their layout and data are verified by automated tests only; how they look and play is **not verified visually**.

## Purpose and boundaries

- The world renders the room, moves the player, finds the targeted station and calls `onInspect(stationId)`.
- It never reads `GameState` or lock state. It does not know whether the arcade is locked.
- It has no storage: no LocalStorage, no cookies, no backend.
- It imports nothing from `src/arcade/` or `src/memories/`. From `src/core/` it imports only the `StationId` type.
- It never requests pointer lock by itself. Lock is requested only from a user gesture.
- Status: **verified by automated test** (`src/world/boundary.test.ts`, 10 tests, checks the import boundary).

## Layout of `src/world/`

```
src/world/
  WorldScene.tsx            public component, WebGL fallback, error boundary, context-loss watch
  worldTypes.ts             Aabb, Vec2, StationDef, Facing
  assets/                   GLB pipeline: assetManifest.ts (empty), AssetModel.tsx, loadGlb.ts
  controller/               usePlayerRig, useWorldInput, usePointerLock, useReducedMotion, useFrameSampler (dev only)
  layout/roomLayout.ts      single source of truth: bounds, walls, doors, props, colliders, station anchors
  logic/                    pure rules: movement, collision, look, targeting, inputMode, inputState, palette, frameStats, playerStep, constants
  overlay/                  DOM overlays and world.css: prompt, crosshair, capture overlay, hints, panel notice, WebGL fallback
  scene/                    Room, Props, Stations, Lighting, Effects, MemoryShiftDriver, PartMeshes, WorldCanvas,
                            modelDetail.ts, proceduralTextures.ts, sharedResources.ts, memoryShift.ts, effectsTiming.ts, assetPlacement.ts
  *.test.ts (and tests beside each module)
tools/blender/              generate_assets.py, count_triangles.py, README.md (never run)
```

## Controls

| Input | Action |
| --- | --- |
| W A S D or arrow keys | Move |
| Mouse (after pointer lock) | Look |
| I J K L | Keyboard look (works without pointer lock) |
| E | Interact with the targeted station |
| Esc | Releases the mouse (browser pointer-lock exit) |
| Click the view, or Enter / E on the capture overlay | Capture the mouse (a user gesture requests pointer lock) |

Status: input state machine, key filtering and click-only lock requests are **verified by automated test** (`logic/inputMode*.test.ts`, `logic/inputState.test.ts`, `logic/movement.test.ts`, `logic/look.test.ts`, `WorldScene.test.ts`). Real pointer-lock behavior in browsers: **verified manually by the project owner (M1-M5 per the owner's report; no recorded log)**. Alt-tab, tab-switch and Esc-while-locked rows P1 to P6 in `manual-test-log.md` are `not run`.

## Public props

```tsx
interface WorldSceneProps {
  onInspect: (station: StationId) => void;
  memoryShifted: boolean;
  /** Optional. Absent behaves as before. When supplied, false suspends world input. */
  inputEnabled?: boolean;
}
```

- `onInspect`: called when the player presses E with a station targeted. `StationId` comes from `src/core/contracts.ts`.
- `memoryShifted`: visual state only. It changes lighting, tints, poster and plaque. Colliders, station anchors and prompt text do not depend on it.
- `inputEnabled`:
  - **Absent**: the world suspends itself after `onInspect` and shows a default panel notice. The player resumes with a click, Enter or E on the capture overlay. Limitation: the world cannot tell when the panel closed, so it can resume while a panel is still open.
  - **Supplied**: the world follows the value. `false` suspends input, clears held keys and releases pointer lock. When it returns to `true`, the capture overlay appears and the player clicks to re-capture. The pointer is never re-locked automatically.
  - `src/App.tsx` passes `inputEnabled={station === null}` (P1, implemented).
  - Status: **verified by automated test** (`WorldScene.inputEnabled.test.ts`, 8 tests; `logic/inputMode.supplied.test.ts`; `src/App.test.ts` with a stubbed `WorldScene`). End-to-end in a real browser: **not verified** (rows I1 to I4 in `manual-test-log.md` are `not run`).
- A `reducedDistortion` prop is **not declared** (proposal P2 pending). Reduced motion follows the OS `prefers-reduced-motion` setting only.

## Lock-agnostic design

- Prompts are neutral and fixed: `Press E to inspect the CRT television` and `Press E to use the arcade cabinet`. They do not change with `memoryShifted` or with any lock state (**verified by automated test**: `WorldScene.test.ts`).
- The world always calls `onInspect` for the targeted station. `App.tsx` decides.
- `App.tsx` owns the HUD status line (`role="status"`, bottom center). For a locked arcade it shows `ARCADE LOCKED � Recover the VHS clue first.` The world only says, in its `aria-label`, that station messages appear in the status line at the bottom of the screen (**verified by automated test**).
- While a station panel is open, the world shows a neutral panel notice.

## World layout

Source of truth: `layout/roomLayout.ts` (**verified by automated test**: `layout/roomLayout.test.ts`, 27 tests, including grid-search reachability of both stations and with either door closed).

- Main room: x -5..5, z -4..4, height 3. The player starts at (0, 3) facing north.
- Arcade_Area: x 5.3..9.3, z -2..2, east of the main room, entered through two doors in the east wall (`door-east-north`, `door-east-south`). Door frames are colliders; the openings are not.
- VHS station (CRT television on a media console): the console covers x -0.9..0.9, z -2.1..-1.5 (north-centre zone), facing +z, with the `vhs` anchor at (0, -1.5) on the south face. The CRT is centred on the console. It is no longer on the north wall. The island keeps a 2.7 m front walkway to the reception desk, 1.9 m to the north wall and 1.3 m to the filing cabinets (computed from the layout, tested). Walkway tests: `keeps at least 1.2 m of walkway on all four sides of the island` and `leaves a 2.7 m unobstructed walkway between the console front and the reception desk`.
- Reception desk: unchanged at x -1.5..1.5, z 1.2..2.0.
- Woven floor rug under the island: x -1.6..1.6, z -2.5..-0.1 (visual only).
- Lights (4): ambient, `crt-light` at (0, 1.6, -0.6), a warm tungsten `west-light` at (-2.6, 2.3, 0.2) over the west bookcase and lounge zone (it replaces the former magenta light), and an arcade light at (7.3, 2.4, 0).
- Console detail (render-only, no collider change): SMPTE colour-bar reference monitor, green 00:19:96 timecode window and metallic tape slot on the VCR, routed coaxial and power cables behind the console, an "OUT OF ORDER" dark-glass decal on the companion cabinet screen, and metric wood UVs.
- North wall: two filing cabinets flanking a wall-mounted bulletin board.
- Arcade cabinet: inside the Arcade_Area against its east wall (front face at x = 8.4, facing -x toward both doorways). It is no longer on the north wall.
- ARCADE sign: hangs on the main-room face of the east wall above both doorways.
- Dressing: reception desk (moved south of the island), three wood bookcases with dense books, couch, abandoned chair, two crates, a powered-down companion cabinet, a stack of CRT monitors, a tape stack, posters, cables, textured walls, a woven floor rug under the island, an arcade runner rug, and books on the shelves.
- 27 colliders (walls, door frames, solid props), from the targeting benchmark line.

Visual appearance of the M6, polish-pass and refinement-pass layout: **not verified visually** (rows S1 to S13 in `manual-test-log.md` are `not run`).

## Effects

- **Memory_Shift**: when `memoryShifted` changes, background, fog, ambient and point-light colors, wall and screen tints, and a visual-only poster and plaque blend over 2 s (`TRANSITION_DURATION_SEC` in `logic/palette.ts`), in both directions. Ambient intensity never goes below 0.35. If the prop is already true at mount, the world starts shifted with no transition. **verified by automated test** (`logic/palette*.test.ts`, `scene/memoryShift.test.ts`, `scene/effectsTiming.test.ts`). The look itself: **not verified** (rows M1 to M3 are `not run`).
- **Reduced motion**: `useReducedMotion` follows the OS setting. Under reduced motion the shift is immediate and flicker is constant. **verified by automated test** (`controller/useReducedMotion.test.ts`, `logic/palette.full.test.ts`). Live OS toggling in a browser: **not verified** (R1 to R3 `not run`).
- **Flicker, dust, CRT static**: driven from `useFrame`, no timers. Flicker deviates at most 12 percent and changes direction at most 3 times per second (**verified by automated test**). They stop while the world is inspecting.
- **`frameloop` demand while inspecting**: the canvas renders no frames until something invalidates (code path in `WorldScene.tsx`; **not verified** in a browser).

## Procedural textures

21 deterministic canvas textures (`scene/proceduralTextures.ts`, `scene/sharedResources.ts`): arcade screen, marquee, sign face, three posters (two ordinary, one shifted), shifted plaque, floor, wood, dark wood, crate, grille, deck, book spine atlas, wall panel, woven rug, cork board, lamp glow, SMPTE colour bars, the OUT OF ORDER decal and the timecode window. `wallPanel` is 256x256. Without a canvas or 2D context, materials keep flat colors. Textures are disposed on unmount. **verified by automated test** (`scene/proceduralTextures.test.ts`, 77 tests; `scene/modelDetail.test.ts`). Whether they look readable in a browser: **not verified visually** (S7 to S11 `not run`).

## Asset pipeline

- `ASSET_MANIFEST` in `assets/assetManifest.ts` is **empty**. No GLB is loaded. `public/models/` holds only `.gitkeep`.
- `AssetModel` renders the primitive fallback immediately and keeps it when the manifest has no entry or loading fails. **verified by automated test** (`assets/assets.test.ts`, `scene/assetIntegration.test.ts`).
- `tools/blender/generate_assets.py` and `count_triangles.py` have **never been run**: Blender is not installed on the development machine. No `.glb` file exists and no asset triangle count or file size has been measured (**planned/prototype**). See `.kiro/specs/world-exploration/asset-log.md`.

## Dev performance sampler

Dev builds only (`import.meta.env.DEV`). Run `npm run dev` and open the page with `?worldPerf=1` (or set `window.__WORLD_PERF__ = true` before mount). Then call `window.__worldPerf.reset()` before a walk and `window.__worldPerf.summary()` after it. The summary returns `frames`, `medianMs`, `p95Ms`, `triangles`, `drawCalls`, `geometries` and `textures`. The sampler does nothing in `npm run build` output. The statistics helper is **verified by automated test** (`logic/frameStats.test.ts`); the sampler itself has not been run in a browser (**not verified**).

## Metrics

Computed from declared geometry and source, **computed, not runtime-measured**. Source: `.kiro/specs/world-exploration/performance-log.md`. Figures re-checked in task 19.3 with `npx vitest run src/world/scene/modelDetail.test.ts` (85 tests passed); the console line was:
`[18.2] computed triangles: 16772 (detail 16530 + base 242), draw-call estimate (grouped by geometry+material): 264, books 370, slipcases 136, leaning 16, per shelf shelf-a=16 draws/178 books, shelf-b=16 draws/172 books, shelf-c=16 draws/156 books, textures 21, texture memory estimate 6.81 MB`

| Metric | Value | Label |
| --- | --- | --- |
| Triangles | 16,772 (detail 16,530 + base 242), limit 20,000 | computed, not runtime-measured |
| Draw-call grouping estimate | 264 | computed estimate, not `renderer.info` |
| Books | 370 (shelf-a 178, shelf-b 172, shelf-c 156) | computed |
| Lights | 4 (1 ambient + 3 point), limit 4 | computed from source |
| Procedural textures | 21, about 6.81 MB estimated, limit 8 MB | computed, not runtime-measured |
| Colliders | 27 | computed |
| Targeting benchmark | informational timing only, no threshold; varies per run and machine (latest run 0.477 us/call, the full-suite run 1.023 us/call) | informational |

Texture memory margin: 6.81 MB computed against the 8 MB limit leaves about 1.19 MB. The per-texture list (MB, computed): arcadeScreen 0.50, marquee 0.25, signFace 0.33, posterSunset 0.66, posterReel 0.66, shiftPoster 0.66, shiftPlaque 0.17, floor 0.08, wood 0.08, woodDark 0.08, crate 0.08, grille 0.08, deck 0.17, spineAtlas 0.66, wallPanel 0.33, rugWoven 0.33, corkBoard 1.33, lampGlow 0.02, smpteBars 0.13, outOfOrder 0.17, timecode 0.02. `corkBoard` is the largest.
Runtime frame-time targets (median and 95th percentile at 1280x720 on integrated graphics, first-render time, runtime triangles and draw calls) are **not measured**. See `.kiro/specs/world-exploration/performance-log.md`. No runtime performance figure is claimed here.

## Disposal and edge-case checks

Only checks with a test or an inspected code path are listed.

- Shared geometries and materials disposed once on `disposeSharedResources()`: `scene/modelDetail.test.ts` ("disposes every shared geometry and material"). Textures are disposed exactly once and a second call is safe (same file). Called on unmount from `scene/WorldCanvas.tsx` (inspected code path).
- GLB scenes released by ref count and disposed only at zero; `disposeGltfScene` disposes geometry, material and texture: `assets/assets.test.ts`.
- Effects texture, material and dust geometry disposed on unmount: inspected code path in `scene/Effects.tsx`; no test.
- Listeners removed on unmount, and prop changes do not re-register them: `WorldScene.test.ts`, `WorldScene.inputEnabled.test.ts`.
- WebGL unavailable: fallback with two buttons calling `onInspect('vhs')` / `onInspect('arcade')`: `WorldScene.test.ts`.
- WebGL context lost and not restored within 3 s switches to the fallback: inspected code path in `WorldScene.tsx` (`CONTEXT_RESTORE_TIMEOUT_MS`); no test.
- Pointer lock denied or unsupported keeps keyboard look and shows a hint; a new click retries: `logic/inputMode.fallback.test.ts`, `logic/inputMode.test.ts`. The `requestLock` wrapper (missing API, throw, rejected promise) is an inspected code path in `controller/usePointerLock.ts`; no direct test.
- `inputEnabled` toggling true to false to true, mounting with false, and `memoryShifted` re-render: `WorldScene.inputEnabled.test.ts`.
- Malformed numeric input: `clampDt` returns 0 for NaN, negative and `-Infinity`, and caps at 0.1 (`logic/movement.test.ts`); NaN and non-finite look deltas and yaw/pitch (`logic/look.test.ts`); NaN movement (`logic/collision.test.ts`); non-finite frame samples (`logic/frameStats.test.ts`).
- Empty manifest: `assets/assets.test.ts`, `scene/assetIntegration.test.ts`.
- Missing GLB warns once with the exact message and keeps the fallback: `assets/assets.test.ts`, `scene/assetIntegration.test.ts`.

## Tests

```
npm run typecheck
npm test
npm run build
```

Fresh `npm test` run for this README (task 19.3, run twice, same result): **27 test files, 456 tests, all passed**. Files under `src/world/` and their counts:

| Area | Files (tests) |
| --- | --- |
| Component | `WorldScene.test.ts` (10), `WorldScene.inputEnabled.test.ts` (8), `boundary.test.ts` (10) |
| Assets | `assets/assetManifest.test.ts` (20), `assets/assets.test.ts` (9), `scene/assetIntegration.test.ts` (6) |
| Controller | `controller/useReducedMotion.test.ts` (8) |
| Layout | `layout/roomLayout.test.ts` (27) |
| Logic | `collision` (18), `frameStats` (5), `inputMode` (29), `inputMode.supplied` (17), `inputMode.fallback` (7), `inputState` (15), `look` (20), `movement` (15), `palette` (4), `palette.full` (13), `playerStep` (9), `targeting` (14), `targeting.bench` (1, informational) |
| Scene | `effectsTiming` (8), `memoryShift` (9), `modelDetail` (85), `proceduralTextures` (77) |

Outside `src/world/`: `src/App.test.ts` (8, stubbed `WorldScene`) and `src/core/gameReducer.test.ts` (4). Counts change when tests are added. Details, the 17 correctness properties and gaps: `.kiro/specs/world-exploration/test-report.md`.

Not covered: optional property-based tests (`fast-check` is not installed; 0 of 17 properties have one), coverage measurement, real-browser rendering, Blender scripts.

## Pending proposals

See `.kiro/specs/world-exploration/proposals.md`. In short: P1 implemented; P3 and P4 implemented for the App HUD and modal styles (world overlay styles remain in `overlay/world.css`); P2 (`reducedDistortion` prop), P5, P6 and P7 pending; P8 partially superseded by the HUD status line; P9 installed except `fast-check`; P10 folder exists, scripts untested.

## Known limitations and gaps

- No browser run is recorded for M6, the polish pass or the refinement pass; the new layout and textures are not verified visually.
- Spawn gap (open item): the spawn (0, 3) is exactly 1.0 m from the desk edge and the south wall, so a 1.2 m disc around the spawn is not clear. The test asserts 0.99 m. This was not requested in the final instructions and is not fixed. The manual test log has no recorded result.
- Runtime frame time, first-render time and runtime triangle/draw-call counts are not measured.
- No GLB assets and no Blender run. The scene uses primitives only.
- No restored-memory viewer component exists in the repo. The HUD shows progress booleans only.
- `reducedDistortion` (P2) is not wired, so there is no in-game reduced-distortion link.
- When `inputEnabled` is absent, the world cannot tell when a panel closed.
- The production bundle is a single 1,253.47 kB JS chunk (357.24 kB gzip) per `performance-log.md`; no code splitting.
- Optional property-based tests are not implemented.

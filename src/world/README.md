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

Milestone M6, the polish pass and the spatial and visual refinement pass (media island, north-wall filing cabinets and bulletin board, wood bookcases with dense books, textured walls and rug, three arcade cabinets, ARCADE sign, dressing, re-centred console, SMPTE monitor, cables) have **no recorded browser run**. Their layout and data are verified by automated tests only; how they look and play is **not verified visually**. The same holds for tasks 21 and 22 (couch fix and fabric, CRT casing and glass, VCR deck face, armchair, VHS shell textures, metal filing cabinets, cardboard crates, desk detail, doorway trim): **not verified visually**. Task 23 (two desk lamps with ON/OFF visuals, the 128x128 `lampGlow`, the interactable lamps and manuals, the world message overlay, the three manual books on `shelf-b`) is also **not verified visually**; its logic is **verified by automated test** only.

## Purpose and boundaries

- The world renders the room, moves the player, finds the targeted station or world-local prop, and calls `onInspect(stationId)` for stations only. Props (desk lamps, arcade manuals) are handled inside the world and never reach `onInspect`.
- It never reads `GameState` or lock state. It does not know whether the arcade is locked.
- It has no storage: no LocalStorage, no cookies, no backend. Lamp state is session-only React state in `WorldScene` (see "Interactable props").
- It imports nothing from `src/arcade/` or `src/memories/`. From `src/core/` it imports only the `StationId` type.
- It never requests pointer lock by itself. Lock is requested only from a user gesture.
- Status: **verified by automated test** (`src/world/boundary.test.ts`, 10 tests, checks the import boundary).

## Layout of `src/world/`

```
src/world/
  WorldScene.tsx            public component, WebGL fallback, error boundary, context-loss watch
  worldTypes.ts             Aabb, Vec2, StationDef, Facing, PropInteractableId, InteractableDef, InteractionTarget
  assets/                   GLB pipeline: assetManifest.ts (empty), AssetModel.tsx, loadGlb.ts
  controller/               usePlayerRig, useWorldInput, usePointerLock, useReducedMotion, useFrameSampler (dev only)
  layout/roomLayout.ts      single source of truth: bounds, walls, doors, props, colliders, station anchors
  logic/                    pure rules: movement, collision, look, targeting, inputMode, inputState, propState, palette, frameStats, playerStep, constants
  overlay/                  DOM overlays and world.css: prompt, WorldMessage, crosshair, capture overlay, hints, panel notice, WebGL fallback
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
| E | Interact with the targeted station, desk lamp or arcade manual |
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
- `App.tsx` owns the HUD status line (`role="status"`, bottom center). For a locked arcade it shows `ARCADE LOCKED · Recover the VHS clue first.` The world only says, in its `aria-label`, that station messages appear in the status line at the bottom of the screen (**verified by automated test**).
- While a station panel is open, the world shows a neutral panel notice.

## Interactable props (task 23.2, not verified visually)

Five world-local props can be targeted and used with E: `desk-lamp-left`, `desk-lamp-right`, `manual-snake`, `manual-maze` and `manual-frequency`. Their ids form the world-only type `PropInteractableId` (`worldTypes.ts`). They are not `StationId` values, so `src/core/contracts.ts` is unchanged.

- **Targeting**: `selectInteractionTargetAll` (`logic/targeting.ts`) combines both kinds. Stations use the existing 2.0 m range, props use 2.2 m (`PROP_INTERACTION_RANGE`). Both use the same view cone and the same line-of-sight rule (a target's own collider is ignored for its own test). The nearest eligible target wins; on equal distance stations come first.
- **Effect**: E on a prop produces a `PROP_INTERACT` effect (`logic/inputMode.ts`). It never calls `onInspect`, never releases pointer lock, never clears input and never suspends the world. E on a station is unchanged (`CALL_ON_INSPECT`, release lock, clear input).
- **Lamp state is session-only.** Both lamps start ON. State lives in React state in `WorldScene` (`logic/propState.ts`). It is not stored (no LocalStorage, no cookie), is not part of `GameState` and resets on reload. Each lamp toggles only itself.
- **Prompts** (fixed text; the lamp prompt follows the lamp state):
  - `Press E to turn off desk lamp` (lamp is ON) / `Press E to turn on desk lamp` (lamp is OFF)
  - `Press E to read: SNAKE.EXE Manual`
  - `Press E to read: LAST EXIT Manual`
  - `Press E to read: DEAD FREQUENCY Manual`
- **Messages** (exact text):
  - Lamp: `Desk lamp turned off.` / `Desk lamp turned on.`
  - `SNAKE.EXE — Guide a serpent of magnetic VHS tape, collect tape fragments, and evade the dark shadow serpent to uncover a secret code.`
  - `LAST EXIT — Navigate a shifting dark labyrinth, recover three lost photograph fragments, and escape before the stalker catches you.`
  - `DEAD FREQUENCY — Listen closely to haunted radio frequencies and repeat each audio sequence to decode hidden transmissions.`
- **Where messages appear**: in the world-owned `WorldMessage` overlay (`overlay/WorldMessage.tsx`, `role="status"`, `aria-live="polite"`) inside the world wrapper, just above the interaction prompt. They do **not** appear in the App HUD status line: `WorldSceneProps` has no status callback and `src/App.tsx` is unchanged.
- **Clearing**: a message clears when the current target is no longer the prop that produced it. There is no timer (`WorldMessage` has none).
- **LAST EXIT and DEAD FREQUENCY manual texts describe gameplay that does not exist in `src/arcade/`.** They are in-world lore only. Only Snake exists in `src/arcade/`. This task did not check the SNAKE.EXE text against the Snake rules, so treat it as lore too.
- Tests: `logic/targeting.test.ts` (`selectInteractionTargetAll`, 26 tests in the file), `logic/propState.test.ts` (5), `logic/inputMode.prop.test.ts` (12), `WorldScene.test.ts` (`WorldScene interactable props (task 23.2)`).

Desk lamps (task 23.1): the left lamp is a green banker's lamp (`desk-lamp-left`), the right one a cream table lamp (`desk-lamp-right`). Each has a bulb, an inner shade glow, a camera-facing glow sprite and a light pool on the desk top. ON uses emissive materials. OFF swaps to dark materials and a never-drawn material for the sprite and pool. **No light was added**: both lamps are visual only, and the scene keeps 4 lights.

Arcade manuals (task 23.2): three colour-coded volumes stand on level 2 of the west bookcase `shelf-b` (y 1.117..1.397, spines at x -4.635, at z 1.4 / 1.8 / 2.2): emerald SNAKE.EXE, crimson LAST EXIT and amber DEAD FREQUENCY, each with a cream band. Seven ordinary books were removed from that row. Interaction anchors are at x -4.6 (the bookcase front face). They are not colliders.

## World layout

Source of truth: `layout/roomLayout.ts` (**verified by automated test**: `layout/roomLayout.test.ts`, 32 tests, including grid-search reachability of every station and a cell in front of each cabinet through each door separately).

- Main room: x -5..5, z -4..4, height 3. The player starts at (0, 3) facing north.
- Arcade_Area: x 5.3..9.3, z -2..2, east of the main room, entered through two doors in the east wall (`door-east-north`, `door-east-south`). Door frames are colliders; the openings are not.
- VHS station (CRT television on a media console): the console covers x -0.9..0.9, z -2.1..-1.5 (north-centre zone), facing +z, with the `vhs` anchor at (0, -1.5) on the south face. The CRT is centred on the console. It is no longer on the north wall. The island keeps a 2.7 m front walkway to the reception desk, 1.9 m to the north wall and 1.3 m to the filing cabinets (computed from the layout, tested). Walkway tests: `keeps at least 1.2 m of walkway on all four sides of the island` and `leaves a 2.7 m unobstructed walkway between the console front and the reception desk`.
- Reception desk: unchanged at x -1.5..1.5, z 1.2..2.0.
- Woven floor rug under the island: x -1.6..1.6, z -2.5..-0.1 (visual only).
- Reception desk lamps (task 23.1): `desk-lamp-left` (green banker's lamp) and `desk-lamp-right` (cream table lamp), non-solid props on the desk top. No light is attached to them.
- Lights (4): ambient, `crt-light` at (0, 1.6, -0.6), a warm tungsten `west-light` at (-2.6, 2.3, 0.2) over the west bookcase and lounge zone (it replaces the former magenta light), and `arcade-light` at (7.4, 2.4, 0) with distance 6.
- Console detail (render-only, no collider change): SMPTE colour-bar reference monitor, green 00:19:96 timecode window and metallic tape slot on the VCR, routed coaxial and power cables behind the console, and metric wood UVs.
- North wall: two filing cabinets flanking a wall-mounted bulletin board.
- **Three arcade cabinets** inside the Arcade_Area against its east wall (x 8.4..9.2, front faces at x = 8.4, facing -x toward both doorways). Each is a solid collider and a Station that calls `onInspect('arcade')`:
  - SNAKE.EXE: z -1.7..-0.7, anchor (8.4, -1.2), `arcadeGame` `'snake'`.
  - LAST EXIT: z -0.5..0.5, anchor (8.4, 0), `arcadeGame` `'maze'`.
  - DEAD FREQUENCY: z 0.7..1.7, anchor (8.4, 1.2), `arcadeGame` `'frequency'`.
  - The optional `arcadeGame` field is world data only. `App.tsx` and `src/arcade/` are unchanged, so **every cabinet currently opens the same App arcade panel**, and only Snake exists in `src/arcade/`. **LAST EXIT and DEAD FREQUENCY are attract-screen art for games that are NOT implemented** (**planned**).
  - Cabinet parts are high-craft: stepped side wing, tilted screen hood, coin slots, grilles, buttons and T-molding accents in green, crimson and amber.
- ARCADE sign: hangs on the main-room face of the east wall above both doorways.
- Dressing: reception desk (moved south of the island), three wood bookcases with dense books, couch, abandoned chair, posters, cables, textured walls and a woven floor rug under the island. Moved out of the Arcade_Area: the CRT stack is in the main-room north-east corner, the two crates are at x 4.3..4.9 in the south-east, and cable decals run between the cabinets. The companion cabinet is removed. The Arcade_Area keeps its arcade floor dressing.
- 28 colliders (9 walls, 4 door frames, 15 solid props), from the targeting benchmark line and `roomLayout.test.ts`.

Visual appearance of the M6, polish-pass, refinement-pass and three-cabinet layout (the three-cabinet pass is **not verified visually**): **not verified visually** (rows S1 to S13 in `manual-test-log.md` are `not run`).

## Effects

- **Memory_Shift**: when `memoryShifted` changes, background, fog, ambient and point-light colors, wall and screen tints, and a visual-only poster and plaque blend over 2 s (`TRANSITION_DURATION_SEC` in `logic/palette.ts`), in both directions. Ambient intensity never goes below 0.35. If the prop is already true at mount, the world starts shifted with no transition. **verified by automated test** (`logic/palette*.test.ts`, `scene/memoryShift.test.ts`, `scene/effectsTiming.test.ts`). The look itself: **not verified** (rows M1 to M3 are `not run`).
- **Reduced motion**: `useReducedMotion` follows the OS setting. Under reduced motion the shift is immediate and flicker is constant. **verified by automated test** (`controller/useReducedMotion.test.ts`, `logic/palette.full.test.ts`). Live OS toggling in a browser: **not verified** (R1 to R3 `not run`).
- **Flicker, dust, CRT static**: driven from `useFrame`, no timers. Flicker deviates at most 12 percent and changes direction at most 3 times per second (**verified by automated test**). They stop while the world is inspecting.
- **`frameloop` demand while inspecting**: the canvas renders no frames until something invalidates (code path in `WorldScene.tsx`; **not verified** in a browser).

## Procedural textures

30 deterministic canvas textures (`scene/proceduralTextures.ts`, `scene/sharedResources.ts`): three cabinet attract screens (`attractSnake`, `attractMaze`, `attractFrequency`, 256x256), three cabinet marquees (`marqueeSnake`, `marqueeMaze`, `marqueeFrequency`, 256x64), sign face, three posters (two ordinary, one shifted), shifted plaque, floor, wood, dark wood, crate, grille, book spine atlas, wall panel (256x256), woven rug, cork board, lamp glow (`lampGlow`, 128x128 since task 23.1, see below), SMPTE colour bars and the timecode window, plus seven added in tasks 21 and 22. Task 21: `couchFabric` (256x256 woven upholstery, metric fabric UVs), `crtCasing` (256x256 charcoal casing with a generic "KV-1996" badge, metric UV, one tile across the front shell) and `crtGlass` (256x256, on the shared `crtScreen` material, which uses a white base when textured and a teal flat fallback). Task 22: `vcrDeck` (256x128 VCR face with PLAY, STOP, REW and EJECT buttons and a "HI-FI STEREO" label), `vhsShell` (128x128 tape shell), `metalCabinet` (256x256 filing-cabinet front) and `deskDetail` (128x64 notebook cover grain and ruled page block). Earlier, 6 textures were added and 4 removed: `arcadeScreen`, `marquee`, `deck` and `outOfOrder`.

Task 23.1 change (computed from source and tests, **not verified visually**): `lampGlow` grew from 64x64 to 128x128 (0.021 MB to 0.083 MB, +0.062 MB). It is a deterministic multi-stop radial gradient with 7 stops, alpha 0 at 90 percent of the half-width, and a filament core. It is shared by the glow sprite (`lampHalo` material) and the desk light pool (`lampPool` material) of both lamps.

Task 22 changes (all computed from source and tests, **not verified visually**):

- `corkBoard` shrank from 512x512 to 256x256 (metric UV factor k = w/512, 1.00 MB freed).
- The reference monitor and the north-east CRT stack use `crtCasing`. The mint `casing` material is removed.
- The VCR front uses `vcrDeck`.
- The armchair uses `couchFabric` on the `armchairBody` and `armchairCushion` materials (slate and teal, tinted by `memoryShift`; the old green flat colour is the no-canvas fallback).
- `vhsShell` is on `tapeBlack`; a new `tapeBlue` material carries the second tape colour.
- `metalCabinet` is on both filing cabinets: index cards 1994 to 1996, drawer labels "TAPES 01-40", "CASE LOGS" and "MISC". The en dash in the card text is written as the escape `\u2013`. One tile spans the cabinet front with four drawer bands. Parts gained the optional fields `metricAspect`, `metricOffset` and `metricPlainV`.
- `crate` is 256x256. Archive boxes use cardboard and the wooden crates carry a cardboard label panel (`crateWood` and `cardboard` materials). Shelf boxes use `crateWood`.
- `deskDetail` (128x64) covers the notebook cover and ruled page block. The mug has a rim. The pencil moved because it intersected the notebook.
- Doorway panel insets and kickplates on the pillar and jambs sit outside the openings, protrude at most 2 cm, and have no colliders.
- The `fabric`, `fabricLight` and `casing` materials are removed.

The couch uses the `couchBody`, `couchCushion` and `couchPillow` materials, which take the `memoryShift` tint. The CRT casing fallback colour (no canvas) is charcoal. Without a canvas or 2D context, materials keep flat colors. Textures are disposed on unmount, each exactly once. **verified by automated test** (`scene/proceduralTextures.test.ts`, 147 tests; `scene/modelDetail.test.ts`, 131 tests). Whether they look readable in a browser: **not verified visually** (S7 to S11 `not run`).

Couch fix (task 21.1): the dark patch on the couch came from a dark "worn patch" box placed 4 mm above the middle cushion. It is removed, together with a second hidden patch. The roll caps are shortened by 4 mm to avoid coplanar faces. The pillow sits in the left seat corner; a test checks with an oriented-box (OBB) no-intersection test that it does not overlap the other couch parts. The couch has 388 triangles (was 412) and no new collider. Task 21 is **not verified visually**.

## Asset pipeline

- `ASSET_MANIFEST` in `assets/assetManifest.ts` is **empty**. No GLB is loaded. `public/models/` holds only `.gitkeep`.
- `AssetModel` renders the primitive fallback immediately and keeps it when the manifest has no entry or loading fails. **verified by automated test** (`assets/assets.test.ts`, `scene/assetIntegration.test.ts`).
- `tools/blender/generate_assets.py` and `count_triangles.py` have **never been run**: Blender is not installed on the development machine. No `.glb` file exists and no asset triangle count or file size has been measured (**planned/prototype**). See `.kiro/specs/world-exploration/asset-log.md`.

## Dev performance sampler

Dev builds only (`import.meta.env.DEV`). Run `npm run dev` and open the page with `?worldPerf=1` (or set `window.__WORLD_PERF__ = true` before mount). Then call `window.__worldPerf.reset()` before a walk and `window.__worldPerf.summary()` after it. The summary returns `frames`, `medianMs`, `p95Ms`, `triangles`, `drawCalls`, `geometries` and `textures`. The sampler does nothing in `npm run build` output. The statistics helper is **verified by automated test** (`logic/frameStats.test.ts`); the sampler itself has not been run in a browser (**not verified**).

## Metrics

Computed from declared geometry and source, **computed, not runtime-measured**. Source: `.kiro/specs/world-exploration/performance-log.md`. Figures re-checked in task 23.3 with `npx vitest run src/world/scene/modelDetail.test.ts` (131 tests passed); the console line was:
`[18.2] computed triangles: 19042 (detail 18800 + base 242), draw-call estimate (grouped by geometry+material): 325, books 366, slipcases 136, leaning 16, per shelf shelf-a=16 draws/178 books, shelf-b=17 draws/168 books, shelf-c=16 draws/156 books, textures 30, texture memory estimate 7.52 MB`

| Metric | Value | Label |
| --- | --- | --- |
| Triangles | 19,042 (detail 18,800 + base 242), limit 20,000; task 23 changed it by -130 from 19,172 | computed, not runtime-measured |
| Draw-call grouping estimate | about 325 (was 319) | computed estimate, not `renderer.info` |
| Books | 366 (shelf-a 178, shelf-b 168, shelf-c 156); includes the 3 manuals | computed |
| Lights | 4 (1 ambient + 3 point), limit 4; task 23 added none | computed from source |
| Procedural textures | 30, 7.521 MB estimated, limit 8 MB; `lampGlow` +0.062 MB | computed, not runtime-measured |
| Colliders | 28 (task 23 added none) | computed |
| Targeting benchmark | informational timing only, no threshold; varies per run and machine (task 23.3 standalone run 1.025 us/call, full-suite run 1.790 us/call; this benchmark times station targeting only, not `selectInteractionTargetAll`) | informational |

**The triangle margin is thin:** 19,042 leaves 958 triangles (about 5 percent) below the 20,000 limit. The biggest consumers (computed by summing declared objects in task 21.3, not recomputed after task 23): the three bookshelves (2,352, 2,280 and 2,088 before the manuals replaced 7 books on `shelf-b`), the three cabinets (1,316 each), `console-cables` (1,088), the two filing cabinets (692 each) and the desk (672). Task 23.1 replaced the two old desk lamps (470 triangles) with two new ones (352): -118. Task 23.2 replaced 7 books on `shelf-b` (-84) with 3 manuals and 3 spine bands (+72): -12.

**The texture margin is also thin:** 7.521 MB computed against the 8 MB limit leaves about 0.48 MB. First candidates to cut if more room is needed: `console-cables` (1,088 triangles), the book count (366 books), the three 0.66 MB posters (`posterSunset`, `posterReel`, `shiftPoster`, 256x512) or `spineAtlas` (512x256, 0.66 MB), which could shrink. The per-texture list (MB, computed, not runtime-measured, rounded to two decimals): attractSnake 0.25, attractMaze 0.25, attractFrequency 0.25, marqueeSnake 0.06, marqueeMaze 0.06, marqueeFrequency 0.06, signFace 0.33, posterSunset 0.66, posterReel 0.66, shiftPoster 0.66, shiftPlaque 0.17, floor 0.08, wood 0.08, woodDark 0.08, crate 0.33, grille 0.08, spineAtlas 0.66, wallPanel 0.33, rugWoven 0.33, corkBoard 0.33, lampGlow 0.08, smpteBars 0.13, timecode 0.02, couchFabric 0.33, crtCasing 0.33, crtGlass 0.25, vcrDeck 0.17, vhsShell 0.08, metalCabinet 0.33, deskDetail 0.04. The largest are the three posters and `spineAtlas` (0.66 each).
**Measured runtime values** (measured by the project owner **before Task 23; not repeated since**, so they do not describe the lamps, manuals or message overlay; dev build, `?worldPerf=1` sampler, 60 s walkthrough across both rooms and all three arcade cabinets; raw output in `.kiro/specs/world-exploration/performance-log.md` section 4):

| Metric | Measured value |
| --- | --- |
| Frames sampled | 3600 (the sampler ring-buffer capacity, so the most recent 3600 frames) |
| Median frame time | 16.70 ms (about 59.9 fps) |
| 95th-percentile frame time | 18.60 ms |
| Renderer triangles (`renderer.info.render.triangles`) | 10,378 |
| Draw calls (`renderer.info.render.calls`) | 151 |
| Geometries / textures (`renderer.info.memory`) | 89 / 29 |

Caveats:
- Hardware/GPU, browser and version, OS, window resolution and date were **not provided**. The Reference_Hardware (integrated graphics at 1280x720) cannot be confirmed, so the median <= 20 ms and p95 <= 33 ms targets are met on the owner's machine only.
- Triangles and draw calls describe the last rendered frame from one camera position, after frustum culling, with each instanced mesh counted as one call. They are not comparable one-to-one with the computed whole-scene figures above (19,042 triangles, 325 draw-call estimate, 30 declared textures); the lower measured numbers are expected.
- Textures 29 vs 30 declared: `renderer.info.memory.textures` counts textures uploaded to the GPU so far. One declared texture may not have been uploaded yet or may be absent (likely explanation, not verified).
- A median near 16.7 ms is consistent with a 60 Hz vsync cap, so frame time is likely limited by display refresh. The real headroom is unknown.
- Dev build, which is slower than production.
- First-render time and the targeting benchmark on the Reference_Hardware are **not measured**. The computed figures above remain computed, not runtime-measured.

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

Fresh `npm test` run for this README (task 23.3, run twice, same result; `npm run typecheck` and `npm run build` exit 0): **29 test files, 619 tests, all passed**. Files under `src/world/` and their counts:

| Area | Files (tests) |
| --- | --- |
| Component | `WorldScene.test.ts` (14), `WorldScene.inputEnabled.test.ts` (8), `boundary.test.ts` (10) |
| Assets | `assets/assetManifest.test.ts` (22), `assets/assets.test.ts` (9), `scene/assetIntegration.test.ts` (6) |
| Controller | `controller/useReducedMotion.test.ts` (8) |
| Layout | `layout/roomLayout.test.ts` (32) |
| Logic | `collision` (18), `frameStats` (5), `inputMode` (29), `inputMode.supplied` (17), `inputMode.fallback` (7), `inputMode.prop` (12), `inputState` (15), `look` (20), `movement` (15), `palette` (4), `palette.full` (13), `playerStep` (9), `propState` (5), `targeting` (26), `targeting.bench` (1, informational) |
| Scene | `effectsTiming` (8), `memoryShift` (16), `modelDetail` (131), `proceduralTextures` (147) |

Outside `src/world/`: `src/App.test.ts` (8, stubbed `WorldScene`) and `src/core/gameReducer.test.ts` (4). Counts change when tests are added. Details, the 17 correctness properties and gaps: `.kiro/specs/world-exploration/test-report.md`.

Not covered: optional property-based tests (`fast-check` is not installed; 0 of 17 properties have one), coverage measurement, real-browser rendering, Blender scripts.

## Pending proposals

See `.kiro/specs/world-exploration/proposals.md`. In short: P1 implemented; P3 and P4 implemented for the App HUD and modal styles (world overlay styles remain in `overlay/world.css`); P2 (`reducedDistortion` prop), P5, P6 and P7 pending; P8 partially superseded by the HUD status line; P9 installed except `fast-check`; P10 folder exists, scripts untested.

## Known limitations and gaps

- No browser run is recorded for M6, the polish pass, the refinement pass or the three-cabinet pass; the new layout and textures are not verified visually.
- All three cabinets open the same App arcade panel (Snake). LAST EXIT and DEAD FREQUENCY have no game behind them. Their manual texts on `shelf-b` are in-world lore for gameplay that does not exist in `src/arcade/`.
- Task 23 (lamps, manuals, world message) is not verified visually or in a browser. Lamp state is session-only and resets on reload. Prop messages appear in the world-owned overlay, not in the App HUD status line.
- Spawn gap (open item): the spawn (0, 3) is exactly 1.0 m from the desk edge and the south wall, so a 1.2 m disc around the spawn is not clear. The test asserts 0.99 m. This was not requested in the final instructions and is not fixed. The manual test log has no recorded result.
- Frame time and renderer counts were measured once by the project owner (dev build, hardware not provided; see the Metrics section). First-render time is not measured, and the Reference_Hardware cannot be confirmed. The triangle margin below the 20,000 limit is only 958 (computed), and the texture margin below 8 MB is only about 0.48 MB (computed).
- No GLB assets and no Blender run. The scene uses primitives only.
- No restored-memory viewer component exists in the repo. The HUD shows progress booleans only.
- `reducedDistortion` (P2) is not wired, so there is no in-game reduced-distortion link.
- When `inputEnabled` is absent, the world cannot tell when a panel closed.
- The production bundle is a single 1,262.70 kB JS chunk (360.43 kB gzip, task 21.3 build) per `performance-log.md`; no code splitting.
- Optional property-based tests are not implemented.

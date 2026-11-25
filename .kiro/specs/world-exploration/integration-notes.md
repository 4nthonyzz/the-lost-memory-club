# World Exploration: App.tsx Integration Notes

Originally documentation only (task 9.9). Updated by tasks 13.5, 15.5, 19.3, 20.3, 23.3, 24.3, 27.3, 28.3 and 29.3. Related: `proposals.md`, `performance-log.md`, `manual-test-log.md`, `test-report.md`, `src/world/README.md`.

## Status

- **P1 (`inputEnabled={station === null}`): implemented** in `src/App.tsx` and in the world (`src/world/WorldScene.tsx`).
- **P3 (overlay and layout styles): implemented for the App HUD and modal styles** in `src/styles.css`. The world overlay rules stay in `src/world/overlay/world.css`. Moving them (task 16.3) is optional and not done.
- **P4 (status text): implemented** in `src/App.tsx`. App renders the PROTOTYPE tag, progress booleans (TAPE, CLUE, ARCADE, ENDING), the `role="status"` message line at the bottom center and a collapsed menu drawer at the top right (controls summary and reset button).
- P2 (`reducedDistortion` prop) remains pending: the world follows OS `prefers-reduced-motion` only.
- These App changes were made under approved scope change M5. App is a full-screen 3D shell (100vw x 100vh). `MemoryPanel` and `ArcadePanel` render inside a modal layer (`role="dialog"`, `aria-modal="true"`). Escape (window keydown, registered only while a station is open) and the Close button close it. Focus moves into the dialog on open and returns to `.world-wrapper` on close. App never requests pointer lock.
- Unlock rule and message strings are unchanged.

## Applied change in `src/App.tsx`

```tsx
<WorldScene inputEnabled={station === null} onInspect={interact} memoryShifted={memoryShifted} />
```

Final `WorldSceneProps`: `onInspect(station: StationId)`, `memoryShifted: boolean`, optional `inputEnabled?: boolean`. No `reducedDistortion` prop exists.

## Verification state

| Item | State |
| --- | --- |
| World-side `inputEnabled` behavior (absent, supplied true, toggling, mount with false) | verified by automated test: `src/world/WorldScene.inputEnabled.test.ts` (8 tests), `src/world/logic/inputMode.supplied.test.ts` |
| App passes the prop, dialogs, Escape, focus return, status messages | verified by automated test with a stubbed `WorldScene`: `src/App.test.ts` (8 tests) |
| M1 to M5 in a browser | verified manually by the project owner per the owner's report; no recorded log (every row of `manual-test-log.md` is `not run`) |
| End-to-end sequences (a) and (b) below in a real browser, HUD layout on small or short viewports | not verified (no recorded result) |
| M6, the polish pass (tasks 18.1 to 18.3) and the refinement pass (tasks 19.1 to 19.2: re-centred media console, new lighting, SMPTE monitor, timecode, cables) and the three-cabinet arcade pass (tasks 20.1 and 20.2) and the task 21 couch fix, couch fabric, CRT casing and CRT glass textures and the task 22 detail pass (VCR deck face, armchair, VHS shells, metal filing cabinets, cardboard crates, desk detail, doorway trim) and the task 23 lamps and manuals and the task 24 lamp cones, desk pools, room light coupling, ceiling bloom strips, Archive Document Card and notes counter in a browser | not verified visually (no browser run recorded). Layout data and budgets are verified by `src/world/layout/roomLayout.test.ts` (33 tests) and `src/world/scene/modelDetail.test.ts` (180 tests). Task 25 (notebook move, banker's lamp collars, soft cones, arcade floor glows, Club Archive Notice) Task 26 (anisotropy 4, redrawn textures, VCR front panel, mug coffee surface and stain, rebalanced lighting) and Task 27 (cabinet and manual detail texture, two-page themed Archive Document Card) and Task 28 (scrollable document card, protruding themed manuals) and Task 29 (open-book manual cards, animated attract screens) are **not verified visually** either |

Fresh `npm test` at the time of task 29.3: 31 files, 856 tests, all passed (exit 0), run three times with 31 of 31 files passing each time and no timeout (a JSON-reporter run also reported 856 passed, 0 failed). Four CPU-heavy tests carry an explicit 30,000 ms per-test timeout since task 24.3 (they had timed out at the 5 s default in three earlier full runs under load; details in `test-report.md`). `npm run typecheck` and `npm run build` exited 0.

## Arcade area (M6, three cabinets from tasks 20.1 and 20.2)

The Arcade_Area (x 5.3..9.3, z -2..2) now holds **three arcade cabinets** against its east wall, x 8.4..9.2, facing -x toward both east doorways. Each cabinet is a solid collider and a Station that calls `onInspect('arcade')`:

| Cabinet | z range | Anchor | `arcadeGame` (world data only) |
| --- | --- | --- | --- |
| SNAKE.EXE | -1.7..-0.7 | (8.4, -1.2) | `snake` |
| LAST EXIT | -0.5..0.5 | (8.4, 0) | `maze` |
| DEAD FREQUENCY | 0.7..1.7 | (8.4, 1.2) | `frequency` |

**Integration consequence.** `App.tsx` and `src/arcade/` are unchanged. The `StationId` and the `onInspect` payload are unchanged (always `'arcade'`), and the optional `arcadeGame` field exists only in the world's layout data. So **every cabinet currently opens the same App arcade panel**, and the App cannot tell which cabinet was used. Only Snake exists in `src/arcade/`. **LAST EXIT and DEAD FREQUENCY are attract-screen art for games that are NOT implemented.** If the team later builds those games, the App would need a typed event or payload change, which needs the cross-team review described in the architecture rules.

The ARCADE sign hangs on the main-room face of the east wall above both doorways. Dressing moved out of the Arcade_Area: the CRT stack is in the main-room north-east corner, the two crates are at x 4.3..4.9 in the south-east, and cable decals run between the cabinets. The earlier companion cabinet is removed. The Arcade_Area has an `arcade-light` at (7.4, 2.4, 0) with distance 6. Reachability of a cell in front of every cabinet through each door, and a 1.2 m lane from each door to every anchor, are covered by `roomLayout.test.ts`. Visual result of the three-cabinet pass in a browser: **not verified visually**.
## Layout after the refinement pass (tasks 18.1 to 19.2)

The `vhs` station (CRT television on a media console) is on a central media island facing +Z. The console covers x -0.9..0.9, z -2.1..-1.5, the `vhs` anchor is at (0, -1.5) on the south face, and the CRT is centred on the console. The woven rug covers x -1.6..1.6, z -2.5..-0.1. `crt-light` is at (0, 1.6, -0.6). A warm tungsten light named `west-light` at (-2.6, 2.3, 0.2) replaces the former magenta light. The reception desk is unchanged at x -1.5..1.5, z 1.2..2.0. Walkways (computed from the layout, tested): 2.7 m in front of the island to the desk, 1.9 m to the north wall and 1.3 m to the filing cabinets. Two filing cabinets and a bulletin board are on the north wall. The east Arcade_Area is described in the section above (three cabinets). Shelves are wood bookcases with dense books; walls, floor and rug are textured.

Render-only additions from tasks 19.1 and 19.2: SMPTE colour-bar reference monitor, green 00:19:96 timecode window, metallic tape slot, routed coaxial and power cables, metric wood UVs, `wallPanel` reduced to 256x256. Station ids, `StationId` and the `onInspect` payload are unchanged, so `App.tsx` needed no change. Not verified visually (no browser run).

Open item: the spawn (0, 3) is exactly 1.0 m from the desk edge (z 2.0) and from the south wall (z 4), so a 1.2 m disc around the spawn is not clear. The layout test asserts 0.99 m. This was not requested in the final instructions and is not fixed.

## HUD and status wording

- The world never shows lock messages. Its station prompts are neutral and fixed: `Press E to inspect the CRT television` and `Press E to use the arcade cabinet`.
- The world `aria-label` says that station messages, including why a station cannot be used yet, appear in the status line at the bottom of the screen.
- App owns the status line. After E at the locked arcade it shows `ARCADE LOCKED · Recover the VHS clue first.` After a successful request it shows `CRT STATION CONNECTED` or `ARCADE STATION CONNECTED`.
- The wording is verified by `WorldScene.test.ts` (world side) and `App.test.ts` (App side). How it looks in a browser is not verified.

## Interactable props, lamp lighting and the Archive Document Card (tasks 23 to 25, 27 and 28, no App change)

Task 23 added five world-local interactable props, Task 24.2 added three more and Task 25.2 added one, nine in total (2 lamps + 7 readable documents): `desk-lamp-left`, `desk-lamp-right`, `manual-snake`, `manual-maze`, `manual-frequency`, `desk-notebook`, `cork-board`, `poster-shift` and `poster-archive` (world-only type `PropInteractableId`; the seven non-lamp ids are `ReadableId`). **No App change is needed and none was made** (`git status` shows no change in `src/App.tsx`, `src/core/`, `src/arcade/`, `src/memories/`, `src/ui/` or `src/styles.css`).

- `StationId` in `src/core/contracts.ts` (`'vhs' | 'arcade'`) is unchanged. `WorldSceneProps` is unchanged. `onInspect` is still called only for stations. A prop press produces a `PROP_INTERACT` effect inside the world: it never calls `onInspect`, never releases pointer lock and never suspends input. Code path: `controller/useWorldInput.ts` (the `CALL_ON_INSPECT` branch calls `onInspectRef.current` only when `target.type === 'station'`), then `WorldScene.tsx` `inspectStation`. Tests: `logic/inputMode.prop.test.ts` ("emits exactly one PROP_INTERACT per key press, and none of CALL_ON_INSPECT, RELEASE_POINTER_LOCK or CLEAR_INPUT") and `WorldScene.test.ts` ("E on a manual opens its card with the title, E again closes it, and onInspect is never called").
- Combined targeting is `selectInteractionTargetAll`: stations 2.0 m, props 2.2 m, same view cone and line of sight, nearest wins, stations first on ties. The poster is targetable only while `memoryShifted` is true.
- **Lamp state is session-only.** It lives in React state in `WorldScene`, is not stored anywhere (no LocalStorage) and is not part of `GameState`. Both lamps start ON and reset on reload.
- **Lamp pills.** A lamp press shows a short status pill in the world-owned `WorldMessage` overlay (`role="status"`, `aria-live="polite"`): `Banker's lamp switched ON` / `Banker's lamp switched OFF` and `Table lamp switched ON` / `Table lamp switched OFF`. The pill clears when the target changes. There is no timer.
- **Archive Document Card (task 24.2).** E on a readable prop (three manuals, notebook, cork board, the two posters) opens `WorldInspectorCard`, a non-modal paper document with `role="region"` and an `aria-label` equal to the title. It has no focus trap and no focus move, its scroll container takes the mouse (wheel and scrollbar, see the "Task 28" section below), and it never calls `onInspect`, never changes the input mode and never changes pointer lock. It closes on E (also with no target), Esc (not prevented), loss of pointer lock, walking more than 2.6 m from the prop's anchor, a station opening, or the world entering `inspecting`. A station E while a card is open opens the station and closes the card. E on a lamp while a card is open closes the card only. Since task 27.2 the card is a two-page themed document (see the "Task 27" section below), and since task 29.1 the three manual cards render as an open two-page book (see the "Task 29" section below); its footer is `Press 1 / 2 to switch pages · E or move away to close`.
- **Notes counter.** `NOTES READ: X / 7` (bottom-right, the total derived from `READABLE_COUNT`) counts unique readable props opened this session. It is not stored, is not in `GameState` and resets on reload. It is hidden while a station panel is open (inspecting).
- **Poster decision.** No texture in the repository says "THE SIGNAL REMEMBERS". The only Memory_Shift poster, the overlay poster reading PLEASE REWIND / THE TAPE / REMEMBERS YOU, was used with the requested title "The Signal Remembers". It is targetable only while `memoryShifted` is true, so reading all 7 of 7 notes needs the shift.
- **Club Archive Notice (task 25.2).** The framed ARCHIVE / MEMBERS ONLY poster on the Arcade_Area north wall is the 7th readable document, `poster-archive` (tag CLUB NOTICE // MEMBERS ARCHIVE, prompt `Press E to read: Club Archive Notice`). It is always targetable. Anchor (7.5, -1.93), not the suggested (5.58, -2.0), which lies on the area boundary and 1.92 m from the poster. Its text is placeholder lore for review by the story owner (Developer 3). E opens the card and never calls `onInspect`. Task 25.2 also adds three additive arcade floor glows (x 7.8, z -1.2 / 0 / 1.2, 0.9 x 0.9 m, opacity 0.26, y 0.014 because the runner decal is at 0.011).
- **Task 25.1 notebook and lamps.** `desk-notebook` anchor moved from (-0.95, 1.7) to (-0.58, 1.62) so the left lamp is no longer taken over by the notebook. Behaviour change: from the console front (0, -0.5) the notebook is now within 2.2 m and is selected there. Cone opacity is 0.20 with the new 64x64 `coneFalloff` texture, the green ON shade is `#16a34a` at 0.38, desk pool opacity is 0.42, and the banker's lamp has brass collars and a `#fff1cc` liner.
- **All card text is placeholder lore for review by the story owner (Developer 3).** The LAST EXIT and DEAD FREQUENCY cards carry the status line `Cabinet status: awaiting service` (on page 2 since task 29.1) because those games do not exist in `src/arcade/`. Only Snake exists, and every cabinet still opens the same App arcade panel.
- **Lamp lighting (task 24.1).** Additive volumetric cones and desk pools per lamp, emissive shades, a room light coupling by lamps ON and additive bloom strips under the five ceiling fixtures; still 4 lights. Coupling (ambient / west-light multipliers): 2 ON = 1.00 / 1.00, 1 ON = 0.95 / 0.88, 0 ON = 0.90 / 0.75, applied after the Memory_Shift blend and computed from authored base values, so it does not accumulate; the ambient floor is kept; `crt-light` and `arcade-light` are untouched. **The requested 0.85 m pool radius was not possible on a 0.8 m deep desk:** the pool is a 0.8 m decal capped to the desk depth with a visible disc of about 0.36 m, kept inside the desk top.
- Scene: three manual books stand on `shelf-b` level 2 (y 1.117..1.397, z 1.4 / 1.8 / 2.2). Since task 28.2 they protrude 0.08 m (spine face at x -4.555, anchors (-4.52, z); see the "Task 28" section below), and ordinary books were removed from that row in tasks 23 and 28.2. `lampGlow` is 128x128.
- **Known limitations of the card.** On short windows (about 400 to 500 px tall) the card region is small. Since task 28.1 its content scrolls with the wheel, ArrowUp / ArrowDown, PageUp / PageDown and the scrollbar (see the "Task 28" section below for what is untested). The poster becomes targetable when the flag flips, slightly before its fade completes. Closing on pointer-lock loss is wired (`controller/useWorldInput.ts:226`) but is not testable in jsdom, and the 2.6 m auto-close runs in the per-frame hook (`controller/usePlayerRig.ts:88-89`), which jsdom does not run (the pure `shouldCloseCard` is unit-tested).
- Tasks 23, 24, 25, 27, 28 and 29 are **not verified visually**.
## Computed metrics

Computed from declared geometry and source, computed, not runtime-measured. Source: `performance-log.md`, re-checked in task 29.3 with `npx vitest run src/world/scene/modelDetail.test.ts` (180 tests passed). Task 29 changed none of these numbers.

- Triangles: 19,116 (detail 18,874 + base 242), limit 20,000 (task 23 delta -130 from 19,172 to 19,042; task 24 delta +58 to 19,100; task 25 delta +24 to 19,124; task 26 delta +64 to 19,188; task 27 delta -36 to 19,152; task 28.2 delta -36 to 19,116). The margin is thin: 884 triangles (about 4.4 percent). The biggest consumers are the three bookshelves (2,352 + 2,280 + 2,088) and the three cabinets (1,316 each).
- Draw-call grouping estimate: about 344 (not `renderer.info`; was 339 before task 27).
- Lights: 4 (1 ambient + 3 point: `crt-light`, `west-light`, `arcade-light`), limit 4. Tasks 23 to 29 added none. Task 26.2 rebalanced the intensities (ambient 0.60 to 0.54, shifted 0.55 to 0.50, `crt-light` 6 to 6.5, `west-light` 6 to 7 with distance 7 to 8.5, `arcade-light` 5 to 5.5 and `#9a6ae0` to `#8a72f0`); the requested "lift to about 0.54" was a reduction from 0.60, compensated by stronger point lights.
- Procedural textures: 32, 7.703 MiB (8,076,989 bytes) estimate, limit 8 MB (task 27.1 added `cabinetAndManualDetail`, 256x128, 0.166 MiB, and sharpened `rugWoven`, `wood`, `woodDark` and `spineAtlas` in place; task 23: `lampGlow` 64x64 to 128x128, +0.062 MB; task 24 redrew it in place with no size change; task 25.1 added `coneFalloff` 64x64, 0.016 MB; task 26 redrew textures in place with anisotropy 4 on all and changed no size). The margin is also thin: about 0.30 MB. New in task 21: `couchFabric` 0.33, `crtCasing` 0.33, `crtGlass` 0.25 MB. New in task 22: `vcrDeck` 0.17, `vhsShell` 0.08, `metalCabinet` 0.33, `deskDetail` 0.04 MB; `crate` grew to 256x256 (0.33 MB) and `corkBoard` shrank to 256x256 (0.33 MB, 1.00 MB freed). The largest are the three posters and `spineAtlas` (0.66 MB each). First candidates to cut if room is needed: `console-cables` (1,088 triangles), the book count, and the three 0.66 MB posters or `spineAtlas`. Per-texture list: `performance-log.md` section 2.1.
- Colliders: 28 (the task 21 couch change and tasks 23 to 29 add none).
- Interactables: 9 (2 lamps + 7 readable documents).
- Targeting benchmark: informational timing only, varies per run (1.385 us/call standalone in task 29.3, 27.69 ms total; 0.606 us/call standalone in task 28.3; 1.681 and 2.410 us/call in the two full runs of task 28.3; 0.626 us/call in task 27.3; 1.298 us/call in task 26.3; 1.048, 3.852 and 1.833 us/call in the task 25.3 runs; it times station targeting, not the combined targeting).
All figures above are computed, not runtime-measured. Runtime frame time was measured once by the project owner **before Tasks 23 to 29, and it has not been repeated; re-measuring is recommended because Tasks 24 and 25 add additive transparent layers, Task 26 adds anisotropic filtering, Task 27 adds a texture and a themed card overlay, and Task 29.2 redraws and re-uploads the three attract textures up to 12 times per second (about 9.4 MB/s and 36 canvas redraws per second by arithmetic, not measured; the largest new runtime cost since this measurement)** (dev build, `?worldPerf=1` sampler, 60 s walkthrough): median 16.70 ms, p95 18.60 ms, 10,378 triangles and 151 draw calls in the last rendered frame. Hardware, browser, OS, resolution and date were not provided, so the Reference_Hardware targets cannot be confirmed. First-render time is not measured. See `performance-log.md` section 4.

## Task 29: open-book manual cards and animated attract screens (no App change, **not verified visually**)

World-internal changes only (computed from source and tests, not runtime-measured). `StationId` (`'vhs' | 'arcade'`, `src/core/contracts.ts:7`), `WorldSceneProps`, `onInspect` (called only for stations), colliders (28), station anchors and every file outside `src/world/` are unchanged, so `App.tsx` needs no change. No storage and no new timer (`useFrame` only).
- 29.1, open book: the three manual cards render with `data-layout="book"` as two pages, `PAGE 01 // OVERVIEW & RULES` and `PAGE 02 // TECHNICIAN / ANOMALY LOG`, side by side when the card is at least 640 px wide (container query `worldcard`, fallback media query at 760 px, helper `isStackedLayout`) and stacked below. Stitched spine, page-fold shading, ruled paper (`BOOK_PALETTES`, contrast at least 4.5:1, tested), page numbers `P. 01` / `P. 02`, an accent ribbon on the active page and the stamp `LOST MEMORY CLUB // ARCHIVE COPY`. `page` is now the active page (`aria-current="page"`), both tabpanels are rendered, and keys `1` / `2`, tab clicks and page clicks select a page. Stacked: `scrollIntoView` on a switch. Side by side: no scroll reset on a switch. The four room clues keep their layout. The `awaiting service` line moved to page 2 for LAST EXIT and DEAD FREQUENCY.
- **Pointer lock and focus.** A page click is handled by the card's native `click` listener, never requests pointer lock and keeps focus on the world wrapper (the native `mousedown` is prevented). The wrapper still ignores `[data-world-card]` targets (`controller/useWorldInput.ts:250`) and `REQUEST_POINTER_LOCK` runs only for a canvas click or key activation (`useWorldInput.ts:254`, `requestLock` at `:170`).
- 29.2, animated attract screens: `drawAttractSnakeFrame`, `drawAttractMazeFrame` and `drawAttractFrequencyFrame` are pure functions of the elapsed time; `Effects.tsx` (inside `useFrame`) steps `stepAttractClock` and calls `updateAnimatedAttractTextures`, which redraws the three existing attract canvases in place. At most 12 redraws per second, paused while inspecting, static at frame 0 under reduced motion. The collection pulse `attractPulseLevel` (1 s `sin^2` bump every 2.75 s) is tested at 240 Hz for 40 s with at most 3 direction changes in every rolling second.
- **The static art changed.** The static draw equals frame 0, but frame 0 is new art: a new snake path and fragment, gold photo glows, corridor strips and a marker in the maze, and frequency noise from a pure hash. It is not the same picture as the static screens before task 29.2.
- **Estimated cost (arithmetic, not measured):** about 9.4 MB/s of texture uploads (3 x 256 x 256 x 4 bytes x 12 per second) plus 36 canvas redraws per second. This is the largest new runtime cost since the owner's measurement; measure it.
- Computed metrics after task 29 (computed, not runtime-measured): 19,116 triangles, 344 draw-call estimate, 4 lights, 32 textures at 7.703 MiB (unchanged), 28 colliders, 9 interactables, 856 tests in 31 files.
- Known limitations: book breakpoints, spine, ribbon and stamp visuals and the fit inside the region are unverified (jsdom does no layout); the attract animation smoothness, the pulse look and the upload cost are unverified; closing a book card by walking away is untested here (the rig is mocked) and its behaviour is unchanged.
## Task 28: scrollable document card and protruding themed manuals (no App change, **not verified visually**)

World-internal changes only (computed from source and tests, not runtime-measured). `StationId` (`'vhs' | 'arcade'`), `WorldSceneProps`, `onInspect` (called only for stations), colliders (28), station anchors and every file outside `src/world/` are unchanged, so `App.tsx` needs no change.
- 28.1, card scrolling: a window `wheel` listener (`passive: false`) exists only while a card is open, calls `preventDefault` and normalises `deltaMode` (line 16 px, page = `clientHeight`). While a card is open ArrowUp / ArrowDown scroll 48 px and PageUp / PageDown about one page, routed through `onCardScroll`, so they do not move the player; W / S / A / D / ArrowLeft / ArrowRight still move, and arrows held before opening are released by physical key code. `preventDefault` for those keys is called only while a card is open. `.world-card` is the single scroll container (`pointer-events: auto`, `overflow-y: auto`, `overscroll-behavior: contain`, themed scrollbar). The wrapper click handler ignores targets inside `[data-world-card]`, and the card stops native `mousedown` and `click` propagation except on buttons (React delegation of the tab buttons). `scrollTop` resets on open and, for the four room clues, on page switch (task 29.1: not for the three book manuals, see "Task 29").
- **Pointer lock.** `requestPointerLock` is requested only from the wrapper click handler (`controller/useWorldInput.ts`, `CANVAS_CLICK`) or from a key activation (Enter or E on the capture overlay), through the `REQUEST_POINTER_LOCK` effect that runs only when `gesture` is true. Card interactions (wheel, scrollbar, clicks, tab buttons, scroll keys) never reach that path. Tests: `WorldScene.test.ts` "requests pointer lock only after a click" and "clicks and mousedown on the card body or scrollbar never request pointer lock; the canvas still does".
- 28.2, manuals: 0.085 x 0.31 x 0.29 m, spine face at x -4.555 (0.08 m forward, 0.045 m past the bookcase front), anchors (-4.52, 1.4 / 1.8 / 2.2), line-of-sight boxes equal to the book volumes (non-solid, so no collider change), 3 more ordinary books removed (165 items on `shelf-b`). The right half of `cabinetAndManualDetail` was redrawn in place (3 spine strips of 20x128, 3 cover panels of 64x42, cloth stripes); the colours `#16a34a` / `#e11d48` / `#f59e0b` are painted into the texture and the manual instance colour is white (plain white manuals without a canvas). Spines are on +X and covers on both +Z and -Z faces.
- Computed metrics after task 28 (computed, not runtime-measured): 19,116 triangles (-36 from 19,152), 344 draw-call estimate, 4 lights, 32 textures at 7.703 MiB (unchanged), 28 colliders, 9 interactables, 824 tests in 31 files.
- Known limitations: real scrollbar thumb dragging, trackpad deltas and wheel delivery under pointer lock are untested (jsdom); legibility of the spine and cover text and pixel art at runtime is unverified; the +Z and -Z cover orientation follows `BoxGeometry` defaults and is unverified visually.
## Task 27: cabinet detail and themed document card (no App change, **not verified visually**)

World-internal changes only (computed from source and tests, not runtime-measured). `StationId` (`'vhs' | 'arcade'`), `onInspect` (called only for stations), colliders (28), station anchors and every file outside `src/world/` are unchanged, so `App.tsx` needs no change.
- 27.1: new 256x128 texture `cabinetAndManualDetail` (seed 134, 174,326 bytes = 0.166 MiB): cabinet front (coin door, reject buttons `25¢` / `INSERT COIN`, louvred grille, kick plate `SER. 0996-LMC`, deck legends `MOVE` / `ACTION` / `1P START`) and three manual spines (`01 SNAKE.EXE`, `02 LAST EXIT`, `03 DEAD FREQUENCY`, `89.4 MHz`). `atlasBoxGeometry` maps UV windows onto the cabinets' player-facing face, the manuals are their own instanced meshes with remapped UVs, the cream band parts are removed (-36 triangles), the `cabinetPanel` material is new, and `rugWoven`, `wood`, `woodDark` and `spineAtlas` were sharpened in place.
- 27.2: the Archive Document Card has a per-document theme, accent, status pill, spec pills, an inline SVG header and two pages (`[1] OVERVIEW & RULES`, `[2] TECHNICIAN / ANOMALY LOG`); `paragraphs` was replaced by `pages`. Keys `1` / `2` and Numpad 1 / 2 switch pages while a card is open, without releasing pointer lock, clearing movement or moving the player. The tab buttons are clickable only when the pointer is not locked and never request pointer lock; they use `tabIndex={-1}` so focus stays on the world wrapper and `E`, `1`, `2` and `Esc` keep working. Contrast is at least 4.5:1 on every theme (unit test). Footer: `Press 1 / 2 to switch pages · E or move away to close`.
- **Diegetic status text.** `CABINET 01 // PLAYABLE` on the Snake card is in-world flavour text and is accurate only once the Snake game ships in `src/arcade/` (the current `ArcadePanel` says the engine is not implemented). The LAST EXIT and DEAD FREQUENCY cards still show `awaiting service` (on page 2 since task 29.1). All card text is placeholder lore for review by the story owner (Developer 3).
- Known limitations: `aria-live="polite"` on the whole card region may read the full page aloud on a page change; on small viewports the card scrolls since task 28.1 (before that it could not); mipmap bleed at atlas region edges is untested; glyph legibility of the 5 to 7 px legends is unverified.
## Task 26: texture craft and mid-tone lighting (no App change, **not verified visually**)

World-internal render changes only (computed, not runtime-measured). `StationId`, `onInspect`, colliders (28), station anchors and every file outside `src/world/` are unchanged, so `App.tsx` needs no change.
- Interrupted run and repair (task 26): the browser error `does not provide an export named 'VCR_CHASSIS_COLOR'` came from an import of a constant that was never exported. Fix: `export const VCR_CHASSIS_COLOR = '#2b303a'` in `scene/proceduralTextures.ts` (line 1443). All partial hunks of the interrupted run were complete and were kept, and the touched files were normalised to CRLF. The production build now bundles without a missing-export error.
- 26.1: anisotropy 4 on every `CanvasTexture` (`TEXTURE_ANISOTROPY`, set once in `createCanvasTexture`). The identified device is the media-console VCR (`vcrDeckParts`, chassis `#2b303a`) with a redrawn front panel. The loose `tapeBlack` cassettes on the desk were left unchanged (the "desk recorder" in the request may refer to them). Textures redrawn in place, none enlarged: `vcrDeck`, `wood`, `woodDark`, `floor`, `wallPanel`, `spineAtlas`, `corkBoard`, `deskDetail`, `crate`, `vhsShell`, three attract screens, three marquees, `crtGlass`. Mug coffee surface and coffee-ring stain: +64 triangles. `WALL_TEXTURE_ALBEDO` is unchanged and was not re-measured; the shifted wall tint is unverified.
- 26.2: ambient normal 0.60 to 0.54, shifted 0.55 to 0.50, `crt-light` 6 to 6.5, `west-light` 6 to 7 (distance 7 to 8.5), `arcade-light` 5 to 5.5 and `#9a6ae0` to `#8a72f0`, exposure 1 unchanged. The "lift to about 0.54" was a reduction from 0.60. Effective ambient with 2 / 1 / 0 lamps ON: normal 0.540 / 0.513 / 0.486, shifted 0.500 / 0.475 / 0.450. Floor 0.35 kept; flicker and reduced motion unchanged.

## Couch and CRT surface changes (tasks 21.1 and 21.2)
- Couch: the dark patch came from a dark "worn patch" box 4 mm above the middle cushion. It is removed, with a second hidden patch. Roll caps are 4 mm shorter to avoid coplanar faces. The pillow is in the left seat corner, checked by an oriented-box no-intersection test. The couch has 388 triangles (was 412). It uses the new `couchFabric` texture and the `couchBody`, `couchCushion` and `couchPillow` materials with metric fabric UVs, tinted by `memoryShift`.
- CRT: new `crtCasing` texture (generic "KV-1996" badge, metric UV, one tile across the front shell) and `crtGlass` on the shared `crtScreen` material (white base when textured, teal flat fallback). The casing fallback is charcoal. Geometry is unchanged (302 triangles).
- No change to `StationId`, `onInspect`, colliders or station anchors, so `App.tsx` needs no change. Task 21 is **not verified visually**.

## Detail pass (tasks 22.1 and 22.2)

World-internal render changes only (computed, not runtime-measured; **not verified visually**). No change to `StationId`, `onInspect`, colliders (still 28) or station anchors, so `App.tsx` needs no change.
- The reference monitor and the north-east CRT stack use `crtCasing`; the mint `casing` material is removed. The `fabric` and `fabricLight` materials are removed too.
- `vcrDeck` texture on the VCR face (PLAY, STOP, REW, EJECT, "HI-FI STEREO").
- Armchair on `couchFabric` (materials `armchairBody` and `armchairCushion`, slate and teal, `memoryShift` tinted, old green flat colour as no-canvas fallback).
- `vhsShell` texture on `tapeBlack`, plus the new `tapeBlue` material.
- `metalCabinet` on the filing cabinets (index cards 1994 to 1996, "TAPES 01-40", "CASE LOGS", "MISC"; the en dash in the card text is the escape `\u2013`). One tile spans the cabinet front with four drawer bands. New optional Part fields: `metricAspect`, `metricOffset`, `metricPlainV`.
- `crate` is 256x256 with cardboard on the archive boxes and a cardboard label panel on the wooden crates (`crateWood` and `cardboard` materials; shelf boxes use `crateWood`). `corkBoard` is 256x256.
- `deskDetail` (128x64): notebook cover grain and ruled page block, mug rim. The pencil moved because it intersected the notebook.
- Doorway panel insets and kickplates on the pillar and jambs, outside the openings, at most 2 cm protrusion, no colliders.
- Encoding: a byte-level scan of `src/world` found no mojibake (no UTF-8 sequences misread as Latin-1 or Windows-1252, no U+FFFD, no BOM). The garbled characters seen earlier were the terminal code page, not the files.

## Known gaps

- No restored-memory viewer component exists in the repo. No story content was invented. The HUD shows progress booleans only.
- Browser verification is missing for M6, the three-cabinet arcade pass and the end-to-end App behavior listed above.
- LAST EXIT and DEAD FREQUENCY have no game behind them; all three cabinets open the same App arcade panel (Snake). Their manuals on `shelf-b` and their Archive Document Cards are in-world lore for gameplay that does not exist.
- P2 is pending. P5, P6 and P7 are pending (see `proposals.md`).
- All Archive Document Card texts are placeholder lore pending review by the story owner (Developer 3).
- Runtime performance was measured once by the project owner before Tasks 23 to 29 and not repeated (dev build, hardware not provided): median 16.70 ms, p95 18.60 ms (see `performance-log.md` section 4). The agent took no measurement. First-render time and the Reference_Hardware confirmation are still open.

## Backward compatibility

- The prop is optional and additive. `onInspect` and `memoryShifted` keep their names and types. `StationId` is unchanged.
- If a caller omits the prop, the world behaves as in sequence (c).

## Ownership rules

- `App.tsx` remains the source of truth for panel-open state (`station`) and unlock state (`hasClue`).
- The world never reads `GameState` and does not know whether the arcade is locked. It always calls `onInspect` for the targeted station. Props (lamps and readable props) are handled inside the world and never call `onInspect`.
- The world never requests pointer lock automatically. Pointer lock is requested only from a user gesture (canvas click, or Enter/E while the capture overlay is shown).

## Sequences

### (a) Unlocked VHS or arcade request (current App)

1. Player presses E near a station. The world calls `onInspect(stationId)`.
2. `interact` sets `station`, so `inputEnabled` becomes `false`.
3. The world suspends input, clears held keys and releases pointer lock.
4. The player closes the panel. `station` becomes `null` and `inputEnabled` becomes `true`.
5. The world shows the capture overlay. It does not re-lock the pointer. The player clicks the view to re-capture.

### (b) Locked arcade request (current App)

1. Player presses E near the arcade. The world calls `onInspect('arcade')`.
2. `interact` sets only the status message and leaves `station` as `null`. The status line shows `ARCADE LOCKED · Recover the VHS clue first.`
3. `inputEnabled` stays `true`. The world releases pointer lock but stays usable (keyboard movement and look still work).
4. One click on the view re-captures the pointer.

### (c) Prop absent (not used by the current App)

1. Player presses E near a station. The world calls `onInspect(stationId)`, then suspends itself locally and releases pointer lock.
2. The player resumes with a click, Enter or E on the capture overlay. There are no timers.
3. Known limitation: the world cannot tell when the panel closed, so it may resume while a panel is still open, and it cannot distinguish the locked case from the unlocked case.

## Team coordination checklist

- [x] P1 line added to `src/App.tsx` (approved scope change M5).
- [ ] Run the manual check of sequences (a) and (b) in the running App and record the result in `manual-test-log.md` (rows I1 to I4, D1 to D6). Until then, end-to-end behavior is not verified.
- [ ] Decide on P2 (`reducedDistortion`), which would need a one-line change in `App.tsx` and a world prop.

# World Exploration Performance Log (task 15.4, figures refreshed by task 28.3)

**Status: PARTIALLY MEASURED. The project owner recorded a dev-sampler measurement (section 4). Hardware, browser, OS, resolution and date were not provided, so the Reference_Hardware targets cannot be confirmed.** The agent took no measurement itself (tasks 20.3, 21.3, 22.3, 23.3, 24.3, 25.3, 26.3, 27.3, 28.3). **The owner measurement in section 4 was taken before Tasks 23 to 28 and has not been repeated**, so it does not describe the Task 23 scene (lamps, manuals, lamp status pill), the Task 24 scene (lamp cones and pools, ceiling bloom strips, Archive Document Card, notes counter) or the Task 25 scene (banker's lamp collars and liner, soft `coneFalloff` cones at opacity 0.20, richer desk pools at 0.42, three arcade floor glows, the Club Archive Notice) the Task 26 scene (anisotropy 4 on every texture, redrawn textures, the mug coffee surface and stain, rebalanced lights) or the Task 27 scene (the 32nd texture `cabinetAndManualDetail`, cabinet front and manual spine detail, the two-page themed Archive Document Card) or the Task 28 scene (the scrollable document card, the manuals protruding 0.08 m with spine and cover art redrawn in place, three more ordinary books removed). **Re-measuring is recommended** because Tasks 24 and 25 add additive transparent layers, Task 26 adds anisotropic filtering and Task 27 adds a texture and a themed card overlay, all of which add GPU cost (two lamp cones, two desk pools, five ceiling bloom strips and three arcade floor glows) that can raise fill cost. Section 2 holds values computed from declared geometry and a build. Section 3 lists each target as computed, measured or not measured. First-render time and the targeting benchmark on the Reference_Hardware are still not measured. Describe any target without a recorded value as planned (Requirements 14.11, 14.12).

## 1. Method (human measurement)

Prepared by an agent without the Reference_Hardware. A team member performs these steps. See section 1.1 for what the agent checked.

1. From the repository root, run `npm run build`, then `npm run preview`. Open the printed URL.
2. Use a 1280x720 browser window (viewport) on the Reference_Hardware (integrated graphics). Close other heavy tabs and apps. Use a fresh page load.
3. Note the time from page load to first rendered world frame (first-render time, target <= 3 s excluding optional GLB downloads). Use the Performance panel's recording, starting at reload.
4. Walk for 60 seconds on a fixed route. Start at the spawn, go through the first east door into the Arcade_Area, walk to all three cabinets (SNAKE.EXE, LAST EXIT, DEAD FREQUENCY), go back through the second east door, and return to the start. Pass through both doors. Use W A S D (or arrows) to move and the mouse or I J K L to look. Repeat the same route for every run.
5. Record frame times with ONE of these tools:
   - **Dev sampler (dev build only).** Run `npm run dev` and open the page with `?worldPerf=1` appended to the URL. Alternatively set `window.__WORLD_PERF__ = true` before the scene mounts. The sampler is enabled only when `import.meta.env.DEV` is true (see `src/world/controller/useFrameSampler.ts`). It does nothing in `npm run build` / `npm run preview` builds. Call `window.__worldPerf.reset()` just before the walk, then `window.__worldPerf.summary()` right after it. The summary returns `frames`, `medianMs`, `p95Ms`, `triangles`, `drawCalls`, `geometries` and `textures`. The ring buffer holds the last 3600 frame samples, so keep the walk to about 60 s. Dev builds are slower than production, so treat dev-sampler numbers as a lower bound on performance and say so in the notes.
   - **Browser Performance panel (works with the preview build).** Record the 60-second walk. Read the frame durations from the Frames track, or export the trace. Report the median and 95th percentile of frame time. For triangle count and draw calls in a preview build use an external renderer-stats tool, such as a WebGL inspector extension. Note the tool in the notes.
6. Fill section 4 with raw numbers. Copy the full `summary()` output (or the trace statistics) as pasted text. Do not round in a favorable direction.
7. Targeting benchmark: re-run `npx vitest run src/world/logic/targeting.bench.test.ts` on the Reference_Hardware and paste the `[targeting bench]` line.

### 1.1 Agent attempt at a runtime measurement (task 20.3)

**No runtime measurement was taken by the agent.** Checked without installing anything and without touching package.json:

- Installed browsers found: Google Chrome (C:\Program Files\Google\Chrome\Application\chrome.exe) and Microsoft Edge (C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe).
- Automation libraries in `node_modules`: playwright, playwright-core, @playwright/test, puppeteer, puppeteer-core are all absent, and there is no ms-playwright browser cache.
- Without one of those libraries the agent would have to write a DevTools protocol client by hand and also fake pointer lock and keyboard input in a headless page. That would not give a trustworthy 60 s walk, and headless frame times would not represent the Reference_Hardware anyway. So nothing was measured and no runtime number is recorded.

**Exact sign-off steps for a human on the Reference_Hardware:**

1. Run `npm run dev` and open the printed URL with `?worldPerf=1` appended.
2. In the DevTools console run window.__worldPerf.reset().
3. Walk for about 60 s through both doors to all three cabinets and back.
4. In the console run window.__worldPerf.summary().
5. Copy `frames`, `medianMs`, `p95Ms`, `triangles`, `drawCalls`, `geometries` and `textures` into section 4, fill the environment table below, and add the note that dev builds are slower than production.

The project owner has since followed steps 1 to 5 above (see section 4). The agent attempt above remains as history.

### Environment fields

**Request: please fill in every "not provided" field below (hardware/GPU, browser and version, OS, window resolution, date, and the rest).**

| Field | Value |
| --- | --- |
| Date | not provided |
| Recorded by | project owner |
| Hardware (CPU / GPU / RAM) | not provided |
| GPU type (integrated or discrete) | not provided |
| OS and version | not provided |
| Browser and version | not provided |
| Power mode (battery or plugged in) | not provided |
| Display refresh rate | not provided (the median suggests 60 Hz, not verified) |
| Window size | not provided (Reference_Hardware expects 1280x720) |
| Build under test (`preview` or `dev`) | dev build |
| Git commit | not provided |
| Measurement tool | `?worldPerf=1` dev sampler (`window.__worldPerf.summary()`) |

## 2. Computed static metrics
**Computed from declared geometry, NOT runtime-measured.** Computed on the working-tree state at the time of task 28.3 (uncommitted changes present). Every number in this section is **computed, not runtime-measured**. Machine for these commands is unspecified (Windows, PowerShell). Nothing in this section is a frame-time or GPU measurement.
### 2.1 Scene detail (`npx vitest run src/world/scene/modelDetail.test.ts`)
State of the scene after tasks 20.1, 20.2, 21.1, 21.2, 22.1, 22.2, 23.1, 23.2, 24.1, 24.2, 25.1, 25.2, 26.1, 26.2, 27.1, 27.2, 28.1 and 28.2 (**not verified visually**, no browser run; none of these passes has been seen in a browser). Layout (from `roomLayout.ts`):
- **Three arcade cabinets** against the east wall of the Arcade_Area, x 8.4..9.2, facing -X toward both east doorways, each `onInspect('arcade')`:
  - SNAKE.EXE: z -1.7..-0.7, anchor (8.4, -1.2), `arcadeGame` `'snake'`.
  - LAST EXIT: z -0.5..0.5, anchor (8.4, 0), `arcadeGame` `'maze'`.
  - DEAD FREQUENCY: z 0.7..1.7, anchor (8.4, 1.2), `arcadeGame` `'frequency'`.
- The optional `arcadeGame` field is world data only. `App.tsx` and `src/arcade/` are unchanged, so every cabinet currently opens the same App arcade panel, and only Snake exists in `src/arcade/`. LAST EXIT and DEAD FREQUENCY are attract-screen art for games that are NOT implemented.
- Moved dressing: `crt-stack` is now in the main-room north-east corner (x 4.3..4.9, z -3.2..-2.6); `crate-a` and `crate-b` are at x 4.3..4.9 in the south-east; cable decals run between the cabinets. The companion cabinet is removed.
- Lights: `crt-light` (0, 1.6, -0.6), `west-light` (-2.6, 2.3, 0.2) and `arcade-light` (7.4, 2.4, 0) with distance 6 (it replaces the earlier unnamed arcade light at (7.3, 2.4, 0)). Intensities as of task 26.2: 6.5 / 7 (distance 8.5) / 5.5, ambient 0.54 (see the Task 26 table below).
- Cabinet parts are high-craft (stepped side wing, tilted screen hood, coin slots, grilles, buttons, T-molding accents in green, crimson and amber).
- Textures: 6 new (`attractSnake`, `attractMaze`, `attractFrequency`, `marqueeSnake`, `marqueeMaze`, `marqueeFrequency`) and 4 removed (`arcadeScreen`, `marquee`, `deck`, `outOfOrder`).
- Task 21.1 (couch): the dark patch was a dark "worn patch" box 4 mm above the middle cushion. It is removed, together with a second hidden patch. Roll caps are shortened by 4 mm to avoid coplanar faces. The pillow is placed in the left seat corner (oriented-box no-intersection test). The couch drops from 412 to 388 triangles, with no new collider. New texture `couchFabric` (256x256, 0.33 MB, metric fabric UVs) and materials `couchBody`, `couchCushion` and `couchPillow`, tinted by `memoryShift`.
- Task 21.2 (CRT): new textures `crtCasing` (256x256, 0.33 MB, generic "KV-1996" badge, metric UV, one tile across the front shell) and `crtGlass` (256x256, 0.25 MB) on the shared `crtScreen` material (white base when textured, teal flat fallback). The casing fallback is now charcoal. `crt-television` stays at 302 triangles / 9 draw calls.
- Task 22 (computed, not runtime-measured, **not verified visually**):
  - `corkBoard` 512x512 to 256x256 (metric UV factor k = w/512), freeing 1.00 MB.
  - The reference monitor and the north-east CRT stack use `crtCasing`; the mint `casing` material is removed.
  - `vcrDeck` (256x128, 0.17 MB): VCR face with PLAY, STOP, REW, EJECT and "HI-FI STEREO".
  - Armchair on `couchFabric` with materials `armchairBody` and `armchairCushion` (slate and teal, `memoryShift` tinted; the old green flat colour is the no-canvas fallback).
  - `vhsShell` (128x128, 0.08 MB) on `tapeBlack`, plus the new `tapeBlue` material.
  - `metalCabinet` (256x256, 0.33 MB) on both filing cabinets: index cards 1994 to 1996, drawer labels "TAPES 01-40", "CASE LOGS", "MISC". One tile spans the cabinet front with four drawer bands. The en dash in the card text is written as the escape `\u2013`. New optional Part fields: `metricAspect`, `metricOffset`, `metricPlainV`.
  - `crate` 256x256 (0.33 MB): cardboard on the archive boxes, a cardboard label panel on the wooden crates (`crateWood` and `cardboard` materials); shelf boxes use `crateWood`.
  - `deskDetail` (128x64, 0.04 MB): notebook cover grain and ruled page block; mug rim; the pencil moved because it intersected the notebook.
  - Doorway panel insets and kickplates on the pillar and jambs, outside the openings, protruding at most 2 cm, no colliders.
  - The `fabric`, `fabricLight` and `casing` materials are removed.
  - Net effect: 19,128 to 19,172 triangles (+44), 286 to 319 draw calls, 26 to 30 textures, 7.58 to 7.459 MB.
- Task 23 (computed, not runtime-measured, **not verified visually**):
  - `lampGlow` 64x64 to 128x128 (0.021 MB to 0.083 MB, +0.062 MB): a multi-stop radial gradient with 7 stops, alpha 0 at 90 percent of the half-width, and a filament core.
  - Two desk lamps on the reception desk: `desk-lamp-left` (green banker's lamp) and `desk-lamp-right` (cream table lamp), each with a bulb, an inner shade glow, a camera-facing glow sprite and a desk light pool. ON and OFF are different shared materials. **No light was added** (4 lights).
  - Interactable props: world-only `PropInteractableId` (task 23: `desk-lamp-left`, `desk-lamp-right`, `manual-snake`, `manual-maze`, `manual-frequency`; task 24.2 adds `desk-notebook`, `cork-board`, `poster-shift`, eight in total at that time; task 25.2 adds `poster-archive`, nine now), combined targeting `selectInteractionTargetAll` (stations 2.0 m, props 2.2 m), `PROP_INTERACT` effect that never calls `onInspect`. Lamp state is session-only React state in `WorldScene` (no storage, not in `GameState`). Lamp status pills (and, in task 23 only, the manual texts) showed in the world-owned `WorldMessage` overlay (`role="status"`), not in the App HUD status line, with no timer. **Superseded by task 24.2:** manuals and the other readable props open the Archive Document Card instead, and the pill is used for the lamps only (texts: `Banker's lamp switched ON/OFF`, `Table lamp switched ON/OFF`). The per-frame cost of the combined targeting is not measured (the benchmark in section 2.3 times station targeting only).
  - Three manual books on `shelf-b` level 2 (y 1.117..1.397, z 1.4 / 1.8 / 2.2; emerald, crimson, amber; their geometry and anchors were changed by task 28.2, see the Task 28 entry below); 7 ordinary books were removed from that row in task 23 (task 27 removed the cream bands and task 28.2 removed 3 more books). The LAST EXIT and DEAD FREQUENCY manual texts describe gameplay that does not exist in `src/arcade/` (in-world lore only).
  - Net effect: 19,172 to 19,042 triangles (-130: lamps -118, manuals -12), 319 to 325 draw calls, 30 textures, 7.459 to 7.521 MB, 4 lights, 28 colliders.
- Task 24.1 (computed, not runtime-measured, **not verified visually**; no light added):
  - `lampGlow` is redrawn in place (still 128x128, 0.083 MB): a warm-white core, a golden-amber mid falloff and a long soft feather to alpha 0.
  - Two additive volumetric cones, one per lamp, from the shade rim to the desk top: 12-segment open cone (24 triangles each), opacity 0.14, `DoubleSide`, `depthWrite` false. Two additive desk light pools, one per lamp (`lampPool`, `lampPoolBanker`, opacity 0.32, polygon offset), 2 mm above the desk top.
  - **Pool radius limit, stated plainly:** the requested 0.85 m pool radius was not possible on a 0.8 m deep desk. The pool radius is capped to half the desk depth, so the decal is a 0.8 m quad (the 0.8 m desk depth). Its visible disc (90 percent of the quad) is about 0.36 m. The placement is kept inside the desk top (`lampPoolPlacement` in `modelDetail.ts`).
  - Emissive shades: banker shade ON `#22c55e` at 0.75, table shade ON `#ffd27d` at 0.85; the OFF shades have emissive intensity 0.
  - Room light coupling by lamps ON (ambient / west-light multipliers): 2 ON = 1.00 / 1.00, 1 ON = 0.95 / 0.88, 0 ON = 0.90 / 0.75. Applied by `applyShift` after the Memory_Shift blend and computed from the authored base values each frame, so it does not accumulate. The ambient floor is kept. `crt-light` and `arcade-light` are untouched. (`scene/lampCoupling.ts`, `scene/memoryShift.ts`, `scene/MemoryShiftDriver.tsx`.)
  - Additive bloom strips (2 triangles each, opacity 0.16, cool white) under **five** ceiling fixtures (there are five, not two), using `lampGlow` as the map.
  - Lights: 4, unchanged.
- Task 24.2 (computed, not runtime-measured, **not verified visually**): the readable props (desk notebook, cork board, Memory_Shift overlay poster) were already scene geometry, so 24.2 adds eight interactable definitions (two lamps, three manuals, three readable notes) and the world overlay components `WorldInspectorCard` and `NotesCounter`, but no new triangles, textures or lights. Net effect of Task 24 on the totals: 19,042 to 19,100 triangles (+58; arithmetic check: 2 cones x 24 + 5 bloom strips x 2 = 58), 325 to 332 draw calls (estimate), 30 textures, 7.521 MB (unchanged), 4 lights, 28 colliders.
- Task 25.1 (computed, not runtime-measured, **not verified visually**; no light added): `desk-notebook` moved to anchor (-0.58, 1.62) (was (-0.95, 1.7)), the guest book nudged 0.12 m back and the pencil moved with the pad. From the console front (0, -0.5) the notebook is now within 2.2 m and is selected there (behaviour change). New 64x64 `coneFalloff` texture (seed 133, linear filter, no mipmaps, 0.016 MB, flat-colour fallback, one disposal) on both lamp cones; cone opacity 0.14 to 0.20; no UV flip needed. Banker's lamp brass collars (+16 triangles, a new 8-triangle collar geometry) and a `#fff1cc` liner (+2). Green ON shade `#16a34a` at 0.38 (was `#22c55e` at 0.75). Desk pool opacity 0.42 (was 0.32).
- Task 25.2 (computed, not runtime-measured, **not verified visually**; no light added, no texture added): three additive arcade floor glows reuse `lampGlow` at x 7.8, z -1.2 / 0 / 1.2, 0.9 x 0.9 m, opacity 0.26, colours `#22c55e` / `#e11d48` / `#f59e0b`, at y 0.014 (the requested 0.003 would sit under the runner decal at 0.011), +6 triangles. The framed ARCHIVE poster is the 7th readable document, `poster-archive`, anchor (7.5, -1.93) (the suggested (5.58, -2.0) lies on the Arcade_Area boundary and 1.92 m from the poster). The card text is placeholder lore for review by the story owner. The counter reads "NOTES READ: X / 7", derived from `READABLE_COUNT`.
- Net effect of task 25: 19,100 to 19,124 triangles (+24: collars +16, liner +2, floor glows +6), 332 to 337 draw-call estimate, 30 to 31 textures, 7.521 to 7.537 MB, 4 lights, 28 colliders, 9 interactables (2 lamps + 7 readable documents).
- Task 26 (computed, not runtime-measured, **not verified visually**; no light added, no texture added or enlarged):
  - Interrupted run and repair: the browser error `does not provide an export named 'VCR_CHASSIS_COLOR'` came from an import of a constant that was never exported. Fix: `export const VCR_CHASSIS_COLOR = '#2b303a'` in `scene/proceduralTextures.ts` (line 1443). All partial hunks of the interrupted run were complete and were kept, and the touched files were normalised to CRLF. The production build now bundles without a missing-export error.
  - 26.1: anisotropy 4 on every `CanvasTexture` (`TEXTURE_ANISOTROPY`, `sharedResources.ts`, set once in `createCanvasTexture`). The identified device is the media-console VCR (`vcrDeckParts`, `vcrDeck` material, chassis `#2b303a`, was `#2e2f36`) with a redrawn front panel (trim, cassette bay with reels, silver and amber buttons, green and red LEDs). The near-black loose `tapeBlack` cassettes on the desk were left unchanged; if the "desk recorder" meant them, that part was not done. Textures redrawn in place (same size): `vcrDeck`, `wood`, `woodDark`, `floor`, `wallPanel`, `spineAtlas`, `corkBoard`, `deskDetail`, `crate`, `vhsShell`, the three attract screens, the three marquees and `crtGlass`. Mug coffee surface and coffee-ring stain: +64 triangles (two 8-sided discs). `WALL_TEXTURE_ALBEDO` unchanged and not re-measured, so the shifted wall tint is **unverified**.
  - 26.2: lighting balance (see the table below). The requested "lift to about 0.54" was a reduction from 0.60, compensated by stronger point lights.
  - Net effect of task 26: 19,124 to 19,188 triangles (+64), 337 to 339 draw-call estimate, 31 textures, 7.537 MB (unchanged), 4 lights, 28 colliders, 9 interactables.

- Task 27 (computed, not runtime-measured, **not verified visually**; no light added, no collider added):
  - 27.1: new 256x128 texture `cabinetAndManualDetail` (seed 134, 174,326 bytes = 0.166 MiB): left half cabinet front (coin door, reject buttons with `25¢` / `INSERT COIN`, louvred grille, kick plate `SER. 0996-LMC`, control-deck legends `MOVE` / `ACTION` / `1P START` on the deck's front lip), right half three manual spines (`01 SNAKE.EXE`, `02 LAST EXIT`, `03 DEAD FREQUENCY`, emblems, `89.4 MHz`) on neutral backgrounds (task 28.2 later redrew this half in place with the final cloth colours and a white instance colour). `atlasBoxGeometry` maps UV windows onto the cabinets' player-facing face; the manuals are their own instanced meshes with remapped UVs; the cream band parts were removed (-36 triangles); new `cabinetPanel` material; `rugWoven`, `wood`, `woodDark` and `spineAtlas` sharpened in place (same sizes).
  - 27.2: the Archive Document Card became a themed two-page card (DOM and CSS overlay; no triangles, textures or lights). It adds no GPU geometry, but it is a new overlay layer and has not been measured.
  - Net effect of task 27: 19,188 to 19,152 triangles (-36), 339 to 344 draw-call estimate (the manuals are now separate instanced meshes; `shelf-b` 17 to 19 draws), 31 to 32 textures, 7.537 to 7.703 MiB (8,076,989 bytes; +174,326 bytes for the new texture), 4 lights, 28 colliders, 9 interactables.
- Task 28 (computed, not runtime-measured, **not verified visually**; no light added, no texture added or enlarged, no collider added):
  - 28.1: the Archive Document Card became a scroll container (DOM and CSS only: no triangles, textures or lights, but a new interactive overlay layer that has not been measured). A window `wheel` listener (`{ passive: false }`, `preventDefault`, `deltaMode` normalised: line 16 px, page = `clientHeight`) exists only while a card is open (`overlay/WorldInspectorCard.tsx:153`). While a card is open ArrowUp / ArrowDown scroll 48 px and PageUp / PageDown about one page, routed through `onCardScroll`, and do not move the player; W / S / A / D / ArrowLeft / ArrowRight still move, and arrows held before opening are released by physical key code. `preventDefault` for those keys is called only while a card is open. `.world-card` has `pointer-events: auto`, `overflow-y: auto`, `overscroll-behavior: contain` and a themed scrollbar. The wrapper click handler ignores targets inside `[data-world-card]`, the card stops native `mousedown` and `click` propagation except on buttons, and `scrollTop` resets on open and on page switch. No new timer and no storage.
  - 28.2: the three manuals are 0.085 x 0.31 x 0.29 m, protrude 0.08 m (spine face at x -4.555, 0.045 m past the bookcase front), have anchors (-4.52, z) with z 1.4 / 1.8 / 2.2, and their line-of-sight boxes are the book volumes (non-solid). Three more ordinary books were removed (`shelf-b` has 165 items including slipcases). The right half of `cabinetAndManualDetail` was redrawn in place (256x128, 0 extra bytes): 3 spine strips of 20x128, 3 cover panels of 64x42 and cloth stripes, with the colours `#16a34a` / `#e11d48` / `#f59e0b` painted into the texture and a white manual instance colour (without a canvas the manuals render plain white). Spines are on +X and covers on both +Z and -Z faces.
  - Net effect of task 28: 19,152 to 19,116 triangles (-36, from the 3 removed books), 344 draw-call estimate (unchanged), 32 textures, 7.703 MiB (8,076,989 bytes, unchanged), 4 lights, 28 colliders, 9 interactables.
  - Known limitations: real scrollbar thumb dragging, trackpad deltas and wheel delivery under pointer lock are untested (jsdom); the legibility of the spine and cover text and pixel art at runtime is unverified; the +Z and -Z cover orientation follows `BoxGeometry` defaults and is unverified visually.
| Light or setting | Before task 26.2 | After task 26.2 |
| --- | --- | --- |
| Ambient, normal state (both lamps ON) | 0.60 | 0.54 |
| Ambient, shifted state | 0.55 | 0.50 |
| `crt-light` intensity | 6 | 6.5 |
| `west-light` intensity | 6 | 7 |
| `west-light` distance | 7 | 8.5 |
| `arcade-light` intensity | 5 | 5.5 |
| `arcade-light` colour | #9a6ae0 | #8a72f0 |
| Tone mapping | ACESFilmic, exposure 1 | unchanged |

**Plain statement:** the requested "lift to about 0.54" is a reduction of the normal ambient from 0.60, not a lift. It is compensated by stronger point lights (CRT +8 percent, west +17 percent with a wider reach, arcade +10 percent). The effect on the image has not been seen in a browser.

Effective ambient (authored value times the lamp factor; computed): normal 0.540 / 0.513 / 0.486 with 2 / 1 / 0 lamps ON; shifted 0.500 / 0.475 / 0.450. The ambient floor 0.35 is kept. Flicker and reduced motion are unchanged.
- Unchanged: the VHS media console layout, rug, reception desk, bulletin board, wood bookcases and textured walls.

Console lines, verbatim (task 28.3; the `[18.2]` and `[28.2]` lines were copied from the standalone `npx vitest run src/world/scene/modelDetail.test.ts` run, 176 tests passed, and the other lines from the two full `npm test` runs, which print the same values). The `[15.7]`, `[19.2]` and `[20.2]` lines print the same 32 textures as `[22.1]`, at two or three decimals; `[22.1]` is shown in full. The `[22.2B]`, `[23.1]`, `[23.2]`, `[24.1]`, `[24.2]` and `[25.1]` deltas are printed against fixed baselines inside the older tests (19,056, 19,172, 19,054, 19,042 and 19,100), not against the previous task, so only the totals are comparable across tasks. `[28.2]` is printed against 19,152, the task 27 total, so its delta is the real change of task 28.2:
```
[18.2] computed triangles: 19116 (detail 18874 + base 242), draw-call estimate (grouped by geometry+material): 344, books 363, slipcases 136, leaning 16, per shelf shelf-a=16 draws/178 books, shelf-b=19 draws/165 books, shelf-c=16 draws/156 books, textures 32, texture memory estimate 7.70 MB
[18.3] computed triangles: 19116 (detail 18874 + base 242), draw-call estimate: 344, textures 32, texture memory estimate 7.70 MB, lights 4 (computed, not runtime-measured)
[21.1] couch triangles: 388 (before 412), total 19116, textures 32, texture memory 7.70 MB
[21.2] computed triangles 19116, crt-television 302 triangles / 9 draw calls, draw-call estimate 344, textures 32, texture memory estimate 7.70 MB (computed, not runtime-measured), lights 4
[22.1] computed triangles 19116, draw-call estimate 344, textures 32, texture memory estimate 7.703 MB (computed, not runtime-measured): attractSnake 256x256=0.250MB, attractMaze 256x256=0.250MB, attractFrequency 256x256=0.250MB, marqueeSnake 256x64=0.063MB, marqueeMaze 256x64=0.063MB, marqueeFrequency 256x64=0.063MB, signFace 512x128=0.333MB, posterSunset 256x512=0.665MB, posterReel 256x512=0.665MB, shiftPoster 256x512=0.665MB, shiftPlaque 256x128=0.166MB, floor 128x128=0.083MB, wood 128x128=0.083MB, woodDark 128x128=0.083MB, crate 256x256=0.333MB, grille 128x128=0.083MB, spineAtlas 512x256=0.665MB, wallPanel 256x256=0.333MB, rugWoven 256x256=0.333MB, corkBoard 256x256=0.333MB, lampGlow 128x128=0.083MB, smpteBars 256x128=0.125MB, timecode 128x32=0.016MB, couchFabric 256x256=0.333MB, crtCasing 256x256=0.333MB, crtGlass 256x256=0.250MB, vcrDeck 256x128=0.166MB, vhsShell 128x128=0.083MB, metalCabinet 256x256=0.333MB, deskDetail 128x64=0.042MB, coneFalloff 64x64=0.016MB, cabinetAndManualDetail 256x128=0.166MB
[22.2A] triangles 19116, draw calls 344, textures 32, texture memory 7.703 MB (computed, not runtime-measured), metalCabinet 0.333 MB, crate 0.333 MB
[22.2B] triangles 19116 (delta 60), draw calls 344, textures 32, texture memory 7.703 MB (computed, not runtime-measured), deskDetail 0.042 MB
[23.1] triangles 19116 (delta -56), draw-call estimate 344, texture memory 7.703 MiB
[23.2] triangles 19116 (delta from 23.1 62), texture memory 7.703 MiB
[24.1] triangles 19116 (delta 74), draw-call estimate 344, texture memory 7.703 MiB
[24.2] triangles 19116 (delta from 19042 74), texture memory 7.703 MiB
[25.1] triangles 19116 (delta 16), textures 32, texture memory 7.703 MB (computed)
[28.2] triangles 19116 (delta -36), textures 32, texture memory 7.703 MiB (computed)
```
The baselines inside the older tests are fixed numbers, so their deltas (60, -56, 62, 74, 74, 16) are not task-by-task changes. The real change from task 27.3 to task 28.2 is -36 triangles (19,152 to 19,116: three more ordinary books were removed from the `shelf-b` row to make room for the protruding manuals) and 0 bytes of texture memory (the right half of `cabinetAndManualDetail` was redrawn in place).
Result: `modelDetail.test.ts` 176 tests passed (standalone run and full suite, task 28.3).
| Metric | Computed value (computed, not runtime-measured) | Notes |
| --- | --- | --- |
| Triangles | 19,116 | detail 18,874 + base 242, from declared geometry; limit 20,000 (test limit 19,200); margin 884; task 28.2 delta -36 (from 19,152, three more books removed) |
| Draw-call estimate | 344 (unchanged by task 28; was 339 before task 27) | grouped by geometry + material; an estimate, not `renderer.info.render.calls` |
| Books | 363 as printed by the `[18.2]` line (per-shelf item counts 178 + 165 + 156 = 499 also include the 136 slipcases) | 16 leaning books are included; task 28.2 removed 3 ordinary books from `shelf-b` |
| Textures | 32 | procedural canvas textures, all registered for disposal; anisotropy 4 on each (`TEXTURE_ANISOTROPY`, `sharedResources.ts:517`, applied at `sharedResources.ts:561`); task 27.1 added `cabinetAndManualDetail` |
| Texture memory estimate | 7.703 MiB (8,076,989 bytes) | estimate; limit 8 MB (test limit 7.85 MB); margin about 0.30 MB; task 27.1 added 174,326 bytes |
| Lights | 4 | 1 ambient + 3 point, `Lighting.tsx:51-54` (`M3_LIGHT_COUNT = 4`, line 14); tasks 23 to 28 added none |
| Colliders | 28 | unchanged by tasks 22 to 28 |
| Interactables | 9 | 2 lamps + 7 readable documents (3 manuals, notebook, cork board, shift poster, archive poster) |

**Triangle margin is thin.** 19,116 leaves only 884 triangles (about 4.4 percent) below the 20,000 limit (computed, not runtime-measured). Any further dressing should be paid for by removing geometry elsewhere. First candidates to cut: `console-cables` (1,088 triangles) and the book count (363 books). The biggest consumers, computed in task 21.3 by summing each declared object's parts with `declaredObjects()` and `countTriangles()` in a throwaway test (not kept in the repo; `modelDetail.test.ts` prints only totals; task 22 added 44 triangles overall, task 23 changed the total by -130, task 24 by +58, task 25 by +24, task 26 by +64, task 27 by -36 and task 28.2 by -36; these per-object figures were not recomputed after task 22, and `shelf-b` and `desk` now differ): `shelf-a` 2,352, `shelf-b` 2,280, `shelf-c` 2,088, each arcade cabinet 1,316 (three cabinets, 3,948 together), `console-cables` 1,088, `filing-cabinet-a` and `filing-cabinet-b` 692 each, `desk` 672.

**Texture memory margin is also thin.** The computed 7.703 MiB (8,076,989 bytes) leaves about 0.30 MB below the 8 MB limit (computed, not runtime-measured). The largest textures are the three 256x512 posters (`posterSunset`, `posterReel`, `shiftPoster`, 0.66 MB each) and `spineAtlas` (512x256, 0.66 MB); any of them could shrink if room is needed. Task 22 freed 1.00 MB by shrinking `corkBoard` from 512x512 to 256x256, then spent most of it on four new textures and the larger `crate`. Per-texture estimate line (from `proceduralTextures.test.ts`, `[15.7]`): `textures: 32, attractSnake 256x256=0.25MB, attractMaze 256x256=0.25MB, attractFrequency 256x256=0.25MB, marqueeSnake 256x64=0.06MB, marqueeMaze 256x64=0.06MB, marqueeFrequency 256x64=0.06MB, signFace 512x128=0.33MB, posterSunset 256x512=0.66MB, posterReel 256x512=0.66MB, shiftPoster 256x512=0.66MB, shiftPlaque 256x128=0.17MB, floor 128x128=0.08MB, wood 128x128=0.08MB, woodDark 128x128=0.08MB, crate 256x256=0.33MB, grille 128x128=0.08MB, spineAtlas 512x256=0.66MB, wallPanel 256x256=0.33MB, rugWoven 256x256=0.33MB, corkBoard 256x256=0.33MB, lampGlow 128x128=0.08MB, smpteBars 256x128=0.13MB, timecode 128x32=0.02MB, couchFabric 256x256=0.33MB, crtCasing 256x256=0.33MB, crtGlass 256x256=0.25MB, vcrDeck 256x128=0.17MB, vhsShell 128x128=0.08MB, metalCabinet 256x256=0.33MB, deskDetail 128x64=0.04MB, coneFalloff 64x64=0.02MB, cabinetAndManualDetail 256x128=0.17MB, total 7.70 MB (estimate, budget 8 MB).
### 2.2 Declared configuration (read from source)
| Metric | Computed value | Source |
| --- | --- | --- |
| Light count | 4 (1 ambient + 3 point lights: `crt-light` (0, 1.6, -0.6) 6.5, `west-light` (-2.6, 2.3, 0.2) 7 with distance 8.5, `arcade-light` (7.4, 2.4, 0) 5.5 with distance 6) | `src/world/scene/Lighting.tsx` (`M3_LIGHT_COUNT = 4`, line 14; the four light declarations are at lines 51-54) |
| Shadow maps | disabled (`shadows={false}`) | `src/world/scene/WorldCanvas.tsx` |
| DPR cap | `dpr={[1, 1.5]}` (max 1.5) | `src/world/scene/WorldCanvas.tsx` |
| Collider count | 28 (9 walls + 4 door frames + 15 solid props) | targeting benchmark line (section 2.3) and `roomLayout.test.ts:196` |
| Station count | 4 (`vhs` plus three `arcade` cabinets) | same line |
| GLB total size | 0 bytes (`public/models/` contains only `.gitkeep`; no `.glb` anywhere in `public`, `src` or `tools`) | directory listing |
### 2.3 Targeting benchmark (`npx vitest run src/world/logic/targeting.bench.test.ts`)
Informational, this machine, not a pass/fail threshold; machine unspecified. It times station targeting only (`selectInteractionTarget`), not the combined `selectInteractionTargetAll`. Console line, verbatim (task 28.3 standalone run):
```
[targeting bench] method: performance.now around 20000 calls, 254 reachable cells x 16 yaws, 4 stations, 28 colliders. measured total 12.12 ms; computed 0.606 us/call; 1308 calls returned a station. No threshold applied.
```
The task 27.3 standalone run printed `12.52 ms; 0.626 us/call` and the task 26.3 one `25.97 ms; 1.298 us/call`. The two full `npm test` runs of task 28.3 printed `33.61 ms; 1.681 us/call` (run 1) and `48.21 ms; 2.410 us/call` (run 2) while other test files ran in parallel. The two full `npm test` runs of task 25.3 (kept for comparison) printed `measured total 77.03 ms; computed 3.852 us/call` (run 1) and `36.66 ms; 1.833 us/call` (run 2), for the same workload while other test files ran in parallel. Timing varies per run. This is a CPU timing on an unspecified machine and does not show frame-time performance. It must be re-run on the Reference_Hardware (step 7).
### 2.4 Build output (`npm run build`, Vite 7.3.8)
Command exit code 0 (`tsc --noEmit` and `vite build`; 105 modules transformed; built in 5.24 s; task 28.3 run; no missing-export error). PowerShell wraps Vite's chunk-size warning (written to stderr) in a `NativeCommandError` record when run directly; it is only the warning, not a failure.
| Asset | Size | Gzip |
| --- | --- | --- |
| `dist/index.html` | 0.62 kB | 0.37 kB |
| `dist/assets/index-BlzUfg35.css` | 10.25 kB | 2.75 kB |
| `dist/assets/index-Coxpm7Xi.js` | 1,313.89 kB | 378.01 kB |
**Warning:** Vite reports a chunk larger than 500 kB after minification (the single JS bundle is 1,313.89 kB). This is expected with Three.js and React Three Fiber in one chunk. It is not an error, and no code splitting was applied. The bundle size affects download and parse time, which may affect first-render time on the Reference_Hardware. `dist/` is git-ignored and was not committed.
Related checks run for task 28.3: `npm run typecheck` exit 0; `npm run build` exit 0; `npm test` run twice, each `Test Files  31 passed (31)` and `Tests  824 passed (824)`, exit 0, no timeout (durations 8.02 s and 8.07 s). **Flakiness under load:** task 24.3 had three full runs with 1, 2 and 4 CPU-heavy tests timing out at the 5 s default while the same files passed alone; those four tests now have an explicit 30,000 ms per-test timeout (assertions unchanged), and none of the task 25.3, 26.3, 27.3 and 28.3 runs timed out. See `test-report.md` for the table. These are test-suite timings, not runtime frame measurements.
## 3. Target table
Initial targets from `requirements.md`, Requirement 14. "Computed" means derived from declared geometry or source, not measured at runtime. "Measured" values come from section 4 (project owner, dev build, `?worldPerf=1` sampler, 60 s walkthrough).
| Target | Req. | Threshold | Status |
| --- | --- | --- | --- |
| Median frame time at 1280x720, integrated graphics | 14.8 | <= 20 ms | measured: 16.70 ms, met on the owner's machine |
| 95th-percentile frame time at 1280x720, integrated graphics | 14.9 | <= 33 ms | measured: 18.60 ms, met on the owner's machine |
| First render after mount, excluding optional GLB downloads | 14.10 | <= 3 s | not measured |
| Triangles in rendered scene | 14.4 | <= 20,000 | computed: 19,116 (declared geometry; margin 884; runtime `renderer.info` not measured) |
| Triangles, runtime `renderer.info.render.triangles` | 14.4 | <= 20,000 | measured: 10,378 in the last rendered frame from one camera position (see section 4.2; not a whole-scene count) |
| Draw calls | n/a (reported by task 15.4) | no threshold set | computed: 344 estimate; measured before Tasks 23 to 28: 151 in the last rendered frame (section 4.2) |
| Simultaneous dynamic lights | 14.2 | <= 4 | computed: 4 (1 ambient + 3 point; tasks 23 to 28 added none) |
| Device pixel ratio cap | 14.1 | 1.5 | computed: `dpr={[1, 1.5]}` in source; runtime not measured |
| Real-time shadow maps | 14.3 | disabled by default | computed: `shadows={false}` in source |
| Post-processing passes | 14.5 | none, or at most one disablable pass | not measured (no pass found by this log; not verified here) |
| GLB total size | task 15.4 / assets | <= 5 MB | computed: 0 bytes (no GLB files in `public/models/`) |
| Texture memory | n/a | <= 8 MB (budget set in `proceduralTextures.test.ts`) | computed: 7.703 MiB estimate (32 textures, 8,076,989 bytes); limit 8 MB, margin about 0.30 MB (test limit 7.85 MB); largest are the three posters and spineAtlas (0.66 MB each) |
| Collider count | n/a | no threshold set | computed: 28 |
| Production JS bundle | n/a | no threshold set | computed: 1,313.89 kB (378.01 kB gzip), exceeds Vite 500 kB warning |
| Targeting benchmark | n/a | no threshold (informational) | computed: 0.606 us/call (task 28.3 standalone run; 0.626 us/call in task 27.3; 1.681 and 2.410 us/call in the two full runs of task 28.3; station targeting only), this machine, unspecified |
Notes: the 5 MB GLB limit is not stated in Requirement 14 and comes from the task request; confirm the source (asset manifest or `THIRD_PARTY_ASSETS.md`) before citing it. Rows marked "no threshold set" have no target in Requirement 14.
**Reference_Hardware caveat:** the requirement's Reference_Hardware (integrated graphics at 1280x720) cannot be confirmed, because the hardware and window resolution were not recorded. The two frame-time rows are met on the owner's machine only. First-render time (<= 3 s) is still not measured.

**No target is achieved without a recorded runtime value in section 4.** Computed rows only show that declared geometry is within the stated limit.
## 4. Recorded runtime results

Measured by the project owner, dev build, ?worldPerf=1 sampler, 60 s walkthrough across both rooms and all three arcade cabinets. **This measurement predates Tasks 23 to 28 and has not been repeated.** The scene at that time had no interactable lamps, manuals, Archive Document Card or notes counter, none of the Task 24 and 25 additive layers (lamp cones, desk pools, ceiling bloom strips, arcade floor glows), none of the Task 26 changes (anisotropy 4, redrawn textures, rebalanced lights), none of the Task 27 changes (cabinet and manual detail texture, two-page themed card), none of the Task 28 changes (scrollable card, protruding manuals), and different triangle, draw-call and texture figures. **Re-measuring is recommended** because Tasks 24 and 25 add additive transparent layers, Task 26 adds anisotropic filtering and Task 27 adds a texture and a themed card overlay. Until then, the frame-time rows describe the earlier scene only. The agent did not run this measurement. Hardware, browser, OS, resolution and date: not provided (see the environment table in section 1.1; please fill them in).

### 4.1 Raw `window.__worldPerf.summary()` output (verbatim)

```json
{"frames":3600,"medianMs":16.69999998807907,"p95Ms":18.600000023841858,"triangles":10378,"drawCalls":151,"geometries":89,"textures":29}
```

| Field | Value |
| --- | --- |
| Frames sampled | 3600 |
| Median frame time | 16.70 ms (about 59.9 fps) |
| 95th-percentile frame time | 18.60 ms |
| Renderer triangles (`renderer.info.render.triangles`) | 10,378 |
| Draw calls (`renderer.info.render.calls`) | 151 |
| Geometries (`renderer.info.memory.geometries`) | 89 |
| Textures (`renderer.info.memory.textures`) | 29 |
| First-render time (s) | not measured |
| Targeting benchmark on Reference_Hardware | not measured |
| Hardware, browser, OS, resolution, date | not provided |
| Notes | dev build (slower than production); throttling and power mode not provided |

### 4.2 How to read these numbers

Read from `useFrameSampler.ts` and `frameStats.ts`:

- **(a) Frames.** The ring buffer capacity is 3600 (`FRAME_SAMPLE_CAPACITY`). `frames: 3600` equals that capacity, so the summary covers the most recent 3600 frames, about 60 s at about 60 fps. Earlier frames of a longer walk would have been overwritten. Median and p95 are nearest-rank statistics over those samples (each sample is the frame delta in ms).
- **(b) Triangles, draw calls, geometries, textures.** `summary()` reads `renderer.info` at the moment it is called. `triangles` and `drawCalls` are `info.render.triangles` and `info.render.calls`, which describe the last rendered frame only (three.js resets them each frame). They therefore describe one frame from one camera position, after frustum culling, with each instanced mesh counted as one draw call. They are not comparable one-to-one with the computed whole-scene figures (19,116 triangles and a 344 draw-call grouping estimate now, computed; 19,172 and 319 when the owner measured, before Tasks 23 to 28; 32 declared textures now, 30 then). Lower numbers are expected. The computed figures stay valid as budget checks against declared geometry. Geometries (89) and textures (29) come from `info.memory`, which counts resources currently uploaded, not per frame.
- **(c) Textures 29 vs 30 declared.** `info.memory.textures` counts textures uploaded to the GPU so far. Likely explanation, not a verified fact: one declared texture had not been uploaded yet (for example it was never visible or never used by a rendered material) or is absent. This was not investigated.
- **(d) Frame time.** A median near 16.7 ms is consistent with a 60 Hz vsync cap. The frame time is therefore likely limited by display refresh rather than by the GPU, and the real headroom is unknown. The measurement shows the scene held about 60 fps on the owner's machine; it does not show how much faster it could run.
- **Dev build.** Dev builds are slower than production, so these numbers are likely a lower bound on performance. This was not compared against a production build.

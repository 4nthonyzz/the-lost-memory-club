# World Exploration Performance Log (task 15.4)

**Status: PREPARED, NOT MEASURED (no runtime measurement was taken by the agent in tasks 20.3, 21.3 or 22.3; task 15.4 stays open).** Section 2 holds values computed from declared geometry and a build. Section 3 shows every runtime target as "not measured". **No target counts as achieved until a human records a runtime value in section 4.** Until then, the README, submission text and demo must describe the runtime targets as planned (Requirements 14.11, 14.12).

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
- Automation libraries in 
ode_modules: playwright, playwright-core, @playwright/test, puppeteer, puppeteer-core are all absent, and there is no ms-playwright browser cache.
- Without one of those libraries the agent would have to write a DevTools protocol client by hand and also fake pointer lock and keyboard input in a headless page. That would not give a trustworthy 60 s walk, and headless frame times would not represent the Reference_Hardware anyway. So nothing was measured and no runtime number is recorded.

**Exact sign-off steps for a human on the Reference_Hardware:**

1. Run 
pm run dev and open the printed URL with ?worldPerf=1 appended.
2. In the DevTools console run window.__worldPerf.reset().
3. Walk for about 60 s through both doors to all three cabinets and back.
4. In the console run window.__worldPerf.summary().
5. Copy rames, medianMs, p95Ms, 	riangles, drawCalls, geometries and 	extures into section 4, fill the environment table below, and add the note that dev builds are slower than production.

Task 15.4 stays open until a human records those values.

### Environment fields (fill in)

| Field | Value |
| --- | --- |
| Date | not recorded |
| Recorded by | not recorded |
| Hardware (CPU / GPU / RAM) | not recorded |
| GPU type (integrated or discrete) | not recorded |
| OS and version | not recorded |
| Browser and version | not recorded |
| Power mode (battery or plugged in) | not recorded |
| Display refresh rate | not recorded |
| Window size | not recorded (expected 1280x720) |
| Build under test (`preview` or `dev`) | not recorded |
| Git commit | not recorded |
| Measurement tool | not recorded |

## 2. Computed static metrics
**Computed from declared geometry, NOT runtime-measured.** Computed on the working-tree state at the time of task 22.3 (uncommitted changes present). Machine for these commands is unspecified (Windows, PowerShell). Nothing in this section is a frame-time or GPU measurement.
### 2.1 Scene detail (`npx vitest run src/world/scene/modelDetail.test.ts`)
State of the scene after tasks 20.1, 20.2, 21.1, 21.2, 22.1 and 22.2 (**not verified visually**, no browser run; none of these passes has been seen in a browser). Layout (from `roomLayout.ts`):
- **Three arcade cabinets** against the east wall of the Arcade_Area, x 8.4..9.2, facing -X toward both east doorways, each `onInspect('arcade')`:
  - SNAKE.EXE: z -1.7..-0.7, anchor (8.4, -1.2), `arcadeGame` `'snake'`.
  - LAST EXIT: z -0.5..0.5, anchor (8.4, 0), `arcadeGame` `'maze'`.
  - DEAD FREQUENCY: z 0.7..1.7, anchor (8.4, 1.2), `arcadeGame` `'frequency'`.
- The optional `arcadeGame` field is world data only. `App.tsx` and `src/arcade/` are unchanged, so every cabinet currently opens the same App arcade panel, and only Snake exists in `src/arcade/`. LAST EXIT and DEAD FREQUENCY are attract-screen art for games that are NOT implemented.
- Moved dressing: `crt-stack` is now in the main-room north-east corner (x 4.3..4.9, z -3.2..-2.6); `crate-a` and `crate-b` are at x 4.3..4.9 in the south-east; cable decals run between the cabinets. The companion cabinet is removed.
- Lights: `crt-light` (0, 1.6, -0.6), `west-light` (-2.6, 2.3, 0.2) and `arcade-light` (7.4, 2.4, 0) with distance 6 (it replaces the earlier unnamed arcade light at (7.3, 2.4, 0)).
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
- Unchanged: the VHS media console layout, rug, reception desk, bulletin board, wood bookcases and textured walls.

Console lines, verbatim (task 22.3, from the full `npm test` run; the standalone `modelDetail.test.ts` run passed 123 tests with the same values). The `[19.2]` and `[20.2]` lines print the same 30 textures as `[22.1]`, at two and three decimals; `[22.1]` is shown in full:
```
[18.2] computed triangles: 19172 (detail 18930 + base 242), draw-call estimate (grouped by geometry+material): 319, books 370, slipcases 136, leaning 16, per shelf shelf-a=16 draws/178 books, shelf-b=16 draws/172 books, shelf-c=16 draws/156 books, textures 30, texture memory estimate 7.46 MB
[18.3] computed triangles: 19172 (detail 18930 + base 242), draw-call estimate: 319, textures 30, texture memory estimate 7.46 MB, lights 4 (computed, not runtime-measured)
[21.1] couch triangles: 388 (before 412), total 19172, textures 30, texture memory 7.46 MB
[21.2] computed triangles 19172, crt-television 302 triangles / 9 draw calls, draw-call estimate 319, textures 30, texture memory estimate 7.46 MB (computed, not runtime-measured), lights 4
[22.1] computed triangles 19172, draw-call estimate 319, textures 30, texture memory estimate 7.459 MB (computed, not runtime-measured): attractSnake 256x256=0.250MB, attractMaze 256x256=0.250MB, attractFrequency 256x256=0.250MB, marqueeSnake 256x64=0.063MB, marqueeMaze 256x64=0.063MB, marqueeFrequency 256x64=0.063MB, signFace 512x128=0.333MB, posterSunset 256x512=0.665MB, posterReel 256x512=0.665MB, shiftPoster 256x512=0.665MB, shiftPlaque 256x128=0.166MB, floor 128x128=0.083MB, wood 128x128=0.083MB, woodDark 128x128=0.083MB, crate 256x256=0.333MB, grille 128x128=0.083MB, spineAtlas 512x256=0.665MB, wallPanel 256x256=0.333MB, rugWoven 256x256=0.333MB, corkBoard 256x256=0.333MB, lampGlow 64x64=0.021MB, smpteBars 256x128=0.125MB, timecode 128x32=0.016MB, couchFabric 256x256=0.333MB, crtCasing 256x256=0.333MB, crtGlass 256x256=0.250MB, vcrDeck 256x128=0.166MB, vhsShell 128x128=0.083MB, metalCabinet 256x256=0.333MB, deskDetail 128x64=0.042MB
[22.2A] triangles 19172, draw calls 319, textures 30, texture memory 7.459 MB (computed, not runtime-measured), metalCabinet 0.333 MB, crate 0.333 MB
[22.2B] triangles 19172 (delta 116), draw calls 319, textures 30, texture memory 7.459 MB (computed, not runtime-measured), deskDetail 0.042 MB
```
Result: `modelDetail.test.ts` 123 tests passed (also re-run alone: 1 file, 123 tests passed).

| Metric | Computed value (computed, not runtime-measured) | Notes |
| --- | --- | --- |
| Triangles | 19,172 | detail 18,930 + base 242, from declared geometry; limit 20,000 |
| Draw-call estimate | 319 | grouped by geometry + material; an estimate, not `renderer.info.render.calls` |
| Books | 370 (178 + 172 + 156 per shelf) | 136 slipcases and 16 leaning books are included |
| Textures | 30 | procedural canvas textures, all registered for disposal |
| Texture memory estimate | 7.459 MB | estimate; limit 8 MB; margin about 0.54 MB |
| Lights | 4 | 1 ambient + 3 point, `Lighting.tsx:46-49` |
| Colliders | 28 | unchanged by task 22 |

**Triangle margin is thin.** 19,172 leaves only about 830 triangles (828 exactly, about 4 percent) below the 20,000 limit (computed, not runtime-measured). Any further dressing should be paid for by removing geometry elsewhere. First candidates to cut: `console-cables` (1,088 triangles) and the book count (370 books). The biggest consumers, computed in task 21.3 by summing each declared object's parts with `declaredObjects()` and `countTriangles()` in a throwaway test (not kept in the repo; `modelDetail.test.ts` prints only totals; task 22 added 44 triangles overall and these per-object figures were not recomputed): `shelf-a` 2,352, `shelf-b` 2,280, `shelf-c` 2,088, each arcade cabinet 1,316 (three cabinets, 3,948 together), `console-cables` 1,088, `filing-cabinet-a` and `filing-cabinet-b` 692 each, `desk` 672.

**Texture memory margin is also thin.** The computed 7.459 MB leaves about 0.54 MB below the 8 MB limit (computed, not runtime-measured). The largest textures are the three 256x512 posters (`posterSunset`, `posterReel`, `shiftPoster`, 0.66 MB each) and `spineAtlas` (512x256, 0.66 MB); any of them could shrink if room is needed. Task 22 freed 1.00 MB by shrinking `corkBoard` from 512x512 to 256x256, then spent most of it on four new textures and the larger `crate`. Per-texture estimate line (from `proceduralTextures.test.ts`, `[15.7]`): `textures: 30, attractSnake 256x256=0.25MB, attractMaze 256x256=0.25MB, attractFrequency 256x256=0.25MB, marqueeSnake 256x64=0.06MB, marqueeMaze 256x64=0.06MB, marqueeFrequency 256x64=0.06MB, signFace 512x128=0.33MB, posterSunset 256x512=0.66MB, posterReel 256x512=0.66MB, shiftPoster 256x512=0.66MB, shiftPlaque 256x128=0.17MB, floor 128x128=0.08MB, wood 128x128=0.08MB, woodDark 128x128=0.08MB, crate 256x256=0.33MB, grille 128x128=0.08MB, spineAtlas 512x256=0.66MB, wallPanel 256x256=0.33MB, rugWoven 256x256=0.33MB, corkBoard 256x256=0.33MB, lampGlow 64x64=0.02MB, smpteBars 256x128=0.13MB, timecode 128x32=0.02MB, couchFabric 256x256=0.33MB, crtCasing 256x256=0.33MB, crtGlass 256x256=0.25MB, vcrDeck 256x128=0.17MB, vhsShell 128x128=0.08MB, metalCabinet 256x256=0.33MB, deskDetail 128x64=0.04MB, total 7.46 MB (estimate, budget 8 MB).
### 2.2 Declared configuration (read from source)
| Metric | Computed value | Source |
| --- | --- | --- |
| Light count | 4 (1 ambient + 3 point lights: `crt-light` (0, 1.6, -0.6), `west-light` (-2.6, 2.3, 0.2), `arcade-light` (7.4, 2.4, 0) distance 6) | `src/world/scene/Lighting.tsx` (`M3_LIGHT_COUNT = 4`, lines 14, 32-33, 46-49) |
| Shadow maps | disabled (`shadows={false}`) | `src/world/scene/WorldCanvas.tsx` |
| DPR cap | `dpr={[1, 1.5]}` (max 1.5) | `src/world/scene/WorldCanvas.tsx` |
| Collider count | 28 (9 walls + 4 door frames + 15 solid props) | targeting benchmark line (section 2.3) and `roomLayout.test.ts:196` |
| Station count | 4 (`vhs` plus three `arcade` cabinets) | same line |
| GLB total size | 0 bytes (`public/models/` contains only `.gitkeep`; no `.glb` anywhere in `public`, `src` or `tools`) | directory listing |
### 2.3 Targeting benchmark (`npx vitest run src/world/logic/targeting.bench.test.ts`)
Informational, this machine, not a pass/fail threshold; machine unspecified. Console line, verbatim (task 22.3 standalone run):
```
[targeting bench] method: performance.now around 20000 calls, 254 reachable cells x 16 yaws, 4 stations, 28 colliders. measured total 19.26 ms; computed 0.963 us/call; 1308 calls returned a station. No threshold applied.
```
The first full `npm test` run of task 22.3 printed `measured total 30.88 ms; computed 1.544 us/call` for the same workload. Timing varies per run. This is a CPU timing on an unspecified machine and does not show frame-time performance. It must be re-run on the Reference_Hardware (step 7).
### 2.4 Build output (`npm run build`, Vite 7.3.8)
Command exit code 0 (`tsc --noEmit` and `vite build`; 98 modules transformed; built in 6.54 s; task 22.3 run). PowerShell wraps Vite's chunk-size warning (written to stderr) in a `NativeCommandError` record when run directly; it is only the warning, not a failure.
| Asset | Size | Gzip |
| --- | --- | --- |
| `dist/index.html` | 0.62 kB | 0.37 kB |
| `dist/assets/index-BQ7s00WL.css` | 5.36 kB | 1.64 kB |
| `dist/assets/index-DAoM6WLf.js` | 1,271.74 kB | 363.53 kB |
**Warning:** Vite reports a chunk larger than 500 kB after minification (the single JS bundle is 1,271.74 kB). This is expected with Three.js and React Three Fiber in one chunk. It is not an error, and no code splitting was applied. The bundle size affects download and parse time, which may affect first-render time on the Reference_Hardware. `dist/` is git-ignored and was not committed.
Related checks run for task 22.3: `npm run typecheck` exit 0; `npm test` run twice, both 27 files and 572 tests passed, exit 0 (no flakiness seen); `npm run build` exit 0.
## 3. Target table
Initial targets from `requirements.md`, Requirement 14. "Computed" means derived from declared geometry or source, not measured at runtime.
| Target | Req. | Threshold | Status |
| --- | --- | --- | --- |
| Median frame time at 1280x720, integrated graphics | 14.8 | <= 20 ms | not measured |
| 95th-percentile frame time at 1280x720, integrated graphics | 14.9 | <= 33 ms | not measured |
| First render after mount, excluding optional GLB downloads | 14.10 | <= 3 s | not measured |
| Triangles in rendered scene | 14.4 | <= 20,000 | computed: 19,172 (declared geometry; margin 828; runtime `renderer.info` not measured) |
| Triangles, runtime `renderer.info.render.triangles` | 14.4 | <= 20,000 | not measured |
| Draw calls | n/a (reported by task 15.4) | no threshold set | computed: 319 estimate; runtime not measured |
| Simultaneous dynamic lights | 14.2 | <= 4 | computed: 4 (1 ambient + 3 point) |
| Device pixel ratio cap | 14.1 | 1.5 | computed: `dpr={[1, 1.5]}` in source; runtime not measured |
| Real-time shadow maps | 14.3 | disabled by default | computed: `shadows={false}` in source |
| Post-processing passes | 14.5 | none, or at most one disablable pass | not measured (no pass found by this log; not verified here) |
| GLB total size | task 15.4 / assets | <= 5 MB | computed: 0 bytes (no GLB files in `public/models/`) |
| Texture memory | n/a | <= 8 MB (budget set in `proceduralTextures.test.ts`) | computed: 7.459 MB estimate (30 textures); limit 8 MB, margin about 0.54 MB; largest are the three posters and spineAtlas (0.66 MB each) |
| Collider count | n/a | no threshold set | computed: 28 |
| Production JS bundle | n/a | no threshold set | computed: 1,271.74 kB (363.53 kB gzip), exceeds Vite 500 kB warning |
| Targeting benchmark | n/a | no threshold (informational) | computed: 0.569 us/call (standalone run; 1.592 us/call in the full-suite run), this machine, unspecified |
Notes: the 5 MB GLB limit is not stated in Requirement 14 and comes from the task request; confirm the source (asset manifest or `THIRD_PARTY_ASSETS.md`) before citing it. Rows marked "no threshold set" have no target in Requirement 14.
**No target is achieved until a runtime value is recorded in section 4.** Computed rows only show that declared geometry is within the stated limit.
## 4. Recorded runtime results (to be filled by a human)

| Field | Value |
| --- | --- |
| Median frame time (ms) | not measured |
| 95th-percentile frame time (ms) | not measured |
| Frames sampled | not measured |
| First-render time (s) | not measured |
| Runtime triangles (`renderer.info`) | not measured |
| Runtime draw calls | not measured |
| Geometries / textures (`renderer.info.memory`) | not measured |
| Targeting benchmark on Reference_Hardware | not measured |
| Raw `summary()` output or trace statistics | not measured |
| Notes (tool, deviations, throttling) | not measured |

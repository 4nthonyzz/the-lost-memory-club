# World Exploration Performance Log (task 15.4)

**Status: PREPARED, NOT MEASURED.** Section 2 holds values computed from declared geometry and a build. Section 3 shows every runtime target as "not measured". **No target counts as achieved until a human records a runtime value in section 4.** Until then, the README, submission text and demo must describe the runtime targets as planned (Requirements 14.11, 14.12).

## 1. Method (human measurement)

Prepared by an agent without a browser or the Reference_Hardware. A team member performs these steps.

1. From the repository root, run `npm run build`, then `npm run preview`. Open the printed URL.
2. Use a 1280x720 browser window (viewport) on the Reference_Hardware (integrated graphics). Close other heavy tabs and apps. Use a fresh page load.
3. Note the time from page load to first rendered world frame (first-render time, target <= 3 s excluding optional GLB downloads). Use the Performance panel's recording, starting at reload.
4. Walk for 60 seconds on a fixed route. Start in the room, go through the first door to the arcade, look around, and return through the second door. Use W A S D (or arrows) to move and the mouse or I J K L to look. Repeat the same route for every run.
5. Record frame times with ONE of these tools:
   - **Dev sampler (dev build only).** Run `npm run dev` and open the page with `?worldPerf=1` appended to the URL. Alternatively set `window.__WORLD_PERF__ = true` before the scene mounts. The sampler is enabled only when `import.meta.env.DEV` is true (see `src/world/controller/useFrameSampler.ts`). It does nothing in `npm run build` / `npm run preview` builds. Call `window.__worldPerf.reset()` just before the walk, then `window.__worldPerf.summary()` right after it. The summary returns `frames`, `medianMs`, `p95Ms`, `triangles`, `drawCalls`, `geometries` and `textures`. The ring buffer holds the last 3600 frame samples, so keep the walk to about 60 s. Dev builds are slower than production, so treat dev-sampler numbers as a lower bound on performance and say so in the notes.
   - **Browser Performance panel (works with the preview build).** Record the 60-second walk. Read the frame durations from the Frames track, or export the trace. Report the median and 95th percentile of frame time. For triangle count and draw calls in a preview build use an external renderer-stats tool, such as a WebGL inspector extension. Note the tool in the notes.
6. Fill section 4 with raw numbers. Copy the full `summary()` output (or the trace statistics) as pasted text. Do not round in a favorable direction.
7. Targeting benchmark: re-run `npx vitest run src/world/logic/targeting.bench.test.ts` on the Reference_Hardware and paste the `[targeting bench]` line.

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

**Computed from declared geometry, NOT runtime-measured.** Computed on the working-tree state at the time this log was prepared (uncommitted changes present). Machine for these commands is unspecified.

### 2.1 Scene detail (`npx vitest run src/world/scene/modelDetail.test.ts`)

State of the scene: polish pass plus the spatial and visual refinement pass, tasks 18.1 to 18.3 and 19.1 to 19.2 (**not verified visually**, no browser run). Layout (from `roomLayout.ts`): the VHS station is the media console at x -0.9..0.9, z -2.1..-1.5 with the `vhs` anchor at (0, -1.5) facing +Z, and the CRT is centred on the console. The woven rug covers x -1.6..1.6, z -2.5..-0.1. The reception desk is unchanged at x -1.5..1.5, z 1.2..2.0. Walkways (computed from the layout, tested): 2.7 m in front of the island to the desk, 1.9 m to the north wall and 1.3 m to the filing cabinets. Lights: `crt-light` at (0, 1.6, -0.6) and a warm tungsten `west-light` at (-2.6, 2.3, 0.2) (it replaces the former magenta light). New render-only items: SMPTE colour-bar reference monitor, "OUT OF ORDER" companion screen, green 00:19:96 timecode window, metallic tape slot, routed coaxial and power cables, metric wood UVs, `wallPanel` reduced to 256x256. The filing cabinets, bulletin board, arcade cabinet, wood bookcases and textured walls are unchanged.

Console lines, verbatim:

```
[18.2] computed triangles: 16772 (detail 16530 + base 242), draw-call estimate (grouped by geometry+material): 264, books 370, slipcases 136, leaning 16, per shelf shelf-a=16 draws/178 books, shelf-b=16 draws/172 books, shelf-c=16 draws/156 books, textures 21, texture memory estimate 6.81 MB
[18.3] computed triangles: 16772 (detail 16530 + base 242), draw-call estimate: 264, textures 21, texture memory estimate 6.81 MB, lights 4 (computed, not runtime-measured)
[19.2] computed triangles: 16772 (detail 16530 + base 242), draw-call estimate 264, textures 21, texture memory estimate 6.81 MB (computed, not runtime-measured): arcadeScreen 512x256=0.50MB, marquee 512x128=0.25MB, signFace 512x128=0.33MB, posterSunset 256x512=0.66MB, posterReel 256x512=0.66MB, shiftPoster 256x512=0.66MB, shiftPlaque 256x128=0.17MB, floor 128x128=0.08MB, wood 128x128=0.08MB, woodDark 128x128=0.08MB, crate 128x128=0.08MB, grille 128x128=0.08MB, deck 256x128=0.17MB, spineAtlas 512x256=0.66MB, wallPanel 256x256=0.33MB, rugWoven 256x256=0.33MB, corkBoard 512x512=1.33MB, lampGlow 64x64=0.02MB, smpteBars 256x128=0.13MB, outOfOrder 256x128=0.17MB, timecode 128x32=0.02MB
```

Result: 1 file, 85 tests passed (re-run in task 19.3).

| Metric | Computed value (computed, not runtime-measured) | Notes |
| --- | --- | --- |
| Triangles | 16,772 | detail 16,530 + base 242, from declared geometry; limit 20,000 |
| Draw-call estimate | 264 | grouped by geometry + material; an estimate, not `renderer.info.render.calls` |
| Books | 370 (178 + 172 + 156 per shelf) | 136 slipcases and 16 leaning books are included |
| Textures | 21 | procedural canvas textures, all registered for disposal |
| Texture memory estimate | 6.81 MB | estimate; limit 8 MB; margin about 1.19 MB |

**Texture memory margin.** The computed 6.81 MB leaves about 1.19 MB below the 8 MB limit (computed, not runtime-measured). Task 19.2 shrank `wallPanel` from 512x512 (1.33 MB) to 256x256 (0.33 MB) and added `smpteBars` (0.13 MB), `outOfOrder` (0.17 MB) and `timecode` (0.02 MB). The largest texture is `corkBoard` (512x512, 1.33 MB). Per-texture estimate line (from `proceduralTextures.test.ts`): `textures: 21, arcadeScreen 512x256=0.50MB, marquee 512x128=0.25MB, signFace 512x128=0.33MB, posterSunset 256x512=0.66MB, posterReel 256x512=0.66MB, shiftPoster 256x512=0.66MB, shiftPlaque 256x128=0.17MB, floor 128x128=0.08MB, wood 128x128=0.08MB, woodDark 128x128=0.08MB, crate 128x128=0.08MB, grille 128x128=0.08MB, deck 256x128=0.17MB, spineAtlas 512x256=0.66MB, wallPanel 256x256=0.33MB, rugWoven 256x256=0.33MB, corkBoard 512x512=1.33MB, lampGlow 64x64=0.02MB, smpteBars 256x128=0.13MB, outOfOrder 256x128=0.17MB, timecode 128x32=0.02MB, total 6.81 MB (estimate, budget 8 MB)`.

### 2.2 Declared configuration (read from source)

| Metric | Computed value | Source |
| --- | --- | --- |
| Light count | 4 (1 ambient + 3 point lights: `crt-light` (0, 1.6, -0.6), `west-light` (-2.6, 2.3, 0.2), unnamed arcade light (7.3, 2.4, 0)) | `src/world/scene/Lighting.tsx` (`M3_LIGHT_COUNT = 4`) |
| Shadow maps | disabled (`shadows={false}`) | `src/world/scene/WorldCanvas.tsx` |
| DPR cap | `dpr={[1, 1.5]}` (max 1.5) | `src/world/scene/WorldCanvas.tsx` |
| Collider count | 27 | reported by the targeting benchmark line (section 2.3) |
| Station count | 2 | same line |
| GLB total size | 0 bytes (`public/models/` contains only `.gitkeep`) | directory listing |

### 2.3 Targeting benchmark (`npx vitest run src/world/logic/targeting.bench.test.ts`)

Informational, this machine, not a pass/fail threshold; machine unspecified. Console line, verbatim (latest run):

```
[targeting bench] method: performance.now around 20000 calls, 256 reachable cells x 16 yaws, 2 stations, 27 colliders. measured total 9.53 ms; computed 0.477 us/call; 859 calls returned a station. No threshold applied.
```

Result: 1 test passed. Timing varies per run (the full-suite run in task 19.3 recorded 1.023 us/call). This is a CPU timing on an unspecified machine and does not show frame-time performance. It must be re-run on the Reference_Hardware (step 7).
### 2.4 Build output (`npm run build`, Vite 7.3.8)

Command exit code 0 (`tsc --noEmit` and `vite build`; 98 modules transformed; built in 6.26 s; task 19.3 run). PowerShell wraps Vite's chunk-size warning (written to stderr) in a `NativeCommandError` record; it is only the warning, not a failure.

| Asset | Size | Gzip |
| --- | --- | --- |
| `dist/index.html` | 0.62 kB | 0.37 kB |
| `dist/assets/index-BQ7s00WL.css` | 5.36 kB | 1.64 kB |
| `dist/assets/index-Di914A0G.js` | 1,253.47 kB | 357.24 kB |

**Warning:** Vite reports a chunk larger than 500 kB after minification (the single JS bundle is 1,253.47 kB). This is expected with Three.js and React Three Fiber in one chunk. It is not an error, and no code splitting was applied. The bundle size affects download and parse time, which may affect first-render time on the Reference_Hardware. `dist/` is git-ignored and was not committed.

Related checks run for task 19.3: `npm run typecheck` exit 0; `npm test` run twice, both 27 files and 456 tests passed, exit 0 (no flakiness seen).
## 3. Target table

Initial targets from `requirements.md`, Requirement 14. "Computed" means derived from declared geometry or source, not measured at runtime.

| Target | Req. | Threshold | Status |
| --- | --- | --- | --- |
| Median frame time at 1280x720, integrated graphics | 14.8 | <= 20 ms | not measured |
| 95th-percentile frame time at 1280x720, integrated graphics | 14.9 | <= 33 ms | not measured |
| First render after mount, excluding optional GLB downloads | 14.10 | <= 3 s | not measured |
| Triangles in rendered scene | 14.4 | <= 20,000 | computed: 16,772 (declared geometry; runtime `renderer.info` not measured) |
| Triangles, runtime `renderer.info.render.triangles` | 14.4 | <= 20,000 | not measured |
| Draw calls | n/a (reported by task 15.4) | no threshold set | computed: 264 estimate; runtime not measured |
| Simultaneous dynamic lights | 14.2 | <= 4 | computed: 4 (1 ambient + 3 point) |
| Device pixel ratio cap | 14.1 | 1.5 | computed: `dpr={[1, 1.5]}` in source; runtime not measured |
| Real-time shadow maps | 14.3 | disabled by default | computed: `shadows={false}` in source |
| Post-processing passes | 14.5 | none, or at most one disablable pass | not measured (no pass found by this log; not verified here) |
| GLB total size | task 15.4 / assets | <= 5 MB | computed: 0 bytes (no GLB files in `public/models/`) |
| Texture memory | n/a | <= 8 MB (budget set in `proceduralTextures.test.ts`) | computed: 6.81 MB estimate (21 textures); limit 8 MB, margin about 1.19 MB; largest is corkBoard (512x512) |
| Collider count | n/a | no threshold set | computed: 27 |
| Production JS bundle | n/a | no threshold set | computed: 1,253.47 kB (357.24 kB gzip), exceeds Vite 500 kB warning |
| Targeting benchmark | n/a | no threshold (informational) | computed: 0.477 us/call (latest run), this machine, unspecified |

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

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

Console line, verbatim:

```
[15.7] computed triangles: 9204 (detail 8962 + base 242), draw-call estimate (grouped by geometry+material): 159, tapes 270, textures 13, texture memory estimate 3.83 MB
```

Result: 1 file, 31 tests passed.

| Metric | Computed value | Notes |
| --- | --- | --- |
| Triangles | 9204 | detail 8962 + base 242, from declared geometry |
| Draw-call estimate | 159 | grouped by geometry + material; an estimate, not `renderer.info.render.calls` |
| Tapes | 270 | counted in the above |
| Textures | 13 | procedural textures |
| Texture memory estimate | 3.83 MB | estimate |

### 2.2 Declared configuration (read from source)

| Metric | Computed value | Source |
| --- | --- | --- |
| Light count | 4 (1 ambient + 3 point lights) | `src/world/scene/Lighting.tsx` (`M3_LIGHT_COUNT = 4`) |
| Shadow maps | disabled (`shadows={false}`) | `src/world/scene/WorldCanvas.tsx` |
| DPR cap | `dpr={[1, 1.5]}` (max 1.5) | `src/world/scene/WorldCanvas.tsx` |
| Collider count | 25 | reported by the targeting benchmark line (section 2.3) |
| Station count | 2 | same line |
| GLB total size | 0 bytes (`public/models/` contains only `.gitkeep`) | directory listing |

### 2.3 Targeting benchmark (`npx vitest run src/world/logic/targeting.bench.test.ts`)

Informational, this machine, not a pass/fail threshold; machine unspecified. Console line, verbatim:

```
[targeting bench] method: performance.now around 20000 calls, 260 reachable cells x 16 yaws, 2 stations, 25 colliders. measured total 9.62 ms; computed 0.481 us/call; 704 calls returned a station. No threshold applied.
```

Result: 1 test passed. This is a CPU timing on an unspecified machine and does not show frame-time performance. It must be re-run on the Reference_Hardware (step 7).

### 2.4 Build output (`npm run build`, Vite 7.3.8)

Command exit code 0 (`tsc --noEmit` and `vite build`; 97 modules transformed; built in 6.30 s).

| Asset | Size | Gzip |
| --- | --- | --- |
| `dist/index.html` | 0.62 kB | 0.37 kB |
| `dist/assets/index-BQ7s00WL.css` | 5.36 kB | 1.64 kB |
| `dist/assets/index-D1F8bPm7.js` | 1,225.82 kB | 346.85 kB |

**Warning:** Vite reports a chunk larger than 500 kB after minification (the single JS bundle is 1,225.82 kB). This is expected with Three.js and React Three Fiber in one chunk. It is not an error, and no code splitting was applied. The bundle size affects download and parse time, which may affect first-render time on the Reference_Hardware. `dist/` is git-ignored and was not committed.

## 3. Target table

Initial targets from `requirements.md`, Requirement 14. "Computed" means derived from declared geometry or source, not measured at runtime.

| Target | Req. | Threshold | Status |
| --- | --- | --- | --- |
| Median frame time at 1280x720, integrated graphics | 14.8 | <= 20 ms | not measured |
| 95th-percentile frame time at 1280x720, integrated graphics | 14.9 | <= 33 ms | not measured |
| First render after mount, excluding optional GLB downloads | 14.10 | <= 3 s | not measured |
| Triangles in rendered scene | 14.4 | <= 20,000 | computed: 9204 (declared geometry; runtime `renderer.info` not measured) |
| Triangles, runtime `renderer.info.render.triangles` | 14.4 | <= 20,000 | not measured |
| Draw calls | n/a (reported by task 15.4) | no threshold set | computed: 159 estimate; runtime not measured |
| Simultaneous dynamic lights | 14.2 | <= 4 | computed: 4 (1 ambient + 3 point) |
| Device pixel ratio cap | 14.1 | 1.5 | computed: `dpr={[1, 1.5]}` in source; runtime not measured |
| Real-time shadow maps | 14.3 | disabled by default | computed: `shadows={false}` in source |
| Post-processing passes | 14.5 | none, or at most one disablable pass | not measured (no pass found by this log; not verified here) |
| GLB total size | task 15.4 / assets | <= 5 MB | computed: 0 bytes (no GLB files in `public/models/`) |
| Texture memory | n/a | no threshold set | computed: 3.83 MB estimate (13 textures) |
| Collider count | n/a | no threshold set | computed: 25 |
| Production JS bundle | n/a | no threshold set | computed: 1,225.82 kB (346.85 kB gzip), exceeds Vite 500 kB warning |
| Targeting benchmark | n/a | no threshold (informational) | computed: 0.481 us/call, this machine, unspecified |

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

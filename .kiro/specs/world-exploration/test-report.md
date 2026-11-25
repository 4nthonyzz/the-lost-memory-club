# World Exploration: Test Report

Task 15.1, counts refreshed by task 27.3. Requirements 13.2, 13.10, 13.11, 13.14, 15.6. Related: `design.md` (Correctness Properties), `manual-test-log.md`, `tasks.md`.

## Result of the audit run

Command: `npm test` (Vitest, `vite.config.ts`: `environment: 'node'`, `include: ['src/**/*.test.ts']`). The earlier audit used `npx vitest run --reporter=verbose` for per-test output, which runs the same suite.

```
Test Files  31 passed (31)
     Tests  800 passed (800)
```

**Task 27.3 run log (current state).** `npm run typecheck` exited 0. `npm run build` exited 0 (`tsc --noEmit && vite build`, 105 modules transformed, built in 5.14 s, no missing-export error; PowerShell wraps Vite's chunk-size warning in a `NativeCommandError` record, which is only the warning). `npm test` was run twice, both with `Test Files  31 passed (31)` and `Tests  800 passed (800)`, exit 0 (7.71 s and 9.08 s), with no timeout and no flaky test; a third run with the JSON reporter also reported 800 passed, 0 failed, 31 files. `npx vitest run src/world/scene/modelDetail.test.ts` passed (166 tests) and `npx vitest run src/world/logic/targeting.bench.test.ts` passed 1 of 1 (informational timing only: 0.626 us/call). All numbers are computed from the suite, not runtime-measured. Task 27 added 62 tests and no file (738 to 800 in 31 files).
**Task 26.3 run log (historical, 738 tests).** `npm run typecheck` exited 0. `npm run build` exited 0 (`tsc --noEmit && vite build`, 104 modules transformed, built in 7.09 s, no missing-export error; PowerShell wraps Vite's chunk-size warning in a `NativeCommandError` record, which is only the warning). `npm test` was run twice, both with `Test Files  31 passed (31)` and `Tests  738 passed (738)`, exit 0 (8.28 s and 8.10 s), with no timeout and no flaky test. `npx vitest run src/world/scene/modelDetail.test.ts` passed 152 of 152 and `npx vitest run src/world/logic/targeting.bench.test.ts` passed 1 of 1 (informational timing only: 1.298 us/call). All numbers are computed from the suite, not runtime-measured. Interrupted run: a browser error `does not provide an export named 'VCR_CHASSIS_COLOR'` came from an import of a constant that was never exported; it was fixed by exporting `VCR_CHASSIS_COLOR = '#2b303a'` from `proceduralTextures.ts`, all partial hunks were complete and kept, and the touched files were normalised to CRLF.

**Task 25.3 run log (historical, 694 tests).** `npm run typecheck` exited 0. `npm run build` exited 0 (`tsc --noEmit && vite build`, 104 modules transformed, built in 4.58 s; PowerShell wraps Vite's chunk-size warning in a `NativeCommandError` record, which is only the warning). `npm test` was run twice, both with `Test Files  31 passed (31)` and `Tests  694 passed (694)`, exit 0 (9.01 s and 10.55 s), with no timeout and no flaky test. `npx vitest run src/world/scene/modelDetail.test.ts` passed 148 of 148 and `npx vitest run src/world/logic/targeting.bench.test.ts` passed 1 of 1 (informational timing only). The two runs of task 25.3 are computed from the suite, not runtime-measured.

**Task 24.3 run log (historical).** The table below was recorded in task 24.3 (663 tests then). `npm test` was run several times:

| Run | Result | Exit | Duration |
| --- | --- | --- | --- |
| 1 (before the timeout fix) | 30 files passed, 1 failed; 662 tests passed, 1 failed: `roomLayout.test.ts` "keeps at least 1.2 m of walkway on all four sides of the island", `Test timed out in 5000ms` | 1 | 40.52 s |
| 2 (before the fix) | 29 files passed, 2 failed; 661 tests passed, 2 failed: `look.test.ts` "keeps yaw finite and in range after repeated large inputs" and the same `roomLayout.test.ts` walkway test, both `Test timed out in 5000ms` | 1 | 49.78 s |
| 3 (before the fix) | 27 files passed, 4 failed; 659 tests passed, 4 failed: `effectsTiming.test.ts` "keeps CRT intensity within 15 percent and at most 3 direction changes per second", `look.test.ts`, `palette.full.test.ts` "stays within [0.85, 1.15] and changes direction at most 3 times per rolling second", and the `roomLayout.test.ts` walkway test, all `Test timed out in 5000ms` | 1 | 70.97 s |
| 4, 5, 6 (after the fix) | 31 files passed, 663 tests passed | 0 (runs 5 and 6 read from `$LASTEXITCODE`; run 4 showed the same summary) | 41.21 s (run 4), 27.61 s (run 6) |

**Flakiness, reported plainly.** The timeouts were not logic failures. Re-run alone, `roomLayout.test.ts` passed 32 of 32 (3.25 s; the walkway test took 1.7 s alone) and `look.test.ts` plus `roomLayout.test.ts` together passed 52 of 52. The four tests are CPU-heavy loops (the walkway grid scan; 10,000 look steps with three `expect` calls each; 20,000 and 5,001 flicker samples with `expect` per sample) and ran against Vitest's default 5 s per-test timeout while many test files ran in parallel. The failures grew from 1 to 2 to 4 across the three runs, which suggests growing machine load (the machine was not otherwise instrumented, and the cause was not confirmed). Fix (task 24.3, genuine test-robustness defect, no assertion changed): an explicit per-test timeout of 30,000 ms as the last argument of those four tests (`src/world/layout/roomLayout.test.ts`, `src/world/logic/look.test.ts`, `src/world/logic/palette.full.test.ts`, `src/world/scene/effectsTiming.test.ts`). `vite.config.ts` was not touched. Other CPU-heavy tests could still time out on a more heavily loaded machine; none did after the fix in three full runs.

Historical, task 23.3: `npm test` ran twice, both runs passed 29 files and 619 tests (exit 0, 11.01 s and 12.52 s). Compared with the 572 tests in 27 files of task 22.3, task 23 added 47 tests and 2 files. Task 24 added 44 tests and 2 files to reach 663 in 31 files (see "New test areas from task 24"). Task 25 added 31 tests and no file to reach 694 in 31 files (see "New test areas from task 25"). Task 26 added 44 tests and no file to reach 738 in 31 files (see "New test areas from task 26"). Task 27 added 62 tests and no file to reach 800 in 31 files (see "New test areas from task 27"). All of them check computed data or logic, none is visual.

These numbers describe the repository at the time of the audit. They change when tests are added or removed.

## Statements

- **fast-check was never installed.** It is not in `package.json`. Installing it was deferred and is optional (design.md, "Property-based tests"). No `*.property.test.ts` file exists in the repository (searched `src/`).
- **No seeded fallback generator exists.** `logic/testing/seededRandom.ts` (`mulberry32`) was not created. No test uses randomized inputs, so there are no seeds to report. Seeds used: **none**.
- **DOM tests use jsdom and `@testing-library/react`.** Both are installed (`jsdom`, `@testing-library/react`, `@testing-library/dom` in `package.json`). Files that need jsdom select it per file.
- **Test files use the `.test.ts` extension.** `vite.config.ts` only includes `src/**/*.test.ts`. Some tasks in `tasks.md` name `.test.tsx` files (for example `WorldScene.test.tsx`). The implemented files are `.test.ts` and contain no JSX.
- **No coverage percentage is claimed.** Coverage was not measured.
- **No test here proves rendering, frame rate or visual quality.** Behaviours that need a real browser are listed under "Known untested areas".

## Test files and counts

| Test file | Tests |
| --- | --- |
| `src/App.test.ts` | 8 |
| `src/core/gameReducer.test.ts` | 4 |
| `src/world/WorldScene.test.ts` | 30 |
| `src/world/WorldScene.inputEnabled.test.ts` | 8 |
| `src/world/boundary.test.ts` | 10 |
| `src/world/assets/assetManifest.test.ts` | 22 |
| `src/world/assets/assets.test.ts` | 9 |
| `src/world/controller/useReducedMotion.test.ts` | 8 |
| `src/world/layout/roomLayout.test.ts` | 32 |
| `src/world/logic/archiveDocuments.test.ts` | 10 |
| `src/world/logic/collision.test.ts` | 18 |
| `src/world/logic/frameStats.test.ts` | 5 |
| `src/world/logic/inputMode.test.ts` | 29 |
| `src/world/logic/inputMode.supplied.test.ts` | 17 |
| `src/world/logic/inputMode.fallback.test.ts` | 7 |
| `src/world/logic/inputMode.prop.test.ts` | 22 |
| `src/world/logic/inputState.test.ts` | 16 |
| `src/world/logic/look.test.ts` | 20 |
| `src/world/logic/movement.test.ts` | 15 |
| `src/world/logic/palette.test.ts` | 4 |
| `src/world/logic/palette.full.test.ts` | 13 |
| `src/world/logic/playerStep.test.ts` | 9 |
| `src/world/logic/propState.test.ts` | 17 |
| `src/world/logic/targeting.test.ts` | 40 |
| `src/world/logic/targeting.bench.test.ts` | 1 (informational timing, asserts no speed) |
| `src/world/scene/assetIntegration.test.ts` | 6 |
| `src/world/scene/effectsTiming.test.ts` | 8 |
| `src/world/scene/lampCoupling.test.ts` | 11 |
| `src/world/scene/memoryShift.test.ts` | 16 |
| `src/world/scene/modelDetail.test.ts` | 166 |
| `src/world/scene/proceduralTextures.test.ts` | 219 |
| **Total** | **800 in 31 files** |

New test areas since the audit (polish pass, tasks 18.1 to 18.3), all computed from declared data, none visual: island media console and 1.2 m walkway clearance (`roomLayout.test.ts`), north-wall filing cabinets and bulletin board, book and shelf counts, triangle budget below 20,000, texture memory within 8 MB, at most 4 lights, disposal of all textures and wall geometries (`modelDetail.test.ts`), new procedural textures (`proceduralTextures.test.ts`), and memory-shift tint of the new materials (`memoryShift.test.ts`). Which exact tests were added by which task is not itemized here.

New test areas from the refinement pass (tasks 19.1 and 19.2), all computed from declared data, none visual: re-centred media console and island walkways (2.7 m front, 1.9 m north wall, 1.3 m filing cabinets) in `roomLayout.test.ts`; `crt-light` and `west-light` placement, 4-light cap, `wallPanel` 256x256, and the SMPTE and timecode textures in `modelDetail.test.ts` and `proceduralTextures.test.ts`. The figures this pass originally listed (16,772 triangles, 21 textures at 6.81 MB, the OUT OF ORDER texture) are superseded by the arcade pass below. All numbers are computed, not runtime-measured.

New test areas from the arcade pass (tasks 20.1 and 20.2), all computed from declared data, none visual:
- `roomLayout.test.ts` (31 tests): three solid cabinets on the east wall with the approved footprints (SNAKE.EXE z -1.7..-0.7, LAST EXIT z -0.5..0.5, DEAD FREQUENCY z 0.7..1.7, x 8.4..9.2, anchors (8.4, -1.2), (8.4, 0), (8.4, 1.2), games `snake`, `maze`, `frequency`); moved dressing (`crt-stack` and the crates out of the Arcade_Area); reachability of a cell in front of every cabinet anchor through each door separately; a 1.2 m wide lane from each door to every cabinet anchor free of solid props; line of sight through the doorways to the cabinets; targeting each cabinet from a reachable cell; 28 colliders (9 walls, 4 door frames, 15 solid props).
- `modelDetail.test.ts` (count at task 20.2: 104; now 166): triangles below 20,000 (19,042 after task 23, 19,100 after task 24.2, 19,124 after task 25, 19,188 after task 26, 19,152 after task 27), texture memory within 8 MB, one screen plane and one marquee per cabinet in its own game materials, three distinct T-molding accents, `arcade-light` (7.4, 2.4, 0) distance 6 lighting all three anchors evenly, at most 4 lights, and the removed arcade materials and textures.
- `proceduralTextures.test.ts` (count at task 20.2: 111; now 219): the six attract-screen and marquee textures, every texture disposed exactly once and safe to dispose twice (30 textures at 7.46 MB after task 22).
- `assetManifest.test.ts` (22 tests) and `memoryShift.test.ts` (16 tests now) were extended for the new materials.
New test areas from the couch and CRT pass (tasks 21.1 and 21.2), all computed from declared data, none visual: couch pillow inside its footprint with an oriented-box no-intersection test, no collider added, couch triangles 388 (was 412), no "worn patch" parts left, roll caps shortened to avoid coplanar faces, `couchFabric` texture and `couchBody`/`couchCushion`/`couchPillow` materials with `memoryShift` tint (`modelDetail.test.ts`, `memoryShift.test.ts`); `crtCasing` and `crtGlass` textures, the `crtScreen` material (white base when textured, teal flat fallback), charcoal casing fallback, `crt-television` 302 triangles / 9 draw calls, (`modelDetail.test.ts`, `proceduralTextures.test.ts`). Task 21 is **not verified visually**.
New test areas from the detail pass (tasks 22.1 and 22.2), all computed from declared data, none visual: `vcrDeck`, `vhsShell`, `metalCabinet` and `deskDetail` textures and the 256x256 `crate` and `corkBoard`; armchair on `couchFabric` with `armchairBody`/`armchairCushion` tinted by `memoryShift` (and the green flat fallback); `tapeBlue` material; reference monitor and CRT stack on `crtCasing`; removed `casing`, `fabric` and `fabricLight` materials; cabinet metric Part fields (`metricAspect`, `metricOffset`, `metricPlainV`); doorway insets and kickplates outside the openings with at most 2 cm protrusion and no colliders; pencil clear of the notebook; every texture disposed exactly once and safe to dispose twice. Totals after task 22 (superseded by task 23: 19,042 triangles, 325 draw calls, 7.521 MB; computed, not runtime-measured): 19,172 triangles, 319 draw calls, 30 textures, 7.459 MB, 4 lights, 28 colliders. Task 22 is **not verified visually**.
New test areas from task 23 (desk lamps, interactable props, manuals), all computed from declared data or pure logic, none visual:
- `modelDetail.test.ts`: two lamps (green banker, cream table) with bulb, inner glow, sprite and pool parts; the sprite and pool count as 2 triangles each; ON and OFF materials per lamp; the three manuals on `shelf-b` level 2 (y 1.117..1.397, spines at x -4.635, z 1.4 / 1.8 / 2.2) with 7 ordinary books removed; budgets: 19,042 triangles (task 23 delta -130, limit 20,000), 4 lights, 7.521 MB texture memory (limit 8 MB), every texture disposed exactly once.
- `proceduralTextures.test.ts`: `lampGlow` 128x128 with 7 stops.
- `roomLayout.test.ts`: the lamp props are non-solid on the desk; 28 colliders unchanged.
- `targeting.test.ts`: `selectInteractionTargetAll` (2.0 m stations, 2.2 m props, cone, line of sight, nearest wins, stations first on ties).
- `propState.test.ts` (5), `inputMode.prop.test.ts` (12): `PROP_INTERACT` never emits `CALL_ON_INSPECT`, `RELEASE_POINTER_LOCK` or `CLEAR_INPUT`; lamps toggle independently; messages clear when the target changes.
- `WorldScene.test.ts` (`WorldScene interactable props (task 23.2)`): prompts, exact message texts in the world `role=status` region, `onInspect` not called for props, station prompts unchanged afterwards.
Task 23 is **not verified visually**. Counts are computed, not runtime-measured. (Test counts quoted in this task 23 list are the counts at task 23; task 24 changed them, see below.)

New test areas from task 24 (dramatic lighting and clue inspector), all computed from declared data or pure logic, none visual. Task 24 is **not verified visually** and no browser run covers it. Counts are computed, not runtime-measured.
- Task 24.1 (`lampCoupling.test.ts`, 8 new; `proceduralTextures.test.ts` +1; `modelDetail.test.ts` lamp, cone, pool, emissive and bloom cases; `memoryShift.test.ts` unchanged at 16 and not weakened): the factor table (2 lamps ON = 1.00 ambient / 1.00 west, 1 ON = 0.95 / 0.88, 0 ON = 0.90 / 0.75) is monotonic, clamped, and treats non-finite input as the mount state; `applyShift` multiplies ambient and west-light after the Memory_Shift blend, leaves `crt-light` and `arcade-light` alone, keeps the ambient floor for every blend value and lamp count, and does not accumulate over repeated frames; the lamp materials, cones (12-segment, opacity 0.14, additive, `DoubleSide`, no depth write), desk pools and the five ceiling bloom strips; `lampGlow` stays 128x128; the budgets (computed 19,100 triangles, 4 lights, 7.521 MB) and a single disposal of every texture.
- Task 24.2 (`archiveDocuments.test.ts`, 5 new; `propState.test.ts` 5 to 11; `targeting.test.ts` 26 to 32; `inputMode.prop.test.ts` 12 to 17; `WorldScene.test.ts` 14 to 21): the six cards with exact tags and titles, footer hint, 2 to 4 paragraphs each, ASCII English, no brand names, and `Cabinet status: awaiting service` on LAST EXIT and DEAD FREQUENCY only; eight world interactables (two lamps, three manuals, notebook, cork board, poster), never Stations; the poster is targetable only while the room is shifted; the card opens and closes on E (also with no target after the target was lost), Esc and a station open; E on a lamp while a card is open closes the card only; the notes counter goes 0, 1, unchanged on a re-read, 2, and hides while inspecting; lamp pills show the exact new texts; `onInspect` is never called for a prop and station E is unchanged afterwards.
- Not covered by a rendered test: the 2.6 m auto-close is tested only as the pure function `shouldCloseCard` (`propState.test.ts:99`); the per-frame call in `controller/usePlayerRig.ts:88-89` is an inspected code path, not run in jsdom. Closing on pointer-lock loss is wired in `controller/useWorldInput.ts:226` and is not testable in jsdom (jsdom has no pointer lock); `reduceCloseCard` itself is tested.
- Task 25 (see the next section): 31 tests added, all computed from data or pure logic, **not verified visually**.
- Task 15.4 stays complete as recorded: the project owner recorded a dev-sampler measurement before Tasks 23 to 27 (see `performance-log.md` section 4). It has not been repeated for the Task 23 to 27 scene.

New test areas from task 25 (lamp craft, arcade glow and the Club Archive Notice), all computed from declared data or pure logic, none visual. Task 25 is **not verified visually** and no browser run covers it. Counts are computed, not runtime-measured. 31 tests were added (663 to 694):
- Task 25.1: `targeting.test.ts` (left lamp wins from its front position, the notebook is still targetable from its own position, the console-front behaviour change: the notebook is now selected from (0, -0.5)); `modelDetail.test.ts` (brass collars +16 triangles, liner +2, the `#16a34a` ON shade at 0.38, pool opacity 0.42, cone opacity 0.20, budgets, every texture disposed once and twice-safe); `proceduralTextures.test.ts` (`coneFalloff` is 64x64, deterministic with a fake context, no randomness).
- Task 25.2: `targeting.test.ts` (the archive poster in range and at the boundary); `archiveDocuments.test.ts` (7 documents, the new title and prompt); `propState.test.ts` (counter total 7, uniqueness); `modelDetail.test.ts` (three floor glows +6 triangles, no new light, budgets); `WorldScene.test.ts` (card opens, counter text "NOTES READ: X / 7", `onInspect` not called).
- Per-file increases: `WorldScene.test.ts` +1, `archiveDocuments.test.ts` +1, `propState.test.ts` +1, `targeting.test.ts` +8, `modelDetail.test.ts` +11, `proceduralTextures.test.ts` +9 (total +31).

New test areas from task 26 (texture craft and mid-tone lighting), all computed from declared data or pure logic, none visual. Task 26 is **not verified visually** and no browser run covers it. Counts are computed, not runtime-measured. 44 tests were added (694 to 738): `lampCoupling.test.ts` +3 (8 to 11, "task 26.2: mid-tone lighting balance": normal ambient about 0.54 within 0.52 to 0.58 and above the floor, effective ambient 0.54 x 1.00 / 0.95 / 0.90 for 2 / 1 / 0 lamps in both states, exactly 4 lights with the west fill at #ffb766 and intensity 7 and the authored bases restored at t = 0), `modelDetail.test.ts` +4 (148 to 152, "task 26.1: anisotropy, VCR chassis and mug detail": anisotropy 4 on all 31 shared textures disposed once, the VCR chassis colour #2b303a, the mug rim, coffee surface and stain not overlapping another part, budgets of at most 19,200 triangles, 4 lights and 7.85 MB), `proceduralTextures.test.ts` +37 (157 to 194, "task 26.1: texture craft (redrawn in place)": 31 textures within 7.85 MB with power-of-two sizes and no growth, and for each redrawn texture determinism without Math.random, no fill outside the canvas and no brand names, plus the vcrDeck reels, LEDs and amber buttons and the wallPanel grime band).

New test areas from task 27 (cabinet detail and themed document card), all computed from declared data or pure logic, none visual. Task 27 is **not verified visually** and no browser run covers it. Counts are computed, not runtime-measured. 62 tests were added (738 to 800): `WorldScene.test.ts` +8 (22 to 30), `archiveDocuments.test.ts` +4 (6 to 10), `inputMode.prop.test.ts` +5 (17 to 22), `inputState.test.ts` +1 (15 to 16), `propState.test.ts` +5 (12 to 17), `modelDetail.test.ts` +14 (152 to 166), `proceduralTextures.test.ts` +25 (194 to 219).
- Task 27.1 (`proceduralTextures.test.ts`, `modelDetail.test.ts`): the `cabinetAndManualDetail` texture (256x128, 174,326 bytes estimate) and the in-place sharpening of `rugWoven`, `wood`, `woodDark` and `spineAtlas`; atlas boxes cached by size and window and disposed once; the three manuals map their own spine strip onto the spine face; the manual geometries are disposed once; no cream band parts remain (-36 triangles); the texture is bound to the door and kick plate, the control deck and the manual books, and flat colours return after dispose; without a canvas the materials keep flat colours; budgets (at most 19,200 triangles and not above 19,188, 4 lights, 32 textures within 7.85 MB); anisotropy 4 on all 32 textures, each disposed exactly once and twice-safe.
- Task 27.2 (`archiveDocuments.test.ts`, `propState.test.ts`, `inputState.test.ts`, `inputMode.prop.test.ts`, `WorldScene.test.ts`): the per-document themes and two pages, text contrast of at least 4.5:1 on every theme surface (`archiveDocuments.test.ts`), the page state (page 1 on open, page switches only while a card is open, every way of closing resets it, the read set and lamps unchanged), the key roles for `1`, `2` and the numpad, and the rendered card: theme, tabs, status pill, spec pills and the footer `Press 1 / 2 to switch pages · E or move away to close`; keys 1 and 2 claim the keys only while a card is open and never touch pointer lock or `onInspect`; a tab click switches pages without requesting pointer lock or calling `onInspect`; focus stays on the world when a tab is pressed with the mouse; E and Escape still close the card from page 2.
- Not covered: a real mouse click while the pointer is locked (jsdom has no pointer lock; tab buttons are clickable only when the pointer is not locked), screen-reader output of the `aria-live` region, internal scrolling on small viewports, mipmap bleed at atlas region edges, and legibility of the 5 to 7 px legends.
The three cabinets all call `onInspect('arcade')`; the `arcadeGame` field is world data only. No test covers which game the App panel opens, because `App.tsx` and `src/arcade/` are unchanged and every cabinet opens the same panel. The three-cabinet scene is **not verified visually**.

**Known gap (open item):** the spawn (0, 3) is exactly 1.0 m from the desk edge (z 2.0) and from the south wall (z 4). A 1.2 m disc around the spawn is therefore not clear; the test asserts 0.99 m, not 1.2 m. This was not requested in the final instructions and is not fixed.

## Correctness properties 1 to 17

Status values:
- **unit-test only**: example-based unit tests exercise the same behaviour; no property-based test exists.
- **not implemented**: no test found that exercises the behaviour, or only part of it.
- **present** is not used: no property-based test (the form the design specifies) exists for any property.

The optional property-based sub-tasks are **not implemented** for all 17 properties. The "Covering tests" column lists the example tests that I found by searching the repo and the verbose output. I did not execute any mutation or coverage check, so "covers" means the file tests the same functions, not that it covers every input class in the property.

| # | Design statement (short) | Covering tests | Status | Seeds | Gaps |
| --- | --- | --- | --- | --- | --- |
| 1 | `inputVector` has length 0 or 1; lone key gives the direction relative to yaw; combos never exceed one key. | `logic/movement.test.ts` | unit-test only | none | Fixed examples only; no random yaw or key combinations. |
| 2 | Displacement equals `WALK_SPEED * clampDt(dt)`; `clampDt` in [0, 0.1]; two half steps equal one step. | `logic/movement.test.ts`, `logic/playerStep.test.ts` | unit-test only | none | `clampDt` edge values are tested (NaN, negative, infinity, above 0.1). Step splitting equivalence was not checked in this audit. |
| 3 | Player stays inside bounds and never overlaps a collider across frame sequences. | `logic/collision.test.ts`, `logic/playerStep.test.ts`, `boundary.test.ts` | unit-test only | none | No long random frame sequences or random start positions. |
| 4 | Wall sliding keeps the tangential component. | `logic/collision.test.ts` | unit-test only | none | Specific walls and displacements only. |
| 5 | No tunneling through colliders thinner than 0.2 units. | `logic/collision.test.ts` | unit-test only | none | Specific cases only; no randomized thin-wall sweep. |
| 6 | `resolveAll` is idempotent; `relocateToValid` returns a valid position. | `logic/collision.test.ts` (`relocateToValid` cases) | unit-test only | none | `relocateToValid` is covered by four examples. Idempotency of `resolveAll` was not verified in this audit. |
| 7 | Pitch in [-80, 80] degrees, yaw finite in (-PI, PI], deltas above 500 px ignored. | `logic/look.test.ts` | unit-test only | none | No random delta sequences. |
| 8 | `selectInteractionTarget` returns null or a nearest valid station within range, cone and line of sight. (Task 23 added `selectInteractionTargetAll`, also covered by example tests.) | `logic/targeting.test.ts`, `layout/roomLayout.test.ts` | unit-test only | none | `targeting.bench.test.ts` only times calls and does not assert correctness. |
| 9 | `CALL_ON_INSPECT` at most once per fresh E press. | `logic/inputMode.test.ts`, `logic/inputMode.supplied.test.ts`, `logic/inputMode.prop.test.ts` | unit-test only | none | No random event sequences. |
| 10 | Inspecting state ignores world input; prop-supplied rules. | `logic/inputMode.test.ts`, `logic/inputMode.supplied.test.ts`, `WorldScene.inputEnabled.test.ts` | unit-test only | none | No random event sequences. |
| 11 | Resuming with E or Enter does not trigger an interaction. | `logic/inputMode.test.ts` | unit-test only | none | Only fixed key-repeat scenarios. |
| 12 | Prop-absent and prop-supplied-true machines behave identically until the first `CALL_ON_INSPECT`. | `logic/inputMode.supplied.test.ts`, `WorldScene.inputEnabled.test.ts` | unit-test only | none | No generated paired-sequence comparison. |
| 13 | Blur, hidden visibility, pointer lock change or inspecting clears held keys and pending deltas. | `logic/inputState.test.ts`, `logic/inputMode.test.ts`, `WorldScene.test.ts` | unit-test only | none | No generated held-key states. |
| 14 | `isKeyEventAccepted` rejects input, textarea, select, button, contenteditable and outside-wrapper targets. | `logic/inputState.test.ts`, `WorldScene.test.ts` (jsdom) | unit-test only | none | Covers the listed tag names, contenteditable and outside-wrapper. No generated targets. |
| 15 | Every station has a reachable approach cell; colliders and anchors are the same for `memoryShifted` true and false. | `layout/roomLayout.test.ts`, `scene/assetIntegration.test.ts` | unit-test only | none | Reachability is tested with a grid search, including with each door closed. Independence of colliders from `memoryShifted` was not confirmed by a dedicated test in this audit. |
| 16 | Flicker changes direction at most 3 times per second; transition completes in 3 s; reduced motion is constant. | `logic/palette.full.test.ts`, `scene/effectsTiming.test.ts`, `scene/memoryShift.test.ts` | unit-test only | none | The flicker test samples one dense time series (20,000 samples at 1 ms, starting at 0), not random start times. |
| 17 | `REQUEST_POINTER_LOCK` only comes from a click or key activation; none after `LOCK_DENIED` until a new gesture. | `logic/inputMode.test.ts`, `logic/inputMode.supplied.test.ts`, `logic/inputMode.fallback.test.ts`, `WorldScene.test.ts`, `WorldScene.inputEnabled.test.ts` | unit-test only | none | No random event sequences. |

Summary: 0 of 17 properties have a property-based test; 17 of 17 have related example tests (with the partial-verification notes above). No property is marked "not implemented" for lack of unit tests, but the optional property-based sub-tasks are all not implemented. If the user wants them, add `fast-check` (see design.md) and create `*.property.test.ts` files; this report does not do that.

## Integration-style tests

These tests combine several modules or render components; none uses a real browser.

| Area | File | Notes |
| --- | --- | --- |
| App shell | `src/App.test.ts` | 8 tests. |
| World component (jsdom) | `src/world/WorldScene.test.ts`, `src/world/WorldScene.inputEnabled.test.ts` | Prompts (stations, lamps, readable props), lamp status pill, Archive Document Card, notes counter, listeners, pointer-lock request after click, key filtering, no-WebGL fallback, supplied `inputEnabled` prop. |
| Boundary between modules | `src/world/boundary.test.ts` | 10 tests. |
| Assets | `src/world/assets/assetManifest.test.ts`, `src/world/assets/assets.test.ts`, `src/world/scene/assetIntegration.test.ts` | Manifest and loading logic; no real GLB parse in a browser. |
| Procedural textures | `src/world/scene/proceduralTextures.test.ts` | 219 tests on generated data (32 textures, 7.703 MiB computed estimate, computed, not runtime-measured). |
| Effects | `src/world/scene/effectsTiming.test.ts`, `src/world/scene/memoryShift.test.ts` | Timing and state logic. |
| Layout reachability | `src/world/layout/roomLayout.test.ts` | Grid search from the start position. |
| Reduced motion | `src/world/controller/useReducedMotion.test.ts` | 8 tests. |

## Behaviours verified only manually

`manual-test-log.md` lists the manual checks (keyboard K1 to K5, pointer lock P1 to P6, dialogs D1 to D6, input suspension I1 to I4, reduced motion R1 to R3, memory shift M1 to M3, and other rows). Every row has the status `not run`. This report claims no manual result. Until the user records results there, the following are unverified:
- keyboard-only play in a real browser, including focus behaviour;
- pointer lock, Esc, alt-tab and tab-switch behaviour;
- dialog interaction and focus return;
- live reduced-motion changes and the visual memory shift.

## Known untested areas

- Real browser rendering (WebGL output, frame rate, visual appearance of lighting and effects).
- Pointer lock in real browsers (jsdom tests only check that the code requests it after a click).
- Real GLB loading and parsing in a browser.
- Blender scripts (not run by any test).
- How procedural textures and the polish-pass and refinement-pass layout look (tests check generated data and layout numbers, not appearance). Not verified visually.
- Performance on target hardware. The project owner measured median 16.70 ms and p95 18.60 ms once on a dev build with the `?worldPerf=1` sampler (hardware not provided; see `performance-log.md` section 4). That measurement was taken before Tasks 23 to 27 and has not been repeated. Tasks 24 and 25 add additive transparent layers (lamp cones, desk pools, ceiling bloom strips), Task 26 adds anisotropy 4 on every texture and Task 27 adds a texture and a themed card overlay, so re-measuring is recommended; no test asserts speed, and `targeting.bench.test.ts` is informational.

## Test gaps recorded for Requirement 13.14

- `fast-check` not installed; optional property tests not implemented (see above).
- Component tests are `.test.ts` rather than `.test.tsx`, because of the `vite.config.ts` include pattern.
- No coverage measurement.

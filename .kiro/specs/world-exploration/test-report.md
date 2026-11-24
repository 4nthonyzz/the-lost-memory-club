# World Exploration: Test Report

Task 15.1, counts refreshed by task 18.4. Requirements 13.2, 13.10, 13.11, 13.14, 15.6. Related: `design.md` (Correctness Properties), `manual-test-log.md`, `tasks.md`.

## Result of the audit run

Command: `npm test` (Vitest, `vite.config.ts`: `environment: 'node'`, `include: ['src/**/*.test.ts']`). The earlier audit used `npx vitest run --reporter=verbose` for per-test output, which runs the same suite.

```
Test Files  27 passed (27)
     Tests  428 passed (428)
```

Task 18.4 ran `npm test` twice. Both runs passed 27 files and 428 tests (exit 0), so no flakiness was seen. The first run reported `Duration  8.94s`. `npm run typecheck` and `npm run build` exited 0. The suite has the same 27 files as before; 67 tests were added to existing files (roomLayout +4, memoryShift +1, modelDetail +41, proceduralTextures +21).

```
```

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
| `src/world/WorldScene.test.ts` | 10 |
| `src/world/WorldScene.inputEnabled.test.ts` | 8 |
| `src/world/boundary.test.ts` | 10 |
| `src/world/assets/assetManifest.test.ts` | 20 |
| `src/world/assets/assets.test.ts` | 9 |
| `src/world/controller/useReducedMotion.test.ts` | 8 |
| `src/world/layout/roomLayout.test.ts` | 24 |
| `src/world/logic/collision.test.ts` | 18 |
| `src/world/logic/frameStats.test.ts` | 5 |
| `src/world/logic/inputMode.test.ts` | 29 |
| `src/world/logic/inputMode.supplied.test.ts` | 17 |
| `src/world/logic/inputMode.fallback.test.ts` | 7 |
| `src/world/logic/inputState.test.ts` | 15 |
| `src/world/logic/look.test.ts` | 20 |
| `src/world/logic/movement.test.ts` | 15 |
| `src/world/logic/palette.test.ts` | 4 |
| `src/world/logic/palette.full.test.ts` | 13 |
| `src/world/logic/playerStep.test.ts` | 9 |
| `src/world/logic/targeting.test.ts` | 14 |
| `src/world/logic/targeting.bench.test.ts` | 1 (informational timing, asserts no speed) |
| `src/world/scene/assetIntegration.test.ts` | 6 |
| `src/world/scene/effectsTiming.test.ts` | 8 |
| `src/world/scene/memoryShift.test.ts` | 9 |
| `src/world/scene/modelDetail.test.ts` | 72 |
| `src/world/scene/proceduralTextures.test.ts` | 65 |
| **Total** | **428 in 27 files** |

New test areas since the audit (polish pass, tasks 18.1 to 18.3), all computed from declared data, none visual: island media console and 1.2 m walkway clearance (`roomLayout.test.ts`), north-wall filing cabinets and bulletin board, book and shelf counts, triangle budget below 20,000, texture memory within 8 MB, at most 4 lights, disposal of all 18 textures and wall geometries (`modelDetail.test.ts`), new procedural textures (`proceduralTextures.test.ts`), and memory-shift tint of the new materials (`memoryShift.test.ts`). Which exact tests were added by which task is not itemized here.

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
| 8 | `selectInteractionTarget` returns null or a nearest valid station within range, cone and line of sight. | `logic/targeting.test.ts`, `layout/roomLayout.test.ts` | unit-test only | none | `targeting.bench.test.ts` only times calls and does not assert correctness. |
| 9 | `CALL_ON_INSPECT` at most once per fresh E press. | `logic/inputMode.test.ts`, `logic/inputMode.supplied.test.ts` | unit-test only | none | No random event sequences. |
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
| World component (jsdom) | `src/world/WorldScene.test.ts`, `src/world/WorldScene.inputEnabled.test.ts` | Prompts, listeners, pointer-lock request after click, key filtering, no-WebGL fallback, supplied `inputEnabled` prop. |
| Boundary between modules | `src/world/boundary.test.ts` | 10 tests. |
| Assets | `src/world/assets/assetManifest.test.ts`, `src/world/assets/assets.test.ts`, `src/world/scene/assetIntegration.test.ts` | Manifest and loading logic; no real GLB parse in a browser. |
| Procedural textures | `src/world/scene/proceduralTextures.test.ts` | 65 tests on generated data (18 textures, 7.50 MB computed estimate). |
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
- How procedural textures and the polish-pass layout look (tests check generated data and layout numbers, not appearance). Not verified visually.
- Performance on target hardware (`targeting.bench.test.ts` is informational and asserts nothing about speed).

## Test gaps recorded for Requirement 13.14

- `fast-check` not installed; optional property tests not implemented (see above).
- Component tests are `.test.ts` rather than `.test.tsx`, because of the `vite.config.ts` include pattern.
- No coverage measurement.

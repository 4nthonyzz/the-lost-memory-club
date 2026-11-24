# World Exploration: App.tsx Integration Notes

Originally documentation only (task 9.9). Updated by tasks 13.5 and 15.5. Related: `proposals.md`, `performance-log.md`, `manual-test-log.md`, `test-report.md`, `src/world/README.md`.

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
| M6 and the polish pass (tasks 18.1 to 18.3: media island, north-wall filing cabinets and bulletin board, wood bookcases with dense books, textured walls and rug) in a browser | not verified visually (no browser run recorded). Layout data and budgets are verified by `src/world/layout/roomLayout.test.ts` (24 tests) and `src/world/scene/modelDetail.test.ts` (72 tests) |

Fresh `npm test` at the time of task 18.4: 27 files, 428 tests, all passed (run twice, same result).

## Arcade relocation (M6)

The arcade cabinet now stands inside the Arcade_Area (x 5.3..9.3, z -2..2), against its east wall, facing -x toward both east doorways. It is no longer on the north wall. The ARCADE sign hangs on the main-room face of the east wall above both doorways. Station ids, `StationId` and the `onInspect` payload are unchanged, so no change in `App.tsx` was needed. The Arcade_Area has a powered-down companion cabinet and a CRT stack as dressing (no interaction). Layout reachability is covered by `roomLayout.test.ts`. Visual result in a browser: not verified.

## Polish pass layout (tasks 18.1 to 18.3)

The `vhs` station (CRT television on a media console) is on a central media island, facing +Z at about x -0.4, z -0.3 (anchor on the south face). Two filing cabinets and a bulletin board are on the north wall. The reception desk moved 0.7 m south so the island keeps a 1.2 m walkway on all sides. The arcade cabinet is unchanged in the east Arcade_Area (facing -x). Shelves are wood bookcases with dense books; walls, floor and rug are textured. Station ids, `StationId` and the `onInspect` payload are unchanged, so `App.tsx` needed no change. Not verified visually (no browser run).

## HUD and status wording

- The world never shows lock messages. Its prompts are neutral and fixed: `Press E to inspect the CRT television` and `Press E to use the arcade cabinet`.
- The world `aria-label` says that station messages, including why a station cannot be used yet, appear in the status line at the bottom of the screen.
- App owns the status line. After E at the locked arcade it shows `ARCADE LOCKED · Recover the VHS clue first.` After a successful request it shows `CRT STATION CONNECTED` or `ARCADE STATION CONNECTED`.
- The wording is verified by `WorldScene.test.ts` (world side) and `App.test.ts` (App side). How it looks in a browser is not verified.

## Computed metrics

Computed from declared geometry and source, computed, not runtime-measured. Source: `performance-log.md`, re-checked with `npx vitest run src/world/scene/modelDetail.test.ts` (72 tests passed).

- Triangles: 15,646 (detail 15,404 + base 242), limit 20,000.
- Draw-call grouping estimate: 237 (not `renderer.info`).
- Lights: 4 (1 ambient + 3 point), limit 4.
- Procedural textures: 18, 7.50 MB estimate, limit 8 MB. The margin is thin (about 0.5 MB, within 1 MB of the limit). The largest textures, `wallPanel` and `corkBoard` (512x512, 1.33 MB each), are the first candidates to shrink or share.
- Colliders: 27.
- Targeting benchmark: informational timing only, varies per run (0.479 us/call in the latest run, 1.197 us/call in the full-suite run).
Runtime frame-time targets are not measured. See `performance-log.md`. No performance claim is made.

## Known gaps

- No restored-memory viewer component exists in the repo. No story content was invented. The HUD shows progress booleans only.
- Browser verification is missing for M6 and for the end-to-end App behavior listed above.
- P2 is pending. P5, P6 and P7 are pending (see `proposals.md`).
- Runtime performance is not measured.

## Backward compatibility

- The prop is optional and additive. `onInspect` and `memoryShifted` keep their names and types. `StationId` is unchanged.
- If a caller omits the prop, the world behaves as in sequence (c).

## Ownership rules

- `App.tsx` remains the source of truth for panel-open state (`station`) and unlock state (`hasClue`).
- The world never reads `GameState` and does not know whether the arcade is locked. It always calls `onInspect` for the targeted station.
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

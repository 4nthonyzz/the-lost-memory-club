# World Exploration: App.tsx Integration Notes

Originally documentation only (task 9.9). Updated by tasks 13.5, 15.5, 19.3, 20.3 and 23.3. Related: `proposals.md`, `performance-log.md`, `manual-test-log.md`, `test-report.md`, `src/world/README.md`.

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
| M6, the polish pass (tasks 18.1 to 18.3) and the refinement pass (tasks 19.1 to 19.2: re-centred media console, new lighting, SMPTE monitor, timecode, cables) and the three-cabinet arcade pass (tasks 20.1 and 20.2) and the task 21 couch fix, couch fabric, CRT casing and CRT glass textures and the task 22 detail pass (VCR deck face, armchair, VHS shells, metal filing cabinets, cardboard crates, desk detail, doorway trim) and the task 23 lamps, manuals and world message in a browser | not verified visually (no browser run recorded). Layout data and budgets are verified by `src/world/layout/roomLayout.test.ts` (32 tests) and `src/world/scene/modelDetail.test.ts` (131 tests) |

Fresh `npm test` at the time of task 23.3: 29 files, 619 tests, all passed (run twice, same result). `npm run typecheck` and `npm run build` exited 0.

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

## Interactable props and the world message (task 23, no App change)

Task 23 adds five world-local interactable props: `desk-lamp-left`, `desk-lamp-right`, `manual-snake`, `manual-maze` and `manual-frequency` (world-only type `PropInteractableId`). **No App change is needed and none was made.**

- `StationId` in `src/core/contracts.ts` is unchanged. `WorldSceneProps` is unchanged. `onInspect` is still called only for stations (`vhs`, `arcade`). A prop press produces a `PROP_INTERACT` effect inside the world: it never calls `onInspect`, never releases pointer lock and never suspends input. Code path: `controller/useWorldInput.ts` (`CALL_ON_INSPECT` branch checks `target.type === 'station'`); tests: `logic/inputMode.prop.test.ts` and `WorldScene.test.ts` ("lamp prompt toggles after E, onInspect is not called, and the world message shows the lamp text").
- Combined targeting is `selectInteractionTargetAll`: stations 2.0 m, props 2.2 m, same view cone and line of sight, nearest wins, stations first on ties.
- **Lamp state is session-only.** It lives in React state in `WorldScene`, is not stored anywhere (no LocalStorage) and is not part of `GameState`. Both lamps start ON and reset on reload.
- **Messages use a world-owned line, not the App status line.** `WorldSceneProps` has no status callback and `src/App.tsx` is unchanged, so prop messages appear in the `WorldMessage` overlay inside the world wrapper (`role="status"`, `aria-live="polite"`), just above the interaction prompt. They do not appear in the App HUD status line. A message clears when the target changes. There is no timer.
- Prompts: `Press E to turn off desk lamp` / `Press E to turn on desk lamp`, `Press E to read: SNAKE.EXE Manual`, `Press E to read: LAST EXIT Manual`, `Press E to read: DEAD FREQUENCY Manual`.
- Messages: `Desk lamp turned off.`, `Desk lamp turned on.`, and one manual text each for SNAKE.EXE, LAST EXIT and DEAD FREQUENCY (exact wording in `src/world/README.md`, "Interactable props").
- **The LAST EXIT and DEAD FREQUENCY manual texts describe gameplay that does not exist in `src/arcade/`.** They are in-world lore only. Only Snake exists, and every cabinet still opens the same App arcade panel.
- Scene: two desk lamps (green banker's lamp left, cream table lamp right) with ON/OFF visuals and **no added light** (still 4 lights); `lampGlow` is 128x128; three manual books stand on `shelf-b` level 2 (y 1.117..1.397, spines at x -4.635, z 1.4 / 1.8 / 2.2; emerald, crimson, amber with a cream band; anchors at x -4.6) and 7 ordinary books were removed from that row.
- Task 23 is **not verified visually**.

## Computed metrics

Computed from declared geometry and source, computed, not runtime-measured. Source: `performance-log.md`, re-checked in task 23.3 with `npx vitest run src/world/scene/modelDetail.test.ts` (131 tests passed).

- Triangles: 19,042 (detail 18,800 + base 242), limit 20,000 (task 23 delta -130 from 19,172). The margin is thin: 958 triangles (about 5 percent). The biggest consumers are the three bookshelves (2,352 + 2,280 + 2,088) and the three cabinets (1,316 each).
- Draw-call grouping estimate: about 325 (not `renderer.info`).
- Lights: 4 (1 ambient + 3 point: `crt-light`, `west-light`, `arcade-light`), limit 4. Task 23 added none.
- Procedural textures: 30, 7.521 MB estimate, limit 8 MB (task 23: `lampGlow` 64x64 to 128x128, +0.062 MB). The margin is also thin: about 0.48 MB. New in task 21: `couchFabric` 0.33, `crtCasing` 0.33, `crtGlass` 0.25 MB. New in task 22: `vcrDeck` 0.17, `vhsShell` 0.08, `metalCabinet` 0.33, `deskDetail` 0.04 MB; `crate` grew to 256x256 (0.33 MB) and `corkBoard` shrank to 256x256 (0.33 MB, 1.00 MB freed). The largest are the three posters and `spineAtlas` (0.66 MB each). First candidates to cut if room is needed: `console-cables` (1,088 triangles), the book count, and the three 0.66 MB posters or `spineAtlas`. Per-texture list: `performance-log.md` section 2.1.
- Colliders: 28 (the task 21 couch change adds none).
- Targeting benchmark: informational timing only, varies per run (1.025 us/call standalone, 1.790 us/call in the full-suite run of task 23.3; it times station targeting, not the combined targeting).
All figures above are computed, not runtime-measured. Runtime frame time was measured once by the project owner **before Task 23, and it has not been repeated** (dev build, `?worldPerf=1` sampler, 60 s walkthrough): median 16.70 ms, p95 18.60 ms, 10,378 triangles and 151 draw calls in the last rendered frame. Hardware, browser, OS, resolution and date were not provided, so the Reference_Hardware targets cannot be confirmed. First-render time is not measured. See `performance-log.md` section 4.

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
- LAST EXIT and DEAD FREQUENCY have no game behind them; all three cabinets open the same App arcade panel (Snake). Their manual texts on `shelf-b` are in-world lore for gameplay that does not exist.
- P2 is pending. P5, P6 and P7 are pending (see `proposals.md`).
- Runtime performance was measured once by the project owner before Task 23 and not repeated (dev build, hardware not provided): median 16.70 ms, p95 18.60 ms (see `performance-log.md` section 4). The agent took no measurement. First-render time and the Reference_Hardware confirmation are still open.

## Backward compatibility

- The prop is optional and additive. `onInspect` and `memoryShifted` keep their names and types. `StationId` is unchanged.
- If a caller omits the prop, the world behaves as in sequence (c).

## Ownership rules

- `App.tsx` remains the source of truth for panel-open state (`station`) and unlock state (`hasClue`).
- The world never reads `GameState` and does not know whether the arcade is locked. It always calls `onInspect` for the targeted station. Props (lamps, manuals) are handled inside the world and never call `onInspect`.
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

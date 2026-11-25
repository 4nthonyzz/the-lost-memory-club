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

Milestone M6, the polish pass and the spatial and visual refinement pass (media island, north-wall filing cabinets and bulletin board, wood bookcases with dense books, textured walls and rug, three arcade cabinets, ARCADE sign, dressing, re-centred console, SMPTE monitor, cables) have **no recorded browser run**. Their layout and data are verified by automated tests only; how they look and play is **not verified visually**. The same holds for tasks 21 and 22 (couch fix and fabric, CRT casing and glass, VCR deck face, armchair, VHS shell textures, metal filing cabinets, cardboard crates, desk detail, doorway trim): **not verified visually**. Task 23 (two desk lamps with ON/OFF visuals, the 128x128 `lampGlow`, the interactable lamps and manuals, the lamp status pill, the three manual books on `shelf-b`) and Task 24 (lamp cones and desk pools, emissive shades, room light coupling by lamps ON, ceiling bloom strips, the Archive Document Card, the three new readable props and the notes counter) are also **not verified visually**; their logic and computed data are **verified by automated test** only. Task 25 (notebook move, banker's lamp brass collars and liner, the soft `coneFalloff` cones, richer pools, the three arcade floor glows and the seventh document, the Club Archive Notice) is **not verified visually** either. Tasks 26 and 27 (texture craft, rebalanced lighting, cabinet and manual detail, the themed two-page card) and Task 28 (the scrollable document card and the protruding themed manuals) are **not verified visually** either. Task 29 (the open-book manual cards and the animated cabinet attract screens) is **not verified visually** as well: the book breakpoints, the spine, ribbon and stamp visuals and the fit inside the region need real layout (jsdom does none), and the attract animation smoothness, the pulse look and the texture upload cost have not been seen or measured in a browser. Task 30 (the rounded lamp glows and cones, the frame-rate-independent look and movement smoothing, and the faster attract screens at 24 Hz) is **not verified visually** either: the motion feel, the smoothness and the lamp look have not been seen in a browser.

## Purpose and boundaries

- The world renders the room, moves the player, finds the targeted station or world-local prop, and calls `onInspect(stationId)` for stations only. Props (desk lamps, arcade manuals, notebook, cork board, the two posters) are handled inside the world and never reach `onInspect`.
- It never reads `GameState` or lock state. It does not know whether the arcade is locked.
- It has no storage: no LocalStorage, no cookies, no backend. Lamp state, the open card and the notes counter are session-only React state in `WorldScene` (see "Interactable props").
- It imports nothing from `src/arcade/` or `src/memories/`. From `src/core/` it imports only the `StationId` type.
- It never requests pointer lock by itself. Lock is requested only from a user gesture.
- Status: **verified by automated test** (`src/world/boundary.test.ts`, 10 tests, checks the import boundary).

## Layout of `src/world/`

```
src/world/
  WorldScene.tsx            public component, WebGL fallback, error boundary, context-loss watch
  worldTypes.ts             Aabb, Vec2, StationDef, Facing, PropInteractableId, ReadableId, InteractableDef, InteractionTarget
  assets/                   GLB pipeline: assetManifest.ts (empty), AssetModel.tsx, loadGlb.ts
  controller/               usePlayerRig, useWorldInput, usePointerLock, useReducedMotion, useFrameSampler (dev only)
  layout/roomLayout.ts      single source of truth: bounds, walls, doors, props, colliders, station anchors
  logic/                    pure rules: movement, collision, look, targeting, inputMode, inputState, propState, archiveDocuments, palette, frameStats, playerStep, smoothing, constants
  overlay/                  DOM overlays and world.css: prompt, WorldMessage (lamp pill), WorldInspectorCard, NotesCounter, crosshair, capture overlay, hints, panel notice, WebGL fallback
  scene/                    Room, Props, Stations, Lighting, Effects, MemoryShiftDriver, lampCoupling, PartMeshes, WorldCanvas,
                            modelDetail.ts, proceduralTextures.ts, sharedResources.ts, memoryShift.ts, effectsTiming.ts, assetPlacement.ts
  *.test.ts (and tests beside each module)
tools/blender/              generate_assets.py, count_triangles.py, README.md (never run)
```

## Controls

| Input | Action |
| --- | --- |
| W A S D or arrow keys | Move (while a card is open, ArrowUp / ArrowDown scroll the card instead and do not move the player) |
| Mouse (after pointer lock) | Look |
| I J K L | Keyboard look (works without pointer lock) |
| E | Interact with the targeted station, desk lamp or readable prop; closes an open Archive Document Card |
| Esc | Releases the mouse (browser pointer-lock exit) and closes an open Archive Document Card |
| Click the view, or Enter / E on the capture overlay | Capture the mouse (a user gesture requests pointer lock) |
| Mouse wheel, only while a card is open | Scrolls the card (also while the pointer is locked); the page does not scroll |
| ArrowUp / ArrowDown, only while a card is open | Scroll the card by 48 px; they do not move the player |
| PageUp / PageDown, only while a card is open | Scroll the card by about one page |

Look and movement are smoothed since task 30.2 (exponential approach, frame-rate independent; reduced motion keeps the instantaneous behaviour; see "Task 30").

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

## Interactable props, lamp lighting and the Archive Document Card (tasks 23 to 25, not verified visually)

Nine world-local props can be targeted and used with E: the two desk lamps (`desk-lamp-left`, `desk-lamp-right`), the three arcade manuals (`manual-snake`, `manual-maze`, `manual-frequency`) and four readable notes (`desk-notebook`, `cork-board`, `poster-shift`, `poster-archive`). That is 2 lamps plus 7 readable documents. Their ids form the world-only type `PropInteractableId` (`worldTypes.ts`; `ReadableId` is the seven non-lamp ids). They are not `StationId` values, so `src/core/contracts.ts` is unchanged (`StationId` is still `'vhs' | 'arcade'`).

- **Targeting**: `selectInteractionTargetAll` (`logic/targeting.ts`) combines both kinds. Stations use the existing 2.0 m range, props use 2.2 m (`PROP_INTERACTION_RANGE`). Both use the same view cone and the same line-of-sight rule (a target's own collider is ignored for its own test). The nearest eligible target wins; on equal distance stations come first. The poster is the Memory_Shift overlay poster and has `requiresShift: true`, so it is targetable only while `memoryShifted` is true.
- **Effect**: E on a prop produces a `PROP_INTERACT` effect (`logic/inputMode.ts`). It never calls `onInspect`, never releases pointer lock, never clears input and never suspends the world. `onInspect` is called only from the `CALL_ON_INSPECT` branch of `controller/useWorldInput.ts`, which checks `target.type === 'station'`. E on a station is unchanged (`CALL_ON_INSPECT`, release lock, clear input); if a card is open, `WorldScene.tsx` closes it first and then calls `onInspect` once.
- **Session-only state.** Both lamps start ON. Lamp state, the open card and the set of read notes live in React state in `WorldScene` (`logic/propState.ts`). Nothing is stored (no LocalStorage, no cookie), none of it is part of `GameState`, and it resets on reload. Each lamp toggles only itself.
- **Prompts** (fixed text; the lamp prompt follows the lamp state):
  - `Press E to turn off desk lamp` (lamp is ON) / `Press E to turn on desk lamp` (lamp is OFF)
  - `Press E to read: SNAKE.EXE Manual`
  - `Press E to read: LAST EXIT Manual`
  - `Press E to read: DEAD FREQUENCY Manual`
  - `Press E to read: Shift Log Notebook`
  - `Press E to examine: Investigation Pinboard`
  - `Press E to inspect: 'The Signal Remembers' Poster`
  - `Press E to read: Club Archive Notice`
- **Lamp status pills.** A lamp press shows a short pill in the world-owned `WorldMessage` overlay (`overlay/WorldMessage.tsx`, `role="status"`, `aria-live="polite"`), just above the interaction prompt: `Banker's lamp switched ON` / `Banker's lamp switched OFF` and `Table lamp switched ON` / `Table lamp switched OFF`. The pill clears when the current target is no longer that lamp. There is no timer. It does not appear in the App HUD status line (`WorldSceneProps` has no status callback and `src/App.tsx` is unchanged). Manuals and notes no longer produce a message; they open a card.
- **Archive Document Card (`overlay/WorldInspectorCard.tsx`, text in `logic/archiveDocuments.ts`).** E on a readable prop opens a non-modal paper card inside the world wrapper (`role="region"`, `aria-label` equal to the title, `aria-live="polite"`). It has no focus trap and no focus move, its scroll container takes the mouse (wheel and scrollbar, see "Task 28"), and it does not call `onInspect`, change the input mode or touch pointer lock. It closes on E (also with no target, even after the target was lost), on Esc (the key is not prevented, so the browser still releases pointer lock), when pointer lock is lost, when the player walks more than 2.6 m from the prop's anchor (`CARD_CLOSE_DISTANCE`), when a station opens, and when the world enters `inspecting`. E on a lamp while a card is open closes the card and does not toggle the lamp. Each card is a two-page document (see "Task 27"; the three manual cards render as an open two-page book since task 29.1, see "Task 29") and ends with the footer `Press 1 / 2 to switch pages · E or move away to close`.

  | Prop | Card tag | Card title |
  | --- | --- | --- |
  | `manual-snake` | ARCADE MANUAL // CABINET 01 | SNAKE.EXE Manual |
  | `manual-maze` | ARCADE MANUAL // CABINET 02 | LAST EXIT Manual |
  | `manual-frequency` | ARCADE MANUAL // CABINET 03 | DEAD FREQUENCY Manual |
  | `desk-notebook` | TECHNICIAN LOG // NOV 1996 | Shift Log Notebook |
  | `cork-board` | EVIDENCE BOARD // INCIDENT REPORT | Investigation Pinboard |
  | `poster-shift` | ARCHIVE NOTICE // SIGNAL | The Signal Remembers |
  | `poster-archive` | CLUB NOTICE // MEMBERS ARCHIVE | Club Archive Notice |

- **All card text is placeholder lore for review by the story owner (Developer 3).** It is original, English and ASCII, and names no real brand. The LAST EXIT and DEAD FREQUENCY cards carry the status line `Cabinet status: awaiting service` (on page 2, TECHNICIAN / ANOMALY LOG, since task 29.1; it is no longer on page 1), because those games do not exist in `src/arcade/`. Only Snake exists there. The SNAKE.EXE text has not been checked against the Snake rules, so treat it as lore too.
- **Notes counter (`overlay/NotesCounter.tsx`).** `NOTES READ: X / 7` in the bottom-right corner counts the unique readable props opened this session (`role="group"`, label `Notes read: X of 7`, not a live region). The total is derived from `READABLE_COUNT` in `logic/archiveDocuments.ts` (it is not hard-coded in the component). Re-reading a prop does not change it. It is hidden while a station panel is open (inspecting). Session-only, no storage.
- **Poster decision.** No texture in the repository says "THE SIGNAL REMEMBERS". The Memory_Shift overlay poster (north wall, x -0.3, z -3.94) reads PLEASE REWIND / THE TAPE / REMEMBERS YOU, and it was used with the requested title "The Signal Remembers". It is invisible until the shift, so 7 / 7 needs `memoryShifted` to become true at least once.
- **Club Archive Notice (task 25.2).** The framed ARCHIVE / MEMBERS ONLY poster on the Arcade_Area north wall (`poster-arcade-area`, x 7..8, face at z -1.95) is the 7th readable document, `poster-archive`. It is always targetable (it is not a Memory_Shift overlay). Its anchor is (7.5, -1.93), 0.02 m in front of the poster face. The suggested anchor (5.58, -2.0) was not used: it lies on the Arcade_Area boundary and 1.92 m from the poster. The card text (tag CLUB NOTICE // MEMBERS ARCHIVE) is placeholder lore for review by the story owner (Developer 3). E opens the card and does not call `onInspect`.
- **Known limitations.**
  - On short windows (about 400 to 500 px tall) the card region is small. Since task 28.1 its content scrolls (wheel, ArrowUp / ArrowDown, PageUp / PageDown, scrollbar); see "Task 28" for what is untested.
  - The poster becomes targetable when the flag flips, slightly before its fade completes (the 2 s Memory_Shift blend).
  - Closing on pointer-lock loss is wired in `controller/useWorldInput.ts` (line 226) but is not testable in jsdom, which has no pointer lock. The 2.6 m auto-close runs in the per-frame player rig (`controller/usePlayerRig.ts:88-89`), which jsdom does not run; the pure function `shouldCloseCard` is unit-tested.
- Tests: `logic/targeting.test.ts` (42 tests in the file; `selectInteractionTargetAll`, nine interactables, notes in the layout, the shift poster only while shifted, the left lamp winning from its front position, the notebook still reachable, the archive poster in range and at the boundary), `logic/propState.test.ts` (17 now; 12 at task 25.2), `logic/archiveDocuments.test.ts` (13 now; 6 at task 25.2), `logic/inputMode.prop.test.ts` (22 now; 17 at task 25.2), `WorldScene.test.ts` (50 now; 22 at task 25.2; `WorldScene interactable props (task 23.2, 24.2, 25.2)`).

### Lamp lighting (task 24.1, computed from source and tests, not verified visually)

- **Desk lamps.** The left lamp is a green banker's lamp (`desk-lamp-left`), the right one a cream table lamp (`desk-lamp-right`). Each has a bulb (an 8-sided cylinder since task 30.1), an inner shade glow (a 24-segment disc), an additive cone and an additive light pool. Only the banker's lamp has a camera-facing glow sprite (a 24-segment disc); the table lamp's halo sprite was removed in task 30.1. ON uses emissive materials; OFF swaps to dark materials and the never-drawn `lampGlowOff` for the sprite, cone and pool. **No light was added** (4 lights).
- **Texture.** `lampGlow` was redrawn in place (still 128x128, same id): a warm-white core, a golden-amber falloff and a soft feather to alpha 0.
- **Cones.** Additive volumetric cones from each shade rim to the desk top: open cone, `DoubleSide`, `depthWrite` false. **Since task 30.1 it is a 24-segment open `lampCone` (48 triangles each; it was 12 segments, 24 triangles)** with a top radius of 85 percent of the shade opening (table lamp 0.102 m of 0.12 m, banker's lamp 0.045 m of the 0.053 m hood opening; the old 0.108 m banker cone was wider than the hood), the top inside the shade and the bottom 4 mm above the desk. Opacity was 0.14 in task 24.1 and is **0.20 since task 25.1**, with the soft `coneFalloff` map (see "Task 25.1").
- **Pools.** Additive desk pools (opacity 0.42 since task 25.1, was 0.32; polygon offset), 2 mm above the desk top. **The requested 0.85 m radius was not possible on a 0.8 m deep desk.** **Since task 30.1** each pool is a 24-segment disc centred exactly under its shade, with the radius capped to the distance to the nearest desk edge: banker 0.19 m, table 0.23 m (the old square 0.8 m decal, radius 0.4 m, is gone). `lampPoolPlacement` keeps it inside the desk top.
- **Emissive shades.** ON: banker shade `#16a34a` at 0.38 (since task 25.1; it was `#22c55e` at 0.75), table shade `#ffd27d` at 0.85. OFF shades have emissive intensity 0.
- **Room light coupling** (`scene/lampCoupling.ts`). The number of lamps ON scales the ambient and `west-light` intensities:

  | Lamps ON | Ambient | `west-light` |
  | --- | --- | --- |
  | 2 | 1.00 | 1.00 |
  | 1 | 0.95 | 0.88 |
  | 0 | 0.90 | 0.75 |

  The factors are applied in `applyShift` (`scene/memoryShift.ts`) after the Memory_Shift blend, from the authored base values every frame, so they do not accumulate. The effective ambient is 0.540 / 0.513 / 0.486 with 2 / 1 / 0 lamps ON in the normal state and 0.500 / 0.475 / 0.450 in the shifted state (computed). The ambient floor (0.35) is kept. `crt-light` (owned by the flicker) and `arcade-light` are untouched.
- **Ceiling bloom.** Additive bloom strips (2 triangles each, opacity 0.16, cool white, `lampGlow` map) hang 8 cm below the ceiling under the five ceiling fixtures (there are five, not two).

### Task 25: lamp craft, soft cones and arcade glow (computed from source and tests, not verified visually)

- **Task 25.1, notebook.** `desk-notebook` moved to anchor (-0.58, 1.62) (it was (-0.95, 1.7)). The guest book is nudged 0.12 m back and the pencil moves with the pad. Behaviour change: from the console front (0, -0.5) the notebook is now within 2.2 m and is selected there. Standing in front of the left lamp now targets the lamp, and the notebook is still targetable from its own position (`logic/targeting.test.ts`).
- **Task 25.1, lamps.** The banker's lamp gains two brass collars (+16 triangles, a new 8-triangle collar geometry) and a `#fff1cc` inner liner (+2). Cones and pools: see the bullets above.
- **Task 25.1, `coneFalloff`.** New 64x64 deterministic canvas texture (seed 133, linear filter, no mipmaps, 0.016 MB) on both lamp cones, with a flat-colour fallback and one disposal. No UV flip was needed. Cone opacity 0.14 to 0.20. The total was then 31 textures and 7.537 MB (task 27.1 later added a 32nd texture; see "Task 27").
- **Task 25.2, arcade floor glows.** Three additive decals reuse `lampGlow` (no new light), 0.9 x 0.9 m, opacity 0.26, at x 7.8 and z -1.2 / 0 / 1.2, tinted `#22c55e` (SNAKE.EXE), `#e11d48` (LAST EXIT) and `#f59e0b` (DEAD FREQUENCY). They sit at y 0.014, not the requested 0.003, because the runner decal is at 0.011 and a lower value would be hidden or z-fight. They have no collider.
- **Task 25.2, Club Archive Notice.** See "Poster decision" and the document table above (7 documents, "NOTES READ: X / 7").

### Task 26: texture craft and mid-tone lighting (computed from source and tests, **not verified visually**)

- Interrupted run and repair (task 26): the browser error `does not provide an export named 'VCR_CHASSIS_COLOR'` came from an import of a constant that was never exported. Fix: `export const VCR_CHASSIS_COLOR = '#2b303a'` in `scene/proceduralTextures.ts` (line 1443). All partial hunks of the interrupted run were complete and were kept, and the touched files were normalised to CRLF. The production build now bundles without a missing-export error.
- **26.1, anisotropy.** Every `CanvasTexture` gets anisotropy 4 (`TEXTURE_ANISOTROPY` in `scene/sharedResources.ts`, set once in `createCanvasTexture`). For nearest-filtered or non-mipmapped textures it has little or no visible effect.
- **26.1, device.** The identified device is the media-console VCR (`vcrDeckParts`, material `vcrDeck`, chassis `#2b303a`, was `#2e2f36`). Its front panel is redrawn: trim, cassette bay with reels, silver and amber buttons, green and red LEDs. The loose near-black `tapeBlack` cassettes on the desk were left unchanged. If the "desk recorder" in the request meant those cassettes, that part was not done.
- **26.1, textures redrawn in place** (same ids and sizes, no texture enlarged): `vcrDeck`, `wood`, `woodDark`, `floor`, `wallPanel`, `spineAtlas`, `corkBoard`, `deskDetail`, `crate`, `vhsShell`, the three attract screens, the three marquees and `crtGlass`.
- **26.1, mug.** A dark coffee surface on the mug rim and a translucent coffee-ring stain on the desk top, two 8-sided discs (+64 triangles: 19,124 to 19,188). The `mugRim` glaze is brighter (`#f2b8a4`).
- **26.1, wall tint.** `WALL_TEXTURE_ALBEDO` is unchanged and was not re-measured, so whether the wall tint shifted is **unverified**.
- **26.2, lighting** (`scene/Lighting.tsx` `POINT_BASES`, `logic/palette.ts`):

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

### Task 27: cabinet detail and themed document card (computed from source and tests, **not verified visually**)

Everything in this section is computed from source and automated tests. No browser run covers it.

- **27.1, new texture `cabinetAndManualDetail`** (`scene/proceduralTextures.ts`, 256x128, seed 134, 174,326 bytes = 0.166 MiB). The left half is the cabinet front: coin door, reject buttons with `25¢` / `INSERT COIN`, a louvred grille, a kick plate with `SER. 0996-LMC`, and control-deck legends `MOVE` / `ACTION` / `1P START` on the front lip of the deck. The right half holds three manual spines: `01 SNAKE.EXE`, `02 LAST EXIT`, `03 DEAD FREQUENCY`, with emblems and `89.4 MHz`. In task 27.1 the backgrounds were neutral so the book colour multiplied through; task 28.2 replaced that (see "Task 28").
- **27.1, geometry.** `atlasBoxGeometry` maps UV windows onto the player-facing face of each cabinet. The manuals are their own instanced meshes with remapped UVs. The cream band parts were removed (-36 triangles). New material `cabinetPanel`. The `rugWoven`, `wood`, `woodDark` and `spineAtlas` textures were sharpened in place (same ids and sizes).
- **27.2, Archive Document Card.** Each document has a theme, an accent colour, a status pill, spec pills and an inline SVG header, and two pages: `[1] OVERVIEW & RULES` and `[2] TECHNICIAN / ANOMALY LOG`. The old `paragraphs` field was replaced by `pages`. Text contrast is at least 4.5:1 on every theme (unit test in `logic/archiveDocuments.test.ts`).
- **27.2, controls while a card is open.**
  - Keys `1` and `2` (also Numpad 1 and 2) switch pages. They do not release pointer lock, clear movement or move the player. With no card open they do nothing.
  - The two tab buttons are clickable only when the pointer is not locked (while locked the cursor is hidden). They never request pointer lock.
  - The tabs use `tabIndex={-1}` and block the mouse-down focus change, so keyboard focus stays on the world wrapper and `E`, `1`, `2` and `Esc` keep working.
  - Footer: `Press 1 / 2 to switch pages · E or move away to close`.
- **Diegetic status text.** The card for cabinet 1 shows `CABINET 01 // PLAYABLE`. That line is in-world flavour text and is accurate only once the Snake game ships in `src/arcade/`; the current `ArcadePanel` says the engine is not implemented. The LAST EXIT and DEAD FREQUENCY cards still show `awaiting service`, on page 2 since task 29.1.
- **Placeholder lore.** All card text is placeholder lore pending review by the story owner (Developer 3).
- **Known limitations of task 27:**
  - `aria-live="polite"` is set on the whole card region, so a screen reader may read the full page aloud on every page change.
  - (Resolved by task 28.1.) On small viewports the card now scrolls internally; before task 28.1 it did not.
  - Mipmap bleed at the atlas region edges is untested.
  - Legibility of the 5 to 7 px legends on the cabinet texture is unverified.

Arcade manuals (task 23.2, geometry since task 28.2): three colour-coded volumes on level 2 of the west bookcase `shelf-b` (y 1.117..1.397, z 1.4 / 1.8 / 2.2) that protrude from the bookcase front: emerald SNAKE.EXE, crimson LAST EXIT and amber DEAD FREQUENCY, with spine and cover art from the right half of `cabinetAndManualDetail` (see "Task 28"). They are not colliders.

### Task 28: scrollable document card and protruding themed manuals (computed from source and tests, **not verified visually**)

Everything in this section is computed from source and automated tests (jsdom and pure logic). No browser run covers it.

- **28.1, wheel.** While a card is open, a window `wheel` listener with `{ passive: false }` scrolls the card and calls `preventDefault()`, so the page never scrolls (`overlay/WorldInspectorCard.tsx:153`). It exists only while a card is mounted: it is removed when the card closes and when the world unmounts, and none is attached with no card. `deltaMode` is normalised to pixels: pixels as they are, a line is 16 px (`LINE_PX`), a page is the card's `clientHeight`. The wheel is expected to reach the window while the pointer is locked; that is untested.
- **28.1, keys.** While a card is open, ArrowUp / ArrowDown scroll 48 px (`CARD_LINE_SCROLL_PX`, `WorldScene.tsx:41`) and PageUp / PageDown scroll about one page (the card's `clientHeight` minus 32 px). They are routed through `onCardScroll` (`WorldScene.tsx:132`) and do not move the player. W, S, A, D, ArrowLeft and ArrowRight still move the player. ArrowUp / ArrowDown held before the card opened are released by physical key code (`releaseCardArrows`), and a held W keeps moving. `preventDefault` is called for these keys only while a card is open; with no card the arrows move the player and PageUp / PageDown are not claimed (`controller/useWorldInput.ts`; key roles and `cardScrollFor` in `logic/inputState.ts`).
- **28.1, scroll container.** `.world-card` is the single scroll container: `pointer-events: auto`, `overflow-y: auto`, `overscroll-behavior: contain` and a themed scrollbar (`scrollbar-width: thin` plus `::-webkit-scrollbar` rules coloured from the card palette). `.world-card-region` around it stays `pointer-events: none`.
- **28.1, clicks.** The wrapper click handler ignores any target inside `[data-world-card]` (`controller/useWorldInput.ts:247-250`). The card stops native `mousedown` and `click` propagation except on buttons, because the page tab buttons rely on React's delegated handlers and the wrapper already ignores BUTTON targets. Interacting with the card therefore never requests pointer lock, never calls `onInspect` and never changes the input mode.
- **28.1, reset.** `scrollTop` is set to 0 when a card opens and, for the four room clues, when the page changes. **Changed by task 29.1:** for the three book manuals a page switch does not reset the scroll (side by side) or scrolls the chosen page into view (stacked); a new document still starts at the top (`WorldInspectorCard.tsx:209-226`).
- **28.2, geometry.** Each manual is 0.085 m wide (along z) x 0.31 m high x 0.29 m deep (along x) (`MANUAL_SIZE`, `scene/shelfModel.ts:316`). It protrudes 0.08 m (`MANUAL_PROTRUSION`, `shelfModel.ts:318`), so its spine face is at x -4.555, 0.045 m past the bookcase front face (x -4.6). The anchors are (-4.52, z) with z 1.4 / 1.8 / 2.2 (`layout/roomLayout.ts:279`), 0.035 m in front of the spine face. The line-of-sight boxes are the book volumes and are not solid, so the collider count stays 28. Three more ordinary books were removed from that row (`shelf-b` now has 165 items including slipcases).
- **28.2, art.** The right half of `cabinetAndManualDetail` was redrawn in place (still 256x128, 0 extra bytes): three spine strips of 20x128, three cover panels of 64x42 and cloth stripes. The exact colours `#16a34a` (SNAKE.EXE), `#e11d48` (LAST EXIT) and `#f59e0b` (DEAD FREQUENCY) are painted into the texture, and the manual instance colour is white, so nothing is multiplied. Without a canvas the manuals render plain white. Spines are on the +X face and covers on both +Z and -Z faces.
- **Metrics after task 28 (computed, not runtime-measured):** 19,116 triangles (task 28.2 delta -36 from 19,152, due to the removed books), 344 draw-call estimate, 4 lights, 32 textures at 7.703 MiB, 28 colliders, 9 interactables. Texture memory is unchanged.
- **Known limitations of task 28:**
  - Real scrollbar thumb dragging, trackpad deltas and wheel delivery under pointer lock are untested (jsdom has none of them).
  - The legibility of the spine and cover text and pixel art at runtime is unverified.
  - The orientation of the cover art on the -Z and +Z faces follows the `BoxGeometry` default UV layout and has not been checked visually.
  - Task 28 is **not verified visually**.

### Task 29: open-book manual cards and animated attract screens (computed from source and tests, **not verified visually**)

Everything in this section is computed from source and automated tests (jsdom and pure logic). No browser run covers it. jsdom does no layout, so nothing about real widths, breakpoints or painted pixels has been seen.

- **29.1, open book.** The three manual cards (`manual-snake`, `manual-maze`, `manual-frequency`) render with `data-layout="book"` as an open two-page book: `PAGE 01 // OVERVIEW & RULES` and `PAGE 02 // TECHNICIAN / ANOMALY LOG`. The four room clues (notebook, cork board, the two posters) keep their single-page layout (test "maze and frequency use the book layout; the four room clues do not").
- **29.1, breakpoints.** Side by side when the card is at least 640 px wide (`BOOK_SIDE_BY_SIDE_MIN_PX`, container query `@container worldcard (min-width: 640px)`, `overlay/world.css:566`), stacked below. Browsers without container queries use a viewport media query at 760 px (`@supports not (container-type: inline-size)`, `world.css:591`). The card measures its own width with a `ResizeObserver` and the helper `isStackedLayout(width)` (`logic/archiveDocuments.ts:91`); an unknown width counts as wide, and jsdom has no `ResizeObserver`, so it is guarded.
- **29.1, look.** Stitched spine, page-fold shading, ruled paper, page numbers `P. 01` / `P. 02` (`BOOK_PAGE_NUMBERS`), an accent ribbon on the active page and the stamp `LOST MEMORY CLUB // ARCHIVE COPY` (`BOOK_STAMP_TEXT`). Paper colours come from `BOOK_PALETTES` (`logic/cardThemes.ts:43`); a unit test checks every text and background pair at a contrast of at least 4.5:1 ("keeps text contrast of at least 4.5:1 on the book page paper").
- **29.1, meaning of `page`.** `page` is now the active page. Both pages are always rendered as `tabpanel`s, and the active one carries `aria-current="page"` (`WorldInspectorCard.tsx:322`) plus the ribbon. Keys `1` / `2`, the tab buttons and a click on a page select a page.
- **29.1, scrolling.** Stacked: switching page calls `scrollIntoView({ block: 'start' })` on the chosen page (falls back to `offsetTop` when `scrollIntoView` is missing). Side by side: a page switch does not reset the scroll. A new document always starts at the top (`WorldInspectorCard.tsx:209-226`).
- **29.1, clicks.** A click on a page (not a button) is handled by the card's own native `click` listener (`WorldInspectorCard.tsx:188-189`), because that listener stops propagation and React's delegated handlers would never run. The native `mousedown` is prevented so keyboard focus stays on the world wrapper. Card clicks never reach the wrapper handler, which also ignores `[data-world-card]` targets (`controller/useWorldInput.ts:250`), so no card interaction requests pointer lock (test "clicking a page (not a button) makes it active, keeps focus on the world and never requests pointer lock").
- **29.1, text moves.** The `Cabinet status: awaiting service` line of LAST EXIT and DEAD FREQUENCY moved from page 1 to page 2.
- **29.2, animated attract screens.** The three cabinet screens are now animated. The pure frame functions are `drawAttractSnakeFrame`, `drawAttractMazeFrame` and `drawAttractFrequencyFrame` (`scene/proceduralTextures.ts:385`, `:503`, `:592`). They use no `Math.random`, `Date` or clock (test "the frame functions use no Math.random, Date or performance clock").
- **29.2, the static art changed.** The old static `drawAttract*` functions now call the frame function at `elapsedSec = 0`, so the static draw equals frame 0 (test "elapsedSec 0 gives exactly the static draw sequence, and the seeds match the specs"). **But the static art itself is not what it was before task 29.2:** the snake path and fragment are new, the maze photos have gold glows and the corridors have strips and a marker, and the frequency noise now comes from a pure hash instead of the seeded generator. The first frame therefore looks different from the old static screens, and this has not been seen in a browser.
- **29.2, motion per screen.**
  - (Task 29.2 as first built; the speeds, spacing and cadence below were **changed by task 30.3**, see "Task 30".) SNAKE.EXE: a tape-serpent with an 11-segment body walks a closed 34-cell loop with six corners toward a glowing tape fragment, with a small ring while the pulse lasts.
  - LAST EXIT: a survivor dot walks the corridor loop through the three gold photographs, which pulse with a phase offset each, while a red shadow patrols its own smaller loop.
  - DEAD FREQUENCY: an amber waveform scrolls left over the oscilloscope grid, with three drifting spikes and noise on the right half, and a marker sweeps the dial between 88 and 108 MHz.
- **29.2, pulse limit.** `attractPulseLevel` is one `sin^2` bump of 1 s after each collection, 0 otherwise, so each collection gives two luminance direction changes (collections are 1.6 s apart since task 30.3). A test samples it at 240 Hz for 40 s and requires at most 3 direction changes in every rolling second ("the collection pulse changes luminance direction at most 3 times in every rolling second"); a second test does the same for the maze photo glow.
- **29.2, throttle and clock.** `stepAttractClock` (`scene/effectsTiming.ts:65`) advances the clock only while the effects are active, caps redraws at `ATTRACT_MAX_HZ` (12 per second in task 29.2, **24 per second since task 30.3**; the test confirms 20 to 24 redraws in every rolling second at 60 and 144 fps). While the world is inspecting the effects callback returns early, so the animation pauses and resumes where it stopped (test "inactive: no redraw and the clock does not advance, and it resumes where it stopped"). It runs in `Effects.tsx:181-210` inside `useFrame`; no timer is added.
- **29.2, reduced motion.** With reduced motion the clock stays at 0 and the screens show the static frame; if reduced motion turns on mid-run they are redrawn once at frame 0 and never again (tests "reduced motion never redraws from the initial static frame and keeps the clock at 0" and "reduced motion turning on mid-run redraws once at elapsed 0, then stays still").
- **29.2, reuse and cost.** `updateAnimatedAttractTextures` (`scene/sharedResources.ts:582`) redraws the existing canvas of each texture in place, using a `WeakMap` of context and size filled in `createCanvasTexture` (`sharedResources.ts:575`). It creates no canvas, texture or material, touches only the three attract textures (`attractSnake`, `attractMaze`, `attractFrequency`) and does nothing without a canvas or after dispose (tests "redraws only the three attract canvases in place, flags only their textures, and creates no canvas" and "is a no-op without a canvas and after dispose"). The cost estimate of task 29.2 (about 9.4 MB/s at 12 Hz) is **superseded by task 30.3** (about 18.9 MB/s at 24 Hz, see "Task 30").
- **Metrics after task 29 (history; current numbers are in "Task 30" and "Metrics"):** 19,116 triangles, 344 draw-call estimate, 856 tests in 31 files (824 before); lights, textures and colliders unchanged.
- **Known limitations of task 29:**
  - The book breakpoints (640 px container query, 760 px fallback), the spine, page-fold, ribbon and stamp visuals and whether the book fits inside the card region are unverified (jsdom does no layout).
  - The attract animation smoothness, the look of the pulse and the real texture upload cost are unverified.
  - Closing a book card by walking away (2.6 m) is untested here, because the player rig is mocked; the behaviour is unchanged by task 29.
  - Task 29 is **not verified visually**.

### Task 30: lamp glow fix, frame-rate-independent smoothing and faster attract screens (computed from source and tests, **not verified visually**)

Everything in this section is computed from source and automated tests (jsdom and pure logic). No browser run covers it. The motion feel, the smoothness and the lamp look have **not** been seen.

- **30.1, root cause of the right-lamp square.** The table lamp's inner glow (`lampInnerOn`, `MeshBasicMaterial` `#ffc272`, `DoubleSide`) was an opaque, untextured 0.13 x 0.13 m flat quad. Its half-diagonal is 0.092 m and the cream shade radius is about 0.074 m, so the corners stuck out of the shade by about 17.5 mm and read as a square.
- **30.1, fix.** The inner glow, the banker's halo and both desk pools are now 24-segment discs. The pools are centred exactly under the shades and their radius is capped to the nearest desk edge (banker 0.19 m, table 0.23 m; the old decal was 0.4 m). The table lamp's halo sprite was removed. The cones are new open 24-segment `lampCone` geometries with a top radius of 85 percent of the shade opening (table 0.102 m of 0.12 m; banker 0.045 m of the 0.053 m hood opening, where the old 0.108 m cone was wider than the hood), tops inside the shades and bottoms 4 mm above the desk. The bulbs changed from spheres to 8-sided cylinders to stay under the triangle cap, so they may look slightly faceted. Triangles went from 19,116 to 19,154 (+38). Tests: `scene/modelDetail.test.ts` ("task 30.1: ..." cases for discs, shade containment, cones, pools, OFF state and the +38 budget).
- **30.2, smoothing helpers.** `logic/smoothing.ts` exports `smoothingAlpha(lambda, dt)` (`1 - exp(-lambda * dt)`, 0 for non-positive or non-finite dt), `dampScalar`, `dampAngle` (shortest arc) and `dampVec2`. Constants in `logic/constants.ts`: `LOOK_SMOOTHING_LAMBDA` 32 and `MOVE_SMOOTHING_LAMBDA` 20 (initial values, **not tuned by feel**).
- **30.2, look and movement.** `stepPlayer` (`logic/playerStep.ts`) keeps a target look and a rendered look. Input moves the target and the rendered look approaches it exponentially. Movement damps the velocity toward the target velocity and applies it through `moveWithCollision`, with the into-wall velocity component zeroed. The rig (`controller/usePlayerRig.ts`) holds the smoothing state.
- **30.2, reduced motion.** With reduced motion, smoothing is bypassed and the result equals the old instantaneous behaviour exactly (test "reducedMotion reproduces the instantaneous result"). The default for everyone else is now smoothed look and movement; the instantaneous behaviour is the reduced-motion path only.
- **30.2, snapping.** Velocity goes to 0 and the look equals its target when the mode is inspecting, on blur, on `CLEAR_INPUT` and on suspension. The input hook bumps `clearEpochRef` (`controller/useWorldInput.ts`) whenever input is cleared, and the rig snaps when it sees a new epoch. A normal key release decays instead of snapping. The rig's frame loop and the blur-to-snap wiring are **not exercised by unit tests** (the pure `stepPlayer` snap is).
- **30.2, frame-rate evidence.** Test "gives nearly the same result at 30, 60 and 144 fps": the final look is within 0.02 rad and the final position within 0.1 m across those frame rates. Further tests: convergence above 99 percent after 0.15 s at lambda 32, no overshoot, wall penetration never, pitch clamped and yaw wrapped while smoothing.
- **30.3, attract cadence.** `ATTRACT_MAX_HZ` is 24 (`scene/effectsTiming.ts`), separate from the 12 Hz CRT overlay noise throttle (`NOISE_MAX_HZ`, unchanged). Test: 20 to 24 redraws in every rolling second at 60 and 144 fps.
- **30.3, motion.**
  - SNAKE.EXE: 7.5 cells per second (`SNAKE_CELLS_PER_SEC`) with sub-cell interpolation of the drawn positions. Fragment spacing is 12 cells (`SNAKE_FRAGMENT_SPACING`), so collections are 1.6 s apart.
  - LAST EXIT: the survivor moves at 75 px/s with a radar ping every 1.25 s, the anomaly at 55 px/s, and the photo shimmer stays at 0.5 Hz.
  - DEAD FREQUENCY: the waveform scroll is 2.2 times faster (`FREQUENCY_SCROLL_RATE` 15.4 rad/s), with three-sine modulation, smooth noise blending and a cosine-eased marker sweep. One lock pulse (`frequencyLockLevel`) fires per sweep at 89.4 MHz.
  - Scanlines and the grid are drawn in batched paths.
- **30.3, photosensitivity.** A test samples every pulse component at 240 Hz for 40 s and requires at most 3 luminance direction changes in every rolling second (`scene/effectsTiming.test.ts`, "<component> changes direction at most 3 times in every rolling second"). It measures the helper values, **not drawn pixels**. A second test requires snake collections at least 1.5 s apart.
- **30.3, cost estimate (arithmetic, not measured).** Three 256x256 RGBA textures are 786,432 bytes; at 24 uploads per second that is about 18.9 MB/s of texture uploads plus 72 canvas redraws per second. This doubles the 29.2 estimate (about 9.4 MB/s at 12 Hz) and is the largest runtime cost added since the owner's measurement. **Re-measure before relying on it** (frame time, and GPU upload time if available).
- **Metrics after task 30 (computed, not runtime-measured):** 19,154 triangles (detail 18,912 + base 242), draw-call estimate 343, 4 lights, 32 textures at 7.703 MiB, 28 colliders, 9 interactables, 888 tests in 32 files (856 in 31 files before; `smoothing.test.ts` is the new file).
- **Known limitations of task 30:**
  - Motion feel, smoothness and the lamp look are not verified visually. Lambdas 32 and 20 are untuned. The bulbs may look faceted.
  - The rig's frame loop and the blur-to-snap wiring are untested by unit tests.
  - The 24 Hz upload cost is estimated by arithmetic only.
  - Task 30 is **not verified visually**.

## World layout

Source of truth: `layout/roomLayout.ts` (**verified by automated test**: `layout/roomLayout.test.ts`, 33 tests, including grid-search reachability of every station and a cell in front of each cabinet through each door separately).

- Main room: x -5..5, z -4..4, height 3. The player starts at (0, 3) facing north.
- Arcade_Area: x 5.3..9.3, z -2..2, east of the main room, entered through two doors in the east wall (`door-east-north`, `door-east-south`). Door frames are colliders; the openings are not.
- VHS station (CRT television on a media console): the console covers x -0.9..0.9, z -2.1..-1.5 (north-centre zone), facing +z, with the `vhs` anchor at (0, -1.5) on the south face. The CRT is centred on the console. It is no longer on the north wall. The island keeps a 2.7 m front walkway to the reception desk, 1.9 m to the north wall and 1.3 m to the filing cabinets (computed from the layout, tested). Walkway tests: `keeps at least 1.2 m of walkway on all four sides of the island` and `leaves a 2.7 m unobstructed walkway between the console front and the reception desk`.
- Reception desk: unchanged at x -1.5..1.5, z 1.2..2.0.
- Woven floor rug under the island: x -1.6..1.6, z -2.5..-0.1 (visual only).
- Reception desk lamps (task 23.1): `desk-lamp-left` (green banker's lamp) and `desk-lamp-right` (cream table lamp), non-solid props on the desk top. No light is attached to them. The desk notebook, the cork board (bulletin board) and the Memory_Shift overlay poster are readable props (anchors on the notebook, the bulletin board and the poster; see "Interactable props").
- Lights (4): ambient, `crt-light` at (0, 1.6, -0.6), a warm tungsten `west-light` at (-2.6, 2.3, 0.2) over the west bookcase and lounge zone (it replaces the former magenta light), and `arcade-light` at (7.4, 2.4, 0) with distance 6. Since task 26.2 the authored values are ambient 0.54 (shifted 0.50), `crt-light` 6.5, `west-light` 7 with distance 8.5, and `arcade-light` 5.5 in `#8a72f0` (see "Task 26"). Since task 24.1 the ambient and `west-light` intensities are multiplied by a factor that depends on how many desk lamps are ON (see "Lamp lighting").
- Console detail (render-only, no collider change): SMPTE colour-bar reference monitor, green 00:19:96 timecode window and metallic tape slot on the VCR, routed coaxial and power cables behind the console, and metric wood UVs.
- North wall: two filing cabinets flanking a wall-mounted bulletin board.
- **Three arcade cabinets** inside the Arcade_Area against its east wall (x 8.4..9.2, front faces at x = 8.4, facing -x toward both doorways). Each is a solid collider and a Station that calls `onInspect('arcade')`:
  - SNAKE.EXE: z -1.7..-0.7, anchor (8.4, -1.2), `arcadeGame` `'snake'`.
  - LAST EXIT: z -0.5..0.5, anchor (8.4, 0), `arcadeGame` `'maze'`.
  - DEAD FREQUENCY: z 0.7..1.7, anchor (8.4, 1.2), `arcadeGame` `'frequency'`.
  - The optional `arcadeGame` field is world data only. `App.tsx` and `src/arcade/` are unchanged, so **every cabinet currently opens the same App arcade panel**, and only Snake exists in `src/arcade/`. **LAST EXIT and DEAD FREQUENCY are attract-screen art for games that are NOT implemented** (**planned**).
  - Cabinet parts are high-craft: stepped side wing, tilted screen hood, coin slots, grilles, buttons and T-molding accents in green, crimson and amber.
- Arcade floor glows (task 25.2): three additive decals in front of the cabinets at x 7.8, z -1.2 / 0 / 1.2 (0.9 x 0.9 m, y 0.014). The framed ARCHIVE poster on the Arcade_Area north wall (x 7..8) is the readable `poster-archive` with anchor (7.5, -1.93).
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

32 deterministic canvas textures (`scene/proceduralTextures.ts`, `scene/sharedResources.ts`; the 32nd, `cabinetAndManualDetail`, came with task 27.1 and its right half was redrawn in place by task 28.2): three cabinet attract screens (`attractSnake`, `attractMaze`, `attractFrequency`, 256x256), three cabinet marquees (`marqueeSnake`, `marqueeMaze`, `marqueeFrequency`, 256x64), sign face, three posters (two ordinary, one shifted), shifted plaque, floor, wood, dark wood, crate, grille, book spine atlas, wall panel (256x256), woven rug, cork board, lamp glow (`lampGlow`, 128x128 since task 23.1, redrawn in place in task 24.1, see below), SMPTE colour bars and the timecode window, plus seven added in tasks 21 and 22. Task 21: `couchFabric` (256x256 woven upholstery, metric fabric UVs), `crtCasing` (256x256 charcoal casing with a generic "KV-1996" badge, metric UV, one tile across the front shell) and `crtGlass` (256x256, on the shared `crtScreen` material, which uses a white base when textured and a teal flat fallback). Task 22: `vcrDeck` (256x128 VCR face with PLAY, STOP, REW and EJECT buttons and a "HI-FI STEREO" label), `vhsShell` (128x128 tape shell), `metalCabinet` (256x256 filing-cabinet front) and `deskDetail` (128x64 notebook cover grain and ruled page block). Earlier, 6 textures were added and 4 removed: `arcadeScreen`, `marquee`, `deck` and `outOfOrder`.

Task 23.1 change (computed from source and tests, **not verified visually**): `lampGlow` grew from 64x64 to 128x128 (0.021 MB to 0.083 MB, +0.062 MB). It is a deterministic multi-stop radial gradient with 7 stops, alpha 0 at 90 percent of the half-width, and a filament core. It is shared by the banker's glow sprite (`lampHalo` material; the table lamp has none since task 30.1), the desk light pools (`lampPool`, `lampPoolBanker`) and the ceiling bloom strips (`ceilingBloom`).

Task 24.1 change (computed from source and tests, **not verified visually**): `lampGlow` was redrawn in place at the same size and id (128x128, 0.083 MB, no memory change): a warm-white core, a golden-amber falloff and a soft feather to alpha 0 (8 gradient stops plus a filament dot). `scene/proceduralTextures.ts`, `LAMP_GLOW_STOPS`.

Task 25.1 change (computed from source and tests, **not verified visually**): the 31st texture, `coneFalloff` (64x64, seed 133, linear filter, no mipmaps, 0.016 MB), is the soft map of both lamp cones (`lampConeBanker`, `lampConeTable`). It has a flat-colour fallback, is registered for disposal and is disposed exactly once. No UV flip was needed. Task 25.2 adds no texture: the arcade floor glows reuse `lampGlow`.

Task 26.1 change (computed from source and tests, **not verified visually**): anisotropy 4 on every texture, and the textures listed under "Task 26" were redrawn in place. No texture was added or enlarged in task 26, so the count stayed 31 and the estimate 7.537 MB at that time (task 27.1 then added one: 32 textures, 7.703 MiB).

Task 28.2 change (computed from source and tests, **not verified visually**): the right half of `cabinetAndManualDetail` was redrawn in place (256x128, 0 extra bytes, texture count 32, memory unchanged at 7.703 MiB). It now holds three spine strips of 20x128, three cover panels of 64x42 and cloth stripes in the exact colours `#16a34a`, `#e11d48` and `#f59e0b`; the manual instance colour is white. See "Task 28".
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

The couch uses the `couchBody`, `couchCushion` and `couchPillow` materials, which take the `memoryShift` tint. The CRT casing fallback colour (no canvas) is charcoal. Without a canvas or 2D context, materials keep flat colors. Textures are disposed on unmount, each exactly once. **verified by automated test** (`scene/proceduralTextures.test.ts`, 231 tests; `scene/modelDetail.test.ts`, 186 tests). Whether they look readable in a browser: **not verified visually** (S7 to S11 `not run`).

Couch fix (task 21.1): the dark patch on the couch came from a dark "worn patch" box placed 4 mm above the middle cushion. It is removed, together with a second hidden patch. The roll caps are shortened by 4 mm to avoid coplanar faces. The pillow sits in the left seat corner; a test checks with an oriented-box (OBB) no-intersection test that it does not overlap the other couch parts. The couch has 388 triangles (was 412) and no new collider. Task 21 is **not verified visually**.

## Asset pipeline

- `ASSET_MANIFEST` in `assets/assetManifest.ts` is **empty**. No GLB is loaded. `public/models/` holds only `.gitkeep`.
- `AssetModel` renders the primitive fallback immediately and keeps it when the manifest has no entry or loading fails. **verified by automated test** (`assets/assets.test.ts`, `scene/assetIntegration.test.ts`).
- `tools/blender/generate_assets.py` and `count_triangles.py` have **never been run**: Blender is not installed on the development machine. No `.glb` file exists and no asset triangle count or file size has been measured (**planned/prototype**). See `.kiro/specs/world-exploration/asset-log.md`.

## Dev performance sampler

Dev builds only (`import.meta.env.DEV`). Run `npm run dev` and open the page with `?worldPerf=1` (or set `window.__WORLD_PERF__ = true` before mount). Then call `window.__worldPerf.reset()` before a walk and `window.__worldPerf.summary()` after it. The summary returns `frames`, `medianMs`, `p95Ms`, `triangles`, `drawCalls`, `geometries` and `textures`. The sampler does nothing in `npm run build` output. The statistics helper is **verified by automated test** (`logic/frameStats.test.ts`); the sampler itself has not been run in a browser (**not verified**).

## Metrics

Computed from declared geometry and source, **computed, not runtime-measured**. Source: `.kiro/specs/world-exploration/performance-log.md`. Figures re-checked in task 30.4 with `npx vitest run src/world/scene/modelDetail.test.ts` (186 tests passed); the console lines were:
`[18.2] computed triangles: 19154 (detail 18912 + base 242), draw-call estimate (grouped by geometry+material): 343, books 363, slipcases 136, leaning 16, per shelf shelf-a=16 draws/178 books, shelf-b=19 draws/165 books, shelf-c=16 draws/156 books, textures 32, texture memory estimate 7.70 MB`
`[22.1] computed triangles 19154, draw-call estimate 343, textures 32, texture memory estimate 7.703 MB (computed, not runtime-measured): ... cabinetAndManualDetail 256x128=0.166MB`
`[30.1] triangles 19154 (delta 38 from 19116)` and `[28.2] triangles 19154 (delta 2), textures 32, texture memory 7.703 MiB (computed)` (the `[28.2]` delta is only against the 19,152 baseline of task 27; the per-shelf counts include the 136 slipcases).

| Metric | Value | Label |
| --- | --- | --- |
| Triangles | 19,154, limit 20,000 (test limit 19,200); task 30.1 changed it by +38 from 19,116 (lamp discs, cones and cylinder bulbs); task 29 changed nothing; task 28.2 had changed it by -36 from 19,152, task 27 by -36 and task 26 by +64 | computed, not runtime-measured |
| Draw-call grouping estimate | about 343 (task 30.1 removed one draw with the table lamp halo sprite; was 344 after task 29 and 339 before task 27) | computed estimate, not `renderer.info` |
| Books | 363 as printed by the `[18.2]` line (per-shelf item counts 178 + 165 + 156 = 499 also include the 136 slipcases); 16 leaning books included; task 28.2 removed 3 ordinary books from `shelf-b` | computed |
| Lights | 4 (1 ambient + 3 point), limit 4 (`Lighting.tsx:14` and `:51-54`); tasks 23 to 30 added none | computed from source |
| Procedural textures | 32, 7.703 MiB (8,076,989 bytes) estimated, limit 8 MB (test limit 7.85 MB); anisotropy 4 on every texture; every texture registered for disposal; task 27.1 added `cabinetAndManualDetail` (0.166 MiB) and enlarged none; tasks 29 and 30 added none and changed no size, but the three attract screens are redrawn and re-uploaded up to 24 times per second since task 30.3 (estimate, about 18.9 MB/s and 72 canvas redraws per second, arithmetic, not measured) | computed, not runtime-measured |
| Colliders | 28 (tasks 23 to 30 added none) | computed |
| Interactables | 9 (2 lamps + 7 readable documents) | computed |
| Targeting benchmark | informational timing only, no threshold; varies per run and machine (task 29.3 standalone run: measured total 27.69 ms, 1.385 us/call, 254 reachable cells x 16 yaws, 4 stations and 28 colliders, 1308 calls returned a station; the earlier task 28.3 standalone run printed 12.12 ms, 0.606 us/call, with the same workload: 254 reachable cells x 16 yaws, 4 stations and 28 colliders; the two full `npm test` runs of task 28.3 gave 33.61 ms / 1.681 us/call and 48.21 ms / 2.410 us/call while other files ran in parallel; 0.626 us/call in task 27.3); this benchmark times station targeting only, not `selectInteractionTargetAll` | informational |
**The triangle margin is thin:** 19,154 leaves 846 triangles (about 4.2 percent) below the 20,000 limit (46 below the 19,200 test limit). The biggest consumers (computed by summing declared objects in task 21.3, not recomputed after task 23; tasks 24.1, 25, 26 and 27 then added 58, 24 and 64 triangles and removed 36): the three bookshelves (2,352, 2,280 and 2,088 before the manuals replaced 7 books on `shelf-b`), the three cabinets (1,316 each), `console-cables` (1,088), the two filing cabinets (692 each) and the desk (672). Task 23.1 replaced the two old desk lamps (470 triangles) with two new ones (352): -118. Task 23.2 replaced 7 books on `shelf-b` (-84) with 3 manuals and 3 spine bands (+72): -12. Task 24.1 added 58 (two lamp cones at 24 triangles each plus five ceiling bloom strips at 2 each, by arithmetic); task 24.2 added no triangles.

**The texture margin is also thin:** 7.703 MiB computed (8,076,989 bytes) against the 8 MB limit leaves about 0.30 MB. First candidates to cut if more room is needed: `console-cables` (1,088 triangles), the book count (363 books), the three 0.66 MB posters (`posterSunset`, `posterReel`, `shiftPoster`, 256x512) or `spineAtlas` (512x256, 0.66 MB), which could shrink. The per-texture list (MB, computed, not runtime-measured, rounded to two decimals): attractSnake 0.25, attractMaze 0.25, attractFrequency 0.25, marqueeSnake 0.06, marqueeMaze 0.06, marqueeFrequency 0.06, signFace 0.33, posterSunset 0.66, posterReel 0.66, shiftPoster 0.66, shiftPlaque 0.17, floor 0.08, wood 0.08, woodDark 0.08, crate 0.33, grille 0.08, spineAtlas 0.66, wallPanel 0.33, rugWoven 0.33, corkBoard 0.33, lampGlow 0.08, smpteBars 0.13, timecode 0.02, couchFabric 0.33, crtCasing 0.33, crtGlass 0.25, vcrDeck 0.17, vhsShell 0.08, metalCabinet 0.33, deskDetail 0.04, coneFalloff 0.02, cabinetAndManualDetail 0.17. The largest are the three posters and `spineAtlas` (0.66 each).
**Measured runtime values** (measured by the project owner **before Tasks 23 to 30; not repeated since**, so they do not describe the smoothed look and movement, the reworked lamp glows, the lamps, manuals, lamp cones, desk pools, ceiling bloom strips, arcade floor glows, the open-book manual cards, the animated attract screens, cabinet and manual detail texture or notes counter. **Re-measuring is recommended**, because Tasks 24 and 25 add additive transparent layers, Task 26 adds anisotropic filtering (4x) on every texture and Task 27 adds a texture and a themed card, which add GPU cost (Task 28 adds no triangles, textures or lights). **Tasks 29.2 and 30.3 are the largest new runtime cost since this measurement:** the three attract textures are redrawn and uploaded up to 24 times per second since task 30.3, about 18.9 MB/s of uploads and 72 canvas redraws per second by arithmetic (not measured; it was about 9.4 MB/s at 12 Hz in task 29.2). **Re-measuring is strongly recommended now** because of these 24 Hz uploads; dev build, `?worldPerf=1` sampler, 60 s walkthrough across both rooms and all three arcade cabinets; raw output in `.kiro/specs/world-exploration/performance-log.md` section 4):

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
- Triangles and draw calls describe the last rendered frame from one camera position, after frustum culling, with each instanced mesh counted as one call. They are not comparable one-to-one with the computed whole-scene figures above (19,154 triangles, 343 draw-call estimate, 32 declared textures now; the measurement predates Tasks 23 to 30, so the scene it measured had fewer declared textures and a different triangle count); the lower measured numbers are expected.
- Textures 29 measured vs 30 declared at the time (32 declared now): `renderer.info.memory.textures` counts textures uploaded to the GPU so far. One declared texture may not have been uploaded yet or may be absent (likely explanation, not verified).
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

Fresh run for this README (task 30.4): `npm run typecheck` exit 0, `npm run build` exit 0 (106 modules transformed), `npm test` **32 test files, 888 tests, all passed** (exit 0; the `Test Files  32 passed (32)` and `Tests  888 passed (888)` lines appeared in each of the runs and no test timed out; a JSON-reporter run also counted 888 passed). The four CPU-heavy tests from task 24.3 still carry an explicit 30,000 ms per-test timeout. Details in `test-report.md`. Files under `src/world/` and their counts:

| Area | Files (tests) |
| --- | --- |
| Component | `WorldScene.test.ts` (50), `WorldScene.inputEnabled.test.ts` (8), `boundary.test.ts` (10) |
| Assets | `assets/assetManifest.test.ts` (22), `assets/assets.test.ts` (9), `scene/assetIntegration.test.ts` (6) |
| Controller | `controller/useReducedMotion.test.ts` (8) |
| Layout | `layout/roomLayout.test.ts` (33) |
| Logic | `collision` (18), `frameStats` (5), `inputMode` (29), `inputMode.supplied` (17), `inputMode.fallback` (7), `inputMode.prop` (22), `inputState` (18), `look` (20), `movement` (15), `palette` (4), `palette.full` (13), `playerStep` (19), `smoothing` (6), `propState` (17), `archiveDocuments` (13), `targeting` (42), `targeting.bench` (1, informational) |
| Scene | `effectsTiming` (20), `memoryShift` (16), `lampCoupling` (11), `modelDetail` (186), `proceduralTextures` (231) |

Outside `src/world/`: `src/App.test.ts` (8, stubbed `WorldScene`) and `src/core/gameReducer.test.ts` (4). Counts change when tests are added. Details, the 17 correctness properties and gaps: `.kiro/specs/world-exploration/test-report.md`.

Not covered: optional property-based tests (`fast-check` is not installed; 0 of 17 properties have one), coverage measurement, real-browser rendering, Blender scripts.

## Pending proposals

See `.kiro/specs/world-exploration/proposals.md`. In short: P1 implemented; P3 and P4 implemented for the App HUD and modal styles (world overlay styles remain in `overlay/world.css`); P2 (`reducedDistortion` prop), P5, P6 and P7 pending; P8 partially superseded by the HUD status line; P9 installed except `fast-check`; P10 folder exists, scripts untested.

## Known limitations and gaps

- No browser run is recorded for M6, the polish pass, the refinement pass or the three-cabinet pass; the new layout and textures are not verified visually.
- All three cabinets open the same App arcade panel (Snake). LAST EXIT and DEAD FREQUENCY have no game behind them. Their manuals on `shelf-b` and their Archive Document Cards are in-world lore for gameplay that does not exist in `src/arcade/`.
- Tasks 23 to 30 (lamps, manuals, lamp cones and pools, room light coupling, ceiling bloom, Archive Document Card, notes counter, banker's lamp collars, soft cones, arcade floor glows, Club Archive Notice, cabinet detail texture, two-page themed card, scrollable card, protruding themed manuals, open-book manual cards, animated attract screens, rounded lamp glows, smoothed look and movement, 24 Hz attract cadence) are not verified visually or in a browser. Lamp state, the open card and the notes counter are session-only and reset on reload. Lamp pills appear in the world-owned overlay, not in the App HUD status line. All card texts are placeholder lore pending review by the story owner (Developer 3).
- Archive Document Card: on short windows (about 400 to 500 px tall) the card region is small (its content scrolls since task 28.1; see "Task 28" for the untested parts); the poster becomes targetable when the flag flips, slightly before its fade completes; closing on pointer-lock loss is wired but not testable in jsdom.
- The requested 0.85 m lamp pool radius was not possible on the 0.8 m deep desk; since task 30.1 the pools are 24-segment discs of 0.19 m (banker) and 0.23 m (table), capped to the nearest desk edge.
- Spawn gap (open item): the spawn (0, 3) is exactly 1.0 m from the desk edge and the south wall, so a 1.2 m disc around the spawn is not clear. The test asserts 0.99 m. This was not requested in the final instructions and is not fixed. The manual test log has no recorded result.
- Frame time and renderer counts were measured once by the project owner before Tasks 23 to 30 (dev build, hardware not provided; see the Metrics section) and have not been repeated; re-measuring is strongly recommended, especially because of the 24 Hz animated attract texture uploads of task 30.3. First-render time is not measured, and the Reference_Hardware cannot be confirmed. The triangle margin below the 20,000 limit is only 846 (computed), and the texture margin below 8 MB is only about 0.30 MB (computed). Task 27 added 62 tests (738 to 800 in 31 files), task 28 added 24 (800 to 824), task 29 added 32 (824 to 856 in 31 files) and task 30 added 32 (856 to 888 in 32 files).
- No GLB assets and no Blender run. The scene uses primitives only.
- No restored-memory viewer component exists in the repo. The HUD shows progress booleans only.
- `reducedDistortion` (P2) is not wired, so there is no in-game reduced-distortion link.
- When `inputEnabled` is absent, the world cannot tell when a panel closed.
- The production bundle is a single 1,323.12 kB JS chunk (381.53 kB gzip, task 30.4 build) per `performance-log.md`; no code splitting.
- Optional property-based tests are not implemented.

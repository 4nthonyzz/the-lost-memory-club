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

Milestone M6, the polish pass and the spatial and visual refinement pass (media island, north-wall filing cabinets and bulletin board, wood bookcases with dense books, textured walls and rug, three arcade cabinets, ARCADE sign, dressing, re-centred console, SMPTE monitor, cables) have **no recorded browser run**. Their layout and data are verified by automated tests only; how they look and play is **not verified visually**. The same holds for tasks 21 and 22 (couch fix and fabric, CRT casing and glass, VCR deck face, armchair, VHS shell textures, metal filing cabinets, cardboard crates, desk detail, doorway trim): **not verified visually**. Task 23 (two desk lamps with ON/OFF visuals, the 128x128 `lampGlow`, the interactable lamps and manuals, the lamp status pill, the three manual books on `shelf-b`) and Task 24 (lamp cones and desk pools, emissive shades, room light coupling by lamps ON, ceiling bloom strips, the Archive Document Card, the three new readable props and the notes counter) are also **not verified visually**; their logic and computed data are **verified by automated test** only. Task 25 (notebook move, banker's lamp brass collars and liner, the soft `coneFalloff` cones, richer pools, the three arcade floor glows and the seventh document, the Club Archive Notice) is **not verified visually** either.

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
  logic/                    pure rules: movement, collision, look, targeting, inputMode, inputState, propState, archiveDocuments, palette, frameStats, playerStep, constants
  overlay/                  DOM overlays and world.css: prompt, WorldMessage (lamp pill), WorldInspectorCard, NotesCounter, crosshair, capture overlay, hints, panel notice, WebGL fallback
  scene/                    Room, Props, Stations, Lighting, Effects, MemoryShiftDriver, lampCoupling, PartMeshes, WorldCanvas,
                            modelDetail.ts, proceduralTextures.ts, sharedResources.ts, memoryShift.ts, effectsTiming.ts, assetPlacement.ts
  *.test.ts (and tests beside each module)
tools/blender/              generate_assets.py, count_triangles.py, README.md (never run)
```

## Controls

| Input | Action |
| --- | --- |
| W A S D or arrow keys | Move |
| Mouse (after pointer lock) | Look |
| I J K L | Keyboard look (works without pointer lock) |
| E | Interact with the targeted station, desk lamp or readable prop; closes an open Archive Document Card |
| Esc | Releases the mouse (browser pointer-lock exit) and closes an open Archive Document Card |
| Click the view, or Enter / E on the capture overlay | Capture the mouse (a user gesture requests pointer lock) |

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
- **Archive Document Card (`overlay/WorldInspectorCard.tsx`, text in `logic/archiveDocuments.ts`).** E on a readable prop opens a non-modal paper card inside the world wrapper (`role="region"`, `aria-label` equal to the title, `aria-live="polite"`). It has no focus trap, no focus move and no pointer events, and it does not call `onInspect`, change the input mode or touch pointer lock. It closes on E (also with no target, even after the target was lost), on Esc (the key is not prevented, so the browser still releases pointer lock), when pointer lock is lost, when the player walks more than 2.6 m from the prop's anchor (`CARD_CLOSE_DISTANCE`), when a station opens, and when the world enters `inspecting`. E on a lamp while a card is open closes the card and does not toggle the lamp. Each card is a two-page document (see "Task 27") and ends with the footer `Press 1 / 2 to switch pages · E or move away to close`.

  | Prop | Card tag | Card title |
  | --- | --- | --- |
  | `manual-snake` | ARCADE MANUAL // CABINET 01 | SNAKE.EXE Manual |
  | `manual-maze` | ARCADE MANUAL // CABINET 02 | LAST EXIT Manual |
  | `manual-frequency` | ARCADE MANUAL // CABINET 03 | DEAD FREQUENCY Manual |
  | `desk-notebook` | TECHNICIAN LOG // NOV 1996 | Shift Log Notebook |
  | `cork-board` | EVIDENCE BOARD // INCIDENT REPORT | Investigation Pinboard |
  | `poster-shift` | ARCHIVE NOTICE // SIGNAL | The Signal Remembers |
  | `poster-archive` | CLUB NOTICE // MEMBERS ARCHIVE | Club Archive Notice |

- **All card text is placeholder lore for review by the story owner (Developer 3).** It is original, English and ASCII, and names no real brand. The LAST EXIT and DEAD FREQUENCY cards carry the status line `Cabinet status: awaiting service`, because those games do not exist in `src/arcade/`. Only Snake exists there. The SNAKE.EXE text has not been checked against the Snake rules, so treat it as lore too.
- **Notes counter (`overlay/NotesCounter.tsx`).** `NOTES READ: X / 7` in the bottom-right corner counts the unique readable props opened this session (`role="group"`, label `Notes read: X of 7`, not a live region). The total is derived from `READABLE_COUNT` in `logic/archiveDocuments.ts` (it is not hard-coded in the component). Re-reading a prop does not change it. It is hidden while a station panel is open (inspecting). Session-only, no storage.
- **Poster decision.** No texture in the repository says "THE SIGNAL REMEMBERS". The Memory_Shift overlay poster (north wall, x -0.3, z -3.94) reads PLEASE REWIND / THE TAPE / REMEMBERS YOU, and it was used with the requested title "The Signal Remembers". It is invisible until the shift, so 7 / 7 needs `memoryShifted` to become true at least once.
- **Club Archive Notice (task 25.2).** The framed ARCHIVE / MEMBERS ONLY poster on the Arcade_Area north wall (`poster-arcade-area`, x 7..8, face at z -1.95) is the 7th readable document, `poster-archive`. It is always targetable (it is not a Memory_Shift overlay). Its anchor is (7.5, -1.93), 0.02 m in front of the poster face. The suggested anchor (5.58, -2.0) was not used: it lies on the Arcade_Area boundary and 1.92 m from the poster. The card text (tag CLUB NOTICE // MEMBERS ARCHIVE) is placeholder lore for review by the story owner (Developer 3). E opens the card and does not call `onInspect`.
- **Known limitations.**
  - On short windows (about 400 to 500 px tall) the card region is small and its overflow cannot be scrolled with the mouse (`pointer-events: none`).
  - The poster becomes targetable when the flag flips, slightly before its fade completes (the 2 s Memory_Shift blend).
  - Closing on pointer-lock loss is wired in `controller/useWorldInput.ts` (line 226) but is not testable in jsdom, which has no pointer lock. The 2.6 m auto-close runs in the per-frame player rig (`controller/usePlayerRig.ts:88-89`), which jsdom does not run; the pure function `shouldCloseCard` is unit-tested.
- Tests: `logic/targeting.test.ts` (40 tests in the file; `selectInteractionTargetAll`, nine interactables, notes in the layout, the shift poster only while shifted, the left lamp winning from its front position, the notebook still reachable, the archive poster in range and at the boundary), `logic/propState.test.ts` (12), `logic/archiveDocuments.test.ts` (6), `logic/inputMode.prop.test.ts` (17), `WorldScene.test.ts` (22; `WorldScene interactable props (task 23.2, 24.2, 25.2)`).

### Lamp lighting (task 24.1, computed from source and tests, not verified visually)

- **Desk lamps.** The left lamp is a green banker's lamp (`desk-lamp-left`), the right one a cream table lamp (`desk-lamp-right`). Each has a bulb, an inner shade glow, a camera-facing glow sprite, an additive cone and an additive light pool. ON uses emissive materials; OFF swaps to dark materials and the never-drawn `lampGlowOff` for the sprite, cone and pool. **No light was added** (4 lights).
- **Texture.** `lampGlow` was redrawn in place (still 128x128, same id): a warm-white core, a golden-amber falloff and a soft feather to alpha 0.
- **Cones.** Additive volumetric cones from each shade rim to the desk top: 12-segment open cone (24 triangles each), `DoubleSide`, `depthWrite` false. Opacity was 0.14 in task 24.1 and is **0.20 since task 25.1**, with the soft `coneFalloff` map (see "Task 25.1").
- **Pools.** Additive desk pools (opacity 0.42 since task 25.1, was 0.32; polygon offset), 2 mm above the desk top. **The requested 0.85 m radius was not possible on a 0.8 m deep desk.** The radius is capped to half the desk depth, so each pool is a 0.8 m decal (the 0.8 m desk depth) whose visible disc, 90 percent of it, is about 0.36 m. `lampPoolPlacement` keeps it inside the desk top.
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

- **27.1, new texture `cabinetAndManualDetail`** (`scene/proceduralTextures.ts`, 256x128, seed 134, 174,326 bytes = 0.166 MiB). The left half is the cabinet front: coin door, reject buttons with `25¢` / `INSERT COIN`, a louvred grille, a kick plate with `SER. 0996-LMC`, and control-deck legends `MOVE` / `ACTION` / `1P START` on the front lip of the deck. The right half holds three manual spines: `01 SNAKE.EXE`, `02 LAST EXIT`, `03 DEAD FREQUENCY`, with emblems and `89.4 MHz`. The backgrounds are neutral so the book colour multiplies through.
- **27.1, geometry.** `atlasBoxGeometry` maps UV windows onto the player-facing face of each cabinet. The manuals are their own instanced meshes with remapped UVs. The cream band parts were removed (-36 triangles). New material `cabinetPanel`. The `rugWoven`, `wood`, `woodDark` and `spineAtlas` textures were sharpened in place (same ids and sizes).
- **27.2, Archive Document Card.** Each document has a theme, an accent colour, a status pill, spec pills and an inline SVG header, and two pages: `[1] OVERVIEW & RULES` and `[2] TECHNICIAN / ANOMALY LOG`. The old `paragraphs` field was replaced by `pages`. Text contrast is at least 4.5:1 on every theme (unit test in `logic/archiveDocuments.test.ts`).
- **27.2, controls while a card is open.**
  - Keys `1` and `2` (also Numpad 1 and 2) switch pages. They do not release pointer lock, clear movement or move the player. With no card open they do nothing.
  - The two tab buttons are clickable only when the pointer is not locked (while locked the cursor is hidden). They never request pointer lock.
  - The tabs use `tabIndex={-1}` and block the mouse-down focus change, so keyboard focus stays on the world wrapper and `E`, `1`, `2` and `Esc` keep working.
  - Footer: `Press 1 / 2 to switch pages · E or move away to close`.
- **Diegetic status text.** The card for cabinet 1 shows `CABINET 01 // PLAYABLE`. That line is in-world flavour text and is accurate only once the Snake game ships in `src/arcade/`; the current `ArcadePanel` says the engine is not implemented. The LAST EXIT and DEAD FREQUENCY cards still show `awaiting service`.
- **Placeholder lore.** All card text is placeholder lore pending review by the story owner (Developer 3).
- **Known limitations of task 27:**
  - `aria-live="polite"` is set on the whole card region, so a screen reader may read the full page aloud on every page change.
  - On small viewports the card may need internal scrolling, which it does not provide (`pointer-events: none` on the container).
  - Mipmap bleed at the atlas region edges is untested.
  - Legibility of the 5 to 7 px legends on the cabinet texture is unverified.

Arcade manuals (task 23.2): three colour-coded volumes stand on level 2 of the west bookcase `shelf-b` (y 1.117..1.397, spines at x -4.635, at z 1.4 / 1.8 / 2.2): emerald SNAKE.EXE, crimson LAST EXIT and amber DEAD FREQUENCY, each with a printed spine label (since task 27.1 the cream band parts are gone and the label is part of the spine texture; see "Task 27"). Seven ordinary books were removed from that row. Interaction anchors are at x -4.6 (the bookcase front face). They are not colliders.
## World layout

Source of truth: `layout/roomLayout.ts` (**verified by automated test**: `layout/roomLayout.test.ts`, 32 tests, including grid-search reachability of every station and a cell in front of each cabinet through each door separately).

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

31 deterministic canvas textures (`scene/proceduralTextures.ts`, `scene/sharedResources.ts`): three cabinet attract screens (`attractSnake`, `attractMaze`, `attractFrequency`, 256x256), three cabinet marquees (`marqueeSnake`, `marqueeMaze`, `marqueeFrequency`, 256x64), sign face, three posters (two ordinary, one shifted), shifted plaque, floor, wood, dark wood, crate, grille, book spine atlas, wall panel (256x256), woven rug, cork board, lamp glow (`lampGlow`, 128x128 since task 23.1, redrawn in place in task 24.1, see below), SMPTE colour bars and the timecode window, plus seven added in tasks 21 and 22. Task 21: `couchFabric` (256x256 woven upholstery, metric fabric UVs), `crtCasing` (256x256 charcoal casing with a generic "KV-1996" badge, metric UV, one tile across the front shell) and `crtGlass` (256x256, on the shared `crtScreen` material, which uses a white base when textured and a teal flat fallback). Task 22: `vcrDeck` (256x128 VCR face with PLAY, STOP, REW and EJECT buttons and a "HI-FI STEREO" label), `vhsShell` (128x128 tape shell), `metalCabinet` (256x256 filing-cabinet front) and `deskDetail` (128x64 notebook cover grain and ruled page block). Earlier, 6 textures were added and 4 removed: `arcadeScreen`, `marquee`, `deck` and `outOfOrder`.

Task 23.1 change (computed from source and tests, **not verified visually**): `lampGlow` grew from 64x64 to 128x128 (0.021 MB to 0.083 MB, +0.062 MB). It is a deterministic multi-stop radial gradient with 7 stops, alpha 0 at 90 percent of the half-width, and a filament core. It is shared by the glow sprite (`lampHalo` material), the desk light pools (`lampPool`, `lampPoolBanker`) and the ceiling bloom strips (`ceilingBloom`).

Task 24.1 change (computed from source and tests, **not verified visually**): `lampGlow` was redrawn in place at the same size and id (128x128, 0.083 MB, no memory change): a warm-white core, a golden-amber falloff and a soft feather to alpha 0 (8 gradient stops plus a filament dot). `scene/proceduralTextures.ts`, `LAMP_GLOW_STOPS`.

Task 25.1 change (computed from source and tests, **not verified visually**): the 31st texture, `coneFalloff` (64x64, seed 133, linear filter, no mipmaps, 0.016 MB), is the soft map of both lamp cones (`lampConeBanker`, `lampConeTable`). It has a flat-colour fallback, is registered for disposal and is disposed exactly once. No UV flip was needed. Task 25.2 adds no texture: the arcade floor glows reuse `lampGlow`.

Task 26.1 change (computed from source and tests, **not verified visually**): anisotropy 4 on every texture, and the textures listed under "Task 26" were redrawn in place. No texture was added or enlarged in task 26, so the count stayed 31 and the estimate 7.537 MB at that time (task 27.1 then added one: 32 textures, 7.703 MiB).

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

The couch uses the `couchBody`, `couchCushion` and `couchPillow` materials, which take the `memoryShift` tint. The CRT casing fallback colour (no canvas) is charcoal. Without a canvas or 2D context, materials keep flat colors. Textures are disposed on unmount, each exactly once. **verified by automated test** (`scene/proceduralTextures.test.ts`, 219 tests; `scene/modelDetail.test.ts`, 166 tests). Whether they look readable in a browser: **not verified visually** (S7 to S11 `not run`).

Couch fix (task 21.1): the dark patch on the couch came from a dark "worn patch" box placed 4 mm above the middle cushion. It is removed, together with a second hidden patch. The roll caps are shortened by 4 mm to avoid coplanar faces. The pillow sits in the left seat corner; a test checks with an oriented-box (OBB) no-intersection test that it does not overlap the other couch parts. The couch has 388 triangles (was 412) and no new collider. Task 21 is **not verified visually**.

## Asset pipeline

- `ASSET_MANIFEST` in `assets/assetManifest.ts` is **empty**. No GLB is loaded. `public/models/` holds only `.gitkeep`.
- `AssetModel` renders the primitive fallback immediately and keeps it when the manifest has no entry or loading fails. **verified by automated test** (`assets/assets.test.ts`, `scene/assetIntegration.test.ts`).
- `tools/blender/generate_assets.py` and `count_triangles.py` have **never been run**: Blender is not installed on the development machine. No `.glb` file exists and no asset triangle count or file size has been measured (**planned/prototype**). See `.kiro/specs/world-exploration/asset-log.md`.

## Dev performance sampler

Dev builds only (`import.meta.env.DEV`). Run `npm run dev` and open the page with `?worldPerf=1` (or set `window.__WORLD_PERF__ = true` before mount). Then call `window.__worldPerf.reset()` before a walk and `window.__worldPerf.summary()` after it. The summary returns `frames`, `medianMs`, `p95Ms`, `triangles`, `drawCalls`, `geometries` and `textures`. The sampler does nothing in `npm run build` output. The statistics helper is **verified by automated test** (`logic/frameStats.test.ts`); the sampler itself has not been run in a browser (**not verified**).

## Metrics

Computed from declared geometry and source, **computed, not runtime-measured**. Source: `.kiro/specs/world-exploration/performance-log.md`. Figures re-checked in task 27.3 with `npx vitest run src/world/scene/modelDetail.test.ts` (166 tests passed); the console lines were:
`[20.2] computed triangles 19152, draw-call estimate 344, textures 32, texture memory estimate 7.703 MB (computed, not runtime-measured): ... cabinetAndManualDetail 256x128=0.166MB`
`[22.1] computed triangles 19152, draw-call estimate 344, textures 32, texture memory estimate 7.703 MB (computed, not runtime-measured)`
and `[25.1] triangles 19152 (delta 52), textures 32, texture memory 7.703 MB (computed)` (the `[25.1]` baseline is fixed, so its delta is not the change of task 27). The real change from task 26.3 to task 27.1 is -36 triangles (19,188 to 19,152, the cream manual bands removed) and one more texture (+0.166 MiB).
| Metric | Value | Label |
| --- | --- | --- |
| Triangles | 19,152, limit 20,000 (test limit 19,200); task 27 changed it by -36 from 19,188 (cream manual bands removed); task 26 had changed it by +64 | computed, not runtime-measured |
| Draw-call grouping estimate | about 344 (was 339 before task 27) | computed estimate, not `renderer.info` |
| Books | 366 (shelf-a 178, shelf-b 168, shelf-c 156); includes the 3 manuals | computed |
| Lights | 4 (1 ambient + 3 point), limit 4; tasks 23 to 27 added none | computed from source |
| Procedural textures | 32, 7.703 MiB (8,076,989 bytes) estimated, limit 8 MB (test limit 7.85 MB); anisotropy 4 on every texture; every texture registered for disposal; task 27.1 added `cabinetAndManualDetail` (0.166 MiB) and enlarged none | computed, not runtime-measured |
| Colliders | 28 (tasks 23 to 27 added none) | computed |
| Interactables | 9 (2 lamps + 7 readable documents) | computed |
| Targeting benchmark | informational timing only, no threshold; varies per run and machine (task 27.3 standalone run: measured total 12.52 ms, 0.626 us/call, 254 reachable cells x 16 yaws, 4 stations and 28 colliders; earlier runs gave 25.97 ms and 1.298 us/call in task 26.3); this benchmark times station targeting only, not `selectInteractionTargetAll` | informational |
**The triangle margin is thin:** 19,152 leaves 848 triangles (about 4.2 percent) below the 20,000 limit. The biggest consumers (computed by summing declared objects in task 21.3, not recomputed after task 23; tasks 24.1, 25, 26 and 27 then added 58, 24 and 64 triangles and removed 36): the three bookshelves (2,352, 2,280 and 2,088 before the manuals replaced 7 books on `shelf-b`), the three cabinets (1,316 each), `console-cables` (1,088), the two filing cabinets (692 each) and the desk (672). Task 23.1 replaced the two old desk lamps (470 triangles) with two new ones (352): -118. Task 23.2 replaced 7 books on `shelf-b` (-84) with 3 manuals and 3 spine bands (+72): -12. Task 24.1 added 58 (two lamp cones at 24 triangles each plus five ceiling bloom strips at 2 each, by arithmetic); task 24.2 added no triangles.

**The texture margin is also thin:** 7.703 MiB computed (8,076,989 bytes) against the 8 MB limit leaves about 0.30 MB. First candidates to cut if more room is needed: `console-cables` (1,088 triangles), the book count (366 books), the three 0.66 MB posters (`posterSunset`, `posterReel`, `shiftPoster`, 256x512) or `spineAtlas` (512x256, 0.66 MB), which could shrink. The per-texture list (MB, computed, not runtime-measured, rounded to two decimals): attractSnake 0.25, attractMaze 0.25, attractFrequency 0.25, marqueeSnake 0.06, marqueeMaze 0.06, marqueeFrequency 0.06, signFace 0.33, posterSunset 0.66, posterReel 0.66, shiftPoster 0.66, shiftPlaque 0.17, floor 0.08, wood 0.08, woodDark 0.08, crate 0.33, grille 0.08, spineAtlas 0.66, wallPanel 0.33, rugWoven 0.33, corkBoard 0.33, lampGlow 0.08, smpteBars 0.13, timecode 0.02, couchFabric 0.33, crtCasing 0.33, crtGlass 0.25, vcrDeck 0.17, vhsShell 0.08, metalCabinet 0.33, deskDetail 0.04, coneFalloff 0.02, cabinetAndManualDetail 0.17. The largest are the three posters and `spineAtlas` (0.66 each).
**Measured runtime values** (measured by the project owner **before Tasks 23 to 27; not repeated since**, so they do not describe the lamps, manuals, lamp cones, desk pools, ceiling bloom strips, arcade floor glows, two-page Archive Document Card, cabinet and manual detail texture or notes counter. **Re-measuring is recommended**, because Tasks 24 and 25 add additive transparent layers, Task 26 adds anisotropic filtering (4x) on every texture and Task 27 adds a texture and a themed card, which add GPU cost; dev build, `?worldPerf=1` sampler, 60 s walkthrough across both rooms and all three arcade cabinets; raw output in `.kiro/specs/world-exploration/performance-log.md` section 4):

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
- Triangles and draw calls describe the last rendered frame from one camera position, after frustum culling, with each instanced mesh counted as one call. They are not comparable one-to-one with the computed whole-scene figures above (19,152 triangles, 344 draw-call estimate, 32 declared textures now; the measurement predates Tasks 23 to 27, so the scene it measured had fewer declared textures and a different triangle count); the lower measured numbers are expected.
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

Fresh run for this README (task 27.3): `npm run typecheck` exit 0, `npm run build` exit 0 (105 modules transformed), `npm test` **31 test files, 800 tests, all passed** (exit 0, run twice with the same result, no timeout). The four CPU-heavy tests from task 24.3 still carry an explicit 30,000 ms per-test timeout. Details in `test-report.md`. Files under `src/world/` and their counts:

| Area | Files (tests) |
| --- | --- |
| Component | `WorldScene.test.ts` (30), `WorldScene.inputEnabled.test.ts` (8), `boundary.test.ts` (10) |
| Assets | `assets/assetManifest.test.ts` (22), `assets/assets.test.ts` (9), `scene/assetIntegration.test.ts` (6) |
| Controller | `controller/useReducedMotion.test.ts` (8) |
| Layout | `layout/roomLayout.test.ts` (32) |
| Logic | `collision` (18), `frameStats` (5), `inputMode` (29), `inputMode.supplied` (17), `inputMode.fallback` (7), `inputMode.prop` (22), `inputState` (16), `look` (20), `movement` (15), `palette` (4), `palette.full` (13), `playerStep` (9), `propState` (17), `archiveDocuments` (10), `targeting` (40), `targeting.bench` (1, informational) |
| Scene | `effectsTiming` (8), `memoryShift` (16), `lampCoupling` (11), `modelDetail` (166), `proceduralTextures` (219) |

Outside `src/world/`: `src/App.test.ts` (8, stubbed `WorldScene`) and `src/core/gameReducer.test.ts` (4). Counts change when tests are added. Details, the 17 correctness properties and gaps: `.kiro/specs/world-exploration/test-report.md`.

Not covered: optional property-based tests (`fast-check` is not installed; 0 of 17 properties have one), coverage measurement, real-browser rendering, Blender scripts.

## Pending proposals

See `.kiro/specs/world-exploration/proposals.md`. In short: P1 implemented; P3 and P4 implemented for the App HUD and modal styles (world overlay styles remain in `overlay/world.css`); P2 (`reducedDistortion` prop), P5, P6 and P7 pending; P8 partially superseded by the HUD status line; P9 installed except `fast-check`; P10 folder exists, scripts untested.

## Known limitations and gaps

- No browser run is recorded for M6, the polish pass, the refinement pass or the three-cabinet pass; the new layout and textures are not verified visually.
- All three cabinets open the same App arcade panel (Snake). LAST EXIT and DEAD FREQUENCY have no game behind them. Their manuals on `shelf-b` and their Archive Document Cards are in-world lore for gameplay that does not exist in `src/arcade/`.
- Tasks 23 to 27 (lamps, manuals, lamp cones and pools, room light coupling, ceiling bloom, Archive Document Card, notes counter, banker's lamp collars, soft cones, arcade floor glows, Club Archive Notice, cabinet detail texture, two-page themed card) are not verified visually or in a browser. Lamp state, the open card and the notes counter are session-only and reset on reload. Lamp pills appear in the world-owned overlay, not in the App HUD status line. All card texts are placeholder lore pending review by the story owner (Developer 3).
- Archive Document Card: on short windows (about 400 to 500 px tall) the card region is small and its overflow cannot be scrolled with the mouse (`pointer-events: none`); the poster becomes targetable when the flag flips, slightly before its fade completes; closing on pointer-lock loss is wired but not testable in jsdom.
- The requested 0.85 m lamp pool radius was not possible on the 0.8 m deep desk; the pool is a 0.8 m decal with a visible disc of about 0.36 m.
- Spawn gap (open item): the spawn (0, 3) is exactly 1.0 m from the desk edge and the south wall, so a 1.2 m disc around the spawn is not clear. The test asserts 0.99 m. This was not requested in the final instructions and is not fixed. The manual test log has no recorded result.
- Frame time and renderer counts were measured once by the project owner before Tasks 23 to 27 (dev build, hardware not provided; see the Metrics section) and have not been repeated; re-measuring is recommended. First-render time is not measured, and the Reference_Hardware cannot be confirmed. The triangle margin below the 20,000 limit is only 848 (computed), and the texture margin below 8 MB is only about 0.30 MB (computed). Task 27 added 62 tests (738 to 800 in 31 files).
- No GLB assets and no Blender run. The scene uses primitives only.
- No restored-memory viewer component exists in the repo. The HUD shows progress booleans only.
- `reducedDistortion` (P2) is not wired, so there is no in-game reduced-distortion link.
- When `inputEnabled` is absent, the world cannot tell when a panel closed.
- The production bundle is a single 1,309.06 kB JS chunk (376.15 kB gzip, task 27.3 build) per `performance-log.md`; no code splitting.
- Optional property-based tests are not implemented.

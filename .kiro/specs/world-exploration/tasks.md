# Implementation Plan: World Exploration

## Overview

This plan implements the World_Module (`src/world/`, Developer 1, branch `feature/world-exploration`) in TypeScript, following `design.md` and `requirements.md`. Work is grouped by the six milestones: M1 Playable 3D room, M2 Movement and camera, M3 Collision and interactions, M4 Environmental effects, M5 Blender/GLB integration, M6 Testing and optimization.

Pure logic (movement, collision, targeting, look, input filtering, mode state machine) is written first as pure modules with their unit tests written together with the code (test-first). The import-boundary test (5.7) and the component-level tests (5.8, 9.8) are required sub-tasks. Property-based tests are separate optional sub-tasks, one per design property.

### Status

Specification APPROVED (requirements.md, design.md, tasks.md). Implementation scope currently authorized: Milestone M1 (tasks 1-6) only; tasks 7-17 are not authorized yet. Scene, controller and overlay code is added after the pure logic and wired into `WorldScene.tsx` at the end of M1.

Every task lists: affected files, acceptance criteria, tests, dependencies (task IDs), integration boundaries and requirement references. Verification after each task is `npm run typecheck`, `npm test`, `npm run build`, or a named manual check.

### Global constraints (apply to every task)

- Work only in `src/world/`, plus `tools/blender/` (M5, approved P10), `package.json` and the lockfile (P9 test dev dependencies only, added by the first task that needs them), and spec-folder documents in `.kiro/specs/world-exploration/`.
- `src/core/`, `src/arcade/`, `src/memories/` and `src/App.tsx` are not modified. The `WorldSceneProps` and `StationId` contracts are preserved. `memoryShifted` and `onInspect` keep their names and types.
- P1 (`inputEnabled`) is approved as an integration proposal only. The world-module side is implemented in task 9.7. The App.tsx side is documented in task 9.9 (non-implementation). P2 to P8 stay pending and appear only as approval-gated tasks in task 16.
- The world is lock-agnostic. It never reads GameState, always calls `onInspect` for the targeted Station, and shows neutral fixed prompt text.
- Pointer lock is requested only from a Valid_User_Gesture (canvas click, or Enter/E activation while the wrapper has focus).
- M1 uses primitives only: no Blender, no GLB, no post-processing, no custom shaders, no new dependencies.
- `jsdom`, `@testing-library/react` (and `@testing-library/dom` if required as a peer) are installed in required task 5.8. `fast-check` remains installed in optional task 2.2 or by the first property-test task that is run. jsdom is selected per test file with `// @vitest-environment jsdom`.
- Numeric values are initial and validated in testing. No performance figure is reported as achieved before it is recorded (Requirement 14.11, 14.12).
- All visible text, labels, comments and docs are in English.
- Approved scope change (M6), 2026-11-24: the `arcade` Station may be relocated from the main room north wall into the east Arcade_Area (against the east wall around x 8.4, z 0, facing west toward both doorways). The station id `'arcade'` and the `StationId` contract are unchanged. `roomLayout.ts` remains the single source of truth for colliders and anchors. Procedural `CanvasTexture` textures are allowed (deterministic, created in `sharedResources.ts`, all disposed). Budgets stay: fewer than 20,000 triangles in total and at most 4 lights. `ASSET_MANIFEST` stays `Object.freeze({})` unless real `.glb` files exist. `src/core/`, `src/arcade/`, `src/memories/`, `src/ui/`, `vite.config.ts` and `package.json` are unchanged. Earlier wording in `requirements.md` and `design.md` about the arcade Station position is superseded by this bullet.
- Approved scope change (M5), 2026-11-24: `src/App.tsx` and `src/styles.css` may now be modified. P1 (App-side `inputEnabled={station === null}`), P3 (overlay and layout styles) and P4 (status text) are approved and implemented in task 13.5. `src/core/`, `src/arcade/`, `src/memories/` and `vite.config.ts` remain unchanged. `package.json` changes only if unavoidable and flagged. `tools/blender/` and `.glb` files are allowed from M5 on. The earlier statements that `App.tsx` is not modified apply to M1-M4 only. `requirements.md` and `design.md` still contain M1-M4 wording stating that `App.tsx` is unmodified and that P1/P3/P4 are pending; that wording is superseded by this bullet.
- Approved scope change (polish pass), 2026-11-25: the `vhs` Station may be relocated from the north wall to a central archive media island in the main room (around x -0.4, z -0.3, facing +Z toward the spawn at (0, 3)). `StationId` and the station ids are unchanged. `roomLayout.ts` stays the single source of truth for colliders and anchors. New solid colliders are allowed (media console, two filing cabinets), with walkways of at least 1.2 m around the island. New procedural textures are allowed (spine atlas, wall paneling, woven rug, cork bulletin board); each must be registered in `sharedResources.ts` and disposed. Budgets: fewer than 20,000 triangles, at most 4 lights (`M3_LIGHT_COUNT` stays 4 and `crt-light` moves to the new CRT spot), texture memory at most 8 MB. `src/App.tsx`, `src/core/`, `src/arcade/`, `src/memories/`, `src/ui/`, `src/styles.css`, `vite.config.ts`, `package.json` and `tools/blender/` stay unchanged. `ASSET_MANIFEST` stays empty. Earlier wording that places the `vhs` Station on the north wall (in this file, `requirements.md` and `design.md`) is superseded by this bullet.
- Approved scope change (refinement pass), 2026-11-26: after a live browser walkthrough, one more targeted refinement is approved. The media island stays centered (about x -0.9..0.9, z -0.6..0) with the `vhs` anchor at (0, 0) facing +Z, and `crt-light` moves to (0, 1.6, 0.9). The reception desk (with its tape stack and desk lamp) moves to a dedicated south-east position. At least 2.2 m of unobstructed floor is kept in front (+Z) of the CRT, at least 1.2 m of walkway surrounds every solid collider, and the spawn (0, 3) stays clear. The second point light moves over the west bookcase and lounge zone (about (-2.5, 2.3, 0.4), warm tungsten); the 4-light cap is unchanged (1 ambient + 3 point). The `wallPanel` texture shrinks from 512x512 to 256x256. The island and the companion cabinet get richer detail. Budgets stay: fewer than 20,000 triangles, at most 4 lights, texture memory at most 8 MB. `ASSET_MANIFEST` stays `Object.freeze({})`. `src/App.tsx`, `src/core/`, `src/arcade/`, `src/memories/`, `src/ui/`, `src/styles.css`, `vite.config.ts`, `package.json` and `tools/blender/` stay unchanged. The earlier island coordinates (x -1.3..0.5, anchor (-0.4, 0), `crt-light` at (-0.4, 1.6, 0.8)) and the earlier desk position are superseded by this bullet.

- Approved scope change (three arcade cabinets), 2026-11-27: the Arcade_Area east wall (x 8.4..9.2, facing -X) holds three interactive cabinets that replace the active cabinet, the powered-down companion cabinet and (if it conflicts) the CRT stack: SNAKE.EXE (z -1.7..-0.7, anchor (8.4, -1.2)), LAST EXIT (z -0.5..0.5, anchor (8.4, 0)) and DEAD FREQUENCY (z 0.7..1.7, anchor (8.4, 1.2)). `StationId` stays `'vhs' | 'arcade'`. All three cabinets call `onInspect('arcade')`. An optional `arcadeGame?: 'snake' | 'maze' | 'frequency'` field is layout and world data only. `App.tsx` and `src/arcade/` are unchanged, so all three currently open the same App arcade panel. Budgets stay: fewer than 20,000 triangles, at most 4 lights, texture memory at most 8 MB. `ASSET_MANIFEST` stays `Object.freeze({})`. `src/App.tsx`, `src/core/`, `src/arcade/`, `src/memories/`, `src/ui/`, `src/styles.css`, `vite.config.ts`, `package.json` and `tools/blender/` stay unchanged. Earlier wording about a single arcade cabinet (x around 8.4, z 0) and the companion cabinet is superseded by this bullet.

- Approved scope change (couch and CRT craftsmanship), 2026-11-28: the couch pillow clipping and the middle-cushion artefact are fixed, and two new 256x256 textures (`couchFabric`, `crtCasing`) plus a CRT glass screen texture (scanlines, curved-glass vignette, phosphor grain) are allowed. Every new texture is registered in `sharedResources.ts` and disposed exactly once (`disposeSharedResources()` is twice-safe), with a flat-colour fallback if a texture is unavailable. `memoryShift` tints the new materials cleanly over t = 0..1. Budgets stay: fewer than 20,000 triangles (currently 19,152 computed, so geometry changes must be near zero or net-negative), at most 4 lights, texture memory at most 8 MB. `ASSET_MANIFEST` stays `Object.freeze({})`. `src/App.tsx`, `src/core/`, `src/arcade/`, `src/memories/`, `src/ui/`, `src/styles.css`, `vite.config.ts`, `package.json` and `tools/blender/` stay unchanged. No real trademarks are used; the CRT badge reads the generic "KV-1996".

- Approved scope change (cohesive prop textures), 2026-11-29: `corkBoard` shrinks to 256x256. New deterministic textures are allowed: `vcrDeck` (256x128), `vhsShell` (128x128) and `metalCabinet` (256x256). `crate` is upgraded to 256x256. Small desk-clutter detail (notebook, mug) and recessed door-panel detail are allowed. The reference monitor uses the `crtCasing` look. The armchair uses `couchFabric` with metric fabric UVs and a slate/teal hue. Every new texture is registered in `sharedResources.ts` and disposed exactly once (`disposeSharedResources()` is twice-safe), with a flat-colour fallback. `memoryShift` tints the new fabric and casing materials over t = 0..1, with t = 0 exact. Budgets stay: fewer than 20,000 triangles (currently 19,128 computed, so geometry changes must be near zero), at most 4 lights, texture memory at most 8 MB (target at most 7.7 MB). `ASSET_MANIFEST` stays `Object.freeze({})`. `src/App.tsx`, `src/core/`, `src/arcade/`, `src/memories/`, `src/ui/`, `src/styles.css`, `vite.config.ts`, `package.json` and `tools/blender/` stay unchanged. No real trademarks are used.

- Approved scope change (interactive props), 2026-11-30: world-local interactable props (two desk lamps and three arcade manual books on the west bookcase) are added. They do NOT use `StationId` and never call `onInspect`; `StationId` stays `'vhs' | 'arcade'`. Pressing E on a prop is handled inside the world (lamp on/off state is session-only, not persisted, not GameState) and does not suspend world input. Because `WorldSceneProps` has no status callback and `App.tsx` is unchanged, prop messages are shown in a world-owned message line inside the world wrapper (near the interaction prompt, `role="status"`, never covering the App HUD status line); this supersedes the earlier wording "status bar". The reception desk currently has one lamp: a second lamp is added (left green-shaded banker's lamp, right cream-shaded table lamp). Lighting stays `M3_LIGHT_COUNT = 4` (lamp light is emissive meshes, a glow sprite and a desk light-pool decal only). The manual texts describe LAST EXIT and DEAD FREQUENCY gameplay that is not implemented in `src/arcade`: they are in-world lore. Budgets: fewer than 20,000 triangles (currently 19,172 computed; new geometry at most +120), at most 4 lights, texture memory at most 8 MB (`lampGlow` upgraded in place). `ASSET_MANIFEST` stays `Object.freeze({})`. `src/App.tsx`, `src/core/`, `src/arcade/`, `src/memories/`, `src/ui/`, `src/styles.css`, `vite.config.ts`, `package.json` and `tools/blender/` stay unchanged.

- Approved scope change (lighting and clue inspector), 2026-12-01: no new three.js lights are added (`M3_LIGHT_COUNT` stays 4). Lamp light is produced by emissive shades, additive volumetric cones, additive desk pools and glow sprites. West-light and ambient intensity are modulated by the number of lamps ON, as a multiplier applied on top of the existing Memory_Shift and flicker values (never overwriting them), and the ambient floor is kept. Ceiling fixtures get additive bloom strips. A world-owned Archive Document Card overlay (`WorldInspectorCard`) opens for readable props. It is non-blocking (no `onInspect`, no input suspension) and closes on E, Esc or when the player walks more than 2.6 m away. A session-only "NOTES READ: X / 6" counter is shown (no storage). There are eight world interactables: two lamps, three manuals, the desk notebook, the cork board and the "THE SIGNAL REMEMBERS" poster (targetable only while visible, if it is the Memory_Shift overlay poster). New lore texts are original placeholder writing, for review by the story owner (Developer 3). `StationId` and `onInspect` are unchanged. Budgets: fewer than 20,000 triangles (currently 19,042 computed; task 24 adds at most +100), at most 4 lights, texture memory at most 8 MB (7.521 MB computed; `lampGlow` is upgraded in place). `ASSET_MANIFEST` stays `Object.freeze({})`. `src/App.tsx`, `src/core/`, `src/arcade/`, `src/memories/`, `src/ui/`, `src/styles.css`, `vite.config.ts`, `package.json` and `tools/blender/` stay unchanged.

- Approved scope change (lamp craft and arcade glow), 2026-12-02: `desk-notebook` moves to about anchor (-0.58, 1.62) so the left lamp is no longer stolen by the notebook when targeting. A new 64x64 `coneFalloff` texture (0.016 MB) gives soft lamp cones. The banker's lamp gets brass end caps (+16 triangles) and a warm inner liner. The ON green shade emissive is `#16a34a` at 0.38, and desk pools use opacity about 0.42. Three additive floor-glow decals in front of the arcade cabinets reuse `lampGlow` (+6 triangles, no new light). The arcade room ARCHIVE poster becomes the 7th readable document (prompt "Press E to read: Club Archive Notice", counter "NOTES READ: X / 7", anchor at the poster's real position). Budgets: fewer than 20,000 triangles (currently 19,100 computed), at most 4 lights, texture memory at most 8 MB (7.521 MB computed). `ASSET_MANIFEST` stays `Object.freeze({})`. `src/App.tsx`, `src/core/`, `src/arcade/`, `src/memories/`, `src/ui/`, `src/styles.css`, `vite.config.ts`, `package.json`, `package-lock.json` and `tools/blender/` stay unchanged. Earlier wording of "X / 6" in task 24.2 is superseded by this bullet.

- Approved scope change (texture craft and mid-tone lighting), 2026-12-03: anisotropy 4 is set on every procedural `CanvasTexture` (no memory cost). Texture detail upgrades are redrawn in place (the texture count stays 31). At most one small-prop texture may grow from 128x128 to 256x256. Normal-state lighting is tuned to a mid-tone balance (ambient about 0.52 to 0.58 with both lamps on, the 0.35 floor is kept, the lamp-coupling ratios are kept). Memory_Shift, flicker and reduced motion are unchanged. Budgets: triangles at most 19,200 (below 20,000; currently 19,124 computed), at most 4 lights, texture memory at most 7.85 MB (currently 7.537 MB computed; hard limit 8 MB). `ASSET_MANIFEST` stays `Object.freeze({})`. `src/App.tsx`, `src/core/`, `src/arcade/`, `src/memories/`, `src/ui/`, `src/styles.css`, `vite.config.ts`, `package.json`, `package-lock.json` and `tools/blender/` stay unchanged.

- Approved scope change (themed inspector and cabinet detail), 2026-12-04: one new 256x128 texture `cabinetAndManualDetail` is added (left half: coin door and control-deck legends for the three arcade cabinets; right half: three illustrated manual spines), mapped onto existing faces with zero new triangles. `rugWoven`, `wood`, `woodDark` and `spineAtlas` are sharpened in place. The Archive Document Card gains per-document themes, status pills, inline SVG header art and two pages switched with keys 1 and 2 (also clickable buttons when the pointer is not locked; while pointer-locked there is no cursor, so keys are the input), without releasing pointer lock or moving the player. E, Esc and walking more than 2.6 m away still close it. In-world status text such as "CABINET 01 // PLAYABLE" is diegetic and is accurate only once the Snake game ships in `src/arcade`. Budgets: triangles at most 19,200 (currently 19,188), at most 4 lights, texture memory at most 7.85 MB (currently 7.537 MB), texture count 32. `ASSET_MANIFEST` stays `Object.freeze({})`. `src/App.tsx`, `src/core/`, `src/arcade/`, `src/memories/`, `src/ui/`, `src/styles.css`, `vite.config.ts`, `package.json`, `package-lock.json` and `tools/blender/` stay unchanged.

- Approved scope change (scrollable card and protruding manuals), 2026-12-05: the Archive Document Card scrolls with the mouse wheel (window `wheel` listener, `passive: false`, attached only while a card is open, also while pointer-locked) and with ArrowUp / ArrowDown / PageUp / PageDown. While a card is open, ArrowUp / ArrowDown scroll the card and do not move the player (W / S still move). The card becomes `pointer-events: auto` with a styled scrollbar so it can be dragged when the cursor is visible. Clicks and mousedown inside the card never request pointer lock: the world click handler ignores targets inside the card, because React `stopPropagation` alone does not stop the native wrapper listener. `scrollTop` resets on open and on page switch. The three manuals protrude 0.08 m toward +X as 0.31 x 0.085 x 0.29 m volumes with anchors at x -4.52, z 1.4 / 1.8 / 2.2, showing spine art and cover art on the exposed side faces using the right half of `cabinetAndManualDetail` (redrawn in place, 0 bytes). Budgets: triangles at most 19,200 (currently 19,152; 0 extra), at most 4 lights, texture memory at most 7.85 MB (currently 7.703 MiB; 0 extra). `ASSET_MANIFEST` stays `Object.freeze({})`. `src/App.tsx`, `src/core/`, `src/arcade/`, `src/memories/`, `src/ui/`, `src/styles.css`, `vite.config.ts`, `package.json`, `package-lock.json` and `tools/blender/` stay unchanged.

- Approved scope change (open-book manuals and animated attract screens), 2026-12-06: the three manual cards render as an open two-page book (both pages side by side on wide viewports, stacked on narrow ones). Keys 1 and 2 and clicks select and highlight a page, and scroll it into view when stacked. Wheel, arrow keys, page keys and the scrollbar keep working. The four room clues keep their own layouts. The three attract screens are animated in place by redrawing the existing `attractSnake`, `attractMaze` and `attractFrequency` canvases at most 12 times per second from the existing `Effects` `useFrame` (no timers, no new textures). Animation stops while inspecting and is static under reduced motion. `elapsedSec = 0` reproduces the static frame. Any collection flash is a soft pulse that keeps luminance changes at or below 3 per second (Requirement 10). Budgets: triangles at most 19,200 (currently 19,116), at most 4 lights, 32 textures, texture memory at most 7.85 MB (currently 7.703 MiB). `ASSET_MANIFEST` stays `Object.freeze({})`. `src/App.tsx`, `src/core/`, `src/arcade/`, `src/memories/`, `src/ui/`, `src/styles.css`, `vite.config.ts`, `package.json`, `package-lock.json` and `tools/blender/` stay unchanged.

- Approved scope change (lamp fix, smooth motion, 24 Hz attract), 2026-12-07: the `desk-lamp-right` square glow/cone artefact is removed (round, radially faded glow and pool geometry with at least 24 segments, cone top tucked inside the shade's bottom opening, pool flat just above the desk). Camera look (yaw/pitch, lambda about 32) and movement velocity (lambda about 20) use frame-rate-independent exponential smoothing `1 - exp(-lambda * dt)`, bypassed (alpha = 1) under reduced motion; collision, bounds and pointer-lock behaviour are unchanged. The attract-screen redraw throttle rises from 12 Hz to 24 Hz (estimated texture uploads about 18.8 MB/s, not measured) with faster, interpolated motion, and every brightness pulse keeps at most 3 direction changes per rolling second. Budgets: triangles at most 19,200 (currently 19,116), at most 4 lights, 32 textures, texture memory at most 7.85 MB (7.703 MiB). `ASSET_MANIFEST` stays `Object.freeze({})`. `src/App.tsx`, `src/core/`, `src/arcade/`, `src/memories/`, `src/ui/`, `src/styles.css`, `vite.config.ts`, `package.json`, `package-lock.json` and `tools/blender/` stay unchanged. The earlier 12 Hz redraw wording in the open-book/attract scope change and in task 29.2 is superseded by this bullet.

- Approved scope change (crisp look, faster walk, cassette and fixture polish), 2026-12-08: mouse look deltas apply 1:1 to both the target and the rendered look (no smoothing lag on mouse). Keyboard look (I/J/K/L; the arrow keys move, they do not turn) keeps exponential smoothing with `LOOK_SMOOTHING_LAMBDA` 42. `WALK_SPEED` rises about 15% (2.5 -> about 2.9 m/s; the earlier approved initial value 2.5 is superseded) and `MOVE_SMOOTHING_LAMBDA` goes from 20 to 28. Collision substeps, bounds, snap on blur / inspect / clear input and the reduced-motion bypass are unchanged. The loose desk VHS cassette uses a satin charcoal shell (`#2a2d36`) with the existing `vhsShell` texture; the ceiling fluorescent bars get diffuser and end-cap detail from existing textures. Budgets: triangles at most 19,200 (currently 19,154; 0 extra), at most 4 lights, 32 textures, texture memory at most 7.85 MB (7.703 MiB; 0 extra bytes). `ASSET_MANIFEST` stays `Object.freeze({})`. `src/App.tsx`, `src/core/`, `src/arcade/`, `src/memories/`, `src/ui/`, `src/styles.css`, `vite.config.ts`, `package.json`, `package-lock.json` and `tools/blender/` stay unchanged. The earlier smoothing wording (look lambda about 32 for mouse and movement lambda about 20) in the 2026-12-07 bullet and in task 30.2 is superseded by this bullet.

- Approved scope change (procedural world audio), 2026-12-09: a zero-asset procedural Web Audio engine is added in `src/world/audio/` (`createWorldAudioEngine`). It is a silent no-op when `AudioContext` / `webkitAudioContext` is missing and accepts an injectable context factory for tests. The context is created or resumed only on a user gesture (click or keydown in the world wrapper), suspended while `document.hidden`, and closed on dispose. SFX: VHS insert (on `onInspect('vhs')`), arcade coin (on `onInspect('arcade')`), lamp switch, page rustle (card open and page 1 / 2). Click-to-inspect no longer exists (removed in M1), so station SFX fire on E and on the WebGL fallback buttons. Ambient late-night VHS-store music at about 78 BPM: the pad and tape hiss are continuously running nodes (they keep playing while the canvas uses `frameloop="demand"` during an open panel), and sparse bell notes are scheduled ahead from the existing `useFrame` using `audioCtx.currentTime` (no `setInterval` / `setTimeout`). Master BGM gain is about 0.15 and is ducked x0.4 while a station panel is open (gain ramp triggered by the mode change, not the frame loop). `KeyM` toggles mute, and a compact "AUDIO: ON [M]" / "AUDIO: MUTED [M]" badge shows the state. Coordination note: the game-foundation spec assigns audio effects to Developer 3, so this world-local engine must be reviewed with Developer 3 before merge so the game does not run two audio systems. Budgets unchanged: triangles 19,154 (at most 19,200), 4 lights, 32 textures (7.703 MiB), no new timers. `ASSET_MANIFEST` stays `Object.freeze({})`. `src/App.tsx`, `src/core/`, `src/arcade/`, `src/memories/`, `src/ui/`, `src/styles.css`, `vite.config.ts`, `package.json`, `package-lock.json` and `tools/blender/` stay unchanged.

- Approved scope change (turntable and music catalog), 2026-12-10: a world-only interactable `record-player` (not a `StationId`) with a solid collider is placed in a free corner of the main room, so every existing reachability, 1.2 m walkway, doorway-lane, island-clearance, spawn and line-of-sight test still passes. It is a multi-part walnut console and Hi-Fi turntable: plinth with feet, brushed steel deck, emissive track display (no light), pitch slider and power button, 12-inch platter with a coloured label that spins while a track plays and stops when stopped or under reduced motion, and a tonearm that rests on its cradle when stopped and sits on the record when playing. It reuses existing textures only (0 extra bytes). To stay within 19,200 triangles the pass may cull unseen floor-flush bottom faces and, if still needed, simplify the hidden console cables behind the CRT island; every reclaimed triangle is reported. A procedural `MUSIC_CATALOG` of 4 tracks plus a stop option is added: 01 MIDNIGHT RENTAL 78 BPM (the current loop), 02 NEON ARCADE LOBBY 92 BPM (FM chords and bass), 03 RAIN ON CRT GLASS 72 BPM (Rhodes-style chords with vinyl crackle), 04 STATIC & STARLIGHT 84 BPM (A-minor arpeggio with tape wow), 05 STOP. Tracks switch with an audio-clock crossfade (no timers); track 1 is the default on unlock. A needle-drop SFX (about 0.55 s) plays on track start. E on the record player opens a themed turntable catalog card (`data-theme` turntable). Keys 1-5 select a track while that card is open (on document cards, 1 and 2 still switch pages), and track rows are clickable without recapturing pointer lock. The Developer 3 audio review is still required. Budgets: triangles at most 19,200 (19,154 now), 4 lights, 32 textures (7.703 MiB), no new timers, no audio files. `StationId` stays `'vhs' | 'arcade'`; `ASSET_MANIFEST` stays `Object.freeze({})`. `src/App.tsx`, `src/core/`, `src/arcade/`, `src/memories/`, `src/ui/`, `src/styles.css`, `vite.config.ts`, `package.json`, `package-lock.json` and `tools/blender/` stay unchanged.

- Approved scope change (Hi-Fi table relocation), 2026-12-11: the `record-player` moves from the north wall (x 2.2..3.1, z -4..-3.55) to a well-lit spot in the lounge beside the sofa. Every existing reachability, 1.2 m walkway, doorway-lane, island-clearance, spawn, bookcase-walkway and line-of-sight test stays green. The stand widens to a ~1.25 m Hi-Fi listening table holding the turntable, a wooden record crate with 4 LP sleeves (#16a34a, #e11d48, #38bdf8, #f59e0b) and an angled NOW PLAYING jacket stand that shows the active track's colour (neutral or lowered on STOP). A warm `MeshBasicMaterial` LED accent bar and an additive tabletop glow disc (`lampGlow` or `coneFalloff`, `depthWrite` false) replace any need for a fifth light. Triangles stay at most 19,200 (19,132 now) by reclaiming hidden geometry (wall-flush back faces on tall bookcases or filing cabinets via `floorCull.ts`, or fewer segments on hidden pipes). The draw-call estimate stays under the existing < 400 test (377 now). Budgets: 4 lights, 32 textures (7.703 MiB), no new timers. `StationId` is unchanged; `ASSET_MANIFEST` stays `Object.freeze({})`. `src/App.tsx`, `src/core/`, `src/arcade/`, `src/memories/`, `src/ui/`, `src/styles.css`, `vite.config.ts`, `package.json`, `package-lock.json` and `tools/blender/` stay unchanged. The placement wording in task 33.1 and in the turntable and music catalog bullet is superseded by this bullet.

## Tasks

### Milestone 1: Playable 3D room (primitives only)

- [x] 1. Foundation: types, constants and room layout
  - [x] 1.1 Create world types and constants
    - Files: `src/world/worldTypes.ts`, `src/world/logic/constants.ts`.
    - Define `Vec2`, `Aabb`, `MovementInput`, `StationDef` (importing `StationId` from `../core/contracts`) and the constants from the design (`WALK_SPEED`, `PLAYER_RADIUS`, `INTERACTION_RANGE`, `INTERACTION_CONE_DEG`, `PITCH_LIMIT_DEG`, `KEY_LOOK_DEG_PER_SEC`, `MOUSE_SENSITIVITY`, `MOUSE_DELTA_MAX`, `DT_MAX`, `MAX_STEP`, `EYE_HEIGHT`).
    - Acceptance: files compile; `constants.ts` imports nothing from React, three.js or the DOM; constants carry a comment stating they are initial values.
    - Tests: `npm run typecheck`.
    - Depends on: none.
    - Boundary: imports only `src/core/contracts.ts` types; no change to `src/core/`.
    - _Requirements: 3.6, 3.11, 4.3, 4.5, 5.5, 6.9, 7.1, 13.1, 16.3_

  - [x] 1.2 Implement the Milestone 1 room layout with reachability test
    - Files: `src/world/layout/roomLayout.ts`, `src/world/layout/roomLayout.test.ts`.
    - Single enclosed room (x -5..5, z -4..4, height 3), four wall Colliders, reception desk, shelves A and B, CRT/VHS Station (`vhs`), arcade cabinet Station (`arcade`), start position `(0, 3.0)` yaw 0. Export frozen `ROOM`, derived colliders, Station anchors on the front face, and a `reachableCells` BFS helper. The layout contains no field that depends on `memoryShifted`.
    - Acceptance: at least 2 shelves, a desk, both Stations inside bounds; start position does not overlap any Collider; both Station anchors have a reachable approach cell from the start; estimated triangle count (12 per box) is below 20,000.
    - Tests: `roomLayout.test.ts` (counts, bounds, start validity, reachability, triangle estimate). Run `npm test`.
    - Depends on: 1.1, 2.4 (uses `overlapsAny` for walkable cells).
    - Boundary: layout data is the single source of truth for colliders and anchors; no mesh or three.js import.
    - _Requirements: 1.3, 1.4, 1.7, 2.2, 6.1, 12.5, 13.8, 14.4, 19.1, 19.2_

  - [ ]* 1.3 Write property test for layout reachability and collision independence
    - **Property 15: Layout reachability and collision independence**
    - Files: `src/world/layout/roomLayout.reachability.property.test.ts`.
    - Assert Station anchors reachable from the start for generated grid resolutions, and that colliders and anchors are identical whichever palette flag is simulated (layout object is constant).
    - Depends on: 1.2, 2.2.
    - **Validates: Requirements 1.7, 9.3, 12.5, 13.8**

- [x] 2. Movement and collision pure logic (test-first)
  - [x] 2.1 Implement movement module with unit tests
    - Files: `src/world/logic/movement.ts`, `src/world/logic/movement.test.ts`.
    - `clampDt`, `inputVector` (opposing keys cancel, diagonal normalized), `stepMovement` using forward `(-sin yaw, -cos yaw)` and right `(cos yaw, -sin yaw)`.
    - Acceptance: no React, three.js or DOM imports; NaN or negative dt gives 0; dt above 0.1 gives 0.1; diagonal length equals single-axis length.
    - Tests: unit tests with one typical and one boundary case per function (dt exactly 0.1, opposing keys, yaw 0 and PI/2). Run `npm test`.
    - Depends on: 1.1.
    - Boundary: pure module; no collision here.
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.10, 3.11, 13.1, 13.2_

  - [ ]* 2.2 Write property test for input vector direction and speed
    - **Property 1: Input vector direction and speed**
    - Files: `src/world/logic/movement.direction.property.test.ts`, `package.json`, lockfile.
    - Install `fast-check` as a dev dependency (approved P9, compatible with React 19, TypeScript 5.9, Vitest 3). Use a fixed seed printed on failure and at least 100 runs. If installation or compatibility fails, create `src/world/logic/testing/seededRandom.ts` (mulberry32) and record the gap in the test report (task 15.1).
    - Depends on: 2.1.
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 13.7, 13.11, 13.12**

  - [ ]* 2.3 Write property test for frame-rate independent movement
    - **Property 2: Frame-rate independent movement with clamped dt**
    - Files: `src/world/logic/movement.dt.property.test.ts`.
    - Include NaN and Infinity dt in generators.
    - Depends on: 2.2.
    - **Validates: Requirements 3.6, 3.10, 3.11**

  - [x] 2.4 Implement collision module with unit tests
    - Files: `src/world/logic/collision.ts`, `src/world/logic/collision.test.ts`.
    - `resolveCircleAabb`, `resolveAll` (4 passes), `clampToBounds`, `moveWithCollision` (substeps of `MAX_STEP`, X then Z), `overlapsAny`, `relocateToValid` (grid spiral search then fallback).
    - Acceptance: circle touching a wall exactly does not overlap; sliding keeps the tangential component; a 0.15-thick Collider is not tunneled at `WALK_SPEED * DT_MAX`; a start inside a Collider is relocated.
    - Tests: unit tests for typical and boundary cases listed above. Run `npm test`.
    - Depends on: 1.1.
    - Boundary: pure module; walls are Colliders, `clampToBounds` is a safety net.
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 13.1, 13.2_

  - [ ]* 2.5 Write property test for position invariant
    - **Property 3: Position invariant (bounds and no overlap)**
    - Files: `src/world/logic/collision.invariant.property.test.ts`.
    - 200 runs; frame sequences with dt above the clamp; uses `ROOM` colliders and bounds.
    - Depends on: 2.4, 2.2, 1.2.
    - **Validates: Requirements 6.2, 6.4, 6.5, 6.8, 6.9, 13.3**

  - [ ]* 2.6 Write property test for wall sliding
    - **Property 4: Wall sliding preserves the tangential component**
    - Files: `src/world/logic/collision.sliding.property.test.ts`.
    - Depends on: 2.4, 2.2.
    - **Validates: Requirements 6.3**

  - [ ]* 2.7 Write property test for no tunneling
    - **Property 5: No tunneling through thin colliders**
    - Files: `src/world/logic/collision.tunneling.property.test.ts`.
    - Depends on: 2.4, 2.2.
    - **Validates: Requirements 6.6**

  - [ ]* 2.8 Write property test for idempotent resolution
    - **Property 6: Collision resolution is idempotent**
    - Files: `src/world/logic/collision.idempotent.property.test.ts`.
    - Includes the `relocateToValid` clause.
    - Depends on: 2.4, 2.2.
    - **Validates: Requirements 6.2, 6.7, 13.6**

- [x] 3. Look, targeting, input and mode pure logic (test-first)
  - [x] 3.1 Implement mouse look module with unit tests
    - Files: `src/world/logic/look.ts`, `src/world/logic/look.test.ts`.
    - `Look` type, `clampPitch` (plus or minus 80 degrees, NaN gives 0), `wrapYaw` (result in (-PI, PI], non-finite gives 0), `applyMouseLook` (ignores an axis delta above 500 px or non-finite). Keyboard look is added in 7.1.
    - Acceptance: pitch exactly 80 degrees accepted; delta 501 ignored; yaw stays finite after repeated large inputs.
    - Tests: unit tests, typical and boundary. Run `npm test`.
    - Depends on: 1.1.
    - Boundary: pure module.
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.9, 13.1, 13.2_

  - [x] 3.2 Implement interaction targeting with unit tests
    - Files: `src/world/logic/targeting.ts`, `src/world/logic/targeting.test.ts`.
    - `selectInteractionTarget` (range, cone, 2D line of sight excluding the Station's own Collider, nearest wins, ties by list order) and `segmentIntersectsAabb` (slab method). Pitch is ignored.
    - Acceptance: Station exactly at range is eligible; yaw exactly at the cone edge is eligible; a Collider between player and anchor excludes the Station; none returns `null`.
    - Tests: unit tests, typical and boundary. Run `npm test`.
    - Depends on: 1.1.
    - Boundary: pure module; takes Station definitions as arguments and has no knowledge of lock state.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.8, 13.1, 13.2, 20.1_

  - [ ]* 3.3 Write property test for target validity and nearest selection
    - **Property 8: Interaction target is valid and nearest**
    - Files: `src/world/logic/targeting.property.test.ts`.
    - 200 runs with random Stations and Colliders.
    - Depends on: 3.2, 2.2.
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.8, 13.5**

  - [x] 3.4 Implement input state and key filtering with unit tests
    - Files: `src/world/logic/inputState.ts`, `src/world/logic/inputState.test.ts`.
    - `keyRole` using `event.code` (W/Arrow keys, J L I K, E), `isKeyEventAccepted`, `reduceHeldKeys` (`down`, `up`, `clear`), `toMovementInput`, `toLookKeys`.
    - Acceptance: events from input, textarea, select, button, contenteditable or outside the wrapper are rejected; `clear` empties the set.
    - Tests: unit tests. Run `npm test`.
    - Depends on: 1.1.
    - Boundary: pure module; takes plain `KeyTargetInfo`, never a DOM element.
    - _Requirements: 3.4, 3.8, 3.9, 11.11, 11.12, 11.13, 11.15, 13.1_

  - [ ]* 3.5 Write property test for input clearing
    - **Property 13: Input clearing**
    - Files: `src/world/logic/inputState.clearing.property.test.ts`.
    - Depends on: 3.4, 2.2.
    - **Validates: Requirements 3.8, 3.9, 11.4, 11.11**

  - [ ]* 3.6 Write property test for key event filtering
    - **Property 14: Key event filtering**
    - Files: `src/world/logic/inputState.filtering.property.test.ts`.
    - Depends on: 3.4, 2.2.
    - **Validates: Requirements 11.12, 11.13, 11.15**

  - [x] 3.7 Implement the mode state machine (prop absent) with unit tests
    - Files: `src/world/logic/inputMode.ts`, `src/world/logic/inputMode.test.ts`.
    - `InputMode`, `ModeState`, `ModeEvent`, `ModeEffect`, `initialModeState`, `reduceMode` for the current-props-only behavior: `capturePending`, `active`, `inspecting`; E with target emits `CALL_ON_INSPECT`, `RELEASE_POINTER_LOCK`, `CLEAR_INPUT` and enters `inspecting`; repeat and held E guarded; Resume_Action by click, Enter or E (the resume key press is not an interaction); `REQUEST_POINTER_LOCK` only from `CANVAS_CLICK` or key activation; Esc never emits `CALL_ON_INSPECT`; `LOCK_DENIED` and `LOCK_UNSUPPORTED` set `keyboardLookHint` and never retry. The `EXTERNAL_ENABLED` event and the supplied-prop rules are added in 9.4.
    - Acceptance: all transitions of the design state diagram for the prop-absent case are covered by examples; no timers.
    - Tests: unit tests for each transition, repeat guard, resume-by-E, denial without retry. Run `npm test`.
    - Depends on: 3.4.
    - Boundary: pure reducer; effects are data, the controller performs them. No arcade lock knowledge.
    - _Requirements: 4.1, 4.8, 4.10, 4.11, 7.5, 7.6, 7.7, 11.1, 11.3, 11.4, 11.5, 11.7, 11.8, 11.9, 11.14, 11.19, 13.1_

  - [ ]* 3.8 Write property test for one onInspect call per key press
    - **Property 9: Interaction calls onInspect at most once per key press**
    - Files: `src/world/logic/inputMode.interaction.property.test.ts`.
    - Random event sequences against `reduceMode` with the prop absent.
    - Depends on: 3.7, 2.2.
    - **Validates: Requirements 7.5, 7.6, 7.7, 11.14**

  - [ ]* 3.9 Write property tests for inspecting state and resume
    - **Property 10: Inspecting state ignores world input** (prop-absent clauses; supplied-prop clauses are added in 9.5)
    - **Property 11: Resume does not trigger an interaction**
    - Files: `src/world/logic/inputMode.inspecting.property.test.ts`.
    - Depends on: 3.7, 2.2.
    - **Validates: Requirements 11.3, 11.4, 11.5, 11.7, 11.8, 11.9**

  - [ ]* 3.10 Write property test for pointer lock only from user gesture
    - **Property 17: Pointer lock is requested only from a user gesture** (prop-absent clauses; supplied-prop clauses are added in 9.6)
    - Files: `src/world/logic/inputMode.gesture.property.test.ts`.
    - Depends on: 3.7, 2.2.
    - **Validates: Requirements 4.10, 4.11, 11.23**

- [x] 4. Checkpoint - Pure logic complete
  - Run `npm run typecheck` and `npm test`; confirm no module in `src/world/logic/` imports React, three.js, `@react-three/*` or DOM APIs.
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 13.1, 13.10_

- [x] 5. M1 scene, controllers, overlays and WorldScene wiring
  - [x] 5.1 Implement the minimal palette
    - Files: `src/world/logic/palette.ts`, `src/world/logic/palette.test.ts`.
    - `Palette`, `PALETTE_NORMAL`, `PALETTE_SHIFTED` (background and ambient differ; every palette keeps a minimum ambient intensity floor). Blending, transition and flicker are added in 11.1.
    - Acceptance: normal and shifted differ in background and ambient color; ambient intensity is at or above the floor in both.
    - Tests: unit tests. Run `npm test`.
    - Depends on: 1.1.
    - Boundary: pure module; derived only from the `memoryShifted` boolean.
    - _Requirements: 9.8, 10.7, 19.8_

  - [x] 5.2 Implement the M1 scene components
    - Files: `src/world/scene/sharedResources.ts`, `src/world/scene/WorldCanvas.tsx`, `src/world/scene/Room.tsx`, `src/world/scene/Props.tsx`, `src/world/scene/Stations.tsx`, `src/world/scene/Lighting.tsx`.
    - Canvas with `dpr={[1, 1.5]}`, shadows off, no post-processing, no custom shaders. Room, desk, shelves, CRT/VHS and arcade from primitives driven by `ROOM`. Shared geometries and materials with a dispose helper. At most 4 lights (M1 uses 3). Arcade idle screen is a fixed material with no lock input. `memoryShifted` changes only background and ambient color.
    - Acceptance: `npm run typecheck` and `npm run build` pass; light count constant at or below 4; no new dependency.
    - Tests: typecheck and build; manual check in task 6.
    - Depends on: 1.2, 5.1.
    - Boundary: render-only; no rules; colliders never read from meshes; no GLB.
    - _Requirements: 1.1, 1.3, 1.4, 12.1, 12.5, 14.1, 14.2, 14.3, 14.5, 14.6, 14.7, 19.1, 19.2, 19.3, 19.8, 19.12, 20.6_

  - [x] 5.3 Implement the M1 overlay components
    - Files: `src/world/overlay/WorldOverlay.tsx`, `InteractionPrompt.tsx`, `Crosshair.tsx`, `CaptureOverlay.tsx`, `PanelOpenNotice.tsx`, `ControlsHint.tsx`, `WebglFallback.tsx`, `src/world/overlay/world.css`.
    - Prompt text map: `vhs` "Press E to inspect the CRT television", `arcade` "Press E to use the arcade cabinet". Live region (`role="status"`) always in the DOM. Capture text "Click to look around · Esc releases the mouse". Neutral panel notice. Fallback shows text plus two buttons. CSS lives in `world.css` imported from `src/world/` (P3 fallback). Contrast at least 4.5:1, visible `:focus-visible`, `pointer-events: none` except buttons, all overlays inside the wrapper.
    - Acceptance: components compile; text strings exactly as specified; no overlay is positioned outside the World_Wrapper.
    - Tests: typecheck, build; string checks are covered in 5.8 and 9.3.
    - Depends on: 1.1.
    - Boundary: `src/styles.css` is not edited; no import from `src/arcade/` or `src/memories/`.
    - _Requirements: 2.5, 4.6, 4.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 11.6, 15.2, 15.4, 15.5, 20.3, 20.8_

  - [x] 5.4 Implement pointer-lock and input controller hooks
    - Files: `src/world/controller/usePointerLock.ts`, `src/world/controller/useWorldInput.ts`.
    - Key listeners on the World_Wrapper element only; `window` gets `blur`; `document` gets `visibilitychange`, `pointerlockchange`, `pointerlockerror`. Translate events into `reduceMode` and `reduceHeldKeys` events and perform effects. `requestPointerLock` is called only inside the click or key-activation handler. `preventDefault` only for used keys while not inspecting; Esc never intercepted. Single cleanup removes every listener and exits pointer lock.
    - Acceptance: no key listener on `window`; cleanup function removes each listener it added; no pointer lock request on mount or on any non-gesture event.
    - Tests: typecheck; behavior verified by 5.8 (optional) and the manual check in task 6.
    - Depends on: 3.4, 3.7.
    - Boundary: only layer that touches `window`, `document` and the canvas.
    - _Requirements: 2.3, 2.4, 3.8, 4.1, 4.10, 11.1, 11.11, 11.12, 11.13, 11.14, 11.15, 11.23_

  - [x] 5.5 Implement the player rig
    - Files: `src/world/controller/usePlayerRig.ts`.
    - `useFrame` loop per the design: clamp dt, mouse look, movement via `moveWithCollision`, camera set with rotation order `YXZ` and no roll, constant eye height, target evaluation with React state updated only on change. In `inspecting` the player is frozen. Position, look and held keys live in refs. Start position passes through `relocateToValid`.
    - Acceptance: camera roll is always 0; position stays valid; React state is set only when the target or mode changes.
    - Tests: typecheck; manual check in task 6.
    - Depends on: 2.4, 3.1, 3.2, 5.4, 1.2.
    - Boundary: uses pure modules only for rules.
    - _Requirements: 2.2, 3.1, 3.2, 3.3, 3.6, 3.7, 3.9, 4.2, 6.7, 7.1, 10.5_

  - [x] 5.6 Wire WorldScene.tsx
    - Files: `src/world/WorldScene.tsx`.
    - Keep the exported `WorldScene` and `WorldSceneProps` (`onInspect`, `memoryShifted`) unchanged. Render `div.world-wrapper` with canvas (`tabIndex=0`, accessible label), overlays, WebGL pre-check, error boundary (also for `webglcontextlost` without restore after 3 s), and the fallback buttons. Remove the click-to-inspect prototype behavior. `onInspect` is called only by the controller on E and by the fallback buttons. No imports from arcade or memories, no storage access.
    - Acceptance: `src/App.tsx` compiles and runs unchanged; `npm run build` passes; E near a Station calls `onInspect` with its id and enters Inspecting_State.
    - Tests: `npm run typecheck`, `npm run build`; manual check in task 6.
    - Depends on: 5.2, 5.3, 5.5.
    - Boundary: public contract unchanged; `App.tsx` not touched.
    - _Requirements: 2.1, 2.5, 2.6, 11.2, 16.1, 16.2, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10, 16.11, 17.7, 19.4, 19.5, 19.6, 19.7_

  - Note: any required `package.json` change in M1 is limited to `jsdom` and `@testing-library/react` (plus `@testing-library/dom` if required) as devDependencies. `vite.config.ts` is untouched (jsdom is selected via the per-file docblock).

  - [x] 5.7 Write import-boundary test
    - Files: `src/world/boundary.test.ts`.
    - Scan `src/world/**/*.ts(x)` import specifiers and storage API names (Node `fs`, no DOM). Fail on `../arcade`, `../memories`, `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`; fail if `logic/` imports `react`, `three` or `@react-three/*`.
    - Depends on: 5.6.
    - _Requirements: 13.1, 16.8, 16.9_

  - [x] 5.8 Write component-level tests
    - Files: `src/world/WorldScene.test.tsx`, `package.json`, lockfile.
    - Install `jsdom`, `@testing-library/react` (and `@testing-library/dom` if required) as dev dependencies (P9). File starts with `// @vitest-environment jsdom`; global Vitest config is unchanged (flag for review if a global change is unavoidable). Mock the Canvas child. Cases: E with a target calls `onInspect` with the correct StationId and E without a target does not; fallback buttons call `onInspect('vhs')` and `onInspect('arcade')`; unmount removes every added listener; prompt strings exact. If installation or compatibility fails, use reducer-level tests and record the gap in task 15.1.
    - Depends on: 5.6.
    - _Requirements: 2.3, 2.5, 7.5, 7.6, 8.1, 13.9, 13.13, 13.14_

- [x] 6. Checkpoint - Milestone 1 playable
  - Run `npm run typecheck`, `npm test`, `npm run build`.
  - Manual playtest (`npm run dev` run by the user): click canvas locks the pointer, WASD walks, walls and furniture block, E at the CRT and at the arcade calls the App flow, panel-open notice appears, click or Enter resumes, Esc releases the mouse, `memoryShifted` changes background and ambient only.
  - Confirm `git diff` shows no change in `src/core/`, `src/arcade/`, `src/memories/` or `src/App.tsx`, and no new runtime dependency.
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.11, 19.12_

### Milestone 2: Movement and camera

- [x] 7. Keyboard look, pointer-lock fallback and full controls hint
  - [x] 7.1 Add keyboard look to the look module
    - Files: `src/world/logic/look.ts`, `src/world/logic/look.keyboard.test.ts`.
    - `LookKeys`, `applyKeyboardLook` at 90 degrees per second times `clampDt(dt)`, then wrap and clamp.
    - Acceptance: pitch cannot exceed plus or minus 80 degrees; result independent of frame rate within tolerance.
    - Tests: unit tests, typical and boundary. Run `npm test`.
    - Depends on: 3.1, 2.1.
    - Boundary: pure module.
    - _Requirements: 5.3, 5.5, 4.3, 13.2_

  - [ ]* 7.2 Write property test for look angle validity
    - **Property 7: Look angles stay valid**
    - Files: `src/world/logic/look.property.test.ts`.
    - Mouse deltas from -2000 to 2000 plus NaN, keyboard look with any dt.
    - Depends on: 7.1, 2.2.
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 5.3, 5.5, 13.4**

  - [x] 7.3 Wire keyboard look into the controllers
    - Files: `src/world/controller/usePlayerRig.ts`, `src/world/controller/useWorldInput.ts`.
    - I, J, K, L are active whenever the canvas has focus and mode is not `inspecting`, regardless of pointer-lock state.
    - Acceptance: a player who never locks the pointer can look and walk.
    - Tests: typecheck; manual keyboard-only check in task 8.
    - Depends on: 7.1, 5.5.
    - Boundary: `preventDefault` only for used keys.
    - _Requirements: 5.3, 5.4, 11.15_

  - [x] 7.4 Implement pointer-lock denial and unsupported fallback display
    - Files: `src/world/controller/usePointerLock.ts`, `src/world/overlay/WorldOverlay.tsx`.
    - Missing `requestPointerLock` dispatches `LOCK_UNSUPPORTED`; `pointerlockerror` or a rejected request dispatches `LOCK_DENIED`; the overlay shows a keyboard-controls hint; no retry without a new gesture.
    - Acceptance: after denial the mode stays `capturePending`, WASD and IJKL still work.
    - Tests: reducer behavior covered by 7.6; manual check in task 8.
    - Depends on: 5.4, 5.3.
    - Boundary: browser API only in the controller.
    - _Requirements: 4.11, 5.1, 5.2, 5.4_

  - [x] 7.5 Complete the controls hint
    - Files: `src/world/overlay/ControlsHint.tsx`.
    - Collapsible hint listing W A S D, arrows, I J K L, E, Esc, and a sentence that station messages appear in the status line below the scene. Readable without pointer lock.
    - Acceptance: every movement, look and interaction key is listed; hint toggle is keyboard operable with visible focus.
    - Tests: typecheck; string check added in 9.8 if component tests exist; manual check in task 8.
    - Depends on: 5.3.
    - Boundary: text only; no lock-state knowledge.
    - _Requirements: 5.6, 15.1, 15.2, 15.4, 20.7_

  - [x]* 7.6 Write unit tests for fallback transitions
    - Files: `src/world/logic/inputMode.fallback.test.ts`.
    - Cases: `LOCK_DENIED` sets `keyboardLookHint` and emits no request; `LOCK_UNSUPPORTED` same; a later `CANVAS_CLICK` emits a request; lock loss returns to `capturePending`.
    - Depends on: 3.7.
    - _Requirements: 4.8, 4.11, 5.1, 5.2_

- [x] 8. Checkpoint - Milestone 2 complete
  - Run `npm run typecheck`, `npm test`, `npm run build`.
  - Manual check: keyboard-only play (Tab to canvas, WASD, arrows, IJKL, E, Esc); simulate pointer lock denial; confirm the hint lists all keys.
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 15.1_

### Milestone 3: Collision and interactions

- [x] 9. Full layout, interaction feedback ownership and the inputEnabled prop
  - [x] 9.1 Extend the layout to the full archive
    - Files: `src/world/layout/roomLayout.ts`, `src/world/layout/roomLayout.test.ts`.
    - Add the Arcade_Area (east opening to a 4 by 4 area), at least 2 doors (frame-side Colliders block, opening does not), shelf C (at least 3 shelves total), chair and couch (at least 2 furniture pieces), at least 5 additional detail objects (tapes, boxes, posters, cables) with Colliders where solid. Prop definitions carry `milestone` and optional `glbPath`.
    - Acceptance: all Stations reachable from the start through doors; at least 3 shelves, 2 furniture, 2 doors, 5 details; triangle estimate below 20,000; line of sight from a door-adjacent position to the arcade Station is not blocked by door openings.
    - Tests: update `roomLayout.test.ts`, including a `selectInteractionTarget` example through a doorway. Run `npm test`.
    - Depends on: 5.6, 3.2.
    - Boundary: layout data only; M1 behavior and `WorldSceneProps` unchanged.
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.7, 6.1, 7.3, 13.8, 19.10_

  - [x] 9.2 Render the full layout
    - Files: `src/world/scene/Props.tsx`, `src/world/scene/Stations.tsx`, `src/world/scene/Room.tsx`.
    - Render new props, doors and the Arcade_Area from primitives; repeated objects share geometry and use `InstancedMesh` above about 10 copies; arcade attract screen stays identical for every game state.
    - Acceptance: `npm run build` passes; visible objects match layout colliders; light count at or below 4.
    - Tests: typecheck, build; manual walk-through in task 10.
    - Depends on: 9.1.
    - Boundary: render-only.
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.8, 14.4, 14.6, 20.6_

  - [x] 9.3 Implement feedback ownership text
    - Files: `src/world/overlay/InteractionPrompt.tsx`, `src/world/overlay/PanelOpenNotice.tsx`, `src/world/overlay/ControlsHint.tsx`, `src/world/WorldScene.tsx`.
    - Prompt text is a constant map independent of any prop. Canvas `aria-label` states the controls and that station messages, including why a station cannot be used yet, appear in the status line below the scene. Panel notice is neutral: "Station request sent. Click the view or press Enter to continue exploring. Messages appear below the scene." No overlay covers, replaces or duplicates the App status line.
    - Acceptance: the arcade prompt is identical regardless of props; no GameState or lock prop exists.
    - Tests: string assertions added to `WorldScene.test.tsx` if task 5.8 was done; otherwise manual check in task 10.
    - Depends on: 5.6.
    - Boundary: the World_Module does not read or infer unlock status; the lock message stays in `App.tsx`.
    - _Requirements: 8.1, 8.6, 8.7, 11.2, 11.6, 16.6, 16.7, 16.13, 20.1, 20.2, 20.3, 20.4, 20.5, 20.7, 20.8, 20.9_

  - [x] 9.4 Extend the mode reducer for the supplied inputEnabled prop
    - Files: `src/world/logic/inputMode.ts`, `src/world/logic/inputMode.supplied.test.ts`.
    - Add `inputEnabled: boolean | undefined` handling and `EXTERNAL_ENABLED`. Supplied prop: `onInspect` never enters `inspecting` (emits `CALL_ON_INSPECT`, `RELEASE_POINTER_LOCK`, `CLEAR_INPUT`, stays or moves to `capturePending`); `true -> false` enters `inspecting` without `CALL_ON_INSPECT`; `false -> true` enters `capturePending` without `REQUEST_POINTER_LOCK`; click, Enter and E are ignored while the prop is false. Absent prop keeps the existing behavior unchanged.
    - Acceptance: all supplied-prop transitions of the state diagram covered; prop-absent tests from 3.7 still pass.
    - Tests: unit tests for each supplied-prop transition and for absent versus supplied divergence only after `CALL_ON_INSPECT`. Run `npm test`.
    - Depends on: 3.7.
    - Boundary: pure reducer; the prop is the only source of suspension when supplied.
    - _Requirements: 11.16, 11.17, 11.18, 11.19, 11.20, 11.21, 11.22, 11.23, 11.24, 11.25_

  - [ ]* 9.5 Extend property test for inspecting state and prop behavior
    - **Property 10: Inspecting state ignores world input** (supplied-prop clauses)
    - **Property 12: Prop-absent and prop-supplied behavior**
    - Files: `src/world/logic/inputMode.prop.property.test.ts`.
    - Depends on: 9.4, 2.2.
    - **Validates: Requirements 11.16, 11.17, 11.18, 11.19, 11.20, 11.21, 11.22, 11.25**

  - [ ]* 9.6 Extend property test for pointer lock only from user gesture
    - **Property 17: Pointer lock is requested only from a user gesture** (supplied-prop clauses, including `EXTERNAL_ENABLED` and `memoryShifted` re-renders)
    - Files: `src/world/logic/inputMode.gesture.supplied.property.test.ts`.
    - Depends on: 9.4, 2.2.
    - **Validates: Requirements 4.10, 4.11, 11.18, 11.23**

  - [x] 9.7 Implement the optional inputEnabled prop in the world module
    - Files: `src/world/WorldScene.tsx`, `src/world/controller/useWorldInput.ts`, `src/world/controller/usePlayerRig.ts`.
    - Add `inputEnabled?: boolean` to `WorldSceneProps` (additive, default true). Pass the value to `initialModeState` and send `EXTERNAL_ENABLED` only from an effect that fires when a supplied value changes. An absent prop is treated as true for rendering only, never as a supplied true. The panel notice shows only while the world is `inspecting`. Never request pointer lock on prop change. Do not declare `reducedDistortion` here.
    - Acceptance: existing call sites compile unchanged without the prop; with the prop false the world ignores input and shows the notice; with the prop true after false it shows the Capture_Overlay and waits for a user gesture; `src/App.tsx` is not modified.
    - Tests: typecheck, build; component tests in 9.8 (optional); manual check by temporarily rendering the world in a scratch harness is not allowed in `App.tsx`, so rely on 9.8 or reducer tests.
    - Depends on: 9.4, 9.3, 5.5.
    - Boundary: P1 implemented on the world side only. No prop carries lock, unlock or progress data.
    - _Requirements: 11.16, 11.17, 11.18, 11.19, 11.20, 11.21, 11.22, 11.23, 11.24, 11.25, 16.11, 16.12, 16.13, 17.5, 17.7_

  - [x] 9.8 Write component tests for supplied and absent inputEnabled
    - Files: `src/world/WorldScene.inputEnabled.test.tsx`.
    - jsdom docblock; the DOM test packages are already installed by required task 5.8. Cases: prop absent, E calls `onInspect` and the notice shows; prop true, E calls `onInspect` and the notice does not show (Capture_Overlay shows); prop toggled true to false to true ends in Capture_Overlay and does not call `requestPointerLock`; click while false does nothing; a keydown from a focused input outside the wrapper does not move the player or call `onInspect`.
    - Depends on: 9.7.
    - _Requirements: 11.12, 11.13, 11.16, 11.17, 11.20, 11.21, 11.22, 13.9, 13.13_

  - [x] 9.9 NON-IMPLEMENTATION: document the App.tsx change for team coordination
    - Files: `.kiro/specs/world-exploration/integration-notes.md` (new, documentation only). **Do not edit `src/App.tsx`.**
    - Describe the proposed P1 change (`<WorldScene inputEnabled={station === null} ... />`), the expected sequences for an unlocked request and a locked arcade request, the prop-absent limitation (user resumes with click, Enter or E), and the question for the App.tsx owner. State that P1 is approved as a proposal only and that App.tsx stays unmodified until the team coordinates.
    - Acceptance: file exists and `git diff` shows no change to `src/App.tsx`.
    - Tests: none (documentation). Manual review.
    - Depends on: 9.7.
    - Boundary: no code change outside the spec folder.
    - _Requirements: 11.10, 17.5, 17.7, 17.8, 17.9_

- [x] 10. Checkpoint - Milestone 3 complete
  - Run `npm run typecheck`, `npm test`, `npm run build`.
  - Manual playtest: walk both areas through doors; all Stations reachable; arcade prompt text unchanged regardless of progress; after a locked-arcade request in the running App the status line message is visible and not covered; resume works with the prop absent.
  - Confirm `git diff` is limited to `src/world/`, `package.json`, lockfile and the spec folder.
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 1.2, 6.5, 7.5, 16.6, 17.3, 20.2, 20.8_

### Milestone 4: Environmental effects

- [x] 11. Memory_Shift and effects
  - [x] 11.1 Complete the palette module
    - Files: `src/world/logic/palette.ts`, `src/world/logic/palette.full.test.ts`.
    - Full `Palette` (light, fog, wall, screen emissive, accent), `transitionProgress` (2 s, immediate under reduced motion), `blendPalette`, `flickerFactor` (amplitude at most 15 percent, at most 3 direction changes per second, constant under reduced motion).
    - Acceptance: progress is 1 after 3 s; reduced motion gives 1 immediately and a constant flicker factor; ambient floor kept.
    - Tests: unit tests, typical and boundary. Run `npm test`.
    - Depends on: 5.1.
    - Boundary: pure module.
    - _Requirements: 9.2, 9.4, 9.5, 10.2, 10.3, 10.7_

  - [ ]* 11.2 Write property test for flicker limit and transition time
    - **Property 16: Flicker stays below the flash limit and Memory_Shift completes in time**
    - Files: `src/world/logic/palette.property.test.ts`.
    - Depends on: 11.1, 2.2.
    - **Validates: Requirements 9.4, 9.5, 10.2, 10.3**

  - [x] 11.3 Implement the reduced-motion hook
    - Files: `src/world/controller/useReducedMotion.ts`.
    - `matchMedia('(prefers-reduced-motion: reduce)')` with `change` subscription; treat missing `matchMedia` as no preference; accept an optional boolean argument (default false) that is ORed in. The `reducedDistortion` prop on `WorldSceneProps` is not declared until P2 is approved (task 16.2).
    - Acceptance: setting changes apply without remount; listener removed on unmount.
    - Tests: typecheck; unit test with a mocked `matchMedia` in a jsdom-docblock file if DOM tools are installed, otherwise manual check in task 12.
    - Depends on: 5.4.
    - Boundary: controller only; no prop change.
    - _Requirements: 10.4, 10.6_

  - [x] 11.4 Wire Memory_Shift into the scene
    - Files: `src/world/scene/WorldCanvas.tsx`, `src/world/scene/Lighting.tsx`, `src/world/scene/Room.tsx`, `src/world/scene/Props.tsx`, `src/world/scene/Stations.tsx`.
    - Blend progress `t` kept in a ref, advanced by `dt / 2`, mounted at 1 when `memoryShifted` starts true, immediate under reduced motion. Changes lighting color, background and fog, screen emissive colors and an added poster plus altered plaque (visual only, no Collider, fade by opacity). `frameloop="demand"` while inspecting with `invalidate()` during transitions. Canvas is never remounted.
    - Acceptance: at least 4 properties differ between states; colliders and Station positions unchanged; true to false restores the original look.
    - Tests: typecheck, build; Property 15 test (1.3) still passes; manual check in task 12.
    - Depends on: 11.1, 11.3, 9.2.
    - Boundary: appearance derives only from `memoryShifted`.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 10.7, 14.3_

  - [x] 11.5 Implement environmental effects
    - Files: `src/world/scene/Effects.tsx`, `src/world/scene/WorldCanvas.tsx`.
    - CRT point-light flicker, screen glow variation (0.5 Hz), one `Points` object with about 150 dust points, 64 by 64 `CanvasTexture` static updated at most 12 times per second on the CRT screen only. Under reduced motion all are static equivalents. No shake, roll or forced camera motion. Textures and geometries disposed on unmount. No post-processing, no custom shaders.
    - Acceptance: luminance changes at most 3 per second; reduced motion disables animation; camera is untouched by effects.
    - Tests: typecheck, build; manual reduced-motion check in task 12.
    - Depends on: 11.4.
    - Boundary: render-only; at most 4 lights.
    - _Requirements: 10.1, 10.2, 10.3, 10.5, 14.2, 14.5, 14.7_

- [x] 12. Checkpoint - Milestone 4 complete
  - Run `npm run typecheck`, `npm test`, `npm run build`.
  - Manual check: toggle `memoryShifted` during play, transition under 3 s, mount with shifted state, toggle the OS reduced-motion setting while mounted, room stays readable in both states.
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 9.4, 9.5, 9.7, 10.3, 10.4, 10.7_

### Milestone 5: Blender/GLB integration

- [x] 13. Optional GLB assets with primitive fallback
  - [x] 13.1 Implement the asset loader, manifest and AssetModel
    - Files: `src/world/assets/assetManifest.ts`, `src/world/assets/loadGlb.ts`, `src/world/assets/AssetModel.tsx`, `src/world/assets/assets.test.ts`.
    - Manifest maps layout object ids to optional `/models/<name>.glb` paths with triangle budgets (initially empty). Loader uses `three/examples/jsm/loaders/GLTFLoader` (no new dependency). `AssetModel` wraps `Suspense` plus an error boundary whose fallback is the primitive; one English warning per failing path: `[world] GLB asset failed to load, using primitive fallback: <path>`. Loaded resources are disposed on unmount.
    - Acceptance: empty manifest renders exactly the M3 scene; a failing path logs once; movement is not blocked while loading.
    - Tests: unit test for the one-warning-per-path logic with a mocked loader (jsdom docblock only if needed). Run `npm test`.
    - Depends on: 9.2.
    - Boundary: colliders and anchors never read from GLB geometry.
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 14.7_

  - [x] 13.2 Integrate AssetModel into scene components
    - Files: `src/world/scene/Props.tsx`, `src/world/scene/Stations.tsx`.
    - Replace direct primitives with `AssetModel` using the primitive as fallback.
    - Acceptance: with an empty manifest the rendered result is unchanged; `npm run build` passes.
    - Tests: typecheck, build; manual check with a missing path to see the warning once.
    - Generated `.glb` files are optional: the manifest stays empty until they exist and are measured.
    - Depends on: 13.1, 13.6.
    - Boundary: layout data still the only source of collision.
    - _Requirements: 12.1, 12.2, 12.3, 12.5_

  - [x] 13.3 Add original Blender scripts
    - Files: `tools/blender/export_glb.py`, `tools/blender/count_triangles.py`, `tools/blender/generate_assets.py`, `tools/blender/README.md`.
    - Original `bpy` scripts with English comments: batch GLB export into `public/models/` and a triangle counter. README gives usage instructions. No Blender or GLB is needed by M1 to M4.
    - Add `tools/blender/generate_assets.py`: a generator that procedurally builds the same detailed objects as task 13.6 (CRT TV plus VCR, arcade cabinet, shelf with tapes, armchair, couch, crate) from `bpy` primitives, applies the triangle budgets, and exports `.glb` files into `public/models/`. It is deterministic and reproducible (fixed seed) and runs with `blender -b --python tools/blender/generate_assets.py`. Original work only. No `.glb` is claimed to exist unless it was generated and measured.
    - Acceptance: scripts have usage docs; no copied third-party code; folder is outside `src/`.
    - Tests: manual run in Blender by a team member; `python -m py_compile` on each script if Python is available.
    - Deferred note: no Blender scripts or `.glb` assets are created during M1 (tasks 1-6). This task must not start before the M4 checkpoint (task 12) completes.
    - Depends on: 12 (M4 checkpoint).
    - Boundary: `tools/blender/` only (approved P10).
    - _Requirements: 12.6, 12.8, 12.9_

  - [x] 13.4 Add asset budget check and asset log
    - Files: `src/world/assets/assetManifest.test.ts`, `.kiro/specs/world-exploration/asset-log.md`.
    - Test that each manifest entry has a path under `/models/`, at most 5,000 triangles for props, and the sum of budgets is at most 20,000. Asset log template (source, author, license, modifications, file size) kept in the spec folder until P6 is approved. Real file size checks (5 MB total) stay a manual checklist item.
    - Acceptance: test passes with the empty manifest and fails on an over-budget fixture entry.
    - Tests: `npm test`.
    - Depends on: 13.1.
    - Boundary: `docs/THIRD_PARTY_ASSETS.md` is not edited (P6 pending).
    - _Requirements: 12.6, 12.7, 12.10, 14.4_

  - [x] 13.5 Full-screen game shell and in-game overlays (approved App.tsx/styles.css change)
    - Files: `src/App.tsx`, `src/styles.css`, `src/App.test.ts`, `src/world/WorldScene.tsx` (string wording only), `src/world/overlay/*` and existing world tests (only where the "status line below the scene" wording must change to match the new HUD), `src/world/README.md`, `.kiro/specs/world-exploration/integration-notes.md`.
    - Replace the split-column prototype (header, FIELD NOTES, WHAT COMES NEXT?, footer) with a 100vw by 100vh container with `overflow: hidden`. `<WorldScene>` fills it and receives `inputEnabled={station === null}`.
    - Unlock rules, messages and event wiring in `interact()`, `send()` and `reset()` stay unchanged. `App.tsx` stays the source of truth.
    - Render the existing `MemoryPanel` (VHS station) and `ArcadePanel` as `role="dialog"` `aria-modal="true"` overlays centered over the canvas. Each closes with its Close button and with Escape. Focus moves into the dialog on open and returns to the world wrapper on close.
    - Add a compact HUD (progress badge plus a `role="status"` message line, placed so it does not collide with world overlays) and a minimal controls/reset drawer. The world must not cover the HUD status line and the HUD must not cover world overlays.
    - No restored-memory viewer exists in `src/memories`, so none is invented. Record this gap in `integration-notes.md`.
    - Update `integration-notes.md` and `src/world/README.md` to state that P1, P3 and P4 are now implemented, and change any "status line below the scene" wording to describe the HUD.
    - Acceptance: `npm run typecheck` and `npm run build` pass. In the unlocked state, E at a station opens the overlay and the world suspends; closing returns control, and one click re-captures the pointer (no automatic pointer lock). A locked arcade request shows the App lock message and the world stays usable.
    - Tests: `src/App.test.ts` (jsdom docblock; `.test.ts` naming because `vite.config.ts` only includes `.test.ts`; mock `./world/WorldScene`) covering overlay open, close and Escape, `inputEnabled` passed to the world, the lock message, and reset. Run `npm test`.
    - Depends on: 9.7.
    - Boundary: `src/core/`, `src/arcade/` and `src/memories/` unchanged; `vite.config.ts` unchanged.
    - _Requirements: 8.6, 11.2, 11.16, 11.17, 11.20, 11.21, 16.6, 16.7, 16.11, 17.5, 20.2, 20.8_

  - [x] 13.6 Upgrade procedural model detail (primitives only)
    - Files: `src/world/scene/Stations.tsx`, `src/world/scene/Props.tsx`, `src/world/scene/Room.tsx`, `src/world/scene/sharedResources.ts`, `src/world/scene/modelDetail.test.ts`.
    - Build multi-part 1990s detail from primitives:
      - CRT TV with beveled casing, recessed screen bezel, power LED and knobs.
      - VCR deck with a slot and a cassette.
      - Arcade cabinet with angled marquee, side art panels, recessed CRT screen, and a control deck with a ball-top joystick and 6 coloured buttons.
      - Wooden shelves with varied VHS spines and labels (`InstancedMesh` with per-instance colour).
      - Armchair with cushions and armrests, worn couch, ribbed crates.
      - Ceiling fluorescent fixtures, trim and skirting.
    - Layout stays the single source of truth: meshes only decorate layout anchors and footprints. No collider changes.
    - Light count stays at or below 4 (fluorescent fixtures are emissive meshes, not lights). The triangle estimate stays under 20,000 in total and is checked by a pure helper test. Shared geometries and materials are disposed.
    - Acceptance: `npm run typecheck` and `npm run build` pass; colliders and Station anchors are unchanged; triangle estimate below 20,000; light count at or below 4.
    - Tests: `modelDetail.test.ts` (pure triangle-estimate helper, light-count constant, layout colliders unchanged). Run `npm test`.
    - Depends on: 9.2, 11.4.
    - Boundary: render-only; no GLB required.
    - _Requirements: 1.3, 1.4, 1.8, 12.5, 14.4, 14.5, 14.6, 19.1_

- [x] 14. Checkpoint - Milestone 5 complete
  - Run `npm run typecheck`, `npm test`, `npm run build`.
  - Manual check: scene identical with an empty manifest; a deliberately missing GLB path logs one warning and shows the primitive.
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 12.1, 12.3, 12.4_

### Milestone 6: Testing and optimization

- [x] 15. Verification, measurement and documentation
  - [x] 15.1 Audit test coverage against design properties
    - Files: `.kiro/specs/world-exploration/test-report.md`.
    - Table of Properties 1 to 17 with the test file and status (present, skipped, fallback), seeds used, and any gap such as a failed `fast-check` or jsdom install. Add any missing property tests that were skipped only if the user asks for them.
    - Also record the tests added in 15.6, 15.7 and 15.8 (layout relocation, procedural textures, disposal, tabIndex) in the report.
    - Acceptance: each property row names a file or states "not implemented"; the new M6 tests are listed; `npm test` result recorded.
    - Tests: `npm test`.
    - Depends on: 15.7.
    - Boundary: documentation of results only.
    - _Requirements: 13.2, 13.10, 13.11, 13.14, 15.6_

  - [x] 15.2 Add a dev-only frame sampler and targeting benchmark
    - Files: `src/world/controller/useFrameSampler.ts`, `src/world/logic/targeting.bench.test.ts`.
    - Sampler records `useFrame` deltas and `renderer.info` (triangles, draw calls), enabled only with `import.meta.env.DEV` and an explicit flag, and exports median and 95th percentile. Targeting benchmark times `selectInteractionTarget` over the full layout and prints the result without asserting a pass threshold (no hardware-dependent assertion).
    - Acceptance: sampler is inert in production build; benchmark does not fail on slow machines. The benchmark runs against the layout as it stands when the test executes (it needs no relocation to be written).
    - Tests: `npm test`, `npm run build`.
    - Depends on: 14, 5.5.
    - Boundary: no runtime effect in production.
    - _Requirements: 7.9, 14.8, 14.9, 14.11_

  - [x] 15.3 Create the manual test log
    - Files: `.kiro/specs/world-exploration/manual-test-log.md`.
    - Template for the matrix: keyboard only, pointer lock (lock, Esc, alt-tab, denial, unsupported), panels (VHS typing, Snake keys do not move the player, locked arcade message visible and uncovered), reduced motion, Memory_Shift, WebGL failure, latest Chrome, Firefox, Edge. Each row starts as "not run".
    - Add rows for the M6 changes: arcade reachable through both doors, arcade prompt from each doorway, ARCADE sign visible, textured posters and screen, Memory_Shift tint on the arcade screen and posters.
    - Acceptance: every row has a status field; no row is marked passed without a date and tester.
    - Tests: none (documentation). Manual review.
    - Depends on: 14.
    - Boundary: spec folder only.
    - _Requirements: 15.6, 15.7_

  - [x] 15.4 MANUAL MEASUREMENT: record performance results
    - Files: `.kiro/specs/world-exploration/performance-log.md`.
    - Run `npm run build` and `npm run preview`, then record a 60-second scripted walk on the Reference_Hardware at 1280 by 720 with the dev sampler or the browser Performance panel. Record method, hardware, browser, median and 95th-percentile frame time, first-render time, triangle count, draw calls and the targeting benchmark output. Fill each target as "measured: value" or "not measured". Do not claim a target as achieved without a recorded value.
    - Agents prepare `performance-log.md` with computed static metrics (triangle count from `modelDetail` helpers, draw-call grouping estimate), clearly labelled "computed, not runtime-measured". The runtime frame-time fields stay "not measured" until the user records them. This sub-task is intentionally left unchecked until a human records values.
    - Acceptance: the log contains raw numbers and the method, or states that a target is not measured; computed values are labelled as computed.
    - Tests: manual measurement by a team member.
    - Depends on: 15.2, 15.7.
    - Boundary: results only; no code change.
    - _Requirements: 14.1, 14.8, 14.9, 14.10, 14.11, 14.12_

  - [x] 15.5 Update src/world/README.md
    - Files: `src/world/README.md`.
    - Describe module layout, controls, public props (including optional `inputEnabled`), the lock-agnostic design, the known limitation while `inputEnabled` is not supplied, pending proposals, and test commands. Mark each feature as verified only if backed by a test or a recorded manual check, otherwise "planned" or "prototype". Reference performance numbers only from `performance-log.md`.
    - Also add to `src/world/README.md` and `.kiro/specs/world-exploration/integration-notes.md` the measured or computed triangle and draw-call numbers (each labelled computed or measured) and the list of disposal and edge-case checks (texture disposal exactly once, reachability through both doors, doorway line of sight, Memory_Shift tint, reduced motion).
    - Acceptance: README contains no claim without a linked test or log entry; all text in English; numbers carry their label.
    - Tests: none (documentation). Manual review.
    - Depends on: 15.1, 15.3, 15.4, 9.9.
    - Boundary: `src/world/README.md` and the spec folder only.
    - _Requirements: 11.10, 14.11, 14.12, 15.3, 15.6_

  - [x] 15.6 Relocate the arcade Station into the Arcade_Area and dress it
    - Files: `src/world/layout/roomLayout.ts`, `src/world/layout/roomLayout.test.ts`, `src/world/scene/Stations.tsx`, `src/world/scene/Props.tsx`, `src/world/scene/Room.tsx`, `src/world/scene/modelDetail.ts`, `src/world/scene/modelDetail.test.ts`, `src/world/assets/assetPlacement.ts` (only if needed), `src/world/WorldScene.test.ts` (only if it hardcodes the old position).
    - Move the `arcade` Station (cabinet collider, anchor in front of its west face, orientation facing -X toward the doorways) to the east Arcade_Area against the east wall (around x 8.4, z 0). Keep the `vhs` Station where it is.
    - Add an overhead retro "ARCADE" sign above the east doorways (visual only, emissive material, no light).
    - Add non-interactive vintage dressing in the Arcade_Area: a powered-down companion cabinet with a collider, stacked CRT monitors with a collider, a floor runner decal and cable runs. Colliders only where solid.
    - `Stations.tsx` renders the cabinet rotated to face west. Placement helpers from `assetPlacement.ts` handle orientation consistently.
    - Acceptance: the arcade anchor is reachable from the start through BOTH doors; line of sight to the arcade Station is clear from each door-adjacent position; anchors are inside bounds and not blocked; triangle estimate below 20,000; light count unchanged (at most 4); arcade prompt text unchanged; all existing tests pass.
    - Tests: `roomLayout.test.ts` (reachability through both doors, doorway line of sight, collider counts, triangle estimate); `modelDetail.test.ts` (colliders match layout, anchors match `STATION_DEFS`). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: none.
    - Boundary: `src/world/` only; `StationId`, `WorldSceneProps` and `onInspect` unchanged; layout stays the single source of truth for collision.
    - _Requirements: 1.2, 1.3, 1.5, 1.6, 1.7, 6.1, 7.3, 12.5, 13.8, 14.4, 14.5, 19.10, 20.1_

  - [x] 15.7 Procedural canvas textures and model craftsmanship upgrade
    - Files: `src/world/scene/sharedResources.ts`, `src/world/scene/proceduralTextures.ts`, `src/world/scene/modelDetail.ts`, `src/world/scene/Stations.tsx`, `src/world/scene/Props.tsx`, `src/world/scene/Room.tsx`, `src/world/scene/proceduralTextures.test.ts`, `src/world/scene/modelDetail.test.ts`, existing Memory_Shift tests (updated, not weakened).
    - `proceduralTextures.ts` holds pure drawing helpers over a minimal 2D-context interface so they are unit-testable with a fake context. `sharedResources.ts` creates the `CanvasTexture` objects.
    - Textures are deterministic and crisp: power-of-two sizes, `NearestFilter` where pixel-art, sRGB colour space, no per-frame redraw. Textures for: arcade attract screen ("LOST MEMORY // PRESS E" pixel art, scanlines, phosphor grid, tintable by `memoryShifted` without breaking the fixed-material rule); arcade marquee (backlit title lettering and border trim); framed 1990s posters (poster-north, poster-arcade-area and the Memory_Shift overlay posters) inside beveled 3D frames; floor carpet or tile pattern; woodgrain (desk, shelves, crates); louvered speaker grilles and control-deck markings.
    - Refine silhouettes: sculpted arcade side panels, recessed screen hood, coin-return glow, desk props (loose tapes, mug, notepad), cushioned armchair and couch with armrests and legs, slatted crates.
    - Document the texture count and size budget (total texture memory estimate at most 8 MB) in `modelDetail.ts` or a comment in `sharedResources.ts`.
    - Acceptance: every texture is disposed in `disposeSharedResources()`; Memory_Shift tinting of the arcade screen and overlays still works; triangle estimate below 20,000 and light count at most 4 asserted; layout colliders unchanged by this task.
    - Tests: `proceduralTextures.test.ts` (determinism with a fake context, power-of-two sizes, no randomness); `modelDetail.test.ts` (each texture disposed exactly once, texture memory estimate at most 8 MB, triangles and lights budgets); updated Memory_Shift tests. Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 15.6.
    - Boundary: render-only; no layout collider changes; no new dependency; no GLB.
    - _Requirements: 1.3, 1.4, 1.8, 9.1, 9.2, 9.8, 12.5, 14.2, 14.4, 14.5, 14.6, 14.7, 19.1_

  - [x] 15.8 Apply M5 polish fixes
    - Files: `src/world/overlay/WebglFallback.tsx`, `src/App.tsx`, one existing test file (add a test line for the `tabIndex`).
    - `.world-wrapper` gets `tabIndex={-1}` in `WebglFallback.tsx`. `src/App.tsx` gets a trailing newline only.
    - Acceptance: the wrapper has `tabIndex=-1` in the fallback; `git diff` for `src/App.tsx` shows only the trailing newline.
    - Tests: add one assertion in an existing test file for the `tabIndex`. Run `npm test`.
    - Depends on: none.
    - Boundary: no behavior change in `App.tsx`.
    - _Requirements: 2.5, 15.1, 16.7_

- [x] 16. Approval-gated proposals (do not implement unless approved)
  - [x] 16.1 NON-IMPLEMENTATION: record pending proposals P2 to P8
    - Files: `.kiro/specs/world-exploration/proposals.md`.
    - List P2 (`reducedDistortion` prop), P3 (styles in `src/styles.css`), P4 (App status text), P5 (`@react-three/drei`), P6 (`docs/THIRD_PARTY_ASSETS.md`), P7 (mark game-foundation tasks), P8 (App locked-arcade message styling) with status "pending", affected files, owner, and the fallback already used. No file outside the spec folder is changed.
    - Acceptance: every proposal has status and fallback; `git diff` shows no change outside the spec folder.
    - Tests: none (documentation).
    - Depends on: 14.
    - Boundary: documentation only; P1 is tracked in `integration-notes.md`.
    - _Requirements: 17.5, 17.6, 17.8, 17.9_

  - [ ]* 16.2 APPROVAL-GATED (P2): add the reducedDistortion prop
    - Files: `src/world/WorldScene.tsx`, `src/world/controller/useReducedMotion.ts`.
    - Only after P2 is approved: declare `reducedDistortion?: boolean` (default false) and pass it to `useReducedMotion`. `App.tsx` is not modified.
    - Acceptance: absent prop behaves as before; true behaves as reduced motion.
    - Tests: `npm run typecheck`, `npm test`.
    - Depends on: 15.5, 16.1.
    - Boundary: P2 is independent of P1.
    - _Requirements: 10.6, 16.12, 17.5, 17.8_

  - [ ]* 16.3 APPROVAL-GATED (P3): move overlay styles into src/styles.css
    - Files: `src/styles.css`, `src/world/overlay/world.css`.
    - Only after P3 is approved: move the overlay rules and remove the world-local CSS import.
    - Acceptance: appearance unchanged; build passes.
    - Tests: `npm run build`; manual visual check.
    - Depends on: 15.5, 16.1.
    - Boundary: touches a file outside `src/world/` only with approval.
    - _Requirements: 17.5, 17.6_

- [x] 17. Final checkpoint - Verify and report
  - Run `npm run typecheck`, `npm test`, `npm run build`.
  - Confirm `git diff` is limited to `src/world/`, `tools/blender/`, `package.json` and the lockfile (test dev dependencies only), and the spec folder; `src/core/`, `src/arcade/`, `src/memories/` and `src/App.tsx` are unchanged.
  - Confirm README and logs describe unmeasured items as planned.
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 14.11, 14.12, 15.6, 17.3, 17.7, 17.9_

### Polish pass: visual and spatial

- [x] 18. Visual and spatial polish pass
  - [x] 18.1 Centralize the vhs Station and add the north-wall focal layout
    - Files: `src/world/layout/roomLayout.ts`, `src/world/layout/roomLayout.test.ts`, `src/world/scene/Lighting.tsx`, `src/world/scene/Stations.tsx`, `src/world/scene/modelDetail.ts` and `src/world/scene/modelDetail.test.ts` (only where they hardcode the old vhs position), `src/world/WorldScene.test.ts` (only if needed), `src/world/scene/Effects.tsx` and its test (only for `crtScreenPlacement()`).
    - Move the `vhs` Station and a wider wooden media console (with a lower VCR shelf) to the central island around x -0.4, z -0.3, facing +Z. The console is a solid collider and the anchor sits on its south (player-facing) face. Remove the old north-wall CRT collider.
    - Keep at least 1.2 m of walkway on all sides of the island.
    - Add two tall metal filing cabinets (solid colliders) flanking a bulletin-board zone on the north wall. Add non-solid details: rug footprint and tape boxes in corners.
    - Move `crt-light` to illuminate the new CRT spot. The light count stays 4. If the CRT screen moves, update `crtScreenPlacement()` in `Effects.tsx` and its test consistently.
    - Acceptance: both Stations are reachable from the start; `vhs` is targetable from in front of the console (range and cone); clearance tests pass; the filing cabinets and the console are in `COLLIDERS`; triangle estimate is below 20,000; light count is at most 4; all existing tests pass.
    - Tests: update `roomLayout.test.ts` (BFS reachability, 1.2 m clearance around the island, collider membership, `selectInteractionTarget` example in front of the console) and `modelDetail.test.ts`. Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 17, 15.7.
    - Boundary: `src/world/` only; `StationId`, `WorldSceneProps` and `onInspect` unchanged; layout stays the single source of truth for collision; no new dependency.
    - _Requirements: 1.2, 1.3, 1.4, 1.7, 6.1, 7.1, 7.2, 7.3, 12.5, 13.8, 14.4, 14.5, 19.1, 20.1_

  - [x] 18.2 Wood bookcases with dense varied books and VHS slipcases
    - Files: `src/world/scene/modelDetail.ts`, `src/world/scene/PartMeshes.tsx`, `src/world/scene/Props.tsx`, `src/world/scene/proceduralTextures.ts`, `src/world/scene/sharedResources.ts`, `src/world/scene/modelDetail.test.ts`, `src/world/scene/proceduralTextures.test.ts`.
    - Build solid wood bookcases for `shelf-a`, `shelf-b` and `shelf-c`: thick side panels, top cornice, solid back panel and 4 wooden shelves using the wood texture.
    - Fill them with dense, deterministic rows of varied books and VHS slipcases using `InstancedMesh` with per-instance colour, varied heights, thicknesses and depths, occasional leaning books (10 to 18 degrees) and horizontal stacks.
    - Add a deterministic spine atlas `CanvasTexture` (title bands and labels), registered in `sharedResources.ts` and disposed.
    - Use a seeded generator only; no `Math.random`. Compute triangle and draw-call numbers with the pure helpers.
    - Acceptance: layout colliders for the shelves are unchanged; output is identical across runs; triangle estimate is below 20,000; light count is at most 4; texture memory estimate is at most 8 MB; the atlas is disposed exactly once.
    - Tests: `modelDetail.test.ts` (triangle and draw-call estimates, budgets, colliders unchanged), `proceduralTextures.test.ts` (atlas determinism with a fake context, power-of-two size, no randomness). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 18.1.
    - Boundary: render-only; no collider changes; no GLB; no new dependency.
    - _Requirements: 1.3, 1.4, 1.8, 12.5, 14.2, 14.4, 14.5, 14.6, 14.7, 19.1_

  - [x] 18.3 Wall, rug, bulletin board, ceiling and corner dressing
    - Files: `src/world/scene/proceduralTextures.ts`, `src/world/scene/sharedResources.ts`, `src/world/scene/Room.tsx`, `src/world/scene/Props.tsx`, `src/world/scene/modelDetail.ts`, `src/world/scene/Lighting.tsx` (only if the warm lamp glow needs an emissive-only mesh; no new light), `src/world/scene/modelDetail.test.ts`, `src/world/scene/proceduralTextures.test.ts`.
    - Add textures: wall panelling or wainscoting, woven rug under the island, and a cork bulletin board on the north wall (pinned index cards, Polaroids, red string, sticky notes).
    - Add filing-cabinet detail (drawer handles, label slots), overhead conduit pipes, a ventilation grille, hanging cable loops, a warm desk-lamp shade with emissive glow (no light) on the south-east desk, and scattered archival tape boxes in corners.
    - Every new texture is registered in `sharedResources.ts` and disposed exactly once; `disposeSharedResources()` is safe to call twice.
    - Acceptance: colliders unchanged by this task; triangle estimate below 20,000; light count at most 4; texture memory estimate at most 8 MB; Memory_Shift tinting still works.
    - Tests: `proceduralTextures.test.ts` (determinism, power-of-two sizes), `modelDetail.test.ts` (disposal once and twice-safe, budgets). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 18.1, 18.2 (shares scene files, so it runs after 18.2).
    - Boundary: render-only; no collider changes; no new dependency; no GLB.
    - _Requirements: 1.3, 1.4, 1.8, 9.1, 9.2, 9.8, 12.5, 14.2, 14.4, 14.5, 14.6, 14.7, 19.1_

  - [x] 18.4 Update computed metrics and run verification
    - Files: `src/world/README.md`, `.kiro/specs/world-exploration/performance-log.md`, `.kiro/specs/world-exploration/integration-notes.md`, `.kiro/specs/world-exploration/test-report.md` (only where counts changed).
    - Re-run `npm run typecheck`, `npm test` and `npm run build`. Record computed triangles (below 20,000), lights (at most 4) and texture memory (at most 8 MB).
    - Label every number "computed, not runtime-measured". Make no browser or frame-rate claims.
    - Acceptance: documents match the final layout and test counts; all text in English; no unmeasured claim.
    - Tests: `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 18.2, 18.3.
    - Boundary: documentation and the spec folder only.
    - _Requirements: 14.11, 14.12, 15.3, 15.6_

### Refinement pass: spatial and visual

- [x] 19. Spatial and visual refinement pass
  - [x] 19.1 Re-center the island, move the desk and rebalance lighting
    - Files: `src/world/layout/roomLayout.ts`, `src/world/layout/roomLayout.test.ts`, `src/world/scene/Lighting.tsx`, `src/world/scene/Props.tsx`, `src/world/scene/Stations.tsx`, `src/world/scene/Effects.tsx`, `src/world/scene/modelDetail.ts`, `src/world/scene/modelDetail.test.ts`, `src/world/scene/assetIntegration.test.ts`; `src/world/WorldScene*.test.ts` only where they hardcode old coordinates.
    - Center the media island (about x -0.9..0.9, z -0.6..0) with the `vhs` anchor at (0, 0) facing +Z. Move `crt-light` to (0, 1.6, 0.9) and update `crtScreenPlacement()` in `Effects.tsx` consistently. Move the reception desk, tape stack and desk lamp to a dedicated south-east position. Move the second point light over the west bookcase and lounge zone (about (-2.5, 2.3, 0.4), warm tungsten). Light count stays 4 (1 ambient + 3 point).
    - Acceptance: at least 2.2 m of unobstructed floor in front (+Z) of the CRT; at least 1.2 m of walkway around every solid collider; spawn (0, 3) clear; both Stations reachable from the start and `vhs` targetable in front of the console; triangle estimate below 20,000; all existing tests pass.
    - Tests: `roomLayout.test.ts` (new desk placement, spawn clearance, 2.2 m front clearance, 1.2 m walkways around every solid collider, BFS reachability of both Stations); `modelDetail.test.ts` (west light position, light count of 4, colliders match layout); update hardcoded coordinates in `assetIntegration.test.ts` and `WorldScene*.test.ts` where needed. Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 18.4.
    - Boundary: `src/world/` only; `StationId`, `WorldSceneProps` and `onInspect` unchanged; layout stays the single source of truth for collision; no new dependency; no GLB.
    - _Requirements: 1.2, 1.3, 1.4, 1.7, 6.1, 7.1, 7.2, 7.3, 12.5, 13.8, 14.4, 14.5, 19.1, 20.1_

  - [x] 19.2 Texture headroom and visual craftsmanship upgrade
    - Files: `src/world/scene/proceduralTextures.ts`, `src/world/scene/sharedResources.ts`, `src/world/scene/modelDetail.ts`, `src/world/scene/Stations.tsx`, `src/world/scene/Props.tsx`, `src/world/scene/shelfModel.ts`, `src/world/scene/proceduralTextures.test.ts`, `src/world/scene/modelDetail.test.ts`.
    - Shrink `wallPanel` from 512x512 to 256x256 and adjust repeat counts so panel proportions stay the same.
    - Add an SMPTE colour-bar texture for the reference monitor, a glowing green LED timecode window and a metallic tape slot on the VCR, routed coaxial and power cables behind the console, and an "OUT OF ORDER" dark glass decal on the companion cabinet screen.
    - Scale UVs to board length on long boards so wood grain tiles instead of stretching.
    - Acceptance: triangle estimate below 20,000; texture memory at most 8 MB (expected about 6.5 MB, computed); every new texture registered in `sharedResources.ts` and disposed exactly once; textures deterministic; Memory_Shift tinting still works; colliders unchanged by this task; light count at most 4.
    - Tests: `proceduralTextures.test.ts` (determinism with a fake context, power-of-two sizes, no randomness, `wallPanel` is 256x256); `modelDetail.test.ts` (texture memory estimate, disposal once and twice-safe, triangle and light budgets, UV scaling of long boards). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 19.1.
    - Boundary: render-only; no collider changes; no new dependency; no GLB; `ASSET_MANIFEST` stays empty.
    - _Requirements: 1.3, 1.4, 1.8, 9.1, 9.2, 9.8, 12.5, 14.2, 14.4, 14.5, 14.6, 14.7, 19.1_

  - [x] 19.3 Update computed metrics and run verification
    - Files: `src/world/README.md`, `.kiro/specs/world-exploration/performance-log.md`, `.kiro/specs/world-exploration/integration-notes.md`, `.kiro/specs/world-exploration/test-report.md` (each only where counts changed).
    - Re-run `npm run typecheck`, `npm test` and `npm run build`. Record computed triangles (below 20,000), lights (at most 4) and texture memory (at most 8 MB). Label every number "computed, not runtime-measured". Make no browser or frame-rate claims.
    - Acceptance: documents match the final layout and test counts; all text in English; no unmeasured claim.
    - Tests: `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 19.2.
    - Boundary: documentation and the spec folder only.
    - _Requirements: 14.11, 14.12, 15.3, 15.6_

### Three arcade cabinets

- [x] 20. Three dedicated arcade cabinets
  - [x] 20.1 Three-cabinet layout, geometry and lighting
    - Files: `src/world/layout/roomLayout.ts`, `src/world/worldTypes.ts`, `src/world/scene/Lighting.tsx`, `src/world/scene/Stations.tsx`, `src/world/scene/modelDetail.ts`, `src/world/scene/Props.tsx`, `src/world/assets/assetPlacement.ts` (only if needed); tests `src/world/layout/roomLayout.test.ts`, `src/world/scene/modelDetail.test.ts`, `src/world/scene/assetIntegration.test.ts`, and `src/world/WorldScene*.test.ts` only where they hardcode the old arcade.
    - Replace the single arcade cabinet and the companion cabinet with three solid cabinet colliders on the east wall: SNAKE.EXE (z -1.7..-0.7), LAST EXIT (z -0.5..0.5), DEAD FREQUENCY (z 0.7..1.7). Move or drop the CRT stack only if it conflicts.
    - Add three arcade `StationDef`s (id `'arcade'`, optional `arcadeGame: 'snake' | 'maze' | 'frequency'`, facing -X, anchors (8.4, -1.2), (8.4, 0), (8.4, 1.2)). All three call `onInspect('arcade')`.
    - High-craft geometry: recessed tilted CRT bezel, speaker grille bar, angled control deck with dual ball-top joysticks and concave buttons, dual glowing 25c coin-return slots, coloured side T-molding.
    - Move or aim the arcade light so it lights all three cabinets evenly. Light count stays at most 4.
    - Acceptance: at least 1.2 m lanes from both doorways to every anchor; every anchor reachable from the start through BFS; the nearest cabinet is targeted from in front of each one; triangle estimate below 20,000; lights at most 4; the arcade prompt text is unchanged; all existing tests pass.
    - Tests: `roomLayout.test.ts` (three colliders, anchors, 1.2 m lanes, BFS reachability, nearest-cabinet targeting), `modelDetail.test.ts` (colliders match layout, triangle and light budgets). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 19.3.
    - Boundary: `src/world/` only; `StationId`, `WorldSceneProps` and `onInspect` unchanged; layout stays the single source of truth for collision; no new dependency; no GLB.
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.7, 6.1, 7.1, 7.2, 7.3, 12.5, 13.8, 14.4, 14.5, 19.1, 20.1_

  - [x] 20.2 Attract screen and marquee textures
    - Files: `src/world/scene/proceduralTextures.ts`, `src/world/scene/sharedResources.ts`, `src/world/scene/memoryShift.ts`, `src/world/scene/MemoryShiftDriver.tsx` (only if the shift tint must cover three screens), `src/world/scene/proceduralTextures.test.ts`, `src/world/scene/modelDetail.test.ts`, existing Memory_Shift tests (updated, not weakened).
    - Create three 256x256 attract screens and three 256x64 marquees (one per game: SNAKE.EXE, LAST EXIT, DEAD FREQUENCY). Textures are deterministic and drawn once.
    - Remove or replace the old `arcadeScreen`, `marquee` and `outOfOrder` textures. Each new texture is registered in `sharedResources.ts` and disposed exactly once; `disposeSharedResources()` is safe to call twice. Provide a flat-colour fallback if a texture is unavailable.
    - `memoryShift` tints all three screens.
    - Acceptance: texture memory estimate at most 8 MB; triangle estimate below 20,000; lights at most 4; colliders unchanged by this task.
    - Tests: `proceduralTextures.test.ts` (determinism with a fake context, power-of-two sizes, no randomness, sizes 256x256 and 256x64), `modelDetail.test.ts` (disposal once and twice-safe, texture memory budget), Memory_Shift tint test for all three screens. Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 20.1.
    - Boundary: render-only; no collider changes; no new dependency; no GLB; `ASSET_MANIFEST` stays empty.
    - _Requirements: 1.3, 1.4, 1.8, 9.1, 9.2, 9.8, 12.5, 14.2, 14.4, 14.5, 14.6, 14.7, 19.1_

  - [x] 20.3 Docs, metrics and verification
    - Files: `src/world/README.md`, `.kiro/specs/world-exploration/performance-log.md`, `.kiro/specs/world-exploration/integration-notes.md`, `.kiro/specs/world-exploration/test-report.md` (each only where counts changed).
    - Re-run `npm run typecheck`, `npm test` and `npm run build`. Record computed triangles, lights and texture memory, and the targeting benchmark output, each labelled "computed, not runtime-measured". Runtime fields stay "not measured" unless a real measurement is recorded. Task 15.4 stays open.
    - Document that all three cabinets currently open the same App arcade panel because `App.tsx` and `src/arcade/` are unchanged.
    - Acceptance: documents match the final layout and test counts; all text in English; no unmeasured claim.
    - Tests: `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 20.2.
    - Boundary: documentation and the spec folder only.
    - _Requirements: 14.11, 14.12, 15.3, 15.6_

### Couch and CRT craftsmanship

- [x] 21. Couch fix and CRT craftsmanship
  - [x] 21.1 Couch geometry fix and upholstery texture
    - Files: `src/world/scene/modelDetail.ts` (`couchParts`), `src/world/scene/Props.tsx`, `src/world/scene/proceduralTextures.ts`, `src/world/scene/sharedResources.ts`, `src/world/scene/memoryShift.ts`, `src/world/scene/modelDetail.test.ts`, `src/world/scene/proceduralTextures.test.ts`, and the Memory_Shift test file (updated, not weakened).
    - Place the pillow in the seat corner against the armrest and the backrest with zero intersection. Remove the middle-cushion z-fighting by eliminating coplanar overlapping faces. Add a `couchFabric` 256x256 `CanvasTexture` with corduroy/velvet ribbing, stitched seams and edge shading, registered in `sharedResources.ts`, with a flat-colour fallback. `memoryShift` tints the couch material over t = 0..1.
    - Acceptance: pillow has zero intersection with the armrest, backrest and seat cushions; no two couch parts have coplanar overlapping faces; triangle estimate below 20,000 (net-negative or near zero change from 19,152); lights at most 4; texture memory at most 8 MB; colliders unchanged; `couchFabric` disposed exactly once.
    - Tests: `modelDetail.test.ts` (oriented-box overlap test for the pillow against every couch part, coplanar-face test, triangle and light budgets, colliders unchanged, disposal once and twice-safe); `proceduralTextures.test.ts` (determinism with a fake context, 256x256, no randomness); Memory_Shift tint test at t = 0, 0.5 and 1. Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 20.3.
    - Boundary: render-only; `src/world/` only; no new dependency; no GLB; `ASSET_MANIFEST` stays empty.
    - _Requirements: 1.3, 1.4, 1.8, 9.1, 9.2, 9.8, 12.5, 14.2, 14.4, 14.5, 14.6, 14.7, 19.1_

  - [x] 21.2 CRT casing texture and glass screen
    - Files: `src/world/scene/modelDetail.ts`, `src/world/scene/Stations.tsx`, `src/world/scene/Effects.tsx`, `src/world/scene/proceduralTextures.ts`, `src/world/scene/sharedResources.ts`, `src/world/scene/memoryShift.ts`, `src/world/scene/modelDetail.test.ts`, `src/world/scene/proceduralTextures.test.ts`, and the Memory_Shift and Effects test files (updated, not weakened).
    - Add a `crtCasing` 256x256 texture: charcoal/warm-slate molded plastic with grain, vent louvers, bezel seams, dial markings, a red power LED dot and the generic badge "KV-1996" (no real trademark). Add a CRT glass screen texture with scanlines, corner vignette and phosphor grain. Keep the shared `crtScreen` material, the `crt-light` and the `crtScreenPlacement()` contract in `Effects.tsx` unchanged. Textures are registered in `sharedResources.ts` with flat-colour fallbacks. `memoryShift` tints the new materials over t = 0..1.
    - Acceptance: triangle estimate below 20,000 (near zero or net-negative change); lights at most 4; texture memory at most 8 MB; colliders and Station anchors unchanged; new textures disposed exactly once; static-noise effect still targets the CRT screen only.
    - Tests: `proceduralTextures.test.ts` (determinism, 256x256, no randomness, badge text is "KV-1996"); `modelDetail.test.ts` (disposal once and twice-safe, budgets, shared `crtScreen` material still used, colliders unchanged); Effects test for `crtScreenPlacement()`; Memory_Shift tint test at t = 0, 0.5 and 1. Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 21.1.
    - Boundary: render-only; `src/world/` only; no new dependency; no GLB; `ASSET_MANIFEST` stays empty.
    - _Requirements: 1.3, 1.4, 1.8, 9.1, 9.2, 9.8, 10.1, 12.5, 14.2, 14.4, 14.5, 14.6, 14.7, 19.1_

  - [x] 21.3 Docs, metrics and verification
    - Files: `src/world/README.md`, `.kiro/specs/world-exploration/performance-log.md`, `.kiro/specs/world-exploration/integration-notes.md`, `.kiro/specs/world-exploration/test-report.md` (each only where counts changed).
    - Re-run `npm run typecheck`, `npm test` and `npm run build`. Record computed triangles, lights and texture memory, each labelled "computed, not runtime-measured". Runtime fields stay "not measured". Task 15.4 stays open.
    - Acceptance: documents match the final geometry and test counts; all text in English; no unmeasured claim.
    - Tests: `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 21.2.
    - Boundary: documentation and the spec folder only.
    - _Requirements: 14.11, 14.12, 15.3, 15.6_

### Cohesive prop textures

- [x] 22. Cohesive prop texture upgrade
  - [x] 22.1 Texture headroom, media island, armchair and VHS shells
    - Files: `src/world/scene/proceduralTextures.ts`, `src/world/scene/sharedResources.ts`, `src/world/scene/memoryShift.ts`, `src/world/scene/modelDetail.ts`, `src/world/scene/Stations.tsx`, `src/world/scene/Props.tsx`, `src/world/scene/proceduralTextures.test.ts`, `src/world/scene/modelDetail.test.ts`, and the Memory_Shift test file (updated, not weakened).
    - Shrink `corkBoard` from 512x512 to 256x256 and scale its pinned items by k = w/512 so proportions stay the same.
    - Apply the `crtCasing` look to the reference monitor casing.
    - Add a `vcrDeck` 256x128 texture: brushed dark metal, vents, PLAY / STOP / REW / EJECT markings and a "HI-FI STEREO" label.
    - Apply `couchFabric` to the armchair with metric fabric UVs and a slate/teal hue; `memoryShift` tints it over t = 0..1 with t = 0 exact.
    - Add a `vhsShell` 128x128 texture: ribbed shell, two reels, dust-flap seam, "TAPE 001" and "ARCHIVE" labels. Apply it to the `tape`, `tapeBlue` and tape-stack parts.
    - Every new texture is registered in `sharedResources.ts` with a flat-colour fallback and disposed exactly once.
    - Acceptance: triangle estimate below 20,000 (near-zero geometry change from 19,128 computed); lights at most 4; texture memory at most 8 MB (target at most 7.7 MB, computed); colliders and Station anchors unchanged; `ASSET_MANIFEST` empty.
    - Tests: `proceduralTextures.test.ts` (determinism with a fake context, power-of-two sizes, no randomness, `corkBoard` 256x256, `vcrDeck` 256x128, `vhsShell` 128x128); `modelDetail.test.ts` (disposal once and twice-safe, texture memory budget, triangle and light budgets, colliders unchanged); Memory_Shift tint test for armchair and casing at t = 0, 0.5 and 1. Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 21.3.
    - Boundary: render-only; `src/world/` only; no new dependency; no GLB; no real trademarks.
    - _Requirements: 1.3, 1.4, 1.8, 9.1, 9.2, 9.8, 12.5, 14.2, 14.4, 14.5, 14.6, 14.7, 19.1_

  - [x] 22.2 Filing cabinets, boxes, crates, desk clutter and doors
    - Files: `src/world/scene/proceduralTextures.ts`, `src/world/scene/sharedResources.ts`, `src/world/scene/modelDetail.ts`, `src/world/scene/Props.tsx`, `src/world/scene/Room.tsx`, `src/world/scene/proceduralTextures.test.ts`, `src/world/scene/modelDetail.test.ts`.
    - Add a `metalCabinet` 256x256 texture: painted steel grain, drawer seams, chrome label frames, index cards dated 1994-1996, "TAPES 01-40" and "CASE LOGS" labels. Apply it to the filing cabinets.
    - Upgrade `crate` to 256x256: corrugated cardboard, packing tape, shipping label and an "ARCHIVE // HANDLE WITH CARE" stencil. Apply it to archive boxes and crates.
    - Add notebook (ruled edges, cover grain) and mug (rim shading) detail on the desk.
    - Add recessed door-panel and kickplate detail on the two east doors, without changing door openings or colliders.
    - Every new or upgraded texture is registered in `sharedResources.ts` with a flat-colour fallback and disposed exactly once.
    - Acceptance: triangle estimate below 20,000; lights at most 4; texture memory at most 8 MB (target at most 7.7 MB, computed); colliders, doorway openings and Station anchors unchanged; Memory_Shift tinting still works.
    - Tests: `proceduralTextures.test.ts` (determinism, power-of-two sizes, no randomness, `metalCabinet` and `crate` 256x256); `modelDetail.test.ts` (disposal once and twice-safe, budgets, colliders unchanged, both doors still reachable). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 22.1.
    - Boundary: render-only; `src/world/` only; no new dependency; no GLB; no real trademarks.
    - _Requirements: 1.3, 1.4, 1.5, 1.8, 9.1, 9.2, 9.8, 12.5, 14.2, 14.4, 14.5, 14.6, 14.7, 19.1_

  - [x] 22.3 Docs, metrics and verification
    - Files: `src/world/README.md`, `.kiro/specs/world-exploration/performance-log.md`, `.kiro/specs/world-exploration/integration-notes.md`, `.kiro/specs/world-exploration/test-report.md` (each only where counts changed).
    - Re-run `npm run typecheck`, `npm test` and `npm run build`. Record computed triangles, lights and texture memory, each labelled "computed, not runtime-measured". Runtime fields stay "not measured". Task 15.4 stays open.
    - Acceptance: documents match the final geometry and test counts; all text in English; no unmeasured claim.
    - Tests: `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 22.2.
    - Boundary: documentation and the spec folder only.
    - _Requirements: 14.11, 14.12, 15.3, 15.6_

### Interactive desk lamps and arcade manuals

- [x] 23. Interactive desk lamps and arcade manuals
  - [x] 23.1 Lamp glow upgrade and second desk lamp
    - Files: `src/world/scene/proceduralTextures.ts`, `src/world/scene/modelDetail.ts`, `src/world/scene/Props.tsx`, `src/world/scene/sharedResources.ts`, `src/world/layout/roomLayout.ts`, `src/world/scene/proceduralTextures.test.ts`, `src/world/scene/modelDetail.test.ts`, `src/world/layout/roomLayout.test.ts`.
    - Upgrade `lampGlow` in place to 128x128 with a multi-stop warm radial falloff, a filament core and no hard edge. Add `desk-lamp-left` (green-shaded banker's lamp) and `desk-lamp-right` (cream-shaded table lamp) to the layout as non-solid visual props on the reception desk, replacing the single existing lamp. Each lamp has a bulb core, inner shade glow, a glow sprite and a desk light-pool decal. An `on` flag per lamp drives lit versus unlit materials. No new light is added.
    - Acceptance: both lamps render lit and unlit; new geometry at most +120 triangles; triangle estimate below 20,000; lights at most 4 (`M3_LIGHT_COUNT` stays 4); texture memory at most 8 MB; `lampGlow` disposed exactly once; colliders unchanged; Memory_Shift tinting still works.
    - Tests: `proceduralTextures.test.ts` (determinism with a fake context, 128x128, no randomness); `modelDetail.test.ts` (lit and unlit materials, budgets, disposal once and twice-safe, colliders unchanged); `roomLayout.test.ts` (both lamps present and non-solid, spawn and walkways unchanged). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 22.3.
    - Boundary: render and layout data only; `src/world/` only; no new dependency; no GLB.
    - _Requirements: 1.3, 1.4, 1.8, 9.1, 9.2, 9.8, 12.5, 14.2, 14.4, 14.5, 14.6, 14.7, 19.1_

  - [x] 23.2 Interactable props: lamps and manuals
    - Files: `src/world/worldTypes.ts`, `src/world/layout/roomLayout.ts`, `src/world/logic/targeting.ts`, `src/world/logic/inputMode.ts`, `src/world/controller/useWorldInput.ts`, `src/world/controller/usePlayerRig.ts`, `src/world/WorldScene.tsx`, `src/world/overlay/InteractionPrompt.tsx`, new `src/world/overlay/WorldMessage.tsx`, `src/world/scene/Props.tsx`, `src/world/scene/shelfModel.ts` or `src/world/scene/modelDetail.ts`; tests `src/world/logic/targeting.test.ts`, the `inputMode` tests, `src/world/scene/modelDetail.test.ts`, `src/world/WorldScene.test.ts`.
    - Add a world-local `PropDef` type (not `StationId`) for two lamps and three manual books. Targeting uses range 2.2 m and the existing cone and line-of-sight rules, and returns either a Station or a prop; the nearest eligible target wins and Stations keep working. Each prop has prompt text per prop and state (for example lamp on versus off).
    - E on a lamp toggles its session-only `on` state (React or ref state in the world, never persisted, never GameState). E on a manual shows its message in `WorldMessage.tsx`, a `role="status"` line inside the world wrapper near the prompt that never covers the App HUD status line. Prop activation never calls `onInspect` and never enters `inspecting` or suspends input; the E repeat guard applies.
    - Place three manual books at x about -4.2, y 1.1..1.4 on the west bookcase, with the exact message texts approved by the user (supplied with the task prompt; not defined in this plan, and no text is invented). The messages are in-world lore and do not claim that LAST EXIT or DEAD FREQUENCY gameplay exists.
    - Acceptance: E on a prop does not call `onInspect` and does not change the mode; E at a Station still calls `onInspect` with the same `StationId`; `StationId` stays `'vhs' | 'arcade'`; lamp state resets on reload; manuals are reachable and targetable within 2.2 m; triangle estimate below 20,000; lights at most 4; shared contracts and `src/App.tsx` unchanged.
    - Tests: `targeting.test.ts` (prop in range, at the 2.2 m boundary, nearest of Station and prop, line of sight); `inputMode` tests (prop activation emits no `CALL_ON_INSPECT` and keeps the mode); `modelDetail.test.ts` (manual book positions, budgets); `WorldScene.test.ts` (lamp toggle changes prompt text, manual shows the message, `onInspect` not called for props, Station E unchanged). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 23.1.
    - Boundary: `src/world/` only; `WorldSceneProps` and `onInspect` unchanged; no storage access; no import from `src/arcade/` or `src/memories/`.
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6, 7.7, 8.1, 8.6, 11.14, 16.6, 16.7, 16.8, 16.9, 20.1, 20.2, 20.8_

  - [x] 23.3 Docs, metrics and verification
    - Files: `src/world/README.md`, `.kiro/specs/world-exploration/performance-log.md`, `.kiro/specs/world-exploration/integration-notes.md`, `.kiro/specs/world-exploration/test-report.md` (each only where counts changed).
    - Re-run `npm run typecheck`, `npm test` and `npm run build`. Record computed triangles, lights and texture memory, each labelled "computed, not runtime-measured". Document the world-owned message line, that lamp state is session-only, and that the manuals are in-world lore for unimplemented gameplay. Runtime fields stay "not measured". Task 15.4 stays open.
    - Acceptance: documents match the final geometry and test counts; all text in English; no unmeasured claim.
    - Tests: `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 23.2.
    - Boundary: documentation and the spec folder only.
    - _Requirements: 14.11, 14.12, 15.3, 15.6_

### Dramatic lighting and clue inspector

- [x] 24. Dramatic lighting and clue inspector
  - [x] 24.1 Lamp cones, pools, emissive shades, room light coupling and ceiling bloom
    - Files: `src/world/scene/proceduralTextures.ts`, `src/world/scene/modelDetail.ts`, `src/world/scene/Props.tsx`, `src/world/scene/Lighting.tsx`, `src/world/scene/Room.tsx`, `src/world/scene/sharedResources.ts`, `src/world/scene/MemoryShiftDriver.tsx` or `src/world/scene/Effects.tsx` (wherever light intensities are written), `src/world/WorldScene.tsx`, and the matching tests (`proceduralTextures.test.ts`, `modelDetail.test.ts`, Memory_Shift tests updated, not weakened).
    - Add additive volumetric cones and additive desk pools for each lamp, driven by its session-only `on` state, with emissive shades. Upgrade `lampGlow` in place. Add additive bloom strips to the ceiling fixtures. Couple west-light and ambient intensity to the number of lamps ON as a multiplier applied on top of the Memory_Shift and flicker values, never overwriting them, with the ambient floor kept.
    - Acceptance: no new three.js light (`M3_LIGHT_COUNT` stays 4); lights at most 4; new geometry at most +100 triangles and the estimate stays below 20,000; texture memory at most 8 MB; changed textures disposed exactly once (twice-safe); colliders and Station anchors unchanged; Memory_Shift tinting and reduced motion still work; ambient never drops below the floor.
    - Tests: `modelDetail.test.ts` (budgets, lamp-count multiplier values including 0, 1 and 2 lamps, floor kept, multiplier composes with Memory_Shift and flicker), `proceduralTextures.test.ts` (determinism with a fake context, power-of-two sizes, no randomness). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 23.3.
    - Boundary: render-only; `src/world/` only; no new dependency; no GLB; `ASSET_MANIFEST` stays empty.
    - _Requirements: 1.3, 1.4, 1.8, 9.1, 9.2, 9.8, 10.2, 10.3, 10.7, 12.5, 14.2, 14.4, 14.5, 14.6, 14.7, 19.1_

  - [x] 24.2 Clue inspector card, new readable props and notes counter
    - Files: `src/world/logic/propState.ts`, `src/world/layout/roomLayout.ts`, `src/world/logic/targeting.ts`, `src/world/worldTypes.ts`, `src/world/logic/inputMode.ts` (only if needed), `src/world/controller/useWorldInput.ts`, `src/world/controller/usePlayerRig.ts`, `src/world/WorldScene.tsx`, new `src/world/overlay/WorldInspectorCard.tsx`, `src/world/overlay/WorldOverlay.tsx`, `src/world/overlay/world.css`; tests `src/world/logic/targeting.test.ts`, `src/world/logic/propState.test.ts`, `src/world/WorldScene.test.ts`, `src/world/scene/modelDetail.test.ts`.
    - Add the desk notebook, the cork board and the "THE SIGNAL REMEMBERS" poster as world-local readable props (eight world interactables in total with the two lamps and three manuals). The poster is targetable only while visible when it is the Memory_Shift overlay poster. E on a readable prop opens `WorldInspectorCard` (Archive Document Card) with original placeholder lore text for review by the story owner (Developer 3). The card is non-blocking: no `onInspect`, no input suspension, no pointer-lock change. It closes on E, Esc or when the player walks more than 2.6 m away. Add a session-only "NOTES READ: X / 6" counter (unique readable props read; no storage, not GameState, resets on reload).
    - Acceptance: `StationId` stays `'vhs' | 'arcade'`; E on a prop never calls `onInspect` and never changes the input mode; E at a Station is unchanged; the card is reachable by keyboard and has `role` and accessible label; the counter increments once per unique prop; no storage access; triangle estimate below 20,000; lights at most 4; `src/App.tsx` and shared contracts unchanged.
    - Tests: `targeting.test.ts` (new props in range, boundary, nearest wins, hidden poster not targetable), `propState.test.ts` (counter uniqueness, card open and close transitions, 2.6 m auto-close), `WorldScene.test.ts` (card opens and closes on E, Esc and distance; `onInspect` not called; Station E unchanged; counter text), `modelDetail.test.ts` (prop positions, budgets). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 24.1.
    - Boundary: `src/world/` only; `WorldSceneProps` and `onInspect` unchanged; no import from `src/arcade/` or `src/memories/`; the import-boundary test still passes.
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6, 7.7, 8.1, 8.6, 9.3, 11.14, 15.1, 15.2, 15.4, 16.6, 16.7, 16.8, 16.9, 20.1, 20.2, 20.8_

  - [x] 24.3 Docs, metrics and verification
    - Files: `src/world/README.md`, `.kiro/specs/world-exploration/performance-log.md`, `.kiro/specs/world-exploration/integration-notes.md`, `.kiro/specs/world-exploration/test-report.md` (each only where counts changed).
    - Re-run `npm run typecheck`, `npm test` and `npm run build`. Record computed triangles, lights and texture memory, each labelled "computed, not runtime-measured". Document the Archive Document Card, the session-only notes counter, the lamp-count light coupling, and that the lore texts are placeholders pending Developer 3 review. Runtime fields stay "not measured". Task 15.4 stays open.
    - Acceptance: documents match the final geometry and test counts; all text in English; no unmeasured claim.
    - Tests: `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 24.2.
    - Boundary: documentation and the spec folder only.
    - _Requirements: 14.11, 14.12, 15.3, 15.6_

### Lamp craft, arcade glow and final polish

- [x] 25. Lamp craft, arcade glow and final polish
  - [x] 25.1 Notebook targeting fix, banker's lamp craft, soft cones and richer pools
    - Files: `src/world/layout/roomLayout.ts`, `src/world/scene/modelDetail.ts`, `src/world/scene/Props.tsx`, `src/world/scene/proceduralTextures.ts`, `src/world/scene/sharedResources.ts`; tests `src/world/logic/targeting.test.ts`, `src/world/scene/modelDetail.test.ts`, `src/world/scene/proceduralTextures.test.ts`.
    - Move `desk-notebook` to about anchor (-0.58, 1.62). Add banker's lamp brass end caps (+16 triangles) and a warm inner liner. Set the ON green shade emissive to `#16a34a` at 0.38 and desk pool opacity to about 0.42. Add a 64x64 `coneFalloff` `CanvasTexture` (0.016 MB) for soft lamp cones, registered in `sharedResources.ts` with a flat-colour fallback and disposed exactly once.
    - Acceptance: standing in front of the left lamp targets the lamp, not the notebook; the notebook is still targetable from its own position; triangle estimate below 20,000; lights at most 4; texture memory at most 8 MB; colliders and Station anchors unchanged; Memory_Shift tinting still works.
    - Tests: `targeting.test.ts` (left lamp wins from its front position, notebook reachable), `modelDetail.test.ts` (brass caps triangle delta, emissive value, pool opacity, budgets, disposal once and twice-safe), `proceduralTextures.test.ts` (determinism with a fake context, 64x64, no randomness). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 24.3.
    - Boundary: `src/world/` only; no new dependency; no GLB; `ASSET_MANIFEST` stays empty; `StationId` and `onInspect` unchanged.
    - _Requirements: 1.3, 1.4, 1.8, 7.1, 7.2, 7.3, 9.1, 9.2, 9.8, 12.5, 14.2, 14.4, 14.5, 14.6, 14.7, 19.1_

  - [x] 25.2 Arcade floor glow and Club Archive Notice
    - Files: `src/world/scene/modelDetail.ts`, `src/world/scene/Props.tsx`, `src/world/layout/roomLayout.ts`, `src/world/overlay/archiveDocuments.ts`, `src/world/overlay/NotesCounter.tsx`, `src/world/logic/propState.ts` (only if the count is defined there); tests `src/world/logic/targeting.test.ts`, `src/world/overlay/archiveDocuments.test.ts`, `src/world/scene/modelDetail.test.ts`, `src/world/WorldScene.test.ts`, `src/world/logic/propState.test.ts`.
    - Add three additive floor-glow decals in front of the arcade cabinets reusing `lampGlow` (+6 triangles, no new light). Make the arcade room ARCHIVE poster the 7th readable document with prompt "Press E to read: Club Archive Notice" and anchor at the poster's real position. The counter reads "NOTES READ: X / 7".
    - Acceptance: the poster is targetable within range and cone; E opens the card without calling `onInspect` or changing the input mode; the counter increments once per unique document and shows "/ 7"; triangle estimate below 20,000; lights at most 4; texture memory unchanged; colliders unchanged; `StationId` stays `'vhs' | 'arcade'`.
    - Tests: `targeting.test.ts` (poster in range, boundary), `archiveDocuments.test.ts` (7 documents, new title and prompt), `propState.test.ts` (counter of 7, uniqueness), `modelDetail.test.ts` (decal triangle delta, no new light, budgets), `WorldScene.test.ts` (card opens, counter text, `onInspect` not called). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 25.1.
    - Boundary: `src/world/` only; `WorldSceneProps` and `onInspect` unchanged; no storage access; no import from `src/arcade/` or `src/memories/`.
    - _Requirements: 1.3, 1.4, 7.1, 7.2, 7.3, 7.5, 7.6, 7.7, 8.1, 8.6, 9.8, 14.4, 14.5, 15.1, 15.2, 15.4, 16.6, 16.7, 16.8, 16.9, 20.1, 20.2, 20.8_

  - [x] 25.3 Docs, metrics, verification and PR summary
    - Files: `src/world/README.md`, `.kiro/specs/world-exploration/performance-log.md`, `.kiro/specs/world-exploration/integration-notes.md`, `.kiro/specs/world-exploration/test-report.md` (each only where counts changed).
    - Re-run `npm run typecheck`, `npm test` and `npm run build`. Record computed triangles, lights and texture memory, each labelled "computed, not runtime-measured", and write a short PR summary. Runtime fields stay "not measured". Task 15.4 stays open.
    - Acceptance: documents match the final geometry, the "X / 7" counter and test counts; all text in English; no unmeasured claim.
    - Tests: `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 25.2.
    - Boundary: documentation and the spec folder only.
    - _Requirements: 14.11, 14.12, 15.3, 15.6_

### Texture craft and mid-tone lighting

- [x] 26. Texture craft and mid-tone lighting
  - [x] 26.1 Anisotropic filtering and procedural texture detail
    - Files: `src/world/scene/sharedResources.ts`, `src/world/scene/proceduralTextures.ts`, `src/world/scene/modelDetail.ts`; tests `src/world/scene/proceduralTextures.test.ts`, `src/world/scene/modelDetail.test.ts`.
    - Set anisotropy 4 on every procedural `CanvasTexture` (central helper in `sharedResources.ts`). Redraw texture detail in place (texture count stays 31). At most one small-prop texture may grow from 128x128 to 256x256, with the texture memory estimate updated.
    - Acceptance: every texture has anisotropy 4; texture count is 31; triangle estimate at most 19,200; lights at most 4; texture memory at most 7.85 MB (computed); textures stay deterministic and power-of-two; each texture disposed exactly once (twice-safe); colliders and Station anchors unchanged; Memory_Shift tinting still works.
    - Tests: `proceduralTextures.test.ts` (determinism with a fake context, power-of-two sizes, no randomness, at most one 128 to 256 change); `modelDetail.test.ts` (anisotropy on all textures, count 31, memory and triangle budgets, light count, disposal once and twice-safe). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 25.3.
    - Boundary: render-only; `src/world/` only; no new dependency; no GLB; `ASSET_MANIFEST` stays empty.
    - _Requirements: 1.3, 1.4, 1.8, 9.8, 12.5, 14.2, 14.4, 14.5, 14.6, 14.7, 19.1_

  - [x] 26.2 Mid-tone lighting balance
    - Files: `src/world/logic/palette.ts`, `src/world/scene/Lighting.tsx`, `src/world/scene/WorldCanvas.tsx` or `src/world/WorldScene.tsx` (exposure, only if configured), `src/world/scene/memoryShift.ts`, `src/world/logic/lampCoupling.ts` (if needed); tests `palette.test.ts`, `palette.full.test.ts`, `memoryShift.test.ts`, `lampCoupling.test.ts`, `src/world/scene/modelDetail.test.ts`.
    - Tune normal-state lighting to a mid-tone balance: ambient about 0.52 to 0.58 with both lamps on. Keep the 0.35 ambient floor and the lamp-coupling ratios. Memory_Shift, flicker and reduced motion are unchanged; `M3_LIGHT_COUNT` stays 4.
    - Acceptance: ambient with both lamps on is within 0.52 to 0.58; ambient never drops below 0.35 in any state; coupling ratios are unchanged; the multiplier still composes on top of Memory_Shift and flicker; lights at most 4; colliders unchanged.
    - Tests: `palette.test.ts` and `palette.full.test.ts` (normal and shifted values, floor kept), `memoryShift.test.ts` (tint at t = 0, 0.5 and 1 still exact), `lampCoupling.test.ts` (ratios for 0, 1 and 2 lamps), `modelDetail.test.ts` (light count and budgets). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 26.1.
    - Boundary: render-only; `src/world/` only; no new dependency; no new three.js light.
    - _Requirements: 9.1, 9.2, 9.8, 10.2, 10.3, 10.7, 14.5, 19.1_

  - [x] 26.3 Docs, metrics and verification
    - Files: `src/world/README.md`, `.kiro/specs/world-exploration/performance-log.md`, `.kiro/specs/world-exploration/integration-notes.md`, `.kiro/specs/world-exploration/test-report.md` (each only where counts changed).
    - Re-run `npm run typecheck`, `npm test` and `npm run build`. Record computed triangles, lights and texture memory, each labelled "computed, not runtime-measured". Runtime fields stay "not measured". Task 15.4 stays open.
    - Acceptance: documents match the final geometry, lighting values and test counts; all text in English; no unmeasured claim.
    - Tests: `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 26.2.
    - Boundary: documentation and the spec folder only.
    - _Requirements: 14.11, 14.12, 15.3, 15.6_

### Cabinet detail and themed document card

- [x] 27. Cabinet detail and themed document card
  - [x] 27.1 cabinetAndManualDetail texture and in-place sharpening
    - Files: `src/world/scene/proceduralTextures.ts`, `src/world/scene/sharedResources.ts`, `src/world/scene/modelDetail.ts`, `src/world/scene/shelfModel.ts`, `src/world/scene/PartMeshes.tsx` (only if UV mapping needs it); tests `src/world/scene/proceduralTextures.test.ts`, `src/world/scene/modelDetail.test.ts`.
    - Add the 256x128 `cabinetAndManualDetail` texture (left half: coin door and control-deck legends for the three cabinets; right half: three illustrated manual spines), registered in `sharedResources.ts` with a flat-colour fallback and anisotropy 4. Map it onto existing faces with zero new triangles. Sharpen `rugWoven`, `wood`, `woodDark` and `spineAtlas` in place.
    - Acceptance: texture count is 32; texture memory at most 7.85 MB (computed); triangle estimate at most 19,200; lights at most 4; textures deterministic and power-of-two; each texture disposed exactly once (twice-safe); colliders and Station anchors unchanged; Memory_Shift tinting still works.
    - Tests: `proceduralTextures.test.ts` (determinism with a fake context, 256x128, no randomness, sharpened textures keep their sizes); `modelDetail.test.ts` (texture count 32, memory and triangle budgets, light count, disposal once and twice-safe, colliders unchanged). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 26.3.
    - Boundary: render-only; `src/world/` only; no new dependency; no GLB; `ASSET_MANIFEST` stays empty.
    - _Requirements: 1.3, 1.4, 1.8, 9.8, 12.5, 14.2, 14.4, 14.5, 14.6, 14.7, 19.1_

  - [x] 27.2 Themed two-page Archive Document Card
    - Files: `src/world/overlay/archiveDocuments.ts`, `src/world/overlay/WorldInspectorCard.tsx`, `src/world/WorldScene.tsx`, `src/world/controller/useWorldInput.ts`, `src/world/logic/inputState.ts`, `src/world/logic/inputMode.ts`, `src/world/logic/propState.ts`, `src/world/overlay/world.css`; tests `src/world/overlay/archiveDocuments.test.ts`, `src/world/logic/propState.test.ts`, `src/world/logic/inputMode.prop.test.ts`, `src/world/logic/inputState.test.ts`, `src/world/WorldScene.test.ts`.
    - Give each document a theme, a status pill, inline SVG header art and two pages. Keys 1 and 2 switch pages while the card is open; the page buttons are also clickable when the pointer is not locked. While pointer-locked there is no cursor, so keys are the input. Page switching never releases pointer lock, never moves the player and never calls `onInspect`. E, Esc and walking more than 2.6 m away still close the card. Texts remain original placeholders for Developer 3 review; status text such as "CABINET 01 // PLAYABLE" is diegetic and accurate only once the Snake game ships in `src/arcade`.
    - Acceptance: every document has two pages, a theme and a status pill; keys 1 and 2 are accepted only while the card is open and are ignored when focus is in an input outside the wrapper; page state resets when the card closes; the notes counter is unchanged; `StationId` stays `'vhs' | 'arcade'`; the card keeps its `role` and accessible label; no storage access; `src/App.tsx` unchanged.
    - Tests: `archiveDocuments.test.ts` (themes, pills, two pages per document), `propState.test.ts` (page transitions, reset on close), `inputMode.prop.test.ts` and `inputState.test.ts` (keys 1 and 2 role and filtering, no mode change, no `CALL_ON_INSPECT`, no pointer-lock effect), `WorldScene.test.ts` (key and button page switching, closing on E, Esc and distance, `onInspect` not called). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 27.1.
    - Boundary: `src/world/` only; `WorldSceneProps` and `onInspect` unchanged; no import from `src/arcade/` or `src/memories/`; the import-boundary test still passes.
    - _Requirements: 7.5, 7.6, 7.7, 8.1, 8.6, 11.12, 11.13, 11.14, 15.1, 15.2, 15.4, 16.6, 16.7, 16.8, 16.9, 20.1, 20.2, 20.8_

  - [x] 27.3 Docs, metrics and verification
    - Files: `src/world/README.md`, `.kiro/specs/world-exploration/performance-log.md`, `.kiro/specs/world-exploration/integration-notes.md`, `.kiro/specs/world-exploration/test-report.md` (each only where counts changed).
    - Re-run `npm run typecheck`, `npm test` and `npm run build`. Record computed triangles, lights and texture memory, each labelled "computed, not runtime-measured". Document the two-page card controls and the diegetic status text caveat. Runtime fields stay "not measured". Task 15.4 stays open.
    - Acceptance: documents match the final geometry, texture count of 32 and test counts; all text in English; no unmeasured claim.
    - Tests: `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 27.2.
    - Boundary: documentation and the spec folder only.
    - _Requirements: 14.11, 14.12, 15.3, 15.6_

### Scrollable card and protruding manuals

- [x] 28. Scrollable card and protruding themed manuals
  - [x] 28.1 Wheel, key and scrollbar scrolling for the document card
    - Files: `src/world/overlay/WorldInspectorCard.tsx`, `src/world/WorldScene.tsx`, `src/world/controller/useWorldInput.ts`, `src/world/logic/inputState.ts`, `src/world/logic/inputMode.ts` or `src/world/logic/propState.ts` (only if needed), `src/world/overlay/world.css`; tests `src/world/WorldScene.test.ts`, `src/world/logic/inputState.test.ts`, `src/world/logic/inputMode.prop.test.ts`.
    - Add a window `wheel` listener (`passive: false`) attached only while a card is open, working also while pointer-locked, plus ArrowUp / ArrowDown / PageUp / PageDown scrolling. While a card is open ArrowUp / ArrowDown scroll the card and do not move the player; W / S still move. The card gets `pointer-events: auto` and a styled scrollbar. The world click handler ignores clicks and mousedown whose target is inside the card, so they never request pointer lock. `scrollTop` resets on open and on page switch.
    - Acceptance: wheel scrolls the card (also when pointer-locked) and the page is not scrolled; the wheel listener is removed when the card closes or the world unmounts; click inside the card does not call `requestPointerLock`; no `onInspect` call, no mode change; ArrowUp / ArrowDown do not move the player while a card is open and do move it otherwise; scroll position resets on open and page switch.
    - Tests: `WorldScene.test.ts` (wheel scroll, listener add and removal, click inside card does not request lock, scroll reset), `inputState.test.ts` (key roles for scroll keys while the card is open), `inputMode.prop.test.ts` (no mode change, no `CALL_ON_INSPECT`, no lock effect). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 27.3.
    - Boundary: `src/world/` only; `WorldSceneProps` and `onInspect` unchanged; no storage access; no import from `src/arcade/` or `src/memories/`.
    - _Requirements: 4.10, 7.5, 7.6, 7.7, 8.1, 11.12, 11.13, 11.14, 11.23, 15.1, 15.2, 15.4, 20.2, 20.8_

  - [x] 28.2 Protruding manual volumes with spine and cover art
    - Files: `src/world/scene/shelfModel.ts`, `src/world/scene/modelDetail.ts`, `src/world/scene/proceduralTextures.ts`, `src/world/scene/sharedResources.ts` (only if needed), `src/world/layout/roomLayout.ts`; tests `src/world/scene/modelDetail.test.ts`, `src/world/scene/proceduralTextures.test.ts`, `src/world/logic/targeting.test.ts`, `src/world/layout/roomLayout.test.ts`.
    - Make the three manuals protrude 0.08 m toward +X as 0.31 x 0.085 x 0.29 m volumes with anchors at x -4.52, z 1.4 / 1.8 / 2.2. Show spine art and cover art on the exposed side faces using the right half of `cabinetAndManualDetail`, redrawn in place (size unchanged, 0 extra bytes).
    - Acceptance: triangle estimate at most 19,200 (0 extra from 19,152); lights at most 4; texture memory at most 7.85 MB (0 extra); texture count unchanged; the manuals stay targetable within 2.2 m and do not block walkways or change colliders in a way that breaks reachability; `cabinetAndManualDetail` disposed exactly once (twice-safe); Memory_Shift tinting still works.
    - Tests: `modelDetail.test.ts` (manual dimensions and anchors, budgets, disposal once and twice-safe), `proceduralTextures.test.ts` (determinism with a fake context, same size, no randomness), `targeting.test.ts` (each manual targetable from the aisle, nearest wins), `roomLayout.test.ts` (anchors, reachability and clearances unchanged). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 28.1.
    - Boundary: render and layout data only; `src/world/` only; no new dependency; no GLB; `ASSET_MANIFEST` stays empty; `StationId` and `onInspect` unchanged.
    - _Requirements: 1.3, 1.4, 1.8, 6.1, 7.1, 7.2, 7.3, 9.8, 12.5, 13.8, 14.2, 14.4, 14.5, 14.6, 14.7, 19.1_

  - [x] 28.3 Docs, metrics and verification
    - Files: `src/world/README.md`, `.kiro/specs/world-exploration/performance-log.md`, `.kiro/specs/world-exploration/integration-notes.md`, `.kiro/specs/world-exploration/test-report.md` (each only where counts changed).
    - Re-run `npm run typecheck`, `npm test` and `npm run build`. Record computed triangles, lights and texture memory, each labelled "computed, not runtime-measured". Document the card scroll controls and the protruding manuals. Runtime fields stay "not measured". Task 15.4 stays open.
    - Acceptance: documents match the final geometry and test counts; all text in English; no unmeasured claim.
    - Tests: `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 28.2.
    - Boundary: documentation and the spec folder only.
    - _Requirements: 14.11, 14.12, 15.3, 15.6_

### Open-book manuals and animated attract screens

- [x] 29. Open-book manuals and animated attract screens
  - [x] 29.1 Open two-page book layout for the manual cards
    - Files: `src/world/overlay/WorldInspectorCard.tsx`, `src/world/overlay/world.css`, `src/world/overlay/archiveDocuments.ts` (if needed), `src/world/WorldScene.tsx` (if needed), `src/world/overlay/cardThemes.ts` (if needed); tests `src/world/WorldScene.test.ts`, `src/world/overlay/archiveDocuments.test.ts`.
    - The three manual cards render as an open book with both pages side by side on wide viewports and stacked on narrow ones. Keys 1 and 2 and clicks select and highlight a page, and scroll it into view when stacked. Wheel, ArrowUp / ArrowDown, PageUp / PageDown and the scrollbar keep working. The four room clues keep their own layouts. Texts stay as they are.
    - Acceptance: both pages of a manual are visible at once on wide viewports; stacked on narrow ones; the selected page is highlighted; the selected page scrolls into view when stacked; scrolling inputs still work; room clues are unchanged; no `onInspect` call, no mode change, no pointer-lock change; clicks inside the card never request pointer lock.
    - Tests: `WorldScene.test.ts` (manual shows two pages, key 1 and 2 and click select and highlight, room clue layout unchanged, no `onInspect`), `archiveDocuments.test.ts` (each manual has two pages). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 28.3.
    - Boundary: `src/world/` only; `WorldSceneProps` and `onInspect` unchanged; no storage access; no import from `src/arcade/` or `src/memories/`.
    - _Requirements: 7.5, 7.6, 7.7, 8.1, 11.12, 11.13, 11.14, 15.1, 15.2, 15.4, 20.2, 20.8_

  - [x] 29.2 Animated attract screens
    - Files: `src/world/scene/proceduralTextures.ts`, `src/world/scene/sharedResources.ts`, `src/world/scene/Effects.tsx`, `src/world/scene/effectsTiming.ts`; tests `src/world/scene/proceduralTextures.test.ts`, `src/world/scene/effectsTiming.test.ts`, `src/world/scene/modelDetail.test.ts`.
    - Redraw the existing `attractSnake`, `attractMaze` and `attractFrequency` canvases in place, at most 12 times per second, from the existing `Effects` `useFrame`. No timers and no new textures. Animation stops while inspecting and is static under reduced motion. `elapsedSec = 0` reproduces the static frame. Any collection flash is a soft pulse that keeps luminance changes at or below 3 per second.
    - Acceptance: redraw rate at most 12 per second; no timer; texture count stays 32; texture memory at most 7.85 MB (computed); triangle estimate at most 19,200; lights at most 4; animation off while inspecting and under reduced motion; `elapsedSec = 0` matches the static frame; textures deterministic for a given `elapsedSec`; each texture disposed exactly once (twice-safe); Memory_Shift tinting still works.
    - Tests: `proceduralTextures.test.ts` (determinism with a fake context for fixed `elapsedSec`, `elapsedSec = 0` equals static frame, sizes unchanged), `effectsTiming.test.ts` (12 per second cap, stop while inspecting, static under reduced motion, flash luminance changes at most 3 per second), `modelDetail.test.ts` (texture count 32, memory, triangle and light budgets, disposal). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 29.1.
    - Boundary: render-only; `src/world/` only; no new dependency; no GLB; `ASSET_MANIFEST` stays empty.
    - _Requirements: 9.8, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 14.2, 14.4, 14.5, 14.6, 14.7_

  - [x] 29.3 Docs, metrics and verification
    - Files: `src/world/README.md`, `.kiro/specs/world-exploration/performance-log.md`, `.kiro/specs/world-exploration/integration-notes.md`, `.kiro/specs/world-exploration/test-report.md` (each only where counts changed).
    - Re-run `npm run typecheck`, `npm test` and `npm run build`. Record computed triangles, lights and texture memory, each labelled "computed, not runtime-measured". Document the open-book manual cards and the animated attract screens. Runtime fields stay "not measured". Task 15.4 stays open.
    - Acceptance: documents match the final geometry and test counts; all text in English; no unmeasured claim.
    - Tests: `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 29.2.
    - Boundary: documentation and the spec folder only.
    - _Requirements: 14.11, 14.12, 15.3, 15.6_

### Lamp fix, smooth motion and 24 Hz attract screens

- [x] 30. Lamp fix, smooth motion and 24 Hz attract screens
  - [x] 30.1 Remove the right desk lamp square artefact
    - Files: `src/world/scene/modelDetail.ts`, `src/world/scene/sharedResources.ts`, `src/world/scene/Props.tsx`, `src/world/scene/proceduralTextures.ts` (if needed); tests `src/world/scene/modelDetail.test.ts`, `src/world/scene/proceduralTextures.test.ts`.
    - Make the `desk-lamp-right` glow sprite and pool round and radially faded, using geometry with at least 24 segments. Tuck the cone top inside the shade's bottom opening. Lay the pool flat just above the desk surface.
    - Acceptance: no square edge is visible in glow, cone or pool; glow and pool geometry have at least 24 segments; cone top lies inside the shade opening; pool sits just above the desk without z-fighting; triangle estimate at most 19,200; lights at most 4; texture count 32; texture memory at most 7.85 MB (computed); each texture disposed exactly once (twice-safe); colliders and Station anchors unchanged; Memory_Shift tinting still works.
    - Tests: `modelDetail.test.ts` (segment counts at least 24, cone top inside shade, pool height above desk, budgets, disposal once and twice-safe); `proceduralTextures.test.ts` (glow texture deterministic with a fake context, alpha is zero at the edge, unchanged size). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 29.3.
    - Boundary: render-only; `src/world/` only; no new dependency; no GLB; `ASSET_MANIFEST` stays empty.
    - _Requirements: 1.3, 1.4, 1.8, 9.1, 9.2, 9.8, 14.2, 14.4, 14.5, 14.6, 14.7, 19.1_

  - [x] 30.2 Smooth camera look and movement
    - Files: `src/world/logic/playerStep.ts`, `src/world/logic/movement.ts` and `src/world/logic/look.ts` (if needed), `src/world/controller/usePlayerRig.ts`, `src/world/WorldScene.tsx` (if needed); tests `src/world/logic/playerStep.test.ts`, `src/world/logic/look.test.ts`, `src/world/logic/movement.test.ts`, `src/world/WorldScene.test.ts`.
    - Apply frame-rate-independent exponential smoothing with alpha = `1 - exp(-lambda * dt)` (using clamped dt) to camera look (yaw and pitch, lambda about 32) and movement velocity (lambda about 20). Under reduced motion alpha is 1 (no smoothing). Collision, bounds, pitch limits, yaw wrapping and pointer-lock behaviour are unchanged. Smoothing is a pure function.
    - Acceptance: the smoothed value converges to the target; results are consistent across frame rates within tolerance; alpha is 1 under reduced motion; zero input stops the player without drift; position stays valid (no overlap, inside bounds); pitch stays within 80 degrees; yaw stays finite and wrapped; no pointer-lock change.
    - Tests: `playerStep.test.ts` (alpha formula, convergence, frame-rate consistency, reduced-motion bypass, stop on zero input, collision still applied); `look.test.ts` and `movement.test.ts` (limits and wrapping preserved, NaN and large dt safe); `WorldScene.test.ts` (no `onInspect` or lock regression). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 30.1.
    - Boundary: `src/world/` only; pure logic stays free of React, three.js and DOM; `WorldSceneProps` and `onInspect` unchanged.
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.10, 3.11, 4.2, 4.3, 4.4, 4.5, 6.2, 6.4, 6.5, 10.4, 10.6, 13.1, 13.2_

  - [x] 30.3 24 Hz fluid attract animations
    - Files: `src/world/scene/proceduralTextures.ts`, `src/world/scene/effectsTiming.ts`, `src/world/scene/Effects.tsx`; tests `src/world/scene/proceduralTextures.test.ts`, `src/world/scene/effectsTiming.test.ts`.
    - Raise the attract-screen redraw throttle from 12 Hz to 24 Hz (estimated texture uploads about 18.8 MB/s, not measured). Make motion faster and interpolated between frames. Every brightness pulse keeps at most 3 direction changes per rolling second. Animation stays off while inspecting and static under reduced motion; `elapsedSec = 0` still reproduces the static frame; no timers, no new textures.
    - Acceptance: redraw rate at most 24 per second; pulses have at most 3 direction changes in any rolling second; animation stops while inspecting and is static under reduced motion; textures are deterministic for a given `elapsedSec`; texture count 32; texture memory at most 7.85 MB (computed); triangle estimate at most 19,200; lights at most 4; each texture disposed exactly once.
    - Tests: `proceduralTextures.test.ts` (determinism for fixed `elapsedSec`, `elapsedSec = 0` equals the static frame, sizes unchanged); `effectsTiming.test.ts` (24 Hz cap, rolling-second direction-change limit, stop while inspecting, static under reduced motion). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 30.2.
    - Boundary: render-only; `src/world/` only; no new dependency; no GLB; `ASSET_MANIFEST` stays empty.
    - _Requirements: 9.8, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 14.2, 14.4, 14.5, 14.6, 14.7_

  - [x] 30.4 Docs, metrics and verification
    - Files: `src/world/README.md`, `.kiro/specs/world-exploration/performance-log.md`, `.kiro/specs/world-exploration/integration-notes.md`, `.kiro/specs/world-exploration/test-report.md` (each only where counts changed).
    - Re-run `npm run typecheck`, `npm test` and `npm run build`. Record computed triangles, lights and texture memory, each labelled "computed, not runtime-measured". Document the lamp fix, the smoothing constants and the 24 Hz attract throttle (upload estimate labelled not measured). Runtime fields stay "not measured". Task 15.4 stays open.
    - Acceptance: documents match the final geometry and test counts; all text in English; no unmeasured claim.
    - Tests: `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 30.3.
    - Boundary: documentation and the spec folder only.
    - _Requirements: 14.11, 14.12, 15.3, 15.6_

### Crisp look, faster walk and fixture polish

- [x] 31. Crisp look, faster walk and fixture polish
  - [x] 31.1 Direct mouse look and faster, snappier movement
    - Files: `src/world/logic/constants.ts`, `src/world/logic/playerStep.ts`, `src/world/controller/usePlayerRig.ts`; tests `src/world/logic/playerStep.test.ts`, `src/world/logic/smoothing.test.ts`, `src/world/logic/movement.test.ts`, `src/world/logic/collision.test.ts`.
    - Apply mouse look deltas 1:1 to both the target and the rendered look (no smoothing lag). Keep exponential smoothing for keyboard look (I/J/K/L) with `LOOK_SMOOTHING_LAMBDA` 42. Raise `WALK_SPEED` from 2.5 to about 2.9 m/s and `MOVE_SMOOTHING_LAMBDA` from 20 to 28. Collision substeps, bounds, snap on blur / inspect / clear input and the reduced-motion bypass are unchanged.
    - Acceptance: a mouse delta moves the rendered look immediately by the same angle; keyboard look still converges smoothly with lambda 42; walk speed is about 2.9 m/s at full input; movement lambda is 28; position stays valid (no overlap, inside bounds, no tunneling at the new speed with `MAX_STEP`); pitch within 80 degrees; yaw finite and wrapped; reduced motion bypasses smoothing; snap on blur, inspect and clear input still works; no pointer-lock change.
    - Tests: `playerStep.test.ts` (mouse look 1:1, keyboard smoothing with lambda 42, snap cases, reduced-motion bypass), `smoothing.test.ts` (alpha formula and convergence for lambda 28 and 42, frame-rate consistency), `movement.test.ts` (new `WALK_SPEED`, diagonal normalization), `collision.test.ts` (no tunneling at the new speed times `DT_MAX`). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 30.4.
    - Boundary: `src/world/` only; pure logic stays free of React, three.js and DOM; `WorldSceneProps` and `onInspect` unchanged.
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.10, 3.11, 4.2, 4.3, 4.4, 4.5, 5.3, 6.2, 6.4, 6.5, 6.6, 10.4, 10.6, 13.1, 13.2_

  - [x] 31.2 Desk cassette and ceiling fixture texture polish
    - Files: `src/world/scene/sharedResources.ts`, `src/world/scene/modelDetail.ts`, `src/world/scene/Room.tsx`, `src/world/scene/PartMeshes.tsx` (if needed), `src/world/scene/proceduralTextures.ts` (only if an in-place redraw is required); tests `src/world/scene/modelDetail.test.ts`, `src/world/scene/proceduralTextures.test.ts`.
    - Give the loose desk VHS cassette a satin charcoal shell (`#2a2d36`) using the existing `vhsShell` texture. Add diffuser and end-cap detail to the ceiling fluorescent bars using existing textures.
    - Acceptance: triangle estimate at most 19,200 (0 extra from 19,154); lights at most 4; texture count 32; texture memory at most 7.85 MB (0 extra bytes); no new texture; each texture disposed exactly once (twice-safe); colliders and Station anchors unchanged; Memory_Shift tinting still works.
    - Tests: `modelDetail.test.ts` (cassette colour and texture, fixture parts, budgets, disposal once and twice-safe, colliders unchanged); `proceduralTextures.test.ts` (determinism and sizes, only if a redraw changed). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 31.1.
    - Boundary: render-only; `src/world/` only; no new dependency; no GLB; `ASSET_MANIFEST` stays empty.
    - _Requirements: 1.3, 1.4, 1.8, 9.1, 9.2, 9.8, 12.5, 14.2, 14.4, 14.5, 14.6, 14.7, 19.1_

  - [x] 31.3 Docs, metrics and verification
    - Files: `src/world/README.md`, `.kiro/specs/world-exploration/performance-log.md`, `.kiro/specs/world-exploration/integration-notes.md`, `.kiro/specs/world-exploration/test-report.md` (each only where counts changed).
    - Re-run `npm run typecheck`, `npm test` and `npm run build`. Record computed triangles, lights and texture memory, each labelled "computed, not runtime-measured". Document direct mouse look, the new walk speed and smoothing constants, and the cassette and fixture polish. Runtime fields stay "not measured". Task 15.4 stays open.
    - Acceptance: documents match the final geometry, constants and test counts; all text in English; no unmeasured claim.
    - Tests: `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 31.2.
    - Boundary: documentation and the spec folder only.
    - _Requirements: 14.11, 14.12, 15.3, 15.6_

### Procedural world audio

- [x] 32. Procedural world audio
  - [x] 32.1 Web Audio engine: SFX and ambient music
    - Files: `src/world/audio/worldAudio.ts`, `src/world/audio/worldAudio.test.ts` (new); `src/world/boundary.test.ts` only if its rules need to cover the new folder.
    - `createWorldAudioEngine` with an injectable context factory, silent no-op when `AudioContext` / `webkitAudioContext` is missing. Context created or resumed only via an explicit gesture call, suspended while `document.hidden`, closed on dispose (twice-safe). SFX: VHS insert, arcade coin, lamp switch, page rustle. Ambient music at about 78 BPM: continuous pad and tape-hiss nodes, sparse bell notes scheduled ahead from a `tick(audioCtx.currentTime)` call (no `setInterval` / `setTimeout`). Master BGM gain about 0.15, `setDucked(true)` ramps to x0.4, `toggleMute()` and `isMuted()`.
    - Acceptance: no audio files and no new dependency; no timers; no-op engine never throws; nothing plays before a gesture; mute silences SFX and BGM; ducking ramps the gain; dispose closes the context once; the module has no React or three.js import.
    - Tests: `worldAudio.test.ts` with a fake context (no-op without `AudioContext`, gesture-only start, suspend on hidden, close on dispose, ducking and mute gain values, bell scheduling is ahead of `currentTime` and deterministic, no timers used). Run `npm run typecheck`, `npm test`.
    - Depends on: 31.3.
    - Boundary: `src/world/audio/` only; no storage access; no import from `src/arcade/` or `src/memories/`; `ASSET_MANIFEST` stays empty.
    - _Requirements: 10.1, 10.4, 13.1, 14.2, 14.4, 14.7, 15.1, 16.8, 16.9_

  - [x] 32.2 Wire audio into the world and add the mute badge
    - Files: `src/world/WorldScene.tsx`, `src/world/controller/useWorldInput.ts`, `src/world/logic/inputState.ts` (`KeyM` role), `src/world/scene/Effects.tsx` or a small audio host component inside the Canvas, `src/world/overlay/WorldOverlay.tsx` or new `src/world/overlay/AudioBadge.tsx`, `src/world/overlay/world.css`; tests `src/world/WorldScene.test.ts`, `src/world/logic/inputState.test.ts`.
    - Create the engine once per world mount and dispose it on unmount. Start or resume it on the first click or keydown inside the world wrapper. Fire the VHS insert SFX on `onInspect('vhs')` and the coin SFX on `onInspect('arcade')`, from E and from the WebGL fallback buttons. Fire the lamp switch SFX on lamp toggle and the page rustle on card open and page 1 / 2. Tick music scheduling from the existing `useFrame`. Duck on the mode change to `inspecting` (and restore on leaving it), not from the frame loop. `KeyM` toggles mute with the same key filtering as other keys. Show the badge "AUDIO: ON [M]" / "AUDIO: MUTED [M]" with `role="status"` inside the wrapper, without covering the App HUD.
    - Acceptance: no audio before a gesture; E on a Station plays the matching SFX and still calls `onInspect` once; `KeyM` from an input outside the wrapper is ignored and does not move the player; badge text matches the state; no new timers; triangles, lights and textures unchanged (19,154 / 4 / 32); `WorldSceneProps` and `onInspect` unchanged; `src/App.tsx` unchanged.
    - Tests: `inputState.test.ts` (`KeyM` role and filtering), `WorldScene.test.ts` with an injected fake engine (gesture start, SFX per Station and fallback button, lamp and page SFX, ducking on inspect, mute toggle and badge text, dispose on unmount). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 32.1.
    - Boundary: `src/world/` only; no storage access; the import-boundary test still passes.
    - _Requirements: 7.5, 7.6, 7.7, 8.1, 11.12, 11.13, 11.14, 15.1, 15.2, 15.4, 16.6, 16.7, 16.8, 16.9, 20.2, 20.8_

  - [x] 32.3 Docs, metrics and verification
    - Files: `src/world/README.md`, `.kiro/specs/world-exploration/performance-log.md`, `.kiro/specs/world-exploration/integration-notes.md`, `.kiro/specs/world-exploration/test-report.md` (each only where counts changed).
    - Re-run `npm run typecheck`, `npm test` and `npm run build`. Record computed triangles, lights and texture memory, each labelled "computed, not runtime-measured". Document the audio engine, `KeyM`, the badge, and the Developer 3 review requirement (avoid two audio systems). Audio is marked tested only by unit tests with a fake context, not by listening. Runtime fields stay "not measured". Task 15.4 stays open.
    - Acceptance: documents match the final code and test counts; all text in English; no unmeasured claim.
    - Tests: `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 32.2.
    - Boundary: documentation and the spec folder only.
    - _Requirements: 14.11, 14.12, 15.3, 15.6_

### Turntable and music catalog

- [x] 33. Turntable and music catalog
  - [x] 33.1 Turntable placement, model and triangle reclaim
    - Files: `src/world/layout/roomLayout.ts`, `src/world/worldTypes.ts` (if needed), `src/world/scene/modelDetail.ts`, `src/world/scene/Props.tsx`, `src/world/scene/sharedResources.ts`, `src/world/scene/PartMeshes.tsx` (if needed); tests `src/world/layout/roomLayout.test.ts`, `src/world/scene/modelDetail.test.ts`, `src/world/logic/targeting.test.ts`.
    - Add the `record-player` world prop (solid collider, free corner of the main room) and its multi-part walnut console and Hi-Fi turntable, using existing textures only. Cull unseen floor-flush bottom faces and, only if still needed, simplify the hidden console cables behind the CRT island. Report every reclaimed triangle.
    - Acceptance: triangle estimate at most 19,200; lights at most 4; texture count 32 and memory unchanged; `record-player` is in `COLLIDERS` and targetable within range; spawn, 1.2 m walkways, doorway lanes, island clearance, reachability of both Stations and line-of-sight tests still pass; `StationId` unchanged; Memory_Shift tinting still works.
    - Tests: `roomLayout.test.ts` (collider, placement, clearances, BFS reachability), `modelDetail.test.ts` (parts, reclaimed triangle count, budgets, disposal once and twice-safe), `targeting.test.ts` (record player targetable, nearest wins). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 32.3.
    - Boundary: `src/world/` only; no new dependency; no GLB; `ASSET_MANIFEST` stays empty.
    - _Requirements: 1.3, 1.4, 1.8, 6.1, 7.1, 7.2, 7.3, 9.8, 12.5, 13.8, 14.4, 14.5, 19.1_

  - [x] 33.2 Music catalog, crossfade and needle-drop SFX
    - Files: `src/world/audio/worldAudio.ts`, `src/world/audio/engineFactory.ts`, `src/world/audio/worldAudio.test.ts`.
    - Add `MUSIC_CATALOG` (4 procedural tracks plus stop) and `setTrack(id)` with an audio-clock crossfade (no timers), default track 1 on unlock, and a needle-drop SFX of about 0.55 s. Mute, ducking, gesture-only start and dispose behavior are unchanged.
    - Acceptance: no audio files, no new timers, no new dependency; the no-op engine never throws; track 1 matches the current loop; switching ramps gains on `currentTime`; stop silences BGM; mute and ducking still compose.
    - Tests: `worldAudio.test.ts` with a fake context (catalog shape and BPMs, default track, crossfade gain ramps, stop, needle-drop, mute and ducking composition, no timers). Run `npm run typecheck`, `npm test`.
    - Depends on: 33.1.
    - Boundary: `src/world/audio/` only; no storage access; Developer 3 audio review still required.
    - _Requirements: 10.1, 10.4, 13.1, 14.2, 14.4, 14.7, 15.1, 16.8, 16.9_

  - [x] 33.3 Turntable catalog card, track keys and spin wiring
    - Files: `src/world/logic/propState.ts`, `src/world/overlay/archiveDocuments.ts` or new `src/world/overlay/turntableCatalog.ts`, `src/world/overlay/cardThemes.ts`, `src/world/logic/inputState.ts`, `src/world/logic/inputMode.ts`, `src/world/controller/useWorldInput.ts`, `src/world/WorldScene.tsx`, `src/world/overlay/WorldInspectorCard.tsx`, `src/world/overlay/world.css`, `src/world/scene/Props.tsx` (spin and tonearm state); tests `src/world/logic/propState.test.ts`, `src/world/logic/inputState.test.ts`, `src/world/WorldScene.test.ts`, `src/world/scene/modelDetail.test.ts`.
    - E on the record player opens the themed turntable catalog card (`data-theme` turntable). Keys 1-5 select a track while that card is open; on document cards 1 and 2 still switch pages. Track rows are clickable without requesting pointer lock. Selecting a track calls the audio engine, spins the platter and moves the tonearm onto the record; stop or reduced motion stops the spin and returns the tonearm to its cradle. No `onInspect`, no mode change, no input suspension; selected track is session-only (no storage).
    - Acceptance: keys 1-5 are accepted only while the turntable card is open and keep the existing filtering; E, Esc and walking more than 2.6 m away close the card; platter spins only while a track plays and never under reduced motion; tonearm state matches; notes counter unchanged; `src/App.tsx` unchanged.
    - Tests: `propState.test.ts` (turntable card open, close, track selection), `inputState.test.ts` (keys 1-5 role and filtering, document cards unchanged), `WorldScene.test.ts` (track keys and row clicks, no lock request, no `onInspect`, engine calls, spin and tonearm state, reduced motion), `modelDetail.test.ts` (spin and tonearm state parts, budgets). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 33.2.
    - Boundary: `src/world/` only; `WorldSceneProps` and `onInspect` unchanged; no import from `src/arcade/` or `src/memories/`; the import-boundary test still passes.
    - _Requirements: 7.5, 7.6, 7.7, 8.1, 10.4, 10.6, 11.12, 11.13, 11.14, 15.1, 15.2, 15.4, 16.6, 16.7, 16.8, 16.9, 20.2, 20.8_

  - [x] 33.4 Docs, metrics and verification
    - Files: `src/world/README.md`, `.kiro/specs/world-exploration/performance-log.md`, `.kiro/specs/world-exploration/integration-notes.md`, `.kiro/specs/world-exploration/test-report.md` (each only where counts changed).
    - Re-run `npm run typecheck`, `npm test` and `npm run build`. Record computed triangles (with reclaimed count), lights and texture memory, each labelled "computed, not runtime-measured". Document the turntable, catalog, keys 1-5 and the Developer 3 audio review requirement. Audio is tested only with a fake context, not by listening. Runtime fields stay "not measured". Task 15.4 stays open.
    - Acceptance: documents match the final geometry and test counts; all text in English; no unmeasured claim.
    - Tests: `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 33.3.
    - Boundary: documentation and the spec folder only.
    - _Requirements: 14.11, 14.12, 15.3, 15.6_

### Hi-Fi table relocation and record display

- [x] 34. Hi-Fi table relocation and record display
  - [x] 34.1 Relocate the record player and build the Hi-Fi table
    - Files: `src/world/layout/roomLayout.ts`, `src/world/scene/modelDetail.ts`, `src/world/scene/floorCull.ts`, `src/world/scene/sharedResources.ts`, `src/world/scene/Props.tsx`, `src/world/scene/PartMeshes.tsx` (if needed); tests `src/world/layout/roomLayout.test.ts`, `src/world/logic/targeting.test.ts`, `src/world/scene/modelDetail.test.ts`.
    - Move `record-player` to the lounge beside the sofa. Build a ~1.25 m Hi-Fi listening table with the turntable, a wooden record crate with 4 LP sleeves (#16a34a, #e11d48, #38bdf8, #f59e0b), a warm `MeshBasicMaterial` LED accent bar and an additive tabletop glow disc (`lampGlow` or `coneFalloff`, `depthWrite` false). Reclaim hidden triangles (via `floorCull.ts` for wall-flush back faces on tall bookcases or filing cabinets, or fewer segments on hidden pipes) and report each reclaimed count.
    - Acceptance: triangle estimate at most 19,200; draw-call estimate below 400; lights at most 4 (no fifth light); texture count 32 and memory 7.703 MiB unchanged; `record-player` remains in `COLLIDERS` and targetable within range; spawn, 1.2 m walkways, doorway lanes, island clearance, bookcase walkways, reachability of both Stations and line-of-sight tests all pass; no new timers; textures disposed exactly once (twice-safe); Memory_Shift tinting still works.
    - Tests: `roomLayout.test.ts` (new collider, clearances, BFS reachability), `targeting.test.ts` (record player targetable from the lounge, nearest wins), `modelDetail.test.ts` (parts, reclaimed triangles, triangle and draw-call budgets, light count, disposal). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 33.4.
    - Boundary: `src/world/` only; `StationId` unchanged; no new dependency; no GLB; `ASSET_MANIFEST` stays empty.
    - _Requirements: 1.3, 1.4, 1.8, 6.1, 7.1, 7.2, 7.3, 9.8, 12.5, 13.8, 14.4, 14.5, 19.1_

  - [x] 34.2 Now-playing jacket wiring
    - Files: `src/world/WorldScene.tsx`, `src/world/scene/Props.tsx`, `src/world/scene/modelDetail.ts` (if needed); tests `src/world/WorldScene.test.ts`, `src/world/scene/modelDetail.test.ts`.
    - The angled NOW PLAYING jacket stand shows the colour of the active track from the session-only selected track state; it shows a neutral colour or is lowered when STOP is selected. No `onInspect`, no mode change, no storage.
    - Acceptance: jacket colour matches the selected track; neutral or lowered on STOP and before any selection; no new light, timer or texture; budgets from 34.1 still hold.
    - Tests: `WorldScene.test.ts` (jacket state follows track keys 1-5, STOP state, `onInspect` not called), `modelDetail.test.ts` (jacket colour mapping, budgets). Run `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 34.1.
    - Boundary: `src/world/` only; `WorldSceneProps` and `onInspect` unchanged.
    - _Requirements: 7.5, 7.6, 7.7, 9.8, 10.4, 10.6, 14.4, 14.5, 16.8, 16.9_

  - [x] 34.3 Docs, metrics and verification
    - Files: `src/world/README.md`, `.kiro/specs/world-exploration/performance-log.md`, `.kiro/specs/world-exploration/integration-notes.md`, `.kiro/specs/world-exploration/test-report.md` (each only where counts changed).
    - Re-run `npm run typecheck`, `npm test` and `npm run build`. Record computed triangles (with reclaimed count), draw calls, lights and texture memory, each labelled "computed, not runtime-measured". Runtime fields stay "not measured". Task 15.4 stays open.
    - Acceptance: documents match the final geometry and test counts; all text in English; no unmeasured claim.
    - Tests: `npm run typecheck`, `npm test`, `npm run build`.
    - Depends on: 34.2.
    - Boundary: documentation and the spec folder only.
    - _Requirements: 14.11, 14.12, 15.3, 15.6_

## Notes

- Tasks marked with `*` are optional. The 17 property-based test sub-tasks can be skipped for a faster MVP. Tasks 16.2 and 16.3 are marked `*` because they must not be implemented without approval.
- Unit tests for pure modules are written together with the module (test-first) and are not optional. Tests 5.7, 5.8 and 9.8 (import boundary and component-level) are required. Property tests are separate optional sub-tasks, one per design property.
- Required task 5.8 installs `jsdom` and `@testing-library/react` (and `@testing-library/dom` if required). Task 2.2, or the first property-test task that is run, installs `fast-check` under approved P9.
- Each checkpoint requires `npm run typecheck`, `npm test` and `npm run build` to pass.
- Task 9.9 and task 16.1 are documentation only and must not change `src/App.tsx`.
- Performance numbers are recorded in task 15.4 and are not claimed before then.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.4", "3.1", "3.2", "3.4", "5.1", "5.3"] },
    { "id": 2, "tasks": ["1.2", "2.2", "3.7"] },
    { "id": 3, "tasks": ["1.3", "2.3", "2.5", "2.6", "2.7", "2.8", "3.3", "3.5", "3.6", "3.8", "3.9", "3.10", "5.4"] },
    { "id": 4, "tasks": ["4"] },
    { "id": 5, "tasks": ["5.2", "5.5"] },
    { "id": 6, "tasks": ["5.6"] },
    { "id": 7, "tasks": ["5.7", "5.8"] },
    { "id": 8, "tasks": ["6"] },
    { "id": 9, "tasks": ["7.1", "7.4", "7.5"] },
    { "id": 10, "tasks": ["7.2", "7.3", "7.6"] },
    { "id": 11, "tasks": ["8"] },
    { "id": 12, "tasks": ["9.1", "9.3", "9.4"] },
    { "id": 13, "tasks": ["9.2", "9.5", "9.6", "9.7"] },
    { "id": 14, "tasks": ["9.8", "9.9"] },
    { "id": 15, "tasks": ["10"] },
    { "id": 16, "tasks": ["11.1", "11.3"] },
    { "id": 17, "tasks": ["11.2", "11.4"] },
    { "id": 18, "tasks": ["11.5"] },
    { "id": 19, "tasks": ["12"] },
    { "id": 20, "tasks": ["13.1", "13.3", "13.5", "13.6"] },
    { "id": 21, "tasks": ["13.2", "13.4"] },
    { "id": 22, "tasks": ["14"] },
    { "id": 23, "tasks": ["15.2", "15.3", "15.6", "15.8", "16.1"] },
    { "id": 24, "tasks": ["15.7"] },
    { "id": 25, "tasks": ["15.1", "15.4"] },
    { "id": 26, "tasks": ["15.5"] },
    { "id": 27, "tasks": ["16.2", "16.3"] },
    { "id": 28, "tasks": ["17"] },
    { "id": 29, "tasks": ["18.1"] },
    { "id": 30, "tasks": ["18.2"] },
    { "id": 31, "tasks": ["18.3"] },
    { "id": 32, "tasks": ["18.4"] },
    { "id": 33, "tasks": ["19.1"] },
    { "id": 34, "tasks": ["19.2"] },
    { "id": 35, "tasks": ["19.3"] },
    { "id": 36, "tasks": ["20.1"] },
    { "id": 37, "tasks": ["20.2"] },
    { "id": 38, "tasks": ["20.3"] },
    { "id": 39, "tasks": ["21.1"] },
    { "id": 40, "tasks": ["21.2"] },
    { "id": 41, "tasks": ["21.3"] },
    { "id": 42, "tasks": ["22.1"] },
    { "id": 43, "tasks": ["22.2"] },
    { "id": 44, "tasks": ["22.3"] },
    { "id": 45, "tasks": ["23.1"] },
    { "id": 46, "tasks": ["23.2"] },
    { "id": 47, "tasks": ["23.3"] },
    { "id": 48, "tasks": ["24.1"] },
    { "id": 49, "tasks": ["24.2"] },
    { "id": 50, "tasks": ["24.3"] },
    { "id": 51, "tasks": ["25.1"] },
    { "id": 52, "tasks": ["25.2"] },
    { "id": 53, "tasks": ["25.3"] },
    { "id": 54, "tasks": ["26.1"] },
    { "id": 55, "tasks": ["26.2"] },
    { "id": 56, "tasks": ["26.3"] },
    { "id": 57, "tasks": ["27.1"] },
    { "id": 58, "tasks": ["27.2"] },
    { "id": 59, "tasks": ["27.3"] },
    { "id": 60, "tasks": ["28.1"] },
    { "id": 61, "tasks": ["28.2"] },
    { "id": 62, "tasks": ["28.3"] },
    { "id": 63, "tasks": ["29.1"] },
    { "id": 64, "tasks": ["29.2"] },
    { "id": 65, "tasks": ["29.3"] },
    { "id": 66, "tasks": ["30.1"] },
    { "id": 67, "tasks": ["30.2"] },
    { "id": 68, "tasks": ["30.3"] },
    { "id": 69, "tasks": ["30.4"] },
    { "id": 70, "tasks": ["31.1"] },
    { "id": 71, "tasks": ["31.2"] },
    { "id": 72, "tasks": ["31.3"] },
    { "id": 73, "tasks": ["32.1"] },
    { "id": 74, "tasks": ["32.2"] },
    { "id": 75, "tasks": ["32.3"] },
    { "id": 76, "tasks": ["33.1"] },
    { "id": 77, "tasks": ["33.2"] },
    { "id": 78, "tasks": ["33.3"] },
    { "id": 79, "tasks": ["33.4"] },
    { "id": 80, "tasks": ["34.1"] },
    { "id": 81, "tasks": ["34.2"] },
    { "id": 82, "tasks": ["34.3"] }
  ]
}
```

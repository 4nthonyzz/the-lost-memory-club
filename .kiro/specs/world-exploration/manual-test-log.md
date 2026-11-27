# World Exploration: Manual Test Log

Task 15.3. Requirements 15.6, 15.7. Related: `integration-notes.md`.

This file is a **template**. Every row starts as `not run`. No result in this file has been recorded yet. Do not mark a row `pass` without a tester name and a date.

## Legend

| Status | Meaning |
| --- | --- |
| `not run` | Not tested yet. Default for every row. |
| `pass` | Tested; behavior matches the expected result. Requires tester and date. |
| `fail` | Tested; behavior differs from the expected result. Describe it in Notes. |
| `blocked` | Could not be tested (for example, the browser or hardware is not available). Say why in Notes. |
| `n/a` | Not applicable in this browser. Say why in Notes. |

## How to record results

1. Run `npm run dev` (or `npm run build` then `npm run preview`) and open the printed URL.
2. Work through a row and compare against its Expected column.
3. Replace `not run` in the Result column with a status from the legend.
4. Fill Tester (name or handle), Date (YYYY-MM-DD) and Browser (name and version).
5. Put observations in Notes: what you saw, the OS, the viewport size, and any console message.
6. Do not edit the Expected column. If an expectation is wrong, note it and raise it with the team.

## Dev perf sampler (task 15.2)

These instructions refer to task 15.2, which is implemented concurrently. They are **available once task 15.2 is merged**. At the time this log was written, `src/world/controller/useFrameSampler.ts` did not exist, so the flag name below is **not yet verified** against the code.

1. Run `npm run dev` (the sampler is dev-only and inert in production builds).
2. Open the dev URL with `?worldPerf=1` appended.
3. Play or walk for the intended duration.
4. In the browser console, call `window.__worldPerf.summary()`.
5. Copy the raw output into the Notes of the relevant row, and into `performance-log.md` (task 15.4) if relevant.

Verification of the flag name against `useFrameSampler.ts`: `not run`

## Matrix

All rows: Tester, Date and Browser are blank until a test is run.

### 1. Keyboard-only play

| ID | Scenario | Expected | Result | Tester | Date | Browser | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| K1 | Tab to the world wrapper, move with WASD | Player moves; focus ring visible on the wrapper | not run | | | | |
| K2 | Look with arrow keys and IJKL | View rotates without a mouse | not run | | | | |
| K3 | Press E near each station | Interaction fires for the targeted station | not run | | | | |
| K4 | Press Esc during play | Documented Esc behavior occurs; no stuck keys | not run | | | | |
| K5 | Controls hint lists all keys | Hint matches the keys that work | not run | | | | |

### 2. Pointer lock

| ID | Scenario | Expected | Result | Tester | Date | Browser | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | Click the view to lock | Pointer locks; mouse look works | not run | | | | |
| P2 | Press Esc while locked | Pointer unlocks; capture overlay shown; keys do not stay held | not run | | | | |
| P3 | Alt-tab away and back while locked | Input is released on blur or visibility change; no stuck movement; click re-captures | not run | | | | |
| P4 | Switch browser tab (visibility hidden) and return | Same as P3 | not run | | | | |
| P5 | Pointer lock denied (browser or user refuses) | Keyboard-only controls still work; a clear message is shown; no crash | not run | | | | |
| P6 | Pointer lock unsupported (for example, API unavailable) | Fallback to keyboard controls; no crash | not run | | | | |

### 3. Panels

| ID | Scenario | Expected | Result | Tester | Date | Browser | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | Type text in the VHS dialog (including W, A, S, D, E) | Player does not move | not run | | | | |
| D2 | Use Snake or arcade keys (arrows, WASD) in the arcade dialog | Player does not move | not run | | | | |
| D3 | Press Escape in an open dialog | Dialog closes | not run | | | | |
| D4 | Close a dialog with the Close button | Dialog closes | not run | | | | |
| D5 | After closing, check focus | Focus returns to `.world-wrapper` | not run | | | | |
| D6 | Request the arcade while it is locked | `ARCADE LOCKED · Recover the VHS clue first.` is visible in the bottom HUD status line and is not covered by other UI | not run | | | | |

### 4. `inputEnabled` behavior with App

| ID | Scenario | Expected | Result | Tester | Date | Browser | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| I1 | Open a panel (VHS, then unlocked arcade) | World input is suspended, held keys cleared, pointer lock released | not run | | | | |
| I2 | Close the panel | World input resumes; capture overlay shown | not run | | | | |
| I3 | After closing, check pointer state | Pointer is not re-locked automatically; one click re-captures | not run | | | | |
| I4 | Press E at the arcade while locked | World stays usable (movement and look work); pointer lock is released; one click re-captures | not run | | | | |

### 5. Reduced motion

| ID | Scenario | Expected | Result | Tester | Date | Browser | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | Start with the OS reduced-motion setting off, then turn it on while the app is mounted | Distortion and motion effects reduce without a reload | not run | | | | |
| R2 | Turn the OS setting off again while mounted | Effects return to normal without a reload | not run | | | | |
| R3 | Start with the setting on | Reduced effects from the first frame | not run | | | | |

### 6. Memory_Shift

| ID | Scenario | Expected | Result | Tester | Date | Browser | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| M1 | Mount with `memoryShifted` already true | Shifted look applies immediately | not run | | | | |
| M2 | Trigger the shift live (win Snake) | Smooth transition to the shifted look | not run | | | | |
| M3 | Poster and plaque after the shift | Poster and plaque show their shifted state | not run | | | | |

### 7. WebGL failure fallback

| ID | Scenario | Expected | Result | Tester | Date | Browser | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W1 | Disable WebGL or force context creation failure | Fallback UI replaces the canvas; no blank screen | not run | | | | |
| W2 | Use fallback buttons | Station buttons call the same interactions | not run | | | | |
| W3 | Focus in the fallback | Buttons are keyboard-reachable; focus order is sensible; focus returns after dialogs | not run | | | | |

### 8. Assets and layout

| ID | Scenario | Expected | Result | Tester | Date | Browser | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | Missing GLB file | Warning is logged once, not on every frame; procedural fallback is used | not run | | | | |
| L1 | Full-screen layout at 1280x720 | No scrollbars; HUD and status line readable | not run | | | | |
| L2 | Full-screen layout at 1920x1080 | No scrollbars; HUD and status line readable | not run | | | | |

### 9. Browsers (latest stable)

Repeat the full matrix, or the agreed subset, in each browser. Record the version.

| ID | Browser | Expected | Result | Tester | Date | Version | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B1 | Chrome (latest) | Sections 1 to 8 and 10 behave as expected | not run | | | | |
| B2 | Firefox (latest) | Sections 1 to 8 and 10 behave as expected | not run | | | | |
| B3 | Edge (latest) | Sections 1 to 8 and 10 behave as expected | not run | | | | |

### 10. M6: arcade relocation and dressing

| ID | Scenario | Expected | Result | Tester | Date | Browser | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | Reach the arcade through the first east doorway | Arcade is reachable; no collision trap | not run | | | | |
| S2 | Reach the arcade through the second east doorway | Arcade is reachable; no collision trap | not run | | | | |
| S3 | Approach the arcade cabinet (from each doorway) | The interaction prompt appears | not run | | | | |
| S4 | Press E at the prompt (arcade unlocked) | The arcade dialog opens | not run | | | | |
| S5 | Overhead ARCADE sign | Sign is visible above the east doorways and legible | not run | | | | |
| S6 | Companion cabinet and CRT stack | Both are visible, look powered down, and block movement | not run | | | | |
| S7 | Textures readable: attract screen | Readable | not run | | | | |
| S8 | Textures readable: marquee | Readable | not run | | | | |
| S9 | Textures readable: posters | Readable | not run | | | | |
| S10 | Textures readable: floor | Readable | not run | | | | |
| S11 | Textures readable: wood | Readable | not run | | | | |
| S12 | `memoryShifted` tint on the attract screen | Tint changes when shifted | not run | | | | |
| S13 | Frame rate feel on integrated graphics | Subjective: smooth enough to play. Record the GPU and, if the sampler is merged, `summary()` output | not run | | | | |

## Sign-off

Overall status: `not run`. No row above has been tested as of this template.

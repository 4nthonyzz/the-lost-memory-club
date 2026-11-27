# World Exploration: Integration Proposals Register (P1 to P10)

Created by task 16.1 (documentation only). Statuses were checked against the repository, not copied from design.md.

> **Superseded wording.** `requirements.md` (section 17) and `design.md` ("Integration proposals" table and the P1 notes) still say that `src/App.tsx` is unmodified and that P3, P4 and P8 are pending. That wording predates the approved scope change M5 (see `integration-notes.md`). This register reflects the current repository state. The older documents are not edited here.

## Status legend

- **Implemented**: present in the repository and verified by inspection.
- **Pending**: not approved or not done. The fallback applies.
- **Partially superseded**: the original intent was covered by another approved change.

## Register

| ID | Proposal | Status | Affected files | Owner | Fallback in use | Notes |
|----|----------|--------|----------------|-------|-----------------|-------|
| P1 | Optional `inputEnabled?: boolean` (default true); App passes `inputEnabled={station === null}` | **Approved and IMPLEMENTED on both sides** | `src/world/WorldScene.tsx`, `src/App.tsx` | team coordination | None needed. When the prop is absent the world still uses the Inspecting_State plus Resume_Action path. | World: prop declared in `WorldSceneProps` and forwarded to `useWorldInput`. App: `<WorldScene inputEnabled={station === null} ... />`. Implemented through approved scope change M5. |
| P2 | Optional `reducedDistortion?: boolean` (default false), wired by App to the shared setting | **Pending** | `src/world/WorldScene.tsx`, `src/App.tsx` | team coordination | OS `prefers-reduced-motion` only (`useReducedMotion`) | Verified: no `reducedDistortion` prop exists in `WorldScene.tsx` or `App.tsx`. The world has no in-game reduced-distortion toggle link yet. |
| P3 | CSS rules for Capture_Overlay, Interaction_Prompt and controls hint in `src/styles.css` | **Implemented for App/HUD/modal styles via approved M5. World overlay move not done.** | `src/styles.css`, `src/world/overlay/world.css` | team coordination | World overlay styles stay in `src/world/overlay/world.css`, imported from `src/world/` | `src/styles.css` now holds the `.hud-*` rules (progress, status, drawer) and the modal layer. The overlay rules for the world still live in `src/world/overlay/world.css`. Moving them is task 16.3, which is optional (`*`) and **unimplemented**. |
| P4 | Update App status text and scene-card hint for the new controls | **Implemented via approved M5** | `src/App.tsx`, `src/styles.css` | team coordination | None needed | App renders a PROTOTYPE tag, progress booleans (TAPE, CLUE, ARCADE, ENDING), a `role="status"` HUD message line and a menu drawer with the controls summary. |
| P5 | Add `@react-three/drei` dependency | **Pending, not needed** | `package.json` | team coordination | `GLTFLoader` from `three/examples/jsm` | Verified: `drei` is not in `package.json`. No implementation work is planned. |
| P6 | Add GLB records to `docs/THIRD_PARTY_ASSETS.md` | **Pending** | `docs/THIRD_PARTY_ASSETS.md` | team coordination | `.kiro/specs/world-exploration/asset-log.md` is the interim record | No external assets are used, so there is nothing to record in the shared file yet. |
| P7 | Mark Developer 1 tasks complete in `.kiro/specs/game-foundation/tasks.md` after verification | **Pending** | `.kiro/specs/game-foundation/tasks.md` | team coordination | Tasks are not marked | Outside the world spec folder. |
| P8 | App-side more prominent locked-arcade message (Status_Line styling) | **Partially superseded** by the HUD status line (M5) | `src/App.tsx`, `src/styles.css` | team coordination (owner of `App.tsx`) | HUD `role="status"` line at the bottom center | The lock text itself is unchanged in `src/App.tsx`: `ARCADE LOCKED · Recover the VHS clue first.` Only the surrounding presentation changed. No separate locked-message styling was added. |
| P9 | Dev dependencies `fast-check`, `jsdom`, `@testing-library/react` (plus `@testing-library/dom`) | **Approved and installed, except `fast-check`** | `package.json`, `package-lock.json` | team coordination | Property tests are deferred. Example-based and reducer-level tests are used. | Verified in `package.json` devDependencies: `jsdom`, `@testing-library/react`, `@testing-library/dom` present. `fast-check` is **NOT installed**, so the optional property-based test tasks are deferred (gap per Requirement 13.14). |
| P10 | `tools/blender/` for original Python `bpy` scripts | **Approved. Folder exists. Scripts untested.** | `tools/blender/` (`generate_assets.py`, `count_triangles.py`, `README.md`) | team coordination | None needed. The world works without Blender and without GLB assets. | The scripts are untested because Blender was not installed on the development machine. Do not claim they work. |

## Reading notes

- P1, P3 (partly), P4 and P8 (partly) changed `src/App.tsx` and `src/styles.css` under approved scope change M5. This is an exception to the earlier "App.tsx not modified" rule.
- P2, P5, P6 and P7 remain pending. The world works without them.
- Nothing in this register is a claim of tested behavior beyond what `integration-notes.md` and the test suite state.

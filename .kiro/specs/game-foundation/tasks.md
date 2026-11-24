# Game foundation — Tasks (INITIAL DRAFT)

> Review and refine these tasks in Kiro IDE. Items are deliberately unchecked until independently verified.

## Foundation (joint ownership)

- [ ] Review requirements and technical design in Kiro IDE; resolve open decisions together.
- [ ] Approve shared event/state contracts and versioning strategy.
- [ ] Run `npm install`, `npm test` and `npm run build`; commit the generated lockfile.
- [ ] Connect three GitHub collaborators and agree on branch/review rules.
- [ ] Create actual Kiro hooks for tests, confirm trigger execution and preserve logs.

## Developer 1 — World

- [ ] Replace static scene prototype with first-person desktop movement and camera.
- [ ] Add basic collision handling and E-key proximity interaction.
- [ ] Create one compact archive with CRT and arcade machine.
- [ ] React to ARCADE_WON with an obvious visual world change.
- [ ] Test input and 3D scene performance on target hardware.

## Developer 2 — Arcade

- [ ] Implement complete original Snake logic as testable pure functions.
- [ ] Create Canvas renderer, input, score, start/win/lose UI.
- [ ] Emit ARCADE_STARTED and ARCADE_WON with approved payloads.
- [ ] Add unit and property-based tests for movement and collision invariants.
- [ ] Integrate gameplay into arcade station without cross-module imports.

## Developer 3 — VHS / Story / UI

- [ ] Implement genuine VHS play/pause/rewind mechanics and clue inspection.
- [ ] Write concise original English lore and ending.
- [ ] Add audio/visual effects with reduced-distortion toggle.
- [ ] Integrate LocalStorage save and restart flow; test reload.
- [ ] Coordinate main menu, accessible interactions, deployment and README.

## Final release (joint ownership)

- [ ] Verify one full 5–8 minute end-to-end playthrough.
- [ ] Publish source/license/.kiro/ and all authorized assets.
- [ ] Deploy publicly and verify on an independent device.
- [ ] Capture factual evidence of Kiro specs/hooks/agents/PBT work.
- [ ] Publish a public YouTube demonstration below 3 minutes and submit on Devpost.

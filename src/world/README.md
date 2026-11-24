# World and exploration — Developer 1

Current implementation: **static 3D room proof of concept**, click-to-inspect stations. This is NOT a first-person game yet.

Contract: `WorldScene({ onInspect, memoryShifted })`. `onInspect` accepts a `StationId` from `src/core/contracts.ts` and is implemented by the App shell.

Next: movement/camera, collision and E-key proximity interaction, one small scene, visual response after Snake victory. Do not manage LocalStorage or import arcade/memories components.

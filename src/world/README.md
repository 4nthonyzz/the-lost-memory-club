# World and exploration — Developer 1

## M1 status (prototype, playable room)

`WorldScene` renders one small first-person room: WASD movement, mouse look after pointer lock (click the scene), wall/prop collision, and an E-key prompt near the CRT (`vhs`) and arcade stations. E calls `onInspect(stationId)`. The old click-to-inspect behavior is removed. If WebGL is unavailable, rendering throws, or a lost context is not restored within 3 s, a fallback with two buttons calls `onInspect('vhs')` / `onInspect('arcade')`.

- Tested: pure logic in `logic/` and `layout/` (movement, collision, look, targeting, input state/mode, palette, layout) by Vitest.
- Not manually verified yet: rendering, pointer lock, the E interaction in a browser, context-loss fallback, performance. Nothing here is measured.
- Not implemented: keyboard look (I/J/K/L), the `inputEnabled` prop, extra rooms, Blender/GLB assets.
- Known limitation: `App.tsx` does not pass `inputEnabled`, so after a station panel closes the player must resume by clicking the scene (or pressing Enter/E on the capture overlay). Resume is always user-initiated.

## Original notes

Contract: `WorldScene({ onInspect, memoryShifted })`. `onInspect` accepts a `StationId` from `src/core/contracts.ts` and is implemented by the App shell.

Next: movement/camera, collision and E-key proximity interaction, one small scene, visual response after Snake victory. Do not manage LocalStorage or import arcade/memories components.

// Player rig: per-frame movement, mouse look, camera and target evaluation.
// Must be called from a component inside the R3F <Canvas>. All per-frame state
// lives in refs; React is notified only when the interaction target changes.
// Mouse and keyboard look (I/J/K/L) both apply in any lock state; frozen while inspecting.
import { useCallback, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { relocateToValid } from '../logic/collision';
import { EYE_HEIGHT, PLAYER_RADIUS } from '../logic/constants';
import type { HeldKeys } from '../logic/inputState';
import type { InputMode } from '../logic/inputMode';
import type { Look } from '../logic/look';
import { stepPlayer } from '../logic/playerStep';
import { selectInteractionTargetAll } from '../logic/targeting';
import { COLLIDERS, INTERACTABLE_DEFS, ROOM, STATION_DEFS } from '../layout/roomLayout';
import type { InteractionTarget, Vec2 } from '../worldTypes';
import type { MouseDelta } from './usePointerLock';

export interface UsePlayerRigOptions {
  heldKeysRef: { current: HeldKeys };
  consumeMouseDelta: () => MouseDelta;
  getMode: () => InputMode;
  /** Called only when the interaction target changes. */
  onTargetChange?: (target: InteractionTarget | null) => void;
}

export interface PlayerRig {
  /** Latest interaction target. Pass to useWorldInput's `getTarget`. */
  getTarget: () => InteractionTarget | null;
}

/** Targets are equal when they refer to the same Station entry or the same prop entry. */
function sameTarget(a: InteractionTarget | null, b: InteractionTarget | null): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (a.type === 'station' && b.type === 'station') return a.station === b.station;
  if (a.type === 'prop' && b.type === 'prop') return a.prop === b.prop;
  return false;
}

export function usePlayerRig(options: UsePlayerRigOptions): PlayerRig {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const posRef = useRef<Vec2 | null>(null);
  if (posRef.current === null) {
    posRef.current = relocateToValid(ROOM.start, PLAYER_RADIUS, COLLIDERS, ROOM.bounds, ROOM.start);
  }
  const lookRef = useRef<Look>({ yaw: ROOM.startYaw, pitch: 0 });
  const targetRef = useRef<InteractionTarget | null>(null);

  const getTarget = useCallback((): InteractionTarget | null => targetRef.current, []);

  useFrame((state, delta) => {
    const { heldKeysRef, consumeMouseDelta, getMode, onTargetChange } = optionsRef.current;
    const camera = state.camera;
    let pos = posRef.current as Vec2;

    const mode = getMode();
    if (mode !== 'inspecting') {
      const step = stepPlayer({
        pos,
        look: lookRef.current,
        keys: heldKeysRef.current,
        mouseDelta: consumeMouseDelta(),
        dt: delta,
        mode,
        colliders: COLLIDERS,
        bounds: ROOM.bounds,
      });
      pos = step.pos;
      posRef.current = pos;
      lookRef.current = step.look;

      const target = selectInteractionTargetAll(pos, lookRef.current.yaw, STATION_DEFS, INTERACTABLE_DEFS, COLLIDERS);
      if (!sameTarget(target, targetRef.current)) {
        targetRef.current = target;
        onTargetChange?.(target);
      }
    }

    // No roll (Requirement 10.5): order YXZ, rotation.z is always 0.
    camera.rotation.order = 'YXZ';
    camera.position.set(pos.x, EYE_HEIGHT, pos.z);
    camera.rotation.set(lookRef.current.pitch, lookRef.current.yaw, 0);
  });

  return { getTarget };
}

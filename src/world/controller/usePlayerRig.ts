// Player rig: per-frame movement, mouse look, camera and target evaluation.
// Must be called from a component inside the R3F <Canvas>. All per-frame state
// lives in refs; React is notified only when the interaction target changes.
// Mouse and keyboard look (I/J/K/L) both apply in any lock state; frozen while inspecting.
import { useCallback, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useReducedMotion } from './useReducedMotion';
import { relocateToValid } from '../logic/collision';
import { EYE_HEIGHT, PLAYER_RADIUS } from '../logic/constants';
import type { HeldKeys } from '../logic/inputState';
import type { InputMode } from '../logic/inputMode';
import type { Look } from '../logic/look';
import { CARD_CLOSE_DISTANCE, shouldCloseCard } from '../logic/propState';
import { stepPlayer } from '../logic/playerStep';
import { selectInteractionTargetAll } from '../logic/targeting';
import { COLLIDERS, INTERACTABLE_DEFS, ROOM, STATION_DEFS } from '../layout/roomLayout';
import type { InteractionTarget, Vec2 } from '../worldTypes';
import type { MouseDelta } from './usePointerLock';

export interface UsePlayerRigOptions {
  heldKeysRef: { current: HeldKeys };
  consumeMouseDelta: () => MouseDelta;
  /** Optional counter bumped when input is cleared (blur, CLEAR_INPUT). A change snaps velocity to 0 and the look to its target. */
  clearEpochRef?: { current: number };
  getMode: () => InputMode;
  /** Called only when the interaction target changes. */
  onTargetChange?: (target: InteractionTarget | null) => void;
  /** True while the Memory_Shift look is on. Props with `requiresShift` (the poster) are targetable only then. */
  memoryShifted?: boolean;
  /** Anchor of the prop whose Archive Document Card is open, or null. Read from a ref each frame, no React state. */
  getCardAnchor?: () => Vec2 | null;
  /** Called when the player walks beyond CARD_CLOSE_DISTANCE from the open card's anchor. Must be idempotent. */
  onCardAutoClose?: () => void;
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
  // lookRef is the RENDERED look (camera, movement direction, targeting). targetLookRef takes the raw input.
  const lookRef = useRef<Look>({ yaw: ROOM.startYaw, pitch: 0 });
  const targetLookRef = useRef<Look>({ yaw: ROOM.startYaw, pitch: 0 });
  const velocityRef = useRef<Vec2>({ x: 0, z: 0 });
  const reducedMotion = useReducedMotion();
  const reducedRef = useRef(reducedMotion);
  const seenEpochRef = useRef(0);
  reducedRef.current = reducedMotion;
  const targetRef = useRef<InteractionTarget | null>(null);

  const getTarget = useCallback((): InteractionTarget | null => targetRef.current, []);

  useFrame((state, delta) => {
    const { heldKeysRef, consumeMouseDelta, clearEpochRef, getMode, onTargetChange, memoryShifted, getCardAnchor, onCardAutoClose } = optionsRef.current;
    const camera = state.camera;
    let pos = posRef.current as Vec2;

    const mode = getMode();
    const epoch = clearEpochRef?.current ?? 0;
    const snap = epoch !== seenEpochRef.current;
    seenEpochRef.current = epoch;
    // In 'inspecting' stepPlayer freezes: zero velocity, rendered look snaps to the target, mouse delta is not consumed.
    const step = stepPlayer({
      pos,
      look: lookRef.current,
      targetLook: targetLookRef.current,
      velocity: velocityRef.current,
      reducedMotion: reducedRef.current,
      snap,
      keys: heldKeysRef.current,
      mouseDelta: mode === 'inspecting' ? { x: 0, y: 0 } : consumeMouseDelta(),
      dt: delta,
      mode,
      colliders: COLLIDERS,
      bounds: ROOM.bounds,
    });
    pos = step.pos;
    posRef.current = pos;
    lookRef.current = step.look;
    targetLookRef.current = step.targetLook;
    velocityRef.current = step.velocity;

    if (mode !== 'inspecting') {
      const target = selectInteractionTargetAll(pos, lookRef.current.yaw, STATION_DEFS, INTERACTABLE_DEFS, COLLIDERS, undefined, memoryShifted === true);
      if (!sameTarget(target, targetRef.current)) {
        targetRef.current = target;
        onTargetChange?.(target);
      }

      // Walking away closes an open card. Only reads a ref; the callback clears the anchor so it fires once.
      const cardAnchor = getCardAnchor?.() ?? null;
      if (cardAnchor !== null && shouldCloseCard(pos, cardAnchor, CARD_CLOSE_DISTANCE)) onCardAutoClose?.();
    }

    // No roll (Requirement 10.5): order YXZ, rotation.z is always 0.
    camera.rotation.order = 'YXZ';
    camera.position.set(pos.x, EYE_HEIGHT, pos.z);
    camera.rotation.set(lookRef.current.pitch, lookRef.current.yaw, 0);
  });

  return { getTarget };
}

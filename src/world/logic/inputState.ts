import type { MovementInput } from '../worldTypes';

export type KeyRole =
  | 'forward'
  | 'backward'
  | 'left'
  | 'right'
  | 'yawLeft'
  | 'yawRight'
  | 'pitchUp'
  | 'pitchDown'
  | 'interact';

/** Structurally identical to LookKeys in look.ts (added by task 7.1). */
export interface LookKeys {
  yawLeft: boolean;
  yawRight: boolean;
  pitchUp: boolean;
  pitchDown: boolean;
}

const ROLE_BY_CODE: Readonly<Record<string, KeyRole>> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  KeyJ: 'yawLeft',
  KeyL: 'yawRight',
  KeyI: 'pitchUp',
  KeyK: 'pitchDown',
  KeyE: 'interact',
};

/** Maps a physical key (event.code) to a role, or null when unused. */
export function keyRole(code: string): KeyRole | null {
  return Object.prototype.hasOwnProperty.call(ROLE_BY_CODE, code) ? ROLE_BY_CODE[code] : null;
}

export interface KeyTargetInfo {
  tagName: string;
  isContentEditable: boolean;
  insideWorldWrapper: boolean;
}

const REJECTED_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON']);

export function isKeyEventAccepted(t: KeyTargetInfo): boolean {
  if (!t.insideWorldWrapper) return false;
  if (t.isContentEditable) return false;
  return !REJECTED_TAGS.has(t.tagName.toUpperCase());
}

export interface HeldKeys {
  readonly roles: ReadonlySet<KeyRole>;
}

export type HeldKeyEvent =
  | { type: 'down'; role: KeyRole }
  | { type: 'up'; role: KeyRole }
  | { type: 'clear' };

export const EMPTY_HELD_KEYS: HeldKeys = { roles: new Set<KeyRole>() };

export function reduceHeldKeys(s: HeldKeys, e: HeldKeyEvent): HeldKeys {
  switch (e.type) {
    case 'down': {
      if (s.roles.has(e.role)) return s;
      const next = new Set(s.roles);
      next.add(e.role);
      return { roles: next };
    }
    case 'up': {
      if (!s.roles.has(e.role)) return s;
      const next = new Set(s.roles);
      next.delete(e.role);
      return { roles: next };
    }
    case 'clear':
      return s.roles.size === 0 ? s : { roles: new Set<KeyRole>() };
  }
}

export function toMovementInput(s: HeldKeys): MovementInput {
  return {
    forward: s.roles.has('forward'),
    backward: s.roles.has('backward'),
    left: s.roles.has('left'),
    right: s.roles.has('right'),
  };
}

export function toLookKeys(s: HeldKeys): LookKeys {
  return {
    yawLeft: s.roles.has('yawLeft'),
    yawRight: s.roles.has('yawRight'),
    pitchUp: s.roles.has('pitchUp'),
    pitchDown: s.roles.has('pitchDown'),
  };
}

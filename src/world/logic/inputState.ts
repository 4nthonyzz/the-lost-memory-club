import type { MovementInput } from '../worldTypes';
import type { LookKeys } from './look';

export type { LookKeys };

export type KeyRole =
  | 'forward'
  | 'backward'
  | 'left'
  | 'right'
  | 'yawLeft'
  | 'yawRight'
  | 'pitchUp'
  | 'pitchDown'
  | 'interact'
  | 'page1'
  | 'page2'
  | 'track3'
  | 'track4'
  | 'track5'
  | 'scrollPageUp'
  | 'scrollPageDown'
  | 'mute';

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
  Digit1: 'page1',
  Numpad1: 'page1',
  Digit2: 'page2',
  Numpad2: 'page2',
  Digit3: 'track3',
  Numpad3: 'track3',
  Digit4: 'track4',
  Numpad4: 'track4',
  Digit5: 'track5',
  Numpad5: 'track5',
  PageUp: 'scrollPageUp',
  PageDown: 'scrollPageDown',
  KeyM: 'mute',
};

/** Roles that are one-shot actions, never held (interact, the card page and track keys, PageUp / PageDown and mute). */
export function isActionRole(role: KeyRole): boolean {
  return (
    role === 'interact' ||
    role === 'page1' ||
    role === 'page2' ||
    role === 'track3' ||
    role === 'track4' ||
    role === 'track5' ||
    role === 'scrollPageUp' ||
    role === 'scrollPageDown' ||
    role === 'mute'
  );
}

/**
 * Index (0..4) of the turntable track a digit role selects while the turntable card is open: keys 1..5 map to tracks 0..4.
 * Null for every other role.
 */
export function trackIndexForRole(role: KeyRole | null): number | null {
  switch (role) {
    case 'page1':
      return 0;
    case 'page2':
      return 1;
    case 'track3':
      return 2;
    case 'track4':
      return 3;
    case 'track5':
      return 4;
    default:
      return null;
  }
}

/** A request to scroll the open Archive Document Card: one line step or one page, up (-1) or down (1). */
export interface CardScroll {
  kind: 'line' | 'page';
  dir: -1 | 1;
}

/** Keys that scroll the card while it is open. ArrowUp / ArrowDown stop being movement keys in that state. */
export function cardScrollFor(code: string): CardScroll | null {
  switch (code) {
    case 'ArrowUp':
      return { kind: 'line', dir: -1 };
    case 'ArrowDown':
      return { kind: 'line', dir: 1 };
    case 'PageUp':
      return { kind: 'page', dir: -1 };
    case 'PageDown':
      return { kind: 'page', dir: 1 };
    default:
      return null;
  }
}

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

import { describe, expect, it } from 'vitest';
import {
  EMPTY_HELD_KEYS,
  cardScrollFor,
  isActionRole,
  isKeyEventAccepted,
  keyRole,
  reduceHeldKeys,
  toLookKeys,
  toMovementInput,
  type HeldKeys,
  type KeyTargetInfo,
} from './inputState';

const ok: KeyTargetInfo = { tagName: 'DIV', isContentEditable: false, insideWorldWrapper: true };

describe('keyRole', () => {
  it('maps physical codes to roles', () => {
    expect(keyRole('KeyW')).toBe('forward');
    expect(keyRole('ArrowUp')).toBe('forward');
    expect(keyRole('KeyS')).toBe('backward');
    expect(keyRole('ArrowDown')).toBe('backward');
    expect(keyRole('KeyA')).toBe('left');
    expect(keyRole('ArrowLeft')).toBe('left');
    expect(keyRole('KeyD')).toBe('right');
    expect(keyRole('ArrowRight')).toBe('right');
    expect(keyRole('KeyJ')).toBe('yawLeft');
    expect(keyRole('KeyL')).toBe('yawRight');
    expect(keyRole('KeyI')).toBe('pitchUp');
    expect(keyRole('KeyK')).toBe('pitchDown');
    expect(keyRole('KeyE')).toBe('interact');
  });

  it('maps the digit and numpad keys 1 and 2 to the page roles (task 27.2)', () => {
    expect(keyRole('Digit1')).toBe('page1');
    expect(keyRole('Numpad1')).toBe('page1');
    expect(keyRole('Digit2')).toBe('page2');
    expect(keyRole('Numpad2')).toBe('page2');
    expect(keyRole('Digit3')).toBeNull();
    expect(isActionRole('page1')).toBe(true);
    expect(isActionRole('page2')).toBe(true);
    expect(isActionRole('interact')).toBe(true);
    expect(isActionRole('forward')).toBe(false);
  });

  it('returns null for unused codes', () => {
    expect(keyRole('Escape')).toBeNull();
    expect(keyRole('Space')).toBeNull();
    expect(keyRole('w')).toBeNull();
    expect(keyRole('toString')).toBeNull();
  });
});

describe('isKeyEventAccepted', () => {
  it('accepts a plain element inside the wrapper', () => {
    expect(isKeyEventAccepted(ok)).toBe(true);
    expect(isKeyEventAccepted({ ...ok, tagName: 'CANVAS' })).toBe(true);
  });

  it.each(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'input', 'button'])('rejects %s', (tagName) => {
    expect(isKeyEventAccepted({ ...ok, tagName })).toBe(false);
  });

  it('rejects contenteditable', () => {
    expect(isKeyEventAccepted({ ...ok, isContentEditable: true })).toBe(false);
  });

  it('rejects targets outside the wrapper', () => {
    expect(isKeyEventAccepted({ ...ok, insideWorldWrapper: false })).toBe(false);
  });
});

describe('reduceHeldKeys', () => {
  it('adds and removes roles without mutating the input', () => {
    const down = reduceHeldKeys(EMPTY_HELD_KEYS, { type: 'down', role: 'forward' });
    expect(down.roles.has('forward')).toBe(true);
    expect(EMPTY_HELD_KEYS.roles.size).toBe(0);
    const up = reduceHeldKeys(down, { type: 'up', role: 'forward' });
    expect(up.roles.size).toBe(0);
    expect(down.roles.has('forward')).toBe(true);
  });

  it('handles repeated down and unmatched up', () => {
    const a = reduceHeldKeys(EMPTY_HELD_KEYS, { type: 'down', role: 'left' });
    expect(reduceHeldKeys(a, { type: 'down', role: 'left' }).roles.size).toBe(1);
    expect(reduceHeldKeys(a, { type: 'up', role: 'right' }).roles.size).toBe(1);
  });

  it('clear empties the set', () => {
    let s: HeldKeys = EMPTY_HELD_KEYS;
    s = reduceHeldKeys(s, { type: 'down', role: 'forward' });
    s = reduceHeldKeys(s, { type: 'down', role: 'yawLeft' });
    s = reduceHeldKeys(s, { type: 'down', role: 'interact' });
    s = reduceHeldKeys(s, { type: 'clear' });
    expect(s.roles.size).toBe(0);
    expect(toMovementInput(s)).toEqual({ forward: false, backward: false, left: false, right: false });
    expect(toLookKeys(s)).toEqual({ yawLeft: false, yawRight: false, pitchUp: false, pitchDown: false });
  });
});

describe('toMovementInput and toLookKeys', () => {
  it('projects held roles', () => {
    let s: HeldKeys = EMPTY_HELD_KEYS;
    for (const role of ['forward', 'right', 'yawRight', 'pitchDown', 'interact'] as const) {
      s = reduceHeldKeys(s, { type: 'down', role });
    }
    expect(toMovementInput(s)).toEqual({ forward: true, backward: false, left: false, right: true });
    expect(toLookKeys(s)).toEqual({ yawLeft: false, yawRight: true, pitchUp: false, pitchDown: true });
  });
});

describe('card scroll keys (task 28.1)', () => {
  it('maps PageUp / PageDown to one-shot roles that are never held', () => {
    expect(keyRole('PageUp')).toBe('scrollPageUp');
    expect(keyRole('PageDown')).toBe('scrollPageDown');
    expect(isActionRole('scrollPageUp')).toBe(true);
    expect(isActionRole('scrollPageDown')).toBe(true);
  });

  it('cardScrollFor maps the four scroll keys and nothing else', () => {
    expect(cardScrollFor('ArrowUp')).toEqual({ kind: 'line', dir: -1 });
    expect(cardScrollFor('ArrowDown')).toEqual({ kind: 'line', dir: 1 });
    expect(cardScrollFor('PageUp')).toEqual({ kind: 'page', dir: -1 });
    expect(cardScrollFor('PageDown')).toEqual({ kind: 'page', dir: 1 });
    expect(cardScrollFor('KeyW')).toBeNull();
    expect(cardScrollFor('ArrowLeft')).toBeNull();
  });
});

describe('mute key (task 32.2)', () => {
  it('maps KeyM to a one-shot mute role that is never held and follows the key filter', () => {
    expect(keyRole('KeyM')).toBe('mute');
    expect(isActionRole('mute')).toBe(true);
    expect(isKeyEventAccepted(ok)).toBe(true);
    expect(isKeyEventAccepted({ ...ok, tagName: 'INPUT' })).toBe(false);
    expect(isKeyEventAccepted({ ...ok, insideWorldWrapper: false })).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { initialModeState, reduceMode, type ModeEvent, type ModeState } from './inputMode';

const run = (s: ModeState, ...events: ModeEvent[]) =>
  events.reduce((acc, e) => reduceMode(acc.state, e), { state: s, effects: [] as ReturnType<typeof reduceMode>['effects'] });

const hasType = (effects: { type: string }[], t: string) => effects.some((x) => x.type === t);

describe('pointer lock fallback transitions (Req 4.8, 4.11, 5.1, 5.2)', () => {
  it.each(['LOCK_DENIED', 'LOCK_UNSUPPORTED'] as const)(
    '%s sets keyboardLookHint, stays in capturePending, emits no lock request',
    (type) => {
      const r = reduceMode(initialModeState(), { type });
      expect(r.state.keyboardLookHint).toBe(true);
      expect(r.state.mode).toBe('capturePending');
      expect(hasType(r.effects, 'REQUEST_POINTER_LOCK')).toBe(false);
      expect(r.effects).toEqual([]);
    },
  );

  it.each(['LOCK_DENIED', 'LOCK_UNSUPPORTED'] as const)(
    'a CANVAS_CLICK after %s emits a new lock request',
    (type) => {
      const denied = reduceMode(initialModeState(), { type }).state;
      const r = reduceMode(denied, { type: 'CANVAS_CLICK' });
      expect(hasType(r.effects, 'REQUEST_POINTER_LOCK')).toBe(true);
      expect(r.state.mode).toBe('capturePending');
      expect(r.state.keyboardLookHint).toBe(true);
    },
  );

  it('LOCK_LOST from active returns to capturePending without CALL_ON_INSPECT', () => {
    const active = run(initialModeState(), { type: 'LOCK_ACQUIRED' }).state;
    expect(active.mode).toBe('active');
    const r = reduceMode(active, { type: 'LOCK_LOST' });
    expect(r.state.mode).toBe('capturePending');
    expect(r.state.pointerLocked).toBe(false);
    expect(hasType(r.effects, 'CALL_ON_INSPECT')).toBe(false);
  });

  it('repeated denials never leave capturePending', () => {
    const r = run(
      initialModeState(),
      { type: 'LOCK_DENIED' },
      { type: 'LOCK_UNSUPPORTED' },
      { type: 'LOCK_DENIED' },
    );
    expect(r.state.mode).toBe('capturePending');
    expect(r.state.keyboardLookHint).toBe(true);
  });

  it('LOCK_ACQUIRED clears keyboardLookHint; LOCK_LOST does not set or clear it', () => {
    const denied = run(initialModeState(), { type: 'LOCK_DENIED' }, { type: 'CANVAS_CLICK' });
    expect(denied.state.keyboardLookHint).toBe(true);
    const lostWhileHinted = reduceMode(denied.state, { type: 'LOCK_LOST' });
    expect(lostWhileHinted.state.keyboardLookHint).toBe(true);
    const r = reduceMode(denied.state, { type: 'LOCK_ACQUIRED' });
    expect(r.state.mode).toBe('active');
    expect(r.state.keyboardLookHint).toBe(false);
    const lost = reduceMode(r.state, { type: 'LOCK_LOST' });
    expect(lost.state.keyboardLookHint).toBe(false);
  });
});

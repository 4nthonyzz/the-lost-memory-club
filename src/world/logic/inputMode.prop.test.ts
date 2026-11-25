// E on a world-local prop (task 23.2): handled inside the world, never suspends world input.
import { describe, expect, it } from 'vitest';
import type { PropInteractableId } from '../worldTypes';
import { initialModeState, reduceMode, type ModeEffect, type ModeEvent, type ModeState } from './inputMode';

const propE = (id: PropInteractableId = 'desk-lamp-left', o: Partial<Extract<ModeEvent, { type: 'KEY_DOWN' }>> = {}): ModeEvent => ({
  type: 'KEY_DOWN',
  role: 'interact',
  code: 'KeyE',
  repeat: false,
  accepted: true,
  hasTarget: true,
  targetKind: 'prop',
  targetPropId: id,
  ...o,
});
const keyUpE: ModeEvent = { type: 'KEY_UP', role: 'interact' };
const stationE: ModeEvent = { type: 'KEY_DOWN', role: 'interact', code: 'KeyE', repeat: false, accepted: true, hasTarget: true, targetKind: 'station' };

function run(s: ModeState, events: ModeEvent[]) {
  const all: ModeEffect[] = [];
  let state = s;
  for (const ev of events) {
    const r = reduceMode(state, ev);
    state = r.state;
    all.push(...r.effects);
  }
  return { state, effects: all };
}

const variants: Array<[string, boolean | undefined]> = [
  ['prop absent', undefined],
  ['supplied true', true],
];

describe.each(variants)('E on a prop (%s)', (_label, enabled) => {
  const pending = () => initialModeState(enabled);
  const active = () => reduceMode(pending(), { type: 'LOCK_ACQUIRED' }).state;

  it.each([
    ['active', active],
    ['capturePending', pending],
  ] as const)('in %s emits only PROP_INTERACT and keeps the mode and the pointer lock', (_m, make) => {
    const s = make();
    const r = reduceMode(s, propE('manual-maze'));
    expect(r.effects).toEqual([{ type: 'PROP_INTERACT', id: 'manual-maze' }]);
    expect(r.state.mode).toBe(s.mode);
    expect(r.state.pointerLocked).toBe(s.pointerLocked);
    expect(r.state.eRepeatGuard).toBe(true);
  });

  it('emits exactly one PROP_INTERACT per key press, and none of CALL_ON_INSPECT, RELEASE_POINTER_LOCK or CLEAR_INPUT', () => {
    const { state, effects } = run(active(), [
      propE(),
      propE('desk-lamp-left', { repeat: true }),
      propE(),
      keyUpE,
      propE(),
      keyUpE,
    ]);
    const kinds = effects.map((e) => e.type);
    expect(kinds).toEqual(['PROP_INTERACT', 'PROP_INTERACT']);
    expect(state.mode).toBe('active');
    expect(state.eRepeatGuard).toBe(false);
  });

  it('a station E right after a prop E is still guarded until the key is released, then inspects as before', () => {
    const { effects } = run(active(), [propE(), stationE, keyUpE, stationE]);
    expect(effects.map((e) => e.type)).toEqual(['PROP_INTERACT', 'CALL_ON_INSPECT', 'RELEASE_POINTER_LOCK', 'CLEAR_INPUT']);
  });

  it('is ignored while inspecting (E resumes instead)', () => {
    const inspecting = reduceMode(active(), stationE).state;
    expect(inspecting.mode).toBe(enabled === undefined ? 'inspecting' : 'capturePending');
    if (inspecting.mode !== 'inspecting') return;
    const r = reduceMode({ ...inspecting, eRepeatGuard: false }, propE());
    expect(r.effects.some((e) => e.type === 'PROP_INTERACT')).toBe(false);
  });
});

describe('E on a prop while suspended by inputEnabled=false', () => {
  it('does nothing', () => {
    const s = initialModeState(false);
    const r = reduceMode(s, propE());
    expect(r.effects).toEqual([]);
    expect(r.state).toBe(s);
  });
});

describe('station E is unchanged when targetKind is supplied', () => {
  it('matches the event without targetKind', () => {
    const s = reduceMode(initialModeState(), { type: 'LOCK_ACQUIRED' }).state;
    const legacy: ModeEvent = { type: 'KEY_DOWN', role: 'interact', code: 'KeyE', repeat: false, accepted: true, hasTarget: true };
    expect(reduceMode(s, stationE)).toEqual(reduceMode(s, legacy));
  });
});

describe('E with no target while an Archive Document Card is open (task 24.2)', () => {
  const noTargetE = (o: Partial<Extract<ModeEvent, { type: 'KEY_DOWN' }>> = {}): ModeEvent => ({
    type: 'KEY_DOWN',
    role: 'interact',
    code: 'KeyE',
    repeat: false,
    accepted: true,
    hasTarget: false,
    cardOpen: true,
    ...o,
  });

  it.each([undefined, true])('emits CLOSE_CARD only, once per press, in active mode (inputEnabled %s)', (enabled) => {
    const active = reduceMode(initialModeState(enabled), { type: 'LOCK_ACQUIRED' }).state;
    const { state, effects } = run(active, [noTargetE(), noTargetE({ repeat: true }), noTargetE(), keyUpE, noTargetE(), keyUpE]);
    expect(effects).toEqual([{ type: 'CLOSE_CARD' }, { type: 'CLOSE_CARD' }]);
    expect(state.mode).toBe('active');
    expect(state.pointerLocked).toBe(true);
  });

  it('closes instead of requesting pointer lock when the mode is capturePending', () => {
    const r = reduceMode(initialModeState(), noTargetE());
    expect(r.effects).toEqual([{ type: 'CLOSE_CARD' }]);
  });

  it('does nothing without an open card (unchanged behaviour)', () => {
    const active = reduceMode(initialModeState(), { type: 'LOCK_ACQUIRED' }).state;
    expect(reduceMode(active, noTargetE({ cardOpen: false })).effects).toEqual([]);
  });

  it('a station target still inspects while a card is open', () => {
    const active = reduceMode(initialModeState(), { type: 'LOCK_ACQUIRED' }).state;
    const r = reduceMode(active, { ...stationE, cardOpen: true } as ModeEvent);
    expect(r.effects.map((e) => e.type)).toEqual(['CALL_ON_INSPECT', 'RELEASE_POINTER_LOCK', 'CLEAR_INPUT']);
  });
});

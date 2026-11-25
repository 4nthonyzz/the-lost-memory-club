import { describe, expect, it } from 'vitest';
import { INTERACTABLE_DEFS, STATION_DEFS } from '../layout/roomLayout';
import {
  LAMP_MESSAGE_OFF,
  LAMP_MESSAGE_ON,
  MANUAL_TEXT,
  initialPropState,
  propPromptText,
  reducePropInteract,
  reduceTargetChange,
} from './propState';

const propTarget = (id: string) => ({ type: 'prop' as const, prop: INTERACTABLE_DEFS.find((d) => d.id === id)! });

describe('prop state reducer (task 23.2)', () => {
  it('starts with both lamps on and no message', () => {
    expect(initialPropState()).toEqual({ lampOn: { 'desk-lamp-left': true, 'desk-lamp-right': true }, message: null });
  });

  it('toggles each lamp independently with the exact messages', () => {
    let s = reducePropInteract(initialPropState(), 'desk-lamp-left');
    expect(s.lampOn).toEqual({ 'desk-lamp-left': false, 'desk-lamp-right': true });
    expect(s.message).toEqual({ id: 'desk-lamp-left', text: 'Desk lamp turned off.' });
    s = reducePropInteract(s, 'desk-lamp-right');
    expect(s.lampOn).toEqual({ 'desk-lamp-left': false, 'desk-lamp-right': false });
    s = reducePropInteract(s, 'desk-lamp-left');
    expect(s.lampOn).toEqual({ 'desk-lamp-left': true, 'desk-lamp-right': false });
    expect(s.message).toEqual({ id: 'desk-lamp-left', text: 'Desk lamp turned on.' });
    expect(LAMP_MESSAGE_OFF).toBe('Desk lamp turned off.');
    expect(LAMP_MESSAGE_ON).toBe('Desk lamp turned on.');
  });

  it('shows the exact manual texts and leaves the lamps alone', () => {
    const expected = {
      'manual-snake':
        'SNAKE.EXE \u2014 Guide a serpent of magnetic VHS tape, collect tape fragments, and evade the dark shadow serpent to uncover a secret code.',
      'manual-maze':
        'LAST EXIT \u2014 Navigate a shifting dark labyrinth, recover three lost photograph fragments, and escape before the stalker catches you.',
      'manual-frequency':
        'DEAD FREQUENCY \u2014 Listen closely to haunted radio frequencies and repeat each audio sequence to decode hidden transmissions.',
    } as const;
    for (const id of ['manual-snake', 'manual-maze', 'manual-frequency'] as const) {
      const s = reducePropInteract(initialPropState(), id);
      expect(s.message).toEqual({ id, text: expected[id] });
      expect(MANUAL_TEXT[id]).toBe(expected[id]);
      expect(s.lampOn).toEqual(initialPropState().lampOn);
    }
  });

  it('clears the message only when the target moves to a different id or to nothing', () => {
    const s = reducePropInteract(initialPropState(), 'manual-snake');
    expect(reduceTargetChange(s, propTarget('manual-snake'))).toBe(s);
    expect(reduceTargetChange(s, propTarget('manual-maze')).message).toBeNull();
    expect(reduceTargetChange(s, null).message).toBeNull();
    expect(reduceTargetChange(s, { type: 'station', station: STATION_DEFS[0] }).message).toBeNull();
    const empty = initialPropState();
    expect(reduceTargetChange(empty, null)).toBe(empty);
  });

  it('gives the exact prompt texts', () => {
    const on = initialPropState().lampOn;
    const off = { 'desk-lamp-left': false, 'desk-lamp-right': true };
    expect(propPromptText('desk-lamp-left', on)).toBe('Press E to turn off desk lamp');
    expect(propPromptText('desk-lamp-left', off)).toBe('Press E to turn on desk lamp');
    expect(propPromptText('desk-lamp-right', off)).toBe('Press E to turn off desk lamp');
    expect(propPromptText('manual-snake', on)).toBe('Press E to read: SNAKE.EXE Manual');
    expect(propPromptText('manual-maze', on)).toBe('Press E to read: LAST EXIT Manual');
    expect(propPromptText('manual-frequency', on)).toBe('Press E to read: DEAD FREQUENCY Manual');
  });
});

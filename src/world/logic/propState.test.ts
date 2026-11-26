import { describe, expect, it } from 'vitest';
import { INTERACTABLE_DEFS, STATION_DEFS } from '../layout/roomLayout';
import type { PropInteractableId, ReadableId } from '../worldTypes';
import { READABLE_IDS } from './archiveDocuments';
import {
  CARD_CLOSE_DISTANCE,
  READABLE_TOTAL,
  LAMP_MESSAGES,
  initialPropState,
  propPromptText,
  reduceCardPage,
  reduceCloseCard,
  reducePropInteract,
  reduceTargetChange,
  shouldCloseCard,
} from './propState';

const propTarget = (id: string) => ({ type: 'prop' as const, prop: INTERACTABLE_DEFS.find((d) => d.id === id)! });
const press = (ids: PropInteractableId[]) => ids.reduce(reducePropInteract, initialPropState());

describe('prop state reducer (task 23.2, 24.2)', () => {
  it('starts with both lamps on, no message, no card and nothing read', () => {
    const s = initialPropState();
    expect(s.lampOn).toEqual({ 'desk-lamp-left': true, 'desk-lamp-right': true });
    expect(s.message).toBeNull();
    expect(s.openCard).toBeNull();
    expect(s.read.size).toBe(0);
  });

  it('toggles each lamp independently with the exact status pill texts', () => {
    let s = reducePropInteract(initialPropState(), 'desk-lamp-left');
    expect(s.lampOn).toEqual({ 'desk-lamp-left': false, 'desk-lamp-right': true });
    expect(s.message).toEqual({ id: 'desk-lamp-left', text: "Banker's lamp switched OFF" });
    s = reducePropInteract(s, 'desk-lamp-right');
    expect(s.lampOn).toEqual({ 'desk-lamp-left': false, 'desk-lamp-right': false });
    expect(s.message).toEqual({ id: 'desk-lamp-right', text: 'Table lamp switched OFF' });
    s = reducePropInteract(s, 'desk-lamp-left');
    expect(s.message).toEqual({ id: 'desk-lamp-left', text: "Banker's lamp switched ON" });
    s = reducePropInteract(s, 'desk-lamp-right');
    expect(s.message).toEqual({ id: 'desk-lamp-right', text: 'Table lamp switched ON' });
    expect(LAMP_MESSAGES['desk-lamp-left']).toEqual({ on: "Banker's lamp switched ON", off: "Banker's lamp switched OFF" });
    expect(LAMP_MESSAGES['desk-lamp-right']).toEqual({ on: 'Table lamp switched ON', off: 'Table lamp switched OFF' });
  });

  it('E on a readable prop opens its card, marks it read, shows no pill and leaves the lamps alone', () => {
    for (const id of READABLE_IDS) {
      const s = reducePropInteract(initialPropState(), id);
      expect(s.openCard).toBe(id);
      expect(s.read.has(id)).toBe(true);
      expect(s.message).toBeNull();
      expect(s.lampOn).toEqual(initialPropState().lampOn);
    }
  });

  it('E again while the card is open closes it (same prop or another prop), without opening anything', () => {
    const open = reducePropInteract(initialPropState(), 'manual-maze');
    const same = reducePropInteract(open, 'manual-maze');
    expect(same.openCard).toBeNull();
    expect(same.read.size).toBe(1);
    const other = reducePropInteract(open, 'cork-board');
    expect(other.openCard).toBeNull();
    expect(other.read.has('cork-board')).toBe(false);
  });

  it('E on a lamp while a card is open closes the card only (the lamp does not toggle)', () => {
    const open = reducePropInteract(initialPropState(), 'desk-notebook');
    const s = reducePropInteract(open, 'desk-lamp-left');
    expect(s.openCard).toBeNull();
    expect(s.lampOn).toEqual(initialPropState().lampOn);
    expect(s.message).toBeNull();
    // The next press toggles the lamp.
    expect(reducePropInteract(s, 'desk-lamp-left').lampOn['desk-lamp-left']).toBe(false);
  });

  it('closes the card for Esc, pointer lock loss, a station or inspecting through reduceCloseCard, and is idempotent', () => {
    const open = reducePropInteract(initialPropState(), 'poster-shift');
    const closed = reduceCloseCard(open);
    expect(closed.openCard).toBeNull();
    expect(closed.read).toBe(open.read);
    expect(reduceCloseCard(closed)).toBe(closed);
    const none = initialPropState();
    expect(reduceCloseCard(none)).toBe(none);
  });

  it('counts distinct readable props only', () => {
    const order: ReadableId[] = ['manual-snake', 'manual-snake', 'cork-board', 'manual-snake'];
    let s = initialPropState();
    const counts: number[] = [];
    for (const id of order) {
      s = reducePropInteract(s, id); // opens
      counts.push(s.read.size);
      s = reduceCloseCard(s);
    }
    expect(counts).toEqual([1, 1, 2, 2]);
    expect(press(['desk-lamp-left', 'desk-lamp-right']).read.size).toBe(0);
    let all = initialPropState();
    for (const id of READABLE_IDS) all = reduceCloseCard(reducePropInteract(all, id));
    expect(all.read.size).toBe(7);
  });

  it('25.2: opening the Club Archive Notice marks it read and the total is the document count (7)', () => {
    const s = reducePropInteract(initialPropState(), 'poster-archive');
    expect(s.openCard).toBe('poster-archive');
    expect(s.read.has('poster-archive')).toBe(true);
    expect(READABLE_TOTAL).toBe(7);
    expect(READABLE_TOTAL).toBe(READABLE_IDS.length);
    expect(propPromptText('poster-archive', initialPropState().lampOn)).toBe('Press E to read: Club Archive Notice');
  });

  it('shouldCloseCard is true only beyond 2.6 m from the anchor', () => {
    const anchor = { x: 1, z: 1 };
    expect(CARD_CLOSE_DISTANCE).toBe(2.6);
    expect(shouldCloseCard({ x: 1, z: 1 + 2.6 }, anchor, 2.6)).toBe(false);
    expect(shouldCloseCard({ x: 1, z: 1 + 2.61 }, anchor, 2.6)).toBe(true);
    expect(shouldCloseCard({ x: 1 + 2, z: 1 + 2 }, anchor, 2.6)).toBe(true);
    expect(shouldCloseCard({ x: 1.5, z: 1 }, anchor, 2.6)).toBe(false);
  });

  it('clears the message only when the target moves to a different id or to nothing', () => {
    const s = reducePropInteract(initialPropState(), 'desk-lamp-left');
    expect(reduceTargetChange(s, propTarget('desk-lamp-left'))).toBe(s);
    expect(reduceTargetChange(s, propTarget('desk-lamp-right')).message).toBeNull();
    expect(reduceTargetChange(s, null).message).toBeNull();
    expect(reduceTargetChange(s, { type: 'station', station: STATION_DEFS[0] }).message).toBeNull();
    const empty = initialPropState();
    expect(reduceTargetChange(empty, null)).toBe(empty);
  });

  it('keeps an open card when the target changes', () => {
    const open = reducePropInteract(initialPropState(), 'manual-snake');
    expect(reduceTargetChange(open, null).openCard).toBe('manual-snake');
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
    expect(propPromptText('desk-notebook', on)).toBe('Press E to read: Shift Log Notebook');
    expect(propPromptText('cork-board', on)).toBe('Press E to examine: Investigation Pinboard');
    expect(propPromptText('poster-shift', on)).toBe("Press E to inspect: 'The Signal Remembers' Poster");
  });
});

describe('card pages (task 27.2)', () => {
  it('starts on page 1 with no card open', () => {
    expect(initialPropState().cardPage).toBe(1);
  });

  it('CARD_PAGE does nothing while no card is open', () => {
    const s = initialPropState();
    expect(reduceCardPage(s, 2)).toBe(s);
    expect(reduceCardPage(s, 1)).toBe(s);
  });

  it('switches pages while a card is open, and keeps the same state for the page already shown', () => {
    const open = reducePropInteract(initialPropState(), 'manual-snake');
    expect(open.cardPage).toBe(1);
    expect(reduceCardPage(open, 1)).toBe(open);
    const two = reduceCardPage(open, 2);
    expect(two.cardPage).toBe(2);
    expect(two.openCard).toBe('manual-snake');
    expect(reduceCardPage(two, 1).cardPage).toBe(1);
  });

  it('does not change the read set or the lamps when switching pages', () => {
    const open = reducePropInteract(initialPropState(), 'cork-board');
    const two = reduceCardPage(open, 2);
    expect(two.read).toBe(open.read);
    expect(two.read.size).toBe(1);
    expect(two.lampOn).toBe(open.lampOn);
  });

  it('opening always starts on page 1 and every way of closing resets the page', () => {
    let s = reduceCardPage(reducePropInteract(initialPropState(), 'poster-shift'), 2);
    s = reducePropInteract(s, 'poster-shift'); // E closes
    expect(s.openCard).toBeNull();
    expect(s.cardPage).toBe(1);
    expect(reducePropInteract(s, 'poster-shift').cardPage).toBe(1);
    const viaClose = reduceCloseCard(reduceCardPage(reducePropInteract(initialPropState(), 'desk-notebook'), 2));
    expect(viaClose.cardPage).toBe(1);
    expect(viaClose.openCard).toBeNull();
    // Re-reading after page 2 starts on page 1 again.
    const reopened = reducePropInteract(viaClose, 'desk-notebook');
    expect(reopened.cardPage).toBe(1);
    expect(reopened.read.size).toBe(1);
  });
});

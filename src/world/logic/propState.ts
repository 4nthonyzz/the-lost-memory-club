// Pure module: world-local state of the interactable props (desk lamps and readable props).
// Session-only: it lives in React state inside the world, is never persisted and is not part of GameState.
import { isReadableId } from './archiveDocuments';
import type { InteractionTarget, LampId, PropInteractableId, ReadableId, Vec2 } from '../worldTypes';

export interface WorldMessage {
  text: string;
  /** The prop that produced the message. The message is cleared when the target is no longer this prop. */
  id: PropInteractableId;
}

export interface PropState {
  lampOn: Readonly<Record<LampId, boolean>>;
  /** Short status pill (lamps). Readable props use the card instead. */
  message: WorldMessage | null;
  /** The readable prop whose Archive Document Card is open, or null. */
  openCard: ReadableId | null;
  /** Distinct readable props opened this session. Not persisted. */
  read: ReadonlySet<ReadableId>;
}

export const LAMP_IDS: readonly LampId[] = ['desk-lamp-left', 'desk-lamp-right'];

/** Status pill texts of the two lamps. */
export const LAMP_MESSAGES: Readonly<Record<LampId, { on: string; off: string }>> = {
  'desk-lamp-left': { on: "Banker's lamp switched ON", off: "Banker's lamp switched OFF" },
  'desk-lamp-right': { on: 'Table lamp switched ON', off: 'Table lamp switched OFF' },
};

/** The card closes when the player walks farther than this from the open prop's anchor, in metres. */
export const CARD_CLOSE_DISTANCE = 2.6;

/** Total number of readable props, the denominator of the notes counter. */
export const READABLE_TOTAL = 6;

export function initialPropState(): PropState {
  return {
    lampOn: { 'desk-lamp-left': true, 'desk-lamp-right': true },
    message: null,
    openCard: null,
    read: new Set<ReadableId>(),
  };
}

export function isLampId(id: PropInteractableId): id is LampId {
  return id === 'desk-lamp-left' || id === 'desk-lamp-right';
}

/**
 * Applies one E press on a prop. One action per press:
 *  - a card is open: the card closes and nothing else happens (also on a lamp);
 *  - a lamp: it toggles and a status pill is shown;
 *  - a readable prop: its card opens and it counts as read.
 */
export function reducePropInteract(s: PropState, id: PropInteractableId): PropState {
  if (s.openCard !== null) return { ...s, openCard: null };
  if (isLampId(id)) {
    const on = !s.lampOn[id];
    return {
      ...s,
      lampOn: { ...s.lampOn, [id]: on },
      message: { id, text: on ? LAMP_MESSAGES[id].on : LAMP_MESSAGES[id].off },
    };
  }
  const read = s.read.has(id) ? s.read : new Set<ReadableId>([...s.read, id]);
  return { ...s, message: null, openCard: id, read };
}

/** Closes the card (E on nothing, Esc, pointer lock lost, distance, station opened, inspecting). Same state when none is open. */
export function reduceCloseCard(s: PropState): PropState {
  return s.openCard === null ? s : { ...s, openCard: null };
}

/** True when the player is farther than `maxDist` from the anchor of the open card's prop. */
export function shouldCloseCard(playerPos: Vec2, anchor: Vec2, maxDist: number = CARD_CLOSE_DISTANCE): boolean {
  return Math.hypot(anchor.x - playerPos.x, anchor.z - playerPos.z) > maxDist;
}

/** Clears the message unless the current target is the prop that produced it. Returns the same state when unchanged. */
export function reduceTargetChange(s: PropState, target: InteractionTarget | null): PropState {
  if (s.message === null) return s;
  if (target?.type === 'prop' && target.prop.id === s.message.id) return s;
  return { ...s, message: null };
}

/** Prompt text for a prop target given the current lamp state. */
export function propPromptText(id: PropInteractableId, lampOn: Readonly<Record<LampId, boolean>>): string {
  if (isLampId(id)) return lampOn[id] ? 'Press E to turn off desk lamp' : 'Press E to turn on desk lamp';
  if (!isReadableId(id)) return '';
  switch (id) {
    case 'manual-snake':
      return 'Press E to read: SNAKE.EXE Manual';
    case 'manual-maze':
      return 'Press E to read: LAST EXIT Manual';
    case 'manual-frequency':
      return 'Press E to read: DEAD FREQUENCY Manual';
    case 'desk-notebook':
      return 'Press E to read: Shift Log Notebook';
    case 'cork-board':
      return 'Press E to examine: Investigation Pinboard';
    case 'poster-shift':
      return "Press E to inspect: 'The Signal Remembers' Poster";
  }
}

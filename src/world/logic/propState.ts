// Pure module: world-local state of the interactable props (desk lamps and arcade manuals).
// Session-only: it lives in React state inside the world, is never persisted and is not part of GameState.
import type { InteractionTarget, LampId, ManualId, PropInteractableId } from '../worldTypes';

export interface WorldMessage {
  text: string;
  /** The prop that produced the message. The message is cleared when the target is no longer this prop. */
  id: PropInteractableId;
}

export interface PropState {
  lampOn: Readonly<Record<LampId, boolean>>;
  message: WorldMessage | null;
}

export const LAMP_IDS: readonly LampId[] = ['desk-lamp-left', 'desk-lamp-right'];

export const MANUAL_TEXT: Readonly<Record<ManualId, string>> = {
  'manual-snake':
    'SNAKE.EXE \u2014 Guide a serpent of magnetic VHS tape, collect tape fragments, and evade the dark shadow serpent to uncover a secret code.',
  'manual-maze':
    'LAST EXIT \u2014 Navigate a shifting dark labyrinth, recover three lost photograph fragments, and escape before the stalker catches you.',
  'manual-frequency':
    'DEAD FREQUENCY \u2014 Listen closely to haunted radio frequencies and repeat each audio sequence to decode hidden transmissions.',
};

export const LAMP_MESSAGE_OFF = 'Desk lamp turned off.';
export const LAMP_MESSAGE_ON = 'Desk lamp turned on.';

export function initialPropState(): PropState {
  return { lampOn: { 'desk-lamp-left': true, 'desk-lamp-right': true }, message: null };
}

export function isLampId(id: PropInteractableId): id is LampId {
  return id === 'desk-lamp-left' || id === 'desk-lamp-right';
}

/** Applies one E press on a prop. A lamp toggles only itself; a manual shows its text. */
export function reducePropInteract(s: PropState, id: PropInteractableId): PropState {
  if (isLampId(id)) {
    const on = !s.lampOn[id];
    return {
      lampOn: { ...s.lampOn, [id]: on },
      message: { id, text: on ? LAMP_MESSAGE_ON : LAMP_MESSAGE_OFF },
    };
  }
  return { ...s, message: { id, text: MANUAL_TEXT[id] } };
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
  switch (id) {
    case 'manual-snake':
      return 'Press E to read: SNAKE.EXE Manual';
    case 'manual-maze':
      return 'Press E to read: LAST EXIT Manual';
    case 'manual-frequency':
      return 'Press E to read: DEAD FREQUENCY Manual';
  }
}

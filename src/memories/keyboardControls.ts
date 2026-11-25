import type { TransportAction, TransportMode } from './restoration/types';

export interface KeyInput {
  key: string;
  code: string;
  shiftKey: boolean;
}

export interface KeyCommand {
  actions: TransportAction[];
  close: boolean;
}

function stepCommand(direction: 1 | -1, mode: TransportMode): KeyCommand {
  const step: TransportAction = { type: 'STEP_FRAME', direction };
  if (mode === 'paused') return { actions: [step], close: false };
  if (mode === 'stopped') return { actions: [], close: false };
  return { actions: [{ type: 'PAUSE' }, step], close: false };
}

function trackingCommand(sign: 1 | -1, amount: number): KeyCommand {
  return { actions: [{ type: 'ADJUST_TRACKING', delta: sign * amount }], close: false };
}

export function commandForKey(input: KeyInput, mode: TransportMode): KeyCommand | null {
  const amount = input.shiftKey || input.key === '{' || input.key === '}' ? 5 : 1;
  switch (input.key) {
    case ' ':
    case 'Spacebar':
      return { actions: [mode === 'stopped' || mode === 'paused' ? { type: 'PLAY' } : { type: 'PAUSE' }], close: false };
    case 'ArrowLeft':
      return { actions: [{ type: 'REWIND' }], close: false };
    case 'ArrowRight':
      return { actions: [{ type: 'FAST_FORWARD' }], close: false };
    case ',':
    case '<':
      return stepCommand(-1, mode);
    case '.':
    case '>':
      return stepCommand(1, mode);
    case '[':
    case '{':
    case 'ArrowDown':
      return trackingCommand(-1, amount);
    case ']':
    case '}':
    case 'ArrowUp':
      return trackingCommand(1, amount);
    case 'Escape':
      return { actions: [], close: true };
    default:
      if (input.code === 'BracketLeft') return trackingCommand(-1, amount);
      if (input.code === 'BracketRight') return trackingCommand(1, amount);
      return null;
  }
}

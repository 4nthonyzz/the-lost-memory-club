import { describe, expect, it } from 'vitest';
import { commandForKey, type KeyInput } from './keyboardControls';

const key = (value: string, extra: Partial<KeyInput> = {}): KeyInput => ({ key: value, code: '', shiftKey: false, ...extra });

describe('commandForKey', () => {
  it('toggles play and pause with Space', () => {
    expect(commandForKey(key(' '), 'stopped')?.actions).toEqual([{ type: 'PLAY' }]);
    expect(commandForKey(key(' '), 'paused')?.actions).toEqual([{ type: 'PLAY' }]);
    expect(commandForKey(key(' '), 'playing')?.actions).toEqual([{ type: 'PAUSE' }]);
    expect(commandForKey(key(' '), 'rewind')?.actions).toEqual([{ type: 'PAUSE' }]);
  });

  it('maps the arrow keys to rewind and fast forward', () => {
    expect(commandForKey(key('ArrowLeft'), 'playing')?.actions).toEqual([{ type: 'REWIND' }]);
    expect(commandForKey(key('ArrowRight'), 'playing')?.actions).toEqual([{ type: 'FAST_FORWARD' }]);
  });

  it('steps frames with comma and period', () => {
    expect(commandForKey(key(','), 'paused')?.actions).toEqual([{ type: 'STEP_FRAME', direction: -1 }]);
    expect(commandForKey(key('.'), 'paused')?.actions).toEqual([{ type: 'STEP_FRAME', direction: 1 }]);
  });

  it('pauses before stepping while the tape is moving and ignores stepping when stopped', () => {
    expect(commandForKey(key('.'), 'playing')?.actions).toEqual([{ type: 'PAUSE' }, { type: 'STEP_FRAME', direction: 1 }]);
    expect(commandForKey(key('.'), 'stopped')?.actions).toEqual([]);
  });

  it('adjusts tracking with brackets and arrow keys, in larger steps with Shift', () => {
    expect(commandForKey(key('['), 'paused')?.actions).toEqual([{ type: 'ADJUST_TRACKING', delta: -1 }]);
    expect(commandForKey(key(']'), 'paused')?.actions).toEqual([{ type: 'ADJUST_TRACKING', delta: 1 }]);
    expect(commandForKey(key('{', { shiftKey: true }), 'paused')?.actions).toEqual([{ type: 'ADJUST_TRACKING', delta: -5 }]);
    expect(commandForKey(key('}'), 'paused')?.actions).toEqual([{ type: 'ADJUST_TRACKING', delta: 5 }]);
    expect(commandForKey(key('ArrowUp'), 'paused')?.actions).toEqual([{ type: 'ADJUST_TRACKING', delta: 1 }]);
    expect(commandForKey(key('ArrowDown', { shiftKey: true }), 'paused')?.actions).toEqual([{ type: 'ADJUST_TRACKING', delta: -5 }]);
  });

  it('supports bracket keys on layouts that report them only by code', () => {
    expect(commandForKey(key('Dead', { code: 'BracketLeft' }), 'paused')?.actions).toEqual([{ type: 'ADJUST_TRACKING', delta: -1 }]);
    expect(commandForKey(key('Dead', { code: 'BracketRight' }), 'paused')?.actions).toEqual([{ type: 'ADJUST_TRACKING', delta: 1 }]);
  });

  it('closes on Escape and ignores unrelated keys', () => {
    expect(commandForKey(key('Escape'), 'paused')).toEqual({ actions: [], close: true });
    expect(commandForKey(key('a'), 'paused')).toBeNull();
  });
});

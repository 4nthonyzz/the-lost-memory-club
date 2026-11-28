import { describe, expect, it } from 'vitest';
import { actionCuePlan } from './actionAudio';

describe('action audio cues', () => {
  it('keeps the three physical actions short and distinct', () => {
    const clunk = actionCuePlan('clunk');
    const polaroid = actionCuePlan('polaroid');
    const coin = actionCuePlan('coin');
    expect(clunk.some((step) => step.type === 'noise')).toBe(true);
    expect(polaroid.some((step) => step.type === 'tone')).toBe(true);
    expect(coin.map((step) => step.frequency)).toEqual([880, 1320]);
    for (const plan of [clunk, polaroid, coin]) {
      expect(plan.every((step) => step.duration > 0 && step.gain > 0 && step.gain <= 1)).toBe(true);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { mixColor, SCENE_DURATION, sceneProgress, typewriterText } from './endingScenes';

describe('ending scene helpers', () => {
  it('advances scene progress and clamps it to 0..1', () => {
    expect(sceneProgress(-5, false)).toBe(0);
    expect(sceneProgress(SCENE_DURATION / 2, false)).toBe(0.5);
    expect(sceneProgress(SCENE_DURATION * 3, false)).toBe(1);
  });

  it('shows the settled frame immediately with reduced distortion', () => {
    expect(sceneProgress(0, true)).toBe(1);
  });

  it('types text after a delay and shows it whole with reduced distortion', () => {
    expect(typewriterText('ARCHIVE-10 READY', 0, false)).toBe('');
    expect(typewriterText('ARCHIVE-10 READY', 2.5, false)).toBe('ARCHIVE-');
    expect(typewriterText('ARCHIVE-10 READY', 100, false)).toBe('ARCHIVE-10 READY');
    expect(typewriterText('ARCHIVE-10 READY', 0, true)).toBe('ARCHIVE-10 READY');
  });

  it('mixes colors linearly and clamps the amount', () => {
    expect(mixColor('#000000', '#ffffff', 0)).toBe('rgb(0,0,0)');
    expect(mixColor('#000000', '#ffffff', 0.5)).toBe('rgb(128,128,128)');
    expect(mixColor('#000000', '#ffffff', 4)).toBe('rgb(255,255,255)');
  });
});

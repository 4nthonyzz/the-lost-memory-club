import { describe, expect, it } from 'vitest';
import { resolveSaveStatus } from './saveStatus';

describe('resolveSaveStatus', () => {
  const expected = JSON.stringify({ version: 1, collectedTapes: [] });

  it('reports saved when storage holds the exact serialized state', () => {
    expect(resolveSaveStatus(expected, () => expected)).toBe('saved');
  });

  it('reports error when storage holds different or missing data', () => {
    expect(resolveSaveStatus(expected, () => null)).toBe('error');
    expect(resolveSaveStatus(expected, () => '{"version":1}')).toBe('error');
  });

  it('reports error when LocalStorage throws', () => {
    expect(
      resolveSaveStatus(expected, () => {
        throw new Error('storage disabled');
      }),
    ).toBe('error');
  });
});
